import type { Size } from "../ir.js";

/**
 * The medium a diagram is being made for.
 *
 * "Legible" is not a property of a drawing on its own — it is a property of a drawing at a
 * size. The review found a 120-node chain measured 37,491x370 with every geometry counter
 * at zero: legal, and unreadable on any page. Without a declared medium the compiler has
 * no way to say so, and an agent has no way to ask for something that will fit.
 *
 * T05 defines this; T12 compiles presentation intent into it and T19 fits candidates to it.
 */

export type MediumKind =
  /** A fixed physical page, such as A4 or Letter. */
  | "page"
  /** A fixed pixel canvas, such as a slide or a README image. */
  | "canvas"
  /** A viewport that can scroll, where total extent is less constrained. */
  | "screen";

export interface Medium {
  readonly kind: MediumKind;
  /**
   * Usable area after margins, in the medium's own units. For `page` these are points; for
   * the others, logical pixels.
   */
  readonly extent: Size;
  /** Dots per inch for a page, so a text size in points can be checked against it. */
  readonly dpi?: number;
  /**
   * The smallest text the reader is expected to be able to read at this size, in the same
   * units as `extent`. Fitting may shrink text, but never below this.
   */
  readonly minimumTextSize: number;
  /** Space taken by title, legend and attribution, which content cannot use. */
  readonly chrome: { readonly top: number; readonly right: number; readonly bottom: number; readonly left: number };
  /** Whether the drawing may be split across pages when it cannot fit on one. */
  readonly allowPagination: boolean;
}

/** A screen medium with no hard extent, used when a caller states no medium at all. */
export const UNCONSTRAINED_MEDIUM: Medium = {
  kind: "screen",
  extent: { width: 1600, height: 1000 },
  minimumTextSize: 9,
  chrome: { top: 0, right: 0, bottom: 0, left: 0 },
  allowPagination: false,
};

/** Area actually available to diagram content, after chrome. */
export function contentExtent(medium: Medium): Size {
  return {
    width: Math.max(0, medium.extent.width - medium.chrome.left - medium.chrome.right),
    height: Math.max(0, medium.extent.height - medium.chrome.top - medium.chrome.bottom),
  };
}

/**
 * The scale a drawing of this size would be reduced to in order to fit, and the text size
 * that results.
 *
 * Reported rather than applied: a fit that pushes text under the medium's minimum is not a
 * fit, and the caller is entitled to be told that rather than handed an unreadable page.
 */
export function fitToMedium(
  drawing: Size,
  medium: Medium,
  baseTextSize: number,
): { readonly scale: number; readonly textSize: number; readonly legible: boolean } {
  const available = contentExtent(medium);
  const scale = Math.min(1, available.width / Math.max(1, drawing.width), available.height / Math.max(1, drawing.height));
  const textSize = Math.round(baseTextSize * scale * 100) / 100;
  return { scale, textSize, legible: textSize >= medium.minimumTextSize };
}
