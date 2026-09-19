import type { Point, Rect, Size } from "../ir.js";
import { walkBlocks, type MeasuredBlock } from "./blocks.js";
import { measureBlock, type BlockSpec, type MeasureContext } from "./measure-blocks.js";
import type { AttachmentSite, ContentDisposition, Silhouette } from "./plan.js";

/**
 * Width negotiation, silhouettes, attachment derivation and content accounting (T07).
 */

export interface NegotiationOptions {
  /** The width a component would like. */
  readonly preferred: number;
  /**
   * Widths to try, in order, when the preferred width loses required content. Bounded on
   * purpose: the contract is "cap alternatives and return the best legal result with
   * diagnostics", not "keep expanding until the diagram happens to fit".
   */
  readonly alternatives?: readonly number[];
  /** Never exceed this, whatever the content wants. */
  readonly max?: number;
}

export interface Negotiated {
  readonly block: MeasuredBlock;
  readonly width: number;
  /** How many candidate widths were measured, including the one that won. */
  readonly attempts: number;
  /** True when even the widest allowed alternative still abbreviated something. */
  readonly exhausted: boolean;
}

/**
 * Measures a block at the narrowest allowed width that keeps all of its content.
 *
 * The alternatives are capped, and when none of them is clean the widest is returned with
 * `exhausted` set rather than the search continuing. A component that silently grew until
 * its text fit would distort every layout around it, and one that silently kept the
 * narrow result would lose content — so the caller is told which happened.
 */
export function negotiateWidth(spec: BlockSpec, context: MeasureContext, options: NegotiationOptions): Negotiated {
  const cap = options.max ?? Number.POSITIVE_INFINITY;
  const widths = [options.preferred, ...(options.alternatives ?? [])]
    .map((width) => Math.min(width, cap))
    .filter((width, index, all) => width > 0 && all.indexOf(width) === index);
  const tried: Negotiated[] = [];
  for (const width of widths) {
    const block = measureBlock(spec, { ...context, availableWidth: width });
    const candidate: Negotiated = { block, width, attempts: tried.length + 1, exhausted: false };
    if (!hasAbbreviatedText(block)) return candidate;
    tried.push(candidate);
  }
  const widest = tried[tried.length - 1];
  if (widest === undefined) {
    const block = measureBlock(spec, context);
    return { block, width: context.availableWidth, attempts: 1, exhausted: hasAbbreviatedText(block) };
  }
  return { ...widest, attempts: tried.length, exhausted: true };
}

/**
 * Whether any text in the tree lost content to the width it was measured at.
 *
 * Compared as grapheme counts with whitespace removed, because wrapping legitimately
 * changes where the spaces are: a run split across two lines has the same characters as
 * one that was not. Only characters that no line carries count as lost.
 */
export function hasAbbreviatedText(block: MeasuredBlock): boolean {
  return walkBlocks(block).some((entry) => {
    if (entry.type !== "text" && entry.type !== "badge") return false;
    const drawn = entry.text.lines.map((line) => line.text.replace(/…$/u, "")).join("");
    return graphemes(drawn) < graphemes(entry.text.source);
  });
}

/**
 * What became of every piece of authored content in a block tree.
 *
 * Derived from the measurement rather than from the drawing, which is the rule the
 * components contract states: abbreviation is declared by measurement, never inferred
 * later from a missing primitive.
 */
