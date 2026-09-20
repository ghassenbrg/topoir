import type {
  GeometryAnnotation,
  GeometryEdge,
  GeometryGroup,
  GeometryNode,
  GeometryPort,
  LayoutEngine,
  LayoutResult,
  MeasuredGroup,
  MeasuredNode,
  MeasuredView,
  Point,
} from "@topoir/core";
import ElkModule, {
  type ELK as ElkApi,
  type ElkExtendedEdge,
  type ElkLabel,
  type ElkNode,
  type ElkPort,
} from "elkjs/lib/elk.bundled.js";

const ElkConstructor = ElkModule as unknown as new () => ElkApi;
export { CompositionEngine, compositionScore, refineLabels, regionArrangements, routeEdges } from "./composition.js";
export type { PlacedRegion, RegionArrangement, Sized } from "./composition.js";
export { alignToAnchors, compareForReading, orderForReading, packForReading, rankForReading, spineEntry, spinePositions, NO_HINTS, type Cell, type Orderable, type OrderingHints } from "./ordering.js";
export { banded, type BandedSpacing } from "./banded.js";

const ROOT_ID = "__topoir_root__";
const ANNOTATION_PREFIX = "__topoir_annotation__";
const PORT_PREFIX = "__topoir_port__";
const ANCHOR_EDGE_PREFIX = "__topoir_anchor__";

export interface ElkLayoutOptions {
  readonly seed?: number;
  /**
   * Cut a long layered graph into stacked chunks so it approaches the view's aspect
   * target. `elk.aspectRatio` on its own does nothing to a layered graph — measured on a
   * 120-node chain it left the result at 348:1 — so reaching the target needs the
   * wrapping pass, which brought the same graph to exactly 1.6 and ran faster. Wrapping
   * re-reads a chain as stacked rows, which is not always wanted, so it is a candidate
   * the composition scores rather than a default.
   */
  readonly wrap?: boolean;
}

export class ElkLayoutEngine implements LayoutEngine {
  public readonly id = "elk-layered-v1";
  private readonly elk: ElkApi;
  private readonly seed: number;
  private readonly wrap: boolean;

  public constructor(options: ElkLayoutOptions = {}) {
    this.elk = new ElkConstructor();
    this.seed = options.seed ?? 1;
    this.wrap = options.wrap ?? false;
  }

  public async layout(view: MeasuredView): Promise<LayoutResult> {
    try {
      const input = toElkGraph(view, this.seed, this.wrap);
      const output = await this.elk.layout(input);
      const geometry = fromElkGraph(view, output);
      return {
        geometry,
        diagnostics: [],
        metrics: {
          width: geometry.bounds.width,
          height: geometry.bounds.height,
          nodeCount: geometry.nodes.length,
          groupCount: geometry.groups.length,
          edgeCount: geometry.edges.length,
        },
      };
    } catch (error) {
      return {
        diagnostics: [
          {
            code: "TOP400_LAYOUT_FAILED",
            severity: "error",
            message: error instanceof Error ? error.message : "ELK layout failed.",
            details: { engine: this.id },
          },
        ],
      };
    }
  }
}

