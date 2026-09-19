import type { Point, Rect, Size } from "../ir.js";
import type { MeasuredBlock } from "./blocks.js";

/**
 * `ComponentPlan` — one measured, placeable component.
 *
 * It replaces the independent dimension arithmetic that measurement and rendering each
 * did. All coordinates inside a plan are local; placement applies one transform to the
 * whole thing, so a component cannot be measured in one space and drawn in another.
 *
 * The plan is deliberately not graph-specific. `docs/design/02-architecture.md` requires
 * that the same structure represent an architecture component, a process decision and an
 * interaction participant, so nothing here assumes a node in a topology.
 *
 * T05 defines these; T07 implements the engine and T08 migrates the renderer.
 */

/** What kind of thing in the model a plan stands for. */
export type OwnerKind =
  | "occurrence"
  | "relationship"
  | "region"
  | "annotation"
  | "chrome";

export interface ElementRef {
  readonly kind: OwnerKind;
  /** Stable identity in the semantic model. */
  readonly id: string;
  /** Where in the source this came from, preserved through every transform. */
  readonly source?: { readonly pointer: string; readonly line?: number; readonly column?: number };
}

/**
 * The visible outline a route may attach to.
 *
 * A rectangle is the common case but not the only one. A stacked sheet, a cylinder's
 * curved cap and a diamond's corners all have outlines that differ from their layout
 * rectangle, and attaching to the rectangle instead leaves connectors visibly detached.
 */
export type Silhouette =
  | { readonly kind: "rect"; readonly bounds: Rect; readonly radius?: number }
  | { readonly kind: "ellipse"; readonly bounds: Rect }
  | { readonly kind: "diamond"; readonly bounds: Rect }
  | { readonly kind: "cylinder"; readonly bounds: Rect; readonly capHeight: number }
  | { readonly kind: "stack"; readonly bounds: Rect; readonly offset: number; readonly sheets: number }
  | { readonly kind: "polygon"; readonly points: readonly Point[] }
  /** A vertical line descending from a header, as an interaction participant has. */
  | { readonly kind: "lifeline"; readonly x: number; readonly top: number; readonly bottom: number };

/**
 * Somewhere a relationship may legally meet a component.
 *
 * Routes reference an attachment id rather than a node id plus an arbitrary coordinate, so
 * "which part of this component does this connector belong to" is answerable after layout
 * instead of being inferred from proximity.
 */
export interface AttachmentSite {
  readonly id: string;
  readonly role: AttachmentRole;
  /** A point on the silhouette, or on an explicit internal compartment or lifeline. */
  readonly point: Point;
  /** Outward direction, used to stub a connector clear before it turns. */
  readonly normal: Point;
  /** The block this site belongs to, such as a route-table row or an ER field. */
  readonly region?: string;
  readonly allowedDirections: readonly ("north" | "east" | "south" | "west")[];
  /**
   * How many distinct connectors can meet here and still be told apart. A site may grow or
   * another may be selected when lanes do not fit; unrelated routes are never silently
   * stacked on one mark.
   */
  readonly capacity: number;
  readonly labelBounds?: Rect;
}

export type AttachmentRole =
  /** Anywhere along one side. */
  | "side"
  /** A fixed declared port. */
  | "port"
  /** One row of an internal table, such as a gateway route or an ER field. */
  | "row"
  /** Anywhere on the perimeter, for a region boundary. */
  | "perimeter"
  /** A position in time on a lifeline. */
  | "event";

/**
 * What became of one piece of authored content.
 *
 * `omitted` is legal only for content that is not required. Required content that cannot
 * be drawn is a failure, not a disposition.
 */
export type DispositionKind = "rendered" | "abbreviated" | "representedBy" | "omitted";

export interface ContentDisposition {
  /** The authored content this is about. */
  readonly contentId: string;
  readonly kind: DispositionKind;
  /** Scene primitives that carry it, so the claim can be checked against the drawing. */
  readonly sceneIds: readonly string[];
  /** Required for anything other than `rendered`. */
  readonly reason?: string;
  /** For `representedBy`: what stands in for it, such as a summary or a count badge. */
  readonly representative?: string;
  /** For `abbreviated`: how much of the source is not drawn. */
  readonly omittedGraphemes?: number;
}

export interface ComponentPlan {
  readonly id: string;
  /** The occurrence this is an appearance of. One entity may occur in several views. */
  readonly occurrenceId: string;
  readonly semanticRef: ElementRef;
  readonly template: { readonly id: string; readonly version: string };
  readonly size: { readonly min: Size; readonly preferred: Size; readonly max?: Size };
  /** Space reserved for collision purposes. */
  readonly layoutBounds: Rect;
  /** Actual painted extent, including strokes, shadows and overhang. */
  readonly inkBounds: Rect;
  readonly silhouette: Silhouette;
  readonly blocks: readonly MeasuredBlock[];
  readonly attachments: readonly AttachmentSite[];
  readonly content: readonly ContentDisposition[];
  readonly accessibility: {
    readonly label: string;
    readonly description?: string;
    /** Block ids in the order a screen reader should announce them. */
    readonly readingOrder: readonly string[];
  };
}

/** Every attachment of a given role, in declaration order. */
export function attachmentsOfRole(plan: ComponentPlan, role: AttachmentRole): readonly AttachmentSite[] {
  return plan.attachments.filter((site) => site.role === role);
}

/**
 * Content that did not reach the drawing intact.
 *
 * A caller can ask this instead of comparing pictures, which is the whole point of
 * declaring disposition at measurement time.
 */
export function incompleteContent(plan: ComponentPlan): readonly ContentDisposition[] {
  return plan.content.filter((entry) => entry.kind !== "rendered");
}
