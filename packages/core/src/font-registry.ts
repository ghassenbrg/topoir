import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { openSync, type Font } from "fontkit";
import type { Diagnostic } from "@topoir/schema";

/**
 * The versioned font registry.
 *
 * T02 made family resolution honest: an unavailable family is substituted and reported
 * rather than claimed. That fixed the *family*, but a family is not a resource. Layout,
 * the SVG and the PNG each loaded fonts independently, so nothing proved they used the
 * same bytes, and nothing noticed when a glyph was missing — a character DejaVu has no
 * glyph for is drawn as tofu, silently, in both exports.
 *
 * A `ResolvedFace` names one exact file, by content hash. Measurement, the embedded SVG
 * faces and the PNG rasterizer are all handed the same resolved set, so "did these agree"
 * is answerable rather than assumed.
 *
 * Legacy DejaVu metrics are preserved exactly: this registry describes the fonts the
 * compiler already used, it does not change them.
 */

const require = createRequire(import.meta.url);

export type FontStyle = "normal" | "italic";

export interface ResolvedFace {
  readonly family: string;
  readonly weight: number;
  readonly style: FontStyle;
  /** Absolute path to the exact file. */
  readonly path: string;
  /** sha256 of the file's bytes. Two faces are the same resource iff these match. */
  readonly sha256: string;
  readonly unitsPerEm: number;
  readonly ascent: number;
  readonly descent: number;
  readonly lineGap: number;
  readonly version: string;
  readonly license: string;
}

export interface FontPack {
  readonly family: string;
  /** Pack version, so a document can be told which pack produced a drawing. */
  readonly version: string;
  readonly license: string;
  readonly faces: readonly ResolvedFace[];
}

/**
 * The faces selected for one document, in fallback order.
 *
 * `chain` is resolved once, before any shaping happens. Every consumer uses this exact
 * list; none of them re-resolves.
 */
export interface ResolvedFontSet {
  readonly requested: string;
  readonly chain: readonly FontPack[];
  /** The family that actually wins, which is what the scene declares. */
  readonly family: string;
  readonly substituted: boolean;
  /** Content hash over the whole chain; identical chains produce identical hashes. */
  readonly fingerprint: string;
}

interface FaceSpec {
  readonly weight: number;
  readonly style: FontStyle;
  readonly module: string;
}

/** The bundled pack. DejaVu is retained so existing output is bit-for-bit unchanged. */
const BUNDLED: readonly { family: string; license: string; faces: readonly FaceSpec[] }[] = [
  {
    family: "DejaVu Sans",
    license: "Bitstream Vera and Arev fonts licence; DejaVu changes in the public domain",
    faces: [
      { weight: 400, style: "normal", module: "dejavu-fonts-ttf/ttf/DejaVuSans.ttf" },
      { weight: 700, style: "normal", module: "dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf" },
    ],
  },
];

const faceCache = new Map<string, { readonly face: ResolvedFace; readonly font: Font }>();
const packCache = new Map<string, FontPack>();

function loadFace(family: string, license: string, spec: FaceSpec): { face: ResolvedFace; font: Font } {
  const cached = faceCache.get(spec.module);
  if (cached !== undefined) return cached;
  const path = require.resolve(spec.module);
  const bytes = readFileSync(path);
  const opened = openSync(path);
  if ("fonts" in opened) throw new Error(`Expected a single font file for ${spec.module}.`);
  const font = opened;
  const entry = {
    face: {
      family,
      weight: spec.weight,
      style: spec.style,
      path,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      unitsPerEm: font.unitsPerEm,
      ascent: font.ascent,
      descent: font.descent,
      lineGap: font.lineGap,
      version: String(font.version ?? "unknown"),
      license,
    },
    font,
  };
  faceCache.set(spec.module, entry);
  return entry;
}

function pack(family: string): FontPack | undefined {
  const cached = packCache.get(family.toLowerCase());
  if (cached !== undefined) return cached;
  const definition = BUNDLED.find((entry) => entry.family.toLowerCase() === family.toLowerCase());
  if (definition === undefined) return undefined;
  const built: FontPack = {
    family: definition.family,
    version: "1",
    license: definition.license,
    faces: definition.faces.map((spec) => loadFace(definition.family, definition.license, spec).face),
  };
  packCache.set(family.toLowerCase(), built);
  return built;
}

/** Every family the compiler can measure and embed. */
export function availableFamilies(): readonly string[] {
  return BUNDLED.map((entry) => entry.family);
}

export const DEFAULT_FAMILY = "DejaVu Sans";

/**
 * Resolves a requested family into a complete fallback chain.
 *
 * A CSS-style stack resolves entry by entry, and the default pack is always appended so
 * the chain can never be empty. Resolution happens once; the returned set is what every
 * consumer uses.
 */
