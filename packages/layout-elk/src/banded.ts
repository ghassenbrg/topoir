import type {
  GeometryGroup,
  GeometryNode,
  GeometryPort,
  GeometryView,
  MeasuredGroup,
  MeasuredNode,
  MeasuredView,
} from "@topoir/core";

/**
 * Compiler-owned banded composition.
 *
 * Every container — the canvas and each boundary — is laid out as its own small problem,
 * bottom-up, so a boundary is placed as one measured block whose padding and heading are
 * part of that block rather than something the enclosing layout has to discover
 * afterwards. Because a boundary is a single item to its parent, its members are
 * inherently contiguous and a boundary always reads as one block.
 *
 * A container arranges its items according to its own declared `layout.mode`:
 *
 * - `column` / `row`: one fixed lane, so the author's sequence is the drawn sequence.
 * - `grid`: fixed columns.
 * - otherwise: layers assigned along the view direction from the edges that connect the
 *   items, then bands across it.
 *
 * Within a layer an explicit sibling `order` is a hard constraint; unranked siblings are
 * ordered by the barycenter of the items they connect to, which is what keeps connectors
 * short, and then by ID so the result is deterministic. Layer assignment is a relaxation
 * with a fixed iteration cap, so a cycle cannot loop forever — the remaining backward
 * edge is left for the router.
 */

interface Item {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly order?: number | undefined;
  /** Every node drawn inside this item, used to project edges onto this container. */
  readonly members: readonly string[];
  readonly node?: MeasuredNode;
  readonly block?: Block;
}

interface Placement {
  readonly item: Item;
  readonly dx: number;
  readonly dy: number;
}

interface Block {
  readonly width: number;
  readonly height: number;
  readonly placements: readonly Placement[];
}

/** Beyond this, a single lane stops reading as one region. */
const MAX_LANE_EXTENT = 1400;

export interface BandedSpacing {
  readonly node: number;
  readonly layer: number;
}


/**
 * @param excludeFromOrdering relationship ids that must not influence layer assignment.
 * A feedback relationship — a callback, an ack, a retry — is still drawn and routed, but
 * treating it as forward progress pushes its target a band further along and the primary
 * flow stops reading in the order it happens in. See `analyzeSpine` in `@topoir/layout`.
 */
export function banded(view: MeasuredView, spacing: BandedSpacing, excludeFromOrdering: ReadonlySet<string> = new Set()): GeometryView {
  const horizontal = view.layout.direction === "right" || view.layout.direction === "left";
  const groupsByParent = new Map<string | undefined, MeasuredGroup[]>();
  for (const group of view.groups) {
    groupsByParent.set(group.parent, [...(groupsByParent.get(group.parent) ?? []), group]);
  }
  const nodesByGroup = new Map<string | undefined, MeasuredNode[]>();
  for (const node of view.nodes) {
    nodesByGroup.set(node.group, [...(nodesByGroup.get(node.group) ?? []), node]);
  }

  const descendantNodes = (groupId: string): string[] => [
    ...(nodesByGroup.get(groupId) ?? []).map((node) => node.id),
    ...(groupsByParent.get(groupId) ?? []).flatMap((child) => descendantNodes(child.id)),
  ];

  const build = (group: MeasuredGroup | undefined): Block => {
    const groupId = group?.id;
    const items: Item[] = [
      ...(groupsByParent.get(groupId) ?? []).map((child) => {
        const block = build(child);
        return { id: child.id, width: block.width, height: block.height, order: child.order, members: descendantNodes(child.id), block };
      }),
      ...(nodesByGroup.get(groupId) ?? []).map((node) => ({ id: node.id, width: node.width, height: node.height, order: node.order, members: [node.id], node })),
    ];
    const mode = group?.layout.mode ?? "layered";
    const placements = arrange(items, view, spacing, horizontal, mode, group, excludeFromOrdering);
    const contentWidth = Math.max(0, ...placements.map((placement) => placement.dx + placement.item.width));
    const contentHeight = Math.max(0, ...placements.map((placement) => placement.dy + placement.item.height));
    if (group === undefined) return { width: contentWidth, height: contentHeight, placements };
    return {
      width: Math.max(group.labelText.width + group.padding.left + group.padding.right, contentWidth + group.padding.left + group.padding.right),
      height: contentHeight + group.padding.top + group.padding.bottom,
      placements: placements.map((placement) => ({ ...placement, dx: placement.dx + group.padding.left, dy: placement.dy + group.padding.top })),
    };
  };

  const root = build(undefined);
  const nodes: GeometryNode[] = [];
  const groups: GeometryGroup[] = [];
  const walk = (block: Block, x: number, y: number, parent: string | undefined): void => {
    for (const { item, dx, dy } of block.placements) {
      const px = x + dx;
      const py = y + dy;
      if (item.node) {
        nodes.push({ id: item.id, x: round(px), y: round(py), width: item.width, height: item.height, ports: portsFor(item.node, px, py) });
      } else if (item.block) {
        groups.push({ id: item.id, x: round(px), y: round(py), width: item.width, height: item.height, ...(parent ? { parent } : {}) });
        walk(item.block, px, py, item.id);
      }
    }
  };
  walk(root, 24, 24, undefined);

  // Routing happens after placement, so the banded family returns notes unplaced and the
  // composition engine positions them once routes exist.
  const annotations: GeometryView["annotations"] = [];
  const extents = [...nodes, ...groups];

  return {
    id: view.id,
    nodes,
    groups,
    edges: [],
    annotations,
    bounds: {
      x: 0,
      y: 0,
      width: round(Math.max(0, ...extents.map((rect) => rect.x + rect.width)) + 24),
      height: round(Math.max(0, ...extents.map((rect) => rect.y + rect.height)) + 24),
    },
  };
}

