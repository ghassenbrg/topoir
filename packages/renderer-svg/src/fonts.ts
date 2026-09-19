import { readFileSync } from "node:fs";
import { resolveFontSet, type ResolvedFontSet } from "@topoir/core";

/**
 * Font resources for export, taken from the core registry (T06).
 *
 * These used to be a private list of module paths that happened to match the ones
 * `BundledFontTextMeasurer` opened. Nothing connected the two, so nothing would have
 * noticed them diverging — and a drawing laid out with one set of metrics and rasterized
 * with another is wrong in a way no test that only checks "a PNG was produced" can see.
 *
 * Both the SVG's embedded faces and the PNG rasterizer's font files now come from the
 * same resolved set that measurement used.
 */

/** The faces of a resolved set, in the order the chain declares them. */
export function fontFilesFor(set: ResolvedFontSet): readonly string[] {
  return set.chain.flatMap((pack) => pack.faces.map((face) => face.path));
}

/** The default chain, for callers that have not resolved one. */
export const bundledFontFiles: readonly string[] = fontFilesFor(resolveFontSet(undefined));

const cssCache = new Map<string, string>();

/**
 * `@font-face` rules embedding each resolved face.
 *
 * Cached on the set's content fingerprint, so the same resources always produce the same
 * bytes and a cache hit cannot differ from a cache miss.
 */
export function embeddedFontCssFor(set: ResolvedFontSet): string {
  const cached = cssCache.get(set.fingerprint);
  if (cached !== undefined) return cached;
  const css = set.chain
    .flatMap((pack) =>
      pack.faces.map((face) => {
        const data = readFileSync(face.path).toString("base64");
        return `@font-face{font-family:'${face.family}';font-style:${face.style};font-weight:${face.weight};font-display:block;src:url(data:font/ttf;base64,${data}) format('truetype')}`;
      }),
    )
    .join("");
  cssCache.set(set.fingerprint, css);
  return css;
}

export function embeddedFontCss(): string {
  return embeddedFontCssFor(resolveFontSet(undefined));
}