export function contentDispositions(blocks: readonly MeasuredBlock[]): readonly ContentDisposition[] {
  const dispositions: ContentDisposition[] = [];
  for (const root of blocks) {
    for (const block of walkBlocks(root)) {
      if (block.contentId === undefined) continue;
      if (block.type === "text" || block.type === "badge") {
        const drawn = block.text.lines.map((line) => line.text.replace(/…$/u, "")).join("");
        const missing = graphemes(block.text.source) - graphemes(drawn);
        dispositions.push(
          missing > 0
            ? {
                contentId: block.contentId,
                kind: "abbreviated",
                sceneIds: [block.id],
                reason: `did not fit the ${Math.round(block.bounds.width)}px the component could give it`,
                omittedGraphemes: missing,
              }
            : { contentId: block.contentId, kind: "rendered", sceneIds: [block.id] },
        );
        continue;
      }
      if (block.type === "asset") {
        dispositions.push(
          block.href === undefined
            ? { contentId: block.contentId, kind: "omitted", sceneIds: [], reason: `asset role ${JSON.stringify(block.role)} did not resolve` }
            : { contentId: block.contentId, kind: "rendered", sceneIds: [block.id] },
        );
      }
    }
  }
  return dispositions;
}

function graphemes(value: string): number {
  return [...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(value.replace(/\s+/gu, ""))].length;
}

/* --------------------------------------------------------------- geometry */

/**
 * Points on a silhouette's true outline.
 *
 * A stacked sheet, a cylinder cap and a diamond all have outlines that differ from their
 * layout rectangle. Attaching to the rectangle instead is what leaves a connector visibly
 * detached — the class of defect T03 now catches, here prevented at the source.
 */
export function silhouettePoint(silhouette: Silhouette, side: "north" | "east" | "south" | "west", fraction: number): Point {
  const clamp = Math.min(1, Math.max(0, fraction));
  switch (silhouette.kind) {
    case "rect":
    case "stack": {
      return rectPoint(silhouette.bounds, side, clamp);
    }
    case "ellipse": {
      const { x, y, width, height } = silhouette.bounds;
      const centre = { x: x + width / 2, y: y + height / 2 };
      const angle = baseAngle(side) + (clamp - 0.5) * (Math.PI / 2);
      return { x: round(centre.x + (width / 2) * Math.cos(angle)), y: round(centre.y + (height / 2) * Math.sin(angle)) };
    }
    case "diamond": {
      const { x, y, width, height } = silhouette.bounds;
      // Corners are the only points on a diamond's outline that a side midpoint reaches.
      if (side === "north") return { x: round(x + width / 2), y };
      if (side === "south") return { x: round(x + width / 2), y: round(y + height) };
      if (side === "west") return { x, y: round(y + height / 2) };
      return { x: round(x + width), y: round(y + height / 2) };
    }
    case "cylinder": {
      const { bounds, capHeight } = silhouette;
      // The body is straight; the caps bulge. Attaching on a cap needs the curve, so the
      // usable straight span excludes it.
      if (side === "west" || side === "east") {
        const top = bounds.y + capHeight;
        const usable = Math.max(0, bounds.height - capHeight * 2);
        return { x: side === "west" ? bounds.x : round(bounds.x + bounds.width), y: round(top + usable * clamp) };
      }
      return rectPoint(bounds, side, clamp);
    }
    case "polygon": {
      const points = silhouette.points;
      if (points.length === 0) return { x: 0, y: 0 };
      const index = Math.min(points.length - 1, Math.floor(clamp * points.length));
      return points[index] ?? points[0]!;
    }
    case "lifeline": {
      // A lifeline has no sides. Every attachment is a position in time along it.
      return { x: silhouette.x, y: round(silhouette.top + (silhouette.bottom - silhouette.top) * clamp) };
    }
  }
}

function rectPoint(bounds: Rect, side: "north" | "east" | "south" | "west", fraction: number): Point {
  const { x, y, width, height } = bounds;
  if (side === "north") return { x: round(x + width * fraction), y };
  if (side === "south") return { x: round(x + width * fraction), y: round(y + height) };
  if (side === "west") return { x, y: round(y + height * fraction) };
  return { x: round(x + width), y: round(y + height * fraction) };
}

function baseAngle(side: "north" | "east" | "south" | "west"): number {
  return side === "east" ? 0 : side === "south" ? Math.PI / 2 : side === "west" ? Math.PI : -Math.PI / 2;
}