function arrange(
  items: readonly Item[],
  view: MeasuredView,
  spacing: BandedSpacing,
  horizontal: boolean,
  mode: MeasuredGroup["layout"]["mode"] | "layered",
  group: MeasuredGroup | undefined,
  excludeFromOrdering: ReadonlySet<string> = new Set(),
): Placement[] {
  if (items.length === 0) return [];
  const gap = group?.layout.gap ?? spacing.node;

  if (mode === "column" || mode === "row") {
    // One lane in the declared sequence — but a lane is wrapped once it grows absurdly
    // long. Forty components stacked in a single column produce a boundary thousands of
    // pixels tall that every unrelated connector then has to cut through, and no reader
    // can follow a region that tall.
    const ordered = [...items].sort(compareItems);
    const stackVertically = mode === "column";
    const runOf = (item: Item) => (stackVertically ? item.height : item.width) + gap;
    const lanes = Math.max(1, Math.ceil(ordered.reduce((sum, item) => sum + runOf(item), 0) / MAX_LANE_EXTENT));
    const perLane = Math.ceil(ordered.length / lanes);
    const laneWidth = Math.max(...ordered.map((item) => (stackVertically ? item.width : item.height)));
    return ordered.map((item, index) => {
      const lane = Math.floor(index / perLane);
      const within = ordered.slice(lane * perLane, index).reduce((sum, earlier) => sum + runOf(earlier), 0);
      const across = lane * (laneWidth + gap);
      return stackVertically
        ? { item, dx: across + (laneWidth - item.width) / 2, dy: within }
        : { item, dx: within, dy: across + (laneWidth - item.height) / 2 };
    });
  }

  if (mode === "grid" || mode === "pack") {
    const columns = Math.max(1, group?.layout.columns ?? Math.ceil(Math.sqrt(items.length)));
    const ordered = [...items].sort(compareItems);
    const columnWidths = Array.from({ length: columns }, (_, column) =>
      Math.max(0, ...ordered.filter((_, index) => index % columns === column).map((item) => item.width)),
    );
    const rows = Math.ceil(ordered.length / columns);
    const rowHeights = Array.from({ length: rows }, (_, row) =>
      Math.max(0, ...ordered.slice(row * columns, (row + 1) * columns).map((item) => item.height)),
    );
    return ordered.map((item, index) => ({
      item,
      dx: columnWidths.slice(0, index % columns).reduce((sum, value) => sum + value + gap, 0),
      dy: rowHeights.slice(0, Math.floor(index / columns)).reduce((sum, value) => sum + value + gap, 0),
    }));
  }

  const ownerOf = new Map<string, string>();
  for (const item of items) for (const member of item.members) ownerOf.set(member, item.id);
  const links: { readonly from: string; readonly to: string }[] = [];
  for (const edge of view.edges) {
    if (excludeFromOrdering.has(edge.id)) continue;
    const from = ownerOf.get(edge.from);
    const to = ownerOf.get(edge.to);
    if (from !== undefined && to !== undefined && from !== to) links.push({ from, to });
  }

  const layer = new Map<string, number>(items.map((item) => [item.id, 0]));
  const cap = items.length + 8;
  for (let iteration = 0; iteration < cap; iteration += 1) {
    let changed = false;
    for (const link of links) {
      const next = layer.get(link.from)! + 1;
      if (layer.get(link.to)! < next) {
        layer.set(link.to, next);
        changed = true;
      }
    }
    if (!changed) break;
  }

  const byLayer = new Map<number, Item[]>();
  for (const item of items) {
    const index = layer.get(item.id)!;
    byLayer.set(index, [...(byLayer.get(index) ?? []), item]);
  }
  const layerIndices = [...byLayer.keys()].sort((left, right) => left - right);
  for (const index of layerIndices) byLayer.get(index)!.sort(compareItems);
  barycenterSweeps(byLayer, layerIndices, links, 4);

  const layerGap = group?.layout.gap ?? spacing.layer;
  const laneExtent = (laneItems: readonly Item[]): number =>
    laneItems.reduce((sum, item) => sum + (horizontal ? item.height : item.width), 0) + (laneItems.length - 1) * gap;
  const acrossTotal = Math.max(...layerIndices.map((index) => laneExtent(byLayer.get(index)!)));

  const placements: Placement[] = [];
  let along = 0;
  for (const index of layerIndices) {
    const laneItems = byLayer.get(index)!;
    const alongExtent = Math.max(...laneItems.map((item) => (horizontal ? item.width : item.height)));
    // Centre each layer across the container so the bands read as one composition.
    let across = (acrossTotal - laneExtent(laneItems)) / 2;
    for (const item of laneItems) {
      placements.push(
        horizontal
          ? { item, dx: along + (alongExtent - item.width) / 2, dy: across }
          : { item, dx: across, dy: along + (alongExtent - item.height) / 2 },
      );
      across += (horizontal ? item.height : item.width) + gap;
    }
    along += alongExtent + layerGap;
  }
  return placements;
}

