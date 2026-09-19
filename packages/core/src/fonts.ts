import type { Diagnostic } from "@topoir/schema";

/**
 * Font resolution.
 *
 * The review found that `font.family: Invented Font Family` was accepted, the scene
 * declared that family, measurement quietly used the bundled DejaVu Sans, and the SVG
 * embedded only DejaVu Sans. A viewer with some font by that name installed would see a
 * drawing laid out for different metrics; a viewer without it would see a third thing.
 *
 * A family is therefore resolved against what the compiler can actually measure and
 * embed. An unavailable family falls back, and the fallback is reported rather than
 * hidden: measurement, the scene and the embedded font faces all name the same family.
 *
 * This is the narrow T02 form. T06 replaces it with the versioned registry that also
 * carries resolved face hashes, the full fallback chain and glyph-coverage diagnostics.
 */

/** Families the compiler can both measure and embed. */
export const SUPPORTED_FONT_FAMILIES = ["DejaVu Sans"] as const;

export const DEFAULT_FONT_FAMILY = "DejaVu Sans";

export interface ResolvedFont {
  /** The family measurement and rendering actually use. Always a supported family. */
  readonly family: string;
  /** The family the document asked for. */
  readonly requested: string;
  /** True when `family` is not what was requested. */
  readonly substituted: boolean;
}

/**
 * Resolves a requested family to one the compiler can honor.
 *
 * Matching ignores case and surrounding whitespace, and accepts a CSS-style stack so a
 * document that writes `"DejaVu Sans", sans-serif` resolves to its first supported entry
 * rather than being treated as one unknown family.
 */
export function resolveFont(requested: string | undefined): ResolvedFont {
  const asked = requested?.trim();
  if (asked === undefined || asked === "") {
    return { family: DEFAULT_FONT_FAMILY, requested: DEFAULT_FONT_FAMILY, substituted: false };
  }
  for (const candidate of asked.split(",")) {
    const name = candidate.trim().replace(/^["']|["']$/gu, "");
    const supported = SUPPORTED_FONT_FAMILIES.find((family) => family.toLowerCase() === name.toLowerCase());
    if (supported !== undefined) return { family: supported, requested: asked, substituted: supported !== asked };
  }
  return { family: DEFAULT_FONT_FAMILY, requested: asked, substituted: true };
}

/** The diagnostic for a substituted family, or nothing when the request was honored. */
export function fontDiagnostic(resolved: ResolvedFont): Diagnostic | undefined {
  if (!resolved.substituted) return undefined;
  return {
    code: "TOP330_FONT_UNAVAILABLE",
    severity: "warning",
    message:
      `Font family ${JSON.stringify(resolved.requested)} is not available to the compiler, so ` +
      `${JSON.stringify(resolved.family)} was used for measurement, for the scene and for the ` +
      `embedded font faces. Available families: ${SUPPORTED_FONT_FAMILIES.join(", ")}.`,
  };
}