/** The painted extent of a silhouette, which is not always its layout rectangle. */
export function silhouetteInk(silhouette: Silhouette): Rect {
  switch (silhouette.kind) {
    case "rect":
    case "ellipse":
    case "diamond":
      return silhouette.bounds;
    case "cylinder": {
      // The caps bulge above and below the body.
      const { bounds, capHeight } = silhouette;
      return { x: bounds.x, y: round(bounds.y - capHeight / 2), width: bounds.width, height: round(bounds.height + capHeight) };
    }
    case "stack": {
      const spread = round(silhouette.offset * Math.max(0, silhouette.sheets - 1));
      return { ...silhouette.bounds, width: round(silhouette.bounds.width + spread), height: round(silhouette.bounds.height + spread) };
    }
    case "polygon": {
      const xs = silhouette.points.map((point) => point.x);
      const ys = silhouette.points.map((point) => point.y);
      if (xs.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
      return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
    }
    case "lifeline":
      return { x: silhouette.x, y: silhouette.top, width: 0, height: round(silhouette.bottom - silhouette.top) };
  }
}

/**
 * Evenly spaced attachment sites along one side of a silhouette.
 *
 * Spacing is what keeps several connectors on one side distinguishable; without it they
 * land a pixel or two apart and are drawn as one thick line.
 */
export function sideAttachments(
  silhouette: Silhouette,
  side: "north" | "east" | "south" | "west",
  count: number,
  idPrefix: string,
): readonly AttachmentSite[] {
  const sites: AttachmentSite[] = [];
  for (let index = 0; index < count; index += 1) {
    const fraction = (index + 1) / (count + 1);
    sites.push({
      id: `${idPrefix}-${side}-${index}`,
      role: "side",
      point: silhouettePoint(silhouette, side, fraction),
      normal: normalFor(side),
      allowedDirections: [side],
      capacity: 1,
    });
  }
  return sites;
}

/** Attachment sites for the rows of a table block, so a connector meets its own row. */
export function rowAttachments(table: MeasuredBlock, side: "east" | "west", idPrefix: string): readonly AttachmentSite[] {
  if (table.type !== "table") return [];
  return table.rows.map((row) => ({
    id: `${idPrefix}-${row.id}`,
    role: "row" as const,
    point: {
      x: side === "east" ? round(table.bounds.x + table.bounds.width) : table.bounds.x,
      y: round(row.bounds.y + row.bounds.height / 2),
    },
    normal: normalFor(side),
    region: row.id,
    allowedDirections: [side],
    capacity: 1,
  }));
}

function normalFor(side: "north" | "east" | "south" | "west"): Point {
  return side === "north" ? { x: 0, y: -1 } : side === "south" ? { x: 0, y: 1 } : side === "west" ? { x: -1, y: 0 } : { x: 1, y: 0 };
}

/** Union of a component's own silhouette ink and everything its blocks paint. */
export function componentInk(silhouette: Silhouette, blocks: readonly MeasuredBlock[]): Rect {
  const rects = [silhouetteInk(silhouette), ...blocks.map((block) => block.inkBounds)].filter(
    (rect) => rect.width > 0 || rect.height > 0,
  );
  if (rects.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  const left = Math.min(...rects.map((rect) => rect.x));
  const top = Math.min(...rects.map((rect) => rect.y));
  const right = Math.max(...rects.map((rect) => rect.x + rect.width));
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.height));
  return { x: round(left), y: round(top), width: round(right - left), height: round(bottom - top) };
}

/** Total size a set of measured blocks occupies. */
export function blocksExtent(blocks: readonly MeasuredBlock[]): Size {
  if (blocks.length === 0) return { width: 0, height: 0 };
  return {
    width: round(Math.max(...blocks.map((block) => block.bounds.x + block.bounds.width))),
    height: round(Math.max(...blocks.map((block) => block.bounds.y + block.bounds.height))),
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
