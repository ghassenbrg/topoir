import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  availableFamilies,
  bundledFontTextMeasurer,
  DEFAULT_FAMILY,
  fingerprintOf,
  fontFor,
  fontSetDiagnostic,
  glyphCoverage,
  glyphDiagnostic,
  resolveFontSet,
  selectFace,
} from "../src/index.js";

/**
 * T06 — fonts as resolved resources, not names.
 *
 * T02 made the *family* honest. A family is not a resource: measurement, the SVG's
 * embedded faces and the PNG rasterizer each resolved fonts independently, so nothing
 * proved they used the same bytes, and nothing noticed a character the pack cannot draw.
 */

describe("resolved font sets", () => {
  it("resolves the default family to a real file with a content hash", () => {
    const set = resolveFontSet(undefined);
    expect(set.family).toBe(DEFAULT_FAMILY);
    expect(set.substituted).toBe(false);
    const face = selectFace(set, 400);
    expect(face).toBeDefined();
    // The hash describes the bytes on disk, not a name.
    expect(face?.sha256).toBe(createHash("sha256").update(readFileSync(face!.path)).digest("hex"));
  });

  it("preserves the legacy DejaVu metrics exactly", () => {
    // The registry describes the fonts the compiler already used; it does not change them.
    const face = selectFace(resolveFontSet(undefined), 400);
    expect(face?.family).toBe("DejaVu Sans");
    expect(face?.unitsPerEm).toBe(2048);
    expect(face?.ascent).toBe(1901);
    expect(face?.descent).toBe(-483);
  });

  it("retains the licence with the face", () => {
    for (const family of availableFamilies()) {
      const set = resolveFontSet(family);
      for (const pack of set.chain) {
        expect(pack.license.length, pack.family).toBeGreaterThan(10);
        for (const face of pack.faces) expect(face.license, `${pack.family}/${face.weight}`).toBe(pack.license);
      }
    }
  });

  it("always ends the chain with the default pack, so it can never be empty", () => {
    for (const requested of [undefined, "", "Invented Font Family", "Nothing, Real"]) {
      const set = resolveFontSet(requested);
      expect(set.chain.length, String(requested)).toBeGreaterThan(0);
      expect(set.chain[set.chain.length - 1]?.family, String(requested)).toBe(DEFAULT_FAMILY);
    }
  });

  it("resolves a CSS-style stack to its first available entry", () => {
    const set = resolveFontSet("'Inter', \"DejaVu Sans\", sans-serif");
    expect(set.family).toBe("DejaVu Sans");
    expect(set.substituted).toBe(true);
    expect(fontSetDiagnostic(set)?.code).toBe("TOP330_FONT_UNAVAILABLE");
  });

  it("reports nothing when the request was honored", () => {
    expect(fontSetDiagnostic(resolveFontSet("DejaVu Sans"))).toBeUndefined();
  });

  it("selects the nearest weight rather than failing", () => {
    const set = resolveFontSet(undefined);
    expect(selectFace(set, 400)?.weight).toBe(400);
    expect(selectFace(set, 700)?.weight).toBe(700);
    // 600 is not in the pack; the nearest real face is used and measurement still works.
    expect([400, 700]).toContain(selectFace(set, 600)?.weight);
    expect(selectFace(set, 900)?.weight).toBe(700);
  });
});

describe("resource fingerprints", () => {
  it("is stable across resolutions of the same request", () => {
    expect(resolveFontSet(undefined).fingerprint).toBe(resolveFontSet(undefined).fingerprint);
    expect(resolveFontSet("DejaVu Sans").fingerprint).toBe(resolveFontSet("dejavu sans").fingerprint);
  });

  it("is derived from the face bytes", () => {
    const set = resolveFontSet(undefined);
    expect(set.fingerprint).toBe(fingerprintOf(set.chain));
    // A different set of faces must not collide with this one.
    expect(fingerprintOf([])).not.toBe(set.fingerprint);
  });

  it("makes a cached measurer provably the same resource as an uncached one", () => {
    const first = bundledFontTextMeasurer(resolveFontSet(undefined));
    const second = bundledFontTextMeasurer(resolveFontSet("DejaVu Sans"));
    // Same resolved bytes, so the same cache entry: a hit cannot differ from a miss.
    expect(second).toBe(first);
    expect(first.id).toContain(resolveFontSet(undefined).fingerprint.slice(0, 16));
  });

  it("measures identically whether or not the cache was warm", () => {
    const style = { fontSize: 13, fontWeight: 600 as const, lineHeight: 1.35 };
    const cold = new (Object.getPrototypeOf(bundledFontTextMeasurer()).constructor)(resolveFontSet(undefined));
    expect(cold.measure("Payments API", style)).toEqual(bundledFontTextMeasurer().measure("Payments API", style));
  });
});

describe("glyph coverage", () => {
  const set = resolveFontSet(undefined);

  it("accepts text the pack covers, including accented Latin and Cyrillic", () => {
    for (const text of ["Payments API", "Café résumé naïve", "Расчёты", "Λογαριασμός"]) {
      expect(glyphCoverage(set, text).missing, text).toEqual([]);
    }
  });

  it("names characters the pack cannot draw", () => {
    // DejaVu Sans has no CJK coverage. Without this check these are drawn as replacement
    // boxes in both exports and the caller sees a clean compile.
    const coverage = glyphCoverage(set, "支払いサービス");
    expect(coverage.missing).toHaveLength(7);
    expect(coverage.sample).toBe("支払いサービス");
  });

  it("names characters in a mixed run without flagging the covered ones", () => {
    const coverage = glyphCoverage(set, "Service 支払い");
    expect(coverage.missing).toHaveLength(3);
    expect(coverage.sample).toBe("支払い");
  });

  it("does not flag whitespace, joiners or variation selectors", () => {
    // None of these draw a glyph of their own, so reporting them would be noise.
    expect(glyphCoverage(set, "a b\tc\nd").missing).toEqual([]);
    expect(glyphCoverage(set, "a‍b️").missing).toEqual([]);
  });

  it("produces an actionable diagnostic naming the owner and the code points", () => {
    const diagnostic = glyphDiagnostic(set, "node payments", "Service 支払い");
    expect(diagnostic?.code).toBe("TOP332_GLYPH_NOT_AVAILABLE");
    expect(diagnostic?.severity).toBe("warning");
    expect(diagnostic?.message).toContain("node payments");
    expect(diagnostic?.message).toContain("U+652F");
    expect(diagnostic?.message).toContain("replacement boxes");
  });

  it("says nothing when every character is covered", () => {
    expect(glyphDiagnostic(set, "node payments", "Payments API")).toBeUndefined();
  });
});

describe("one resolved set for every consumer", () => {
  it("hands the same face objects to measurement and to export", () => {
    const set = resolveFontSet(undefined);
    const measured = selectFace(set, 400);
    if (measured === undefined) throw new Error("no face");
    // `fontFor` returns the cached opened font for that exact file, so measurement is not
    // reading one copy while export embeds another.
    expect(fontFor(measured).unitsPerEm).toBe(measured.unitsPerEm);
    expect(fontFor(measured)).toBe(fontFor(measured));
  });

  it("gives the measurer's id the fingerprint of the set it used", () => {
    // A layout result therefore records which exact font bytes produced it.
    const set = resolveFontSet(undefined);
    expect(bundledFontTextMeasurer(set).fonts.fingerprint).toBe(set.fingerprint);
  });
});
