import type { Size } from "./ir.js";
import { fontFor, resolveFontSet, selectFace, type ResolvedFontSet } from "./font-registry.js";
import type { TextMeasurer, TextStyle } from "./measure.js";

/**
 * Measurement over a resolved font set (T06).
 *
 * This used to open its own font files by module path, independently of the ones the SVG
 * embedded and the ones the PNG rasterizer loaded. Three separate resolutions that
 * happened to agree; nothing would have caught them drifting, and a drawing laid out with
 * one set of metrics and rasterized with another is wrong in a way that "a PNG was
 * produced" cannot detect.
 *
 * `id` carries the resolved set's content fingerprint, so a layout result records which
 * exact font bytes produced it.
 */
export class BundledFontTextMeasurer implements TextMeasurer {
  public readonly id: string;
  private readonly set: ResolvedFontSet;

  public constructor(set: ResolvedFontSet = resolveFontSet(undefined)) {
    this.set = set;
    this.id = `font-set-${set.fingerprint.slice(0, 16)}`;
  }

  /** The resolved set this measurer used, for the renderer and rasterizer to reuse. */
  public get fonts(): ResolvedFontSet {
    return this.set;
  }

  public measure(text: string, style: TextStyle): Size {
    const face = selectFace(this.set, style.fontWeight ?? 400);
    if (face === undefined) throw new Error("No font face resolved for measurement.");
    const font = fontFor(face);
    const run = font.layout(text.normalize("NFC"));
    const scale = style.fontSize / font.unitsPerEm;
    return {
      width: round(run.advanceWidth * scale),
      height: round(style.fontSize * style.lineHeight),
    };
  }
}

const measurerCache = new Map<string, BundledFontTextMeasurer>();

/**
 * A measurer for a resolved set, cached on the set's content fingerprint.
 *
 * Keying on content rather than on the request is what makes a cache hit provably
 * equivalent to a cache miss: two requests that resolve to the same bytes share a
 * measurer, and two that do not never can.
 */
export function bundledFontTextMeasurer(set?: ResolvedFontSet): BundledFontTextMeasurer {
  const resolved = set ?? resolveFontSet(undefined);
  const cached = measurerCache.get(resolved.fingerprint);
  if (cached !== undefined) return cached;
  const created = new BundledFontTextMeasurer(resolved);
  measurerCache.set(resolved.fingerprint, created);
  return created;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