export function toElkGraph(view: MeasuredView, seed = 1, wrap = false): ElkNode {
  const groupByParent = groupChildren(view.groups);
  const nodesByGroup = nodeChildren(view.nodes);
  const annotations = view.annotations.map<ElkNode>((annotation) => ({
    id: `${ANNOTATION_PREFIX}${annotation.id}`,
    width: annotation.width,
    height: annotation.height,
    layoutOptions: { "elk.nodeSize.constraints": "FIXED_SIZE" },
  }));
  const edges: ElkExtendedEdge[] = view.edges.map((edge) => {
    const storyIndex = view.design?.story?.indexOf(edge.id) ?? -1;
    // ELK's layered wrapping pass throws `java.util.NoSuchElementException` on any edge
    // that carries a label, under every cutting strategy. Label boxes are only a spacing
    // hint here — `refineLabels` places every edge label against the finished polyline
    // regardless — so the wrapped candidate goes in without them and pays for it in the
    // score if that costs a collision.
    const label: ElkLabel[] =
      edge.labelText === undefined || wrap
        ? []
        : [
            {
              id: `label:${edge.id}`,
              text: edge.labelText.lines.join(" "),
              width: edge.labelText.width + 14,
              height: edge.labelText.height + 8,
            },
          ];
    return {
      id: edge.id,
      sources: [portReference(edge.from, edge.sourcePort)],
      targets: [portReference(edge.to, edge.targetPort)],
      labels: label,
      layoutOptions: {
        "elk.layered.priority.direction": String(storyIndex >= 0 ? 100_000 - storyIndex : 10_000 - (edge.order ?? 0)),
        "elk.layered.priority.shortness": String(storyIndex >= 0 ? 100_000 - storyIndex : 1),
      },
    };
  });

  for (const annotation of view.annotations) {
    if (annotation.anchor === undefined || !view.nodes.some((node) => node.id === annotation.anchor)) continue;
    edges.push({
      id: `${ANCHOR_EDGE_PREFIX}${annotation.id}`,
      sources: [annotation.anchor],
      targets: [`${ANNOTATION_PREFIX}${annotation.id}`],
      layoutOptions: { "elk.layered.priority.direction": "1" },
    });
  }

  // ELK requires a hierarchy-crossing edge to be declared on the lowest common ancestor of
  // its endpoints. Declaring every edge on the root throws UnsupportedGraphException as
  // soon as the endpoints sit at different depths, which is most real nested models.
  const parentOfNode = new Map(view.nodes.map((node) => [node.id, node.group]));
  const parentOfGroup = new Map(view.groups.map((group) => [group.id, group.parent]));
  const ancestry = (nodeId: string): (string | undefined)[] => {
    const chain: (string | undefined)[] = [];
    let current = parentOfNode.get(nodeId);
    while (current !== undefined) {
      chain.unshift(current);
      current = parentOfGroup.get(current);
    }
    chain.unshift(undefined);
    return chain;
  };
  const containerOf = (edge: ElkExtendedEdge): string | undefined => {
    const source = edge.sources[0]?.startsWith(PORT_PREFIX)
      ? edge.sources[0].slice(PORT_PREFIX.length).split(":")[0]!
      : edge.sources[0]!;
    const target = edge.targets[0]?.startsWith(PORT_PREFIX)
      ? edge.targets[0].slice(PORT_PREFIX.length).split(":")[0]!
      : edge.targets[0]!;
    // Annotations are laid out at the root, so anything touching one stays at the root.
    if (!parentOfNode.has(source) || !parentOfNode.has(target)) return undefined;
    const left = ancestry(source);
    const right = ancestry(target);
    let common: string | undefined;
    for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
      if (left[index] !== right[index]) break;
      common = left[index];
    }
    return common;
  };
  const edgesByContainer = new Map<string | undefined, ElkExtendedEdge[]>();
  for (const edge of edges) {
    const container = containerOf(edge);
    edgesByContainer.set(container, [...(edgesByContainer.get(container) ?? []), edge]);
  }

  // A boundary is packable only when no relationship touches anything inside it.
  const connected = new Set(view.edges.flatMap((edge) => [edge.from, edge.to]));
  const packable = new Set<string>();
  for (const group of view.groups) {
    const descendants = (id: string): string[] => [
      ...(nodesByGroup.get(id) ?? []).map((node) => node.id),
      ...(groupByParent.get(id) ?? []).flatMap((child) => descendants(child.id)),
    ];
    if (!descendants(group.id).some((id) => connected.has(id))) packable.add(group.id);
  }

  const children: ElkNode[] = [
    ...(groupByParent.get(undefined) ?? []).map((group) =>
      groupToElk(group, groupByParent, nodesByGroup, edgesByContainer, packable, wrap ? view.layout.aspectRatio : undefined),
    ),
    ...(nodesByGroup.get(undefined) ?? []).map(nodeToElk),
    ...annotations,
  ];

  const spacing = spacingFor(view.layout.spacing);
  return {
    id: ROOT_ID,
    children,
    edges: edgesByContainer.get(undefined) ?? [],
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": directionFor(view.layout.direction),
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
      "elk.layered.mergeEdges": "false",
      "elk.layered.mergeHierarchyEdges": "false",
      "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
      "elk.layered.considerModelOrder.portModelOrder": "true",
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
      "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
      "elk.layered.thoroughness": "20",
      "elk.randomSeed": String(seed),
      "elk.spacing.nodeNode": String(spacing.node),
      "elk.layered.spacing.nodeNodeBetweenLayers": String(spacing.layer),
      "elk.spacing.edgeNode": "20",
      "elk.spacing.edgeEdge": "14",
      "elk.padding": "[top=24,left=24,bottom=24,right=24]",
      // The aspect target only reaches a layered graph through the wrapping pass; on its
      // own the option is inert. Both are set together so the cut positions are chosen
      // against the shape the author actually asked for.
      ...(wrap
        ? {
            "elk.aspectRatio": String(view.layout.aspectRatio),
            "elk.layered.wrapping.strategy": "SINGLE_EDGE",
            "elk.layered.wrapping.cutting.strategy": "ARD",
            "elk.layered.wrapping.additionalEdgeSpacing": "24",
          }
        : {}),
    },
  };
}