function compareItems(left: Item, right: Item): number {
  const leftRank = left.order ?? Number.POSITIVE_INFINITY;
  const rightRank = right.order ?? Number.POSITIVE_INFINITY;
  if (leftRank !== rightRank) return leftRank - rightRank;
  return left.id.localeCompare(right.id, "en");
}

/**
 * Move unranked items towards the average band of the items they connect to. Ranked items
 * never move, so an author's declared sequence survives every sweep.
 */
function barycenterSweeps(
  byLayer: Map<number, Item[]>,
  layerIndices: readonly number[],
  links: readonly { readonly from: string; readonly to: string }[],
  passes: number,
): void {
  const neighbours = new Map<string, string[]>();
  for (const link of links) {
    neighbours.set(link.to, [...(neighbours.get(link.to) ?? []), link.from]);
    neighbours.set(link.from, [...(neighbours.get(link.from) ?? []), link.to]);
  }
  const bandOf = new Map<string, number>();
  const refresh = (): void => {
    for (const index of layerIndices) {
      for (const [position, item] of byLayer.get(index)!.entries()) bandOf.set(item.id, position);
    }
  };
  refresh();

  for (let pass = 0; pass < passes; pass += 1) {
    for (const index of pass % 2 === 0 ? layerIndices : [...layerIndices].reverse()) {
      const laneItems = byLayer.get(index)!;
      if (laneItems.length < 2) continue;
      const keyed = laneItems.map((item, position) => {
        const bands = (neighbours.get(item.id) ?? []).map((id) => bandOf.get(id)).filter((band): band is number => band !== undefined);
        return { item, barycenter: bands.length ? bands.reduce((sum, band) => sum + band, 0) / bands.length : position };
      });
      keyed.sort((left, right) => {
        const leftRank = left.item.order ?? Number.POSITIVE_INFINITY;
        const rightRank = right.item.order ?? Number.POSITIVE_INFINITY;
        if (leftRank !== rightRank) return leftRank - rightRank;
        if (leftRank !== Number.POSITIVE_INFINITY) return 0;
        if (left.barycenter !== right.barycenter) return left.barycenter - right.barycenter;
        return left.item.id.localeCompare(right.item.id, "en");
      });
      byLayer.set(index, keyed.map((entry) => entry.item));
      refresh();
    }
  }
}

/** Ports come straight from the measured component, so a compartment and its connector cannot disagree. */
function portsFor(node: MeasuredNode, x: number, y: number): GeometryPort[] {
  return node.ports.map((port) => {
    const side = port.side === "auto" ? "east" : port.side;
    const slot = port.slot;
    const acrossCentre = slot === undefined ? y + node.height / 2 : y + slot.y + slot.height / 2;
    const alongCentre = slot === undefined ? x + node.width / 2 : x + slot.x + slot.width / 2;
    const point =
      side === "west" ? { x, y: acrossCentre }
      : side === "north" ? { x: alongCentre, y }
      : side === "south" ? { x: alongCentre, y: y + node.height }
      : { x: x + node.width, y: acrossCentre };
    return { id: port.id, owner: node.id, side, x: round(point.x), y: round(point.y) };
  });
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