export function resolveFontSet(requested: string | undefined): ResolvedFontSet {
  const asked = requested?.trim() ?? "";
  const chain: FontPack[] = [];
  for (const candidate of asked.split(",")) {
    const name = candidate.trim().replace(/^["']|["']$/gu, "");
    if (name === "") continue;
    const found = pack(name);
    if (found !== undefined && !chain.some((entry) => entry.family === found.family)) chain.push(found);
  }
  const fallback = pack(DEFAULT_FAMILY);
  if (fallback !== undefined && !chain.some((entry) => entry.family === fallback.family)) chain.push(fallback);
  const family = chain[0]?.family ?? DEFAULT_FAMILY;
  return {
    requested: asked === "" ? DEFAULT_FAMILY : asked,
    chain,
    family,
    substituted: asked !== "" && asked !== family,
    fingerprint: fingerprintOf(chain),
  };
}

/**
 * Content hash over a resolved chain.
 *
 * Built from the face hashes, so it changes when the bytes change and not when an
 * unrelated field is reworded. Two runs with the same fingerprint used the same resources,
 * which is what makes cached and uncached output provably identical.
 */
export function fingerprintOf(chain: readonly FontPack[]): string {
  const material = chain.flatMap((entry) => entry.faces.map((face) => `${entry.family}/${face.weight}/${face.style}/${face.sha256}`));
  return createHash("sha256").update(material.join("\n")).digest("hex");
}

/** The face a weight and style select from a resolved chain, with fallback. */
export function selectFace(set: ResolvedFontSet, weight: number, style: FontStyle = "normal"): ResolvedFace | undefined {
  for (const entry of set.chain) {
    const exact = entry.faces.find((face) => face.weight === weight && face.style === style);
    if (exact !== undefined) return exact;
  }
  for (const entry of set.chain) {
    // Nearest available weight in the same style, then anything at all.
    const sameStyle = entry.faces.filter((face) => face.style === style);
    const nearest = [...sameStyle].sort((left, right) => Math.abs(left.weight - weight) - Math.abs(right.weight - weight))[0];
    if (nearest !== undefined) return nearest;
  }
  return set.chain[0]?.faces[0];
}

/** The opened font for a resolved face, from the content-keyed cache. */
export function fontFor(face: ResolvedFace): Font {
  for (const entry of faceCache.values()) if (entry.face.path === face.path) return entry.font;
  const opened = openSync(face.path);
  if ("fonts" in opened) throw new Error(`Expected a single font file at ${face.path}.`);
  return opened;
}

export interface GlyphCoverage {
  /** Code points no face in the chain can draw. These render as tofu. */
  readonly missing: readonly number[];
  /** A readable sample of the missing characters, for the diagnostic message. */
  readonly sample: string;
}

/**
 * Code points in `text` that no face in the chain can draw.
 *
 * Without this a character outside the pack's coverage is drawn as a replacement box in
 * both exports with nothing in the result to say so — the caller sees a successful
 * compilation and a drawing full of boxes.
 */
export function glyphCoverage(set: ResolvedFontSet, text: string): GlyphCoverage {
  const fonts = set.chain.flatMap((entry) => entry.faces.map((face) => fontFor(face)));
  const missing: number[] = [];
  const seen = new Set<number>();
  for (const character of text) {
    const point = character.codePointAt(0);
    if (point === undefined || seen.has(point)) continue;
    seen.add(point);
    // Whitespace and control characters have no visible glyph and never read as tofu.
    if (point < 0x21) continue;
    // Variation selectors and joiners modify neighbours rather than drawing themselves.
    if (point === 0xfe0f || point === 0xfe0e || point === 0x200d) continue;
    if (!fonts.some((font) => font.hasGlyphForCodePoint(point))) missing.push(point);
  }
  return {
    missing,
    sample: missing.slice(0, 8).map((point) => String.fromCodePoint(point)).join(""),
  };
}

/** The diagnostic for a substituted family, or nothing when the request was honored. */
export function fontSetDiagnostic(set: ResolvedFontSet): Diagnostic | undefined {
  if (!set.substituted) return undefined;
  return {
    code: "TOP330_FONT_UNAVAILABLE",
    severity: "warning",
    message:
      `Font family ${JSON.stringify(set.requested)} is not available to the compiler, so ` +
      `${JSON.stringify(set.family)} was used for measurement, for the scene and for the ` +
      `embedded font faces. Available families: ${availableFamilies().join(", ")}.`,
  };
}

/** The diagnostic for characters the resolved chain cannot draw. */
export function glyphDiagnostic(set: ResolvedFontSet, owner: string, text: string): Diagnostic | undefined {
  const coverage = glyphCoverage(set, text);
  if (coverage.missing.length === 0) return undefined;
  const points = coverage.missing.slice(0, 8).map((point) => `U+${point.toString(16).toUpperCase().padStart(4, "0")}`);
  return {
    code: "TOP332_GLYPH_NOT_AVAILABLE",
    severity: "warning",
    message:
      `The text of ${owner} uses ${coverage.missing.length} character${coverage.missing.length === 1 ? "" : "s"} ` +
      `that no resolved font can draw (${points.join(", ")}${coverage.missing.length > 8 ? ", …" : ""}: ${JSON.stringify(coverage.sample)}). ` +
      `They are drawn as replacement boxes. Use characters the ${set.family} pack covers, or wait for a pack that does.`,
  };
}
