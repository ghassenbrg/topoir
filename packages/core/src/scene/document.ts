import type { Rect } from "../ir.js";
import type { ContentDisposition, ElementRef, ShapedTextRef } from "./refs.js";

/**
 * `SceneDocument` — the complete drawing, with semantic ownership.
 *
 * The current `Scene` in the renderer is a tree of anonymous primitives. Once it is built
 * there is no way back from a mark to the thing in the model that caused it, so quality
 * checks can only reason about layout rectangles and an author cannot be told which
 * relationship a defect belongs to.
 *
 * Every primitive here carries a stable scene id and an owner. That is what makes it
 * possible to state, and check, that every required fact has a visible representative and
 * every visible mark has a reason to exist.
 *
 * These types live in core, not in the renderer, because quality analysis and export both
 * need them and neither should depend on an SVG package. `@topoir/renderer-svg` re-exports
 * the legacy names so existing callers keep working.
 */

export type LayerId =
  | "background"
  | "boundaries"
  | "underlays"
  | "relationships"
  | "components"
  | "relationshipLabels"
  | "annotations"
  | "chrome"
  | "interaction";

/**
 * Paint order, back to front.
 *
 * Fixed rather than per-diagram: a relationship label that sometimes falls behind a
 * component and sometimes in front of it is not a style, it is a bug that only shows up in
 * some documents.
 */
export const LAYER_ORDER: readonly LayerId[] = [
  "background",
  "boundaries",
  "underlays",
  "relationships",
  "components",
  "relationshipLabels",
  "annotations",
  "chrome",
  "interaction",
];

export interface ScenePrimitiveBase {
  /** Stable within the document, so a diagnostic can point at one mark. */
  readonly id: string;
  /** What in the model this mark exists for. */
  readonly owner: ElementRef;
  readonly layer: LayerId;
  /** Final painted extent, including stroke width. Quality checks use this, not layout. */
  readonly inkBounds: Rect;
  readonly opacity?: number;
  /** Id of a clip primitive that limits this one. */
  readonly clipId?: string;
}

export interface SceneRectPrimitive extends ScenePrimitiveBase {
  readonly type: "rect";
  readonly bounds: Rect;
  readonly radius?: number;
  readonly fill?: string;
  readonly stroke?: string;
  readonly strokeWidth?: number;
  readonly dash?: string;
}

export interface SceneEllipsePrimitive extends ScenePrimitiveBase {
  readonly type: "ellipse";
  readonly bounds: Rect;
  readonly fill?: string;
  readonly stroke?: string;
  readonly strokeWidth?: number;
}

export interface ScenePathPrimitive extends ScenePrimitiveBase {
  readonly type: "path";
  readonly d: string;
  readonly fill?: string;
  readonly stroke?: string;
  readonly strokeWidth?: number;
  readonly dash?: string;
  readonly markerStart?: string;
  readonly markerEnd?: string;
}

export interface SceneTextPrimitive extends ScenePrimitiveBase {
  readonly type: "text";
  readonly text: ShapedTextRef;
  readonly fill: string;
  /**
   * What is painted behind this text. Contrast is measured against the actual backdrop
   * after alpha compositing, not against the canvas default.
   */
  readonly backdrop?: string;
  /**
   * True when the run is drawn as outlines rather than glyphs. The original text is still
   * in `text.source`, so accessibility and content accounting are unaffected.
   */
  readonly outlined?: boolean;
}

export interface SceneImagePrimitive extends ScenePrimitiveBase {
  readonly type: "image";
  readonly bounds: Rect;
  readonly href: string;
  /** The authored asset role, distinct from any other role sharing these bytes. */
  readonly role: string;
  readonly title: string;
}

export interface SceneSymbolPrimitive extends ScenePrimitiveBase {
  readonly type: "symbol";
  readonly symbolId: string;
  readonly bounds: Rect;
}

export interface SceneClipPrimitive extends ScenePrimitiveBase {
  readonly type: "clip";
  readonly bounds: Rect;
  readonly radius?: number;
}

export type ScenePrimitive =
  | SceneRectPrimitive
  | SceneEllipsePrimitive
  | ScenePathPrimitive
  | SceneTextPrimitive
  | SceneImagePrimitive
  | SceneSymbolPrimitive
  | SceneClipPrimitive;

export interface ScenePage {
  readonly id: string;
  readonly bounds: Rect;
  readonly primitives: readonly ScenePrimitive[];
  /** Continuation text when a diagram is split across pages. */
  readonly continuation?: { readonly of: number; readonly total: number; readonly label: string };
}

export interface SceneDocument {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly background: string;
  readonly pages: readonly ScenePage[];
  /**
   * Every model element to the primitives that represent it. The inverse of each
   * primitive's `owner`, kept so coverage can be checked in both directions: nothing
   * required is unrepresented, and nothing drawn is unexplained.
   */
  readonly semanticIndex: Readonly<Record<string, readonly string[]>>;
  /** Primitive ids in the order they should be announced. */
  readonly readingOrder: readonly string[];
  readonly content: readonly ContentDisposition[];
  readonly attribution?: string;
}

/** Primitives on one layer, in paint order. */
export function primitivesOnLayer(page: ScenePage, layer: LayerId): readonly ScenePrimitive[] {
  return page.primitives.filter((primitive) => primitive.layer === layer);
}

/** Primitives representing one model element, via the semantic index. */
export function primitivesFor(document: SceneDocument, elementId: string): readonly ScenePrimitive[] {
  const ids = new Set(document.semanticIndex[elementId] ?? []);
  return document.pages.flatMap((page) => page.primitives.filter((primitive) => ids.has(primitive.id)));
}

/**
 * Model elements with no primitive representing them.
 *
 * A required element appearing here means the drawing does not show something the document
 * says is there, which no geometry counter can reveal.
 */
export function unrepresented(document: SceneDocument, requiredIds: readonly string[]): readonly string[] {
  return requiredIds.filter((id) => (document.semanticIndex[id] ?? []).length === 0);
}