function groupToElk(
  group: MeasuredGroup,
  groupsByParent: ReadonlyMap<string | undefined, readonly MeasuredGroup[]>,
  nodesByGroup: ReadonlyMap<string | undefined, readonly MeasuredNode[]>,
  edgesByContainer: ReadonlyMap<string | undefined, readonly ElkExtendedEdge[]>,
  packable: ReadonlySet<string>,
  /** Set only while wrapping; the depth that makes a diagram a ribbon is usually inside a boundary, not at the root. */
  wrapAspect?: number,
): ElkNode {
  const mode = group.layout.mode;
  // The box packer cannot lay out edges, and a packed boundary anywhere in the chain
  // stops the layered pass reaching the boundaries below it. So a boundary may only be
  // packed when nothing inside it is connected to anything.
  const algorithm = (mode === "grid" || mode === "pack") && packable.has(group.id) ? "box" : "layered";
  const direction =
    mode === "column"
      ? "DOWN"
      : mode === "row"
        ? "RIGHT"
        : directionFor(group.layout.direction);
  const children = [
    ...(groupsByParent.get(group.id) ?? []).map((child) =>
      groupToElk(child, groupsByParent, nodesByGroup, edgesByContainer, packable, wrapAspect),
    ),
    ...(nodesByGroup.get(group.id) ?? []).map(nodeToElk),
  ];
  const gridColumns = group.layout.columns ?? Math.max(1, Math.ceil(Math.sqrt(children.length)));
  const gridRows = Math.max(1, Math.ceil(children.length / gridColumns));
  const ownEdges = edgesByContainer.get(group.id) ?? [];
  return {
    id: group.id,
    children,
    ...(ownEdges.length ? { edges: [...ownEdges] } : {}),
    layoutOptions: {
      // A container that has to route its own relationships cannot use the box packer,
      // which does not lay out edges at all.
      "elk.algorithm": ownEdges.length ? "layered" : algorithm,
      // Hierarchy handling is not inherited: without it on every level, a relationship
      // that crosses into a nested boundary is rejected as an unsupported graph.
      ...(algorithm === "layered" ? { "elk.hierarchyHandling": "INCLUDE_CHILDREN" } : {}),
      "elk.direction": direction,
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.padding": `[top=${group.padding.top},left=${group.padding.left},bottom=${group.padding.bottom},right=${group.padding.right}]`,
      "elk.spacing.nodeNode": String(group.layout.gap ?? 32),
      "elk.layered.spacing.nodeNodeBetweenLayers": String(group.layout.gap ?? 52),
      ...(mode === "grid"
        ? {
            "elk.aspectRatio": String((gridColumns * gridColumns) / gridRows),
            "elk.box.packingMode": "SIMPLE",
          }
        : {}),
      // A boundary holding a long run of components is what makes the whole canvas a
      // ribbon, so wrapping has to reach containers, not just the root. `column`/`row`
      // are a declared sequence and are left alone.
      ...(wrapAspect !== undefined && algorithm === "layered" && mode !== "column" && mode !== "row" && children.length > 3
        ? {
            "elk.aspectRatio": String(wrapAspect),
            "elk.layered.wrapping.strategy": "SINGLE_EDGE",
            "elk.layered.wrapping.cutting.strategy": "ARD",
            "elk.layered.wrapping.additionalEdgeSpacing": "24",
          }
        : {}),
      "elk.nodeSize.constraints": "MINIMUM_SIZE",
      "elk.nodeSize.minimum": `[${Math.max(180, group.labelText.width + 48)},${group.titleHeight + 60}]`,
    },
  };
}

