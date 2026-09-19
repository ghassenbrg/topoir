import type { MeasuredNode, Rect } from "../ir.js";
import { nodeShape, type TopoIRTheme } from "../theme.js";
import type { MeasuredBlock } from "./blocks.js";
import type { AttachmentSite, ComponentPlan, ContentDisposition, Silhouette } from "./plan.js";
import { componentInk, rowAttachments, sideAttachments } from "./negotiate.js";

/**
 * Compiles a measured node into a `ComponentPlan` (T08).
 *
 * This is the join between the legacy measurement path and the V2 contract. It does not
 * re-measure: it reads the values `measureView` already computed and expresses them as a
 * plan, so the drawing and the geometry analysis work from one description of the
 * component instead of each deriving its own.
 *
 * That shared description is the point. The review found geometry reasoning about layout
 * rectangles while the defects lived in the paint, and route endpoints attaching to
 * bounding boxes that a diamond or a cylinder does not actually occupy. A plan carries the
 * true silhouette and the real attachment sites, so both consumers see the same component.
 *
 * Deliberately additive: nothing here changes what is drawn. T08 wires it alongside the
 * existing path and asserts the two agree; the block-level rewrite of the drawing itself
 * follows once that agreement is established.
 */

export interface PlanOptions {
  readonly theme: TopoIRTheme;
  /** Placement, when the plan is being compiled for a laid-out component. */
  readonly bounds?: Rect;
}

/** The visible outline of a node, from its shape and the theme's language. */
export function silhouetteFor(node: MeasuredNode, theme: TopoIRTheme, bounds: Rect): Silhouette {
  const shape = nodeShape(node, theme);
  switch (shape) {
    case "cylinder":
      // The caps bulge past the body, so attaching on a side midpoint of the bounding box
      // lands off the drawn outline.
      return { kind: "cylinder", bounds, capHeight: 12 };
    case "diamond":
      return { kind: "diamond", bounds };
    case "stack":
      return { kind: "stack", bounds, offset: 7, sheets: 2 };
    case "pill":
      return { kind: "rect", bounds, radius: bounds.height / 2 };
    default:
      return { kind: "rect", bounds, radius: theme.node.radius };
  }
}

/**
 * Attachment sites for a node.
 *
 * A node with visible route compartments attaches per row; everything else attaches along
 * its sides, spaced so several connectors stay distinguishable. `incident` is how many
 * relationships actually meet this node, so the spacing reflects the real demand rather
 * than a fixed guess.
 */
export function attachmentsFor(node: MeasuredNode, theme: TopoIRTheme, bounds: Rect, incident: number): readonly AttachmentSite[] {
  const silhouette = silhouetteFor(node, theme, bounds);
  const showPorts = node.visual?.portLabels === "inside" && node.ports.length > 0;
  const sites: AttachmentSite[] = [];

  if (showPorts) {
    for (const port of node.ports) {
      if (port.slot === undefined) continue;
      const side = port.side === "west" ? "west" : "east";
      sites.push({
        id: `${node.id}:${port.id}`,
        role: "port",
        point: {
          x: side === "east" ? bounds.x + bounds.width : bounds.x,
          y: round(bounds.y + port.slot.y + port.slot.height / 2),
        },
        normal: side === "east" ? { x: 1, y: 0 } : { x: -1, y: 0 },
        region: port.id,
        allowedDirections: [side],
        capacity: 1,
      });
    }
  }

  // Free sides carry whatever is left. Half the relationships can be expected on each of
  // the two facing sides, which is the same assumption measurement sizes the node with.
  const free = Math.max(1, Math.ceil((incident - sites.length) / 2));
  sites.push(...sideAttachments(silhouette, "east", free, node.id));
  sites.push(...sideAttachments(silhouette, "west", free, node.id));
  return sites;
}

/** Content accounting for a measured node, from what measurement already declared. */
export function dispositionsFor(node: MeasuredNode): readonly ContentDisposition[] {
  const entries: ContentDisposition[] = [];
  const record = (contentId: string, text: { disposition: string; omittedGraphemes?: number; source: string }): void => {
    entries.push(
      text.disposition === "abbreviated"
        ? {
            contentId,
            kind: "abbreviated",
            sceneIds: [contentId],
            reason: "did not fit the component's text width",
            ...(text.omittedGraphemes === undefined ? {} : { omittedGraphemes: text.omittedGraphemes }),
          }
        : { contentId, kind: "rendered", sceneIds: [contentId] },
    );
  };
  record(`${node.id}:label`, node.labelText);
  if (node.descriptionText) record(`${node.id}:description`, node.descriptionText);
  if (node.badgeText) record(`${node.id}:badge`, node.badgeText);
  for (const role of node.assetRoles ?? []) {
    entries.push(
      role.size === undefined
        ? { contentId: `${node.id}:asset:${role.reference}`, kind: "omitted", sceneIds: [], reason: `asset role ${JSON.stringify(role.reference)} did not resolve` }
        : { contentId: `${node.id}:asset:${role.reference}`, kind: "rendered", sceneIds: [`${node.id}:asset:${role.reference}`] },
    );
  }
  for (const port of node.ports) {
    if (port.labelText) record(`${node.id}:port:${port.id}`, port.labelText);
  }
  return entries;
}

/**
 * A `ComponentPlan` for a measured, placed node.
 *
 * `blocks` is intentionally empty for now: the legacy renderer still owns block placement,
 * and inventing block positions here that nothing draws from would be a second description
 * of the component — exactly the duplication the plan exists to remove. T08's later slice
 * moves placement into the plan and the renderer reads it.
 */
export function planForNode(node: MeasuredNode, options: PlanOptions, incident = 2): ComponentPlan {
  const bounds = options.bounds ?? { x: 0, y: 0, width: node.width, height: node.height };
  const silhouette = silhouetteFor(node, options.theme, bounds);
  const blocks: readonly MeasuredBlock[] = [];
  return {
    id: `plan:${node.id}`,
    occurrenceId: node.id,
    semanticRef: { kind: "occurrence", id: node.id },
    template: { id: `architecture.${nodeShape(node, options.theme)}`, version: "1" },
    size: {
      min: { width: options.theme.node.minWidth, height: options.theme.node.minHeight },
      preferred: { width: node.width, height: node.height },
    },
    layoutBounds: bounds,
    inkBounds: componentInk(silhouette, blocks),
    silhouette,
    blocks,
    attachments: attachmentsFor(node, options.theme, bounds, incident),
    content: dispositionsFor(node),
    accessibility: {
      label: node.label,
      ...(node.description === undefined ? {} : { description: node.description }),
      readingOrder: [`${node.id}:label`, ...(node.descriptionText ? [`${node.id}:description`] : []), ...(node.badgeText ? [`${node.id}:badge`] : [])],
    },
  };
}

/** Attachment sites derived from a node's visible route table, when it has one. */
export function tableAttachments(node: MeasuredNode, table: MeasuredBlock, side: "east" | "west"): readonly AttachmentSite[] {
  return rowAttachments(table, side, node.id);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
