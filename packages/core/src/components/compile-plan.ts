import type { MeasuredNode, Rect } from "../ir.js";
import { nodeShape, type TopoIRTheme } from "../theme.js";
import type { MeasuredBlock } from "./blocks.js";
import type { AttachmentSite, ComponentPlan, ContentDisposition, Silhouette } from "./plan.js";
import { componentInk, rowAttachments, sideAttachments } from "./negotiate.js";
import { assetOrigin, contentLayout } from "./content-layout.js";
import type { MeasuredText } from "../ir.js";

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
 * The content blocks of a component, at the positions it is actually drawn with.
 *
 * Built from `contentLayout`, the same function the renderer places marks from, so the
 * plan is not a second opinion about where anything is. Coordinates are local to the
 * component; `planForNode` offsets them to its placed bounds.
 */
export function contentBlocksFor(node: MeasuredNode, theme: TopoIRTheme, assetCount: number): readonly MeasuredBlock[] {
  const layout = contentLayout(node, theme, assetCount);
  const blocks: MeasuredBlock[] = [];
  const shaped = (id: string, text: MeasuredText, x: number, baseline: number, fontSize: number, weight: number): MeasuredBlock => {
    const bounds = { x, y: round(baseline - fontSize), width: text.width, height: text.height };
    return {
      type: "text",
      id,
      contentId: id,
      sizing: { min: { width: text.width, height: text.height }, preferred: { width: text.width, height: text.height } },
      bounds,
      inkBounds: bounds,
      text: {
        source: text.source,
        lines: text.lines.map((line, index) => ({
          text: line,
          x,
          baseline: round(baseline + index * text.lineHeight),
          advance: text.width,
          inkBounds: { x, y: round(baseline - fontSize + index * text.lineHeight), width: text.width, height: text.lineHeight },
          continuesPrevious: false,
        })),
        fontFamily: theme.font.family,
        fontSize,
        fontWeight: weight,
        lineHeight: text.lineHeight,
        ascent: round(fontSize * 0.8),
        descent: round(fontSize * 0.2),
        direction: "ltr",
      },
    };
  };

  for (const [index, role] of (node.assetRoles ?? []).slice(0, assetCount).entries()) {
    const origin = assetOrigin(layout, index);
    const size = { width: layout.assetIconWidth, height: layout.iconBox.height };
    blocks.push({
      type: "asset",
      id: `${node.id}:asset:${role.reference}`,
      contentId: `${node.id}:asset:${role.reference}`,
      sizing: { min: size, preferred: size },
      bounds: { ...origin, ...size },
      inkBounds: { ...origin, ...size },
      role: role.reference,
      intrinsic: role.size ?? size,
      fit: "contain",
      ...(role.size === undefined ? {} : { href: "resolved" }),
    });
  }

  blocks.push(shaped(`${node.id}:label`, node.labelText, layout.textX, layout.labelBaseline, theme.font.labelSize, 600));
  if (node.descriptionText !== undefined && layout.descriptionBaseline !== undefined) {
    blocks.push(shaped(`${node.id}:description`, node.descriptionText, layout.textX, layout.descriptionBaseline, theme.font.descriptionSize, 400));
  }
  if (node.badgeText !== undefined && layout.badgeBaseline !== undefined) {
    blocks.push(shaped(`${node.id}:badge`, node.badgeText, layout.badgeStrip?.x ?? 0, layout.badgeBaseline, 10, 600));
  }
  for (const port of node.ports) {
    if (port.slot === undefined || port.labelText === undefined) continue;
    blocks.push(shaped(`${node.id}:port:${port.id}`, port.labelText, port.slot.x, round(port.slot.y + port.slot.height / 2), theme.font.descriptionSize, 600));
  }
  return blocks;
}

/**
 * A `ComponentPlan` for a measured, placed node.
 *
 * `blocks` carries the component's content at the positions the renderer draws it, built
 * from the same `contentLayout` the renderer places from — one description of the
 * component, not two.
 */
export function planForNode(node: MeasuredNode, options: PlanOptions, incident = 2, assetCount?: number): ComponentPlan {
  const bounds = options.bounds ?? { x: 0, y: 0, width: node.width, height: node.height };
  const silhouette = silhouetteFor(node, options.theme, bounds);
  const local = contentBlocksFor(node, options.theme, assetCount ?? node.assetRoles?.length ?? 0);
  const blocks: readonly MeasuredBlock[] = local.map((block) => offsetBlock(block, bounds.x, bounds.y));
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

/** Moves a block and everything inside it into the component's placed position. */
function offsetBlock(block: MeasuredBlock, dx: number, dy: number): MeasuredBlock {
  const move = (rect: { x: number; y: number; width: number; height: number }) => ({ ...rect, x: round(rect.x + dx), y: round(rect.y + dy) });
  const base = { ...block, bounds: move(block.bounds), inkBounds: move(block.inkBounds) };
  if (base.type === "text") {
    return { ...base, text: { ...base.text, lines: base.text.lines.map((line) => ({ ...line, x: round(line.x + dx), baseline: round(line.baseline + dy), inkBounds: move(line.inkBounds) })) } };
  }
  return base as MeasuredBlock;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