function nodeToElk(node: MeasuredNode): ElkNode {
  // A port with a measured slot is pinned to that compartment's own edge, so the
  // connector leaves the route it is drawn against instead of an arbitrary boundary point.
  const pinned = node.ports.some((port) => port.slot !== undefined);
  const ports: ElkPort[] = node.ports.map((port) => {
    const slot = port.slot;
    const side = sideFor(port.side);
    if (slot === undefined) {
      return { id: portReference(node.id, port.id), width: 8, height: 8, layoutOptions: { "elk.port.side": side } };
    }
    const centerY = slot.y + slot.height / 2 - 4;
    const position =
      side === "WEST" ? { x: -8, y: centerY }
      : side === "NORTH" ? { x: slot.x + slot.width / 2 - 4, y: -8 }
      : side === "SOUTH" ? { x: slot.x + slot.width / 2 - 4, y: node.height }
      : { x: node.width, y: centerY };
    return { id: portReference(node.id, port.id), width: 8, height: 8, ...position, layoutOptions: { "elk.port.side": side } };
  });
  return {
    id: node.id,
    width: node.width,
    height: node.height,
    ports,
    layoutOptions: {
      "elk.nodeSize.constraints": "FIXED_SIZE",
      ...(ports.length === 0 ? {} : { "elk.portConstraints": pinned ? "FIXED_POS" : "FIXED_SIDE" }),
    },
  };
}

function fromElkGraph(view: MeasuredView, graph: ElkNode) {
  const groups: GeometryGroup[] = [];
  const nodes: GeometryNode[] = [];
  const annotations: GeometryAnnotation[] = [];
  const offsets = new Map<string, Point>([[ROOT_ID, { x: 0, y: 0 }]]);

  const walk = (parent: ElkNode, parentOffset: Point, parentGroup?: string): void => {
    for (const child of parent.children ?? []) {
      const absolute = {
        x: round(parentOffset.x + (child.x ?? 0)),
        y: round(parentOffset.y + (child.y ?? 0)),
      };
      offsets.set(child.id, absolute);
      if (child.id.startsWith(ANNOTATION_PREFIX)) {
        annotations.push({
          id: child.id.slice(ANNOTATION_PREFIX.length),
          ...absolute,
          width: round(child.width ?? 0),
          height: round(child.height ?? 0),
        });
      } else if (child.children !== undefined) {
        groups.push({
          id: child.id,
          ...absolute,
          width: round(child.width ?? 0),
          height: round(child.height ?? 0),
          ...(parentGroup === undefined ? {} : { parent: parentGroup }),
        });
        walk(child, absolute, child.id);
      } else {
        const ports: GeometryPort[] = (child.ports ?? []).map((port) => ({
          id: port.id.slice(`${PORT_PREFIX}${child.id}:`.length),
          owner: child.id,
          x: round(absolute.x + (port.x ?? 0) + (port.width ?? 0) / 2),
          y: round(absolute.y + (port.y ?? 0) + (port.height ?? 0) / 2),
          side: inferPortSide(port, child),
        }));
        nodes.push({
          id: child.id,
          ...absolute,
          width: round(child.width ?? 0),
          height: round(child.height ?? 0),
          ports,
        });
      }
    }
  };
  walk(graph, { x: 0, y: 0 });

  // Relationships are declared on the lowest common ancestor of their endpoints, so they
  // must be collected from every container, not only the root.
  const allEdges: ElkExtendedEdge[] = [];
  const collectEdges = (node: ElkNode): void => {
    for (const edge of (node.edges ?? []) as ElkExtendedEdge[]) allEdges.push(edge);
    for (const child of node.children ?? []) collectEdges(child);
  };
  collectEdges(graph);

  const edges: GeometryEdge[] = allEdges
    .filter((edge) => !edge.id.startsWith(ANCHOR_EDGE_PREFIX))
    .map((edge) => {
      const edgeOffset = offsets.get(edge.container ?? ROOT_ID) ?? { x: 0, y: 0 };
      const points: Point[] = [];
      for (const section of edge.sections ?? []) {
        const sectionPoints = [section.startPoint, ...(section.bendPoints ?? []), section.endPoint];
        for (const point of sectionPoints) {
          const normalized = {
            x: round(point.x + edgeOffset.x),
            y: round(point.y + edgeOffset.y),
          };
          const previous = points[points.length - 1];
          if (previous?.x !== normalized.x || previous.y !== normalized.y) points.push(normalized);
        }
      }
      const label = edge.labels?.[0];
      // ELK may report the same axis on opposite sides of a rounding boundary.
      // Canonicalize sub-pixel drift instead of introducing a diagonal segment.
      for (let index = 1; index < points.length; index++) {
        const previous = points[index - 1]!, current = points[index]!;
        if (Math.abs(previous.x - current.x) <= 0.02) points[index] = { ...current, x: previous.x };
        else if (Math.abs(previous.y - current.y) <= 0.02) points[index] = { ...current, y: previous.y };
      }
      // A declared label must survive whatever the backend does with it. ELK returns no
      // label box when it was never given one — which is how the wrapped candidate is
      // laid out, because its wrapping pass throws on labelled edges — so the measured
      // text supplies the rectangle and `refineLabels` places it against the polyline.
      // Without this an edge label disappears from the diagram with every metric clean.
      const measured = view.edges.find((item) => item.id === edge.id)?.labelText;
      const placed =
        label?.x !== undefined && label.y !== undefined
          ? {
              x: round(label.x + edgeOffset.x),
              y: round(label.y + edgeOffset.y),
              width: round(label.width ?? 0),
              height: round(label.height ?? 0),
              text: label.text ?? "",
            }
          : measured === undefined
            ? undefined
            : {
                x: round(midpoint(points).x - (measured.width + 14) / 2),
                y: round(midpoint(points).y - (measured.height + 8) / 2),
                width: round(measured.width + 14),
                height: round(measured.height + 8),
                text: measured.lines.join(" "),
              };
      return {
        id: edge.id,
        points,
        ...(placed === undefined ? {} : { label: placed }),
      };
    });

  return {
    id: view.id,
    bounds: {
      x: 0,
      y: 0,
      width: round(graph.width ?? extent(groups, nodes, annotations).width),
      height: round(graph.height ?? extent(groups, nodes, annotations).height),
    },
    groups,
    nodes,
    edges,
    annotations,
  };
}

function groupChildren(groups: readonly MeasuredGroup[]): Map<string | undefined, MeasuredGroup[]> {
  const result = new Map<string | undefined, MeasuredGroup[]>();
  for (const group of groups) {
    const children = result.get(group.parent) ?? [];
    children.push(group);
    result.set(group.parent, children);
  }
  return result;
}

function nodeChildren(nodes: readonly MeasuredNode[]): Map<string | undefined, MeasuredNode[]> {
  const result = new Map<string | undefined, MeasuredNode[]>();
  for (const node of nodes) {
    const children = result.get(node.group) ?? [];
    children.push(node);
    result.set(node.group, children);
  }
  return result;
}

function portReference(nodeId: string, portId: string | undefined): string {
  return portId === undefined ? nodeId : `${PORT_PREFIX}${nodeId}:${portId}`;
}

function directionFor(direction: MeasuredView["layout"]["direction"]): string {
  return { right: "RIGHT", left: "LEFT", down: "DOWN", up: "UP" }[direction];
}

function sideFor(side: string): string {
  return { north: "NORTH", east: "EAST", south: "SOUTH", west: "WEST", auto: "EAST" }[side] ?? "EAST";
}

function inferPortSide(port: ElkPort, node: ElkNode): GeometryPort["side"] {
  const x = (port.x ?? 0) + (port.width ?? 0) / 2;
  const y = (port.y ?? 0) + (port.height ?? 0) / 2;
  const distances = [
    ["west", Math.abs(x)],
    ["east", Math.abs((node.width ?? 0) - x)],
    ["north", Math.abs(y)],
    ["south", Math.abs((node.height ?? 0) - y)],
  ] as const;
  return [...distances].sort((left, right) => left[1] - right[1])[0]?.[0] ?? "east";
}

function spacingFor(spacing: MeasuredView["layout"]["spacing"]): { node: number; layer: number } {
  if (spacing === "compact") return { node: 24, layer: 52 };
  if (spacing === "relaxed") return { node: 52, layer: 104 };
  return { node: 36, layer: 76 };
}

function extent(
  groups: readonly GeometryGroup[],
  nodes: readonly GeometryNode[],
  annotations: readonly GeometryAnnotation[],
): { width: number; height: number } {
  const items = [...groups, ...nodes, ...annotations];
  return {
    width: Math.max(0, ...items.map((item) => item.x + item.width)) + 24,
    height: Math.max(0, ...items.map((item) => item.y + item.height)) + 24,
  };
}

/** Geometric midpoint of a polyline, used to seed a label the backend did not place. */
function midpoint(points: readonly Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  let total = 0;
  for (let index = 1; index < points.length; index += 1) total += Math.abs(points[index]!.x - points[index - 1]!.x) + Math.abs(points[index]!.y - points[index - 1]!.y);
  let travelled = 0;
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1]!, b = points[index]!;
    const length = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
    if (travelled + length >= total / 2 && length > 0) {
      const t = (total / 2 - travelled) / length;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    travelled += length;
  }
  return points[points.length - 1]!;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
