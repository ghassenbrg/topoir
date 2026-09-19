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
export { CompositionEngine, compositionScore, refineLabels } from "./composition.js";

const ROOT_ID = "__topoir_root__";
const ANNOTATION_PREFIX = "__topoir_annotation__";
const PORT_PREFIX = "__topoir_port__";
const ANCHOR_EDGE_PREFIX = "__topoir_anchor__";

export interface ElkLayoutOptions {
  readonly seed?: number;
}

export class ElkLayoutEngine implements LayoutEngine {
  public readonly id = "elk-layered-v1";
  private readonly elk: ElkApi;
  private readonly seed: number;

  public constructor(options: ElkLayoutOptions = {}) {
    this.elk = new ElkConstructor();
    this.seed = options.seed ?? 1;
  }

  public async layout(view: MeasuredView): Promise<LayoutResult> {
    try {
      const input = toElkGraph(view, this.seed);
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

export function toElkGraph(view: MeasuredView, seed = 1): ElkNode {
  const groupByParent = groupChildren(view.groups);
  const nodesByGroup = nodeChildren(view.nodes);
  const annotations = view.annotations.map<ElkNode>((annotation) => ({
    id: `${ANNOTATION_PREFIX}${annotation.id}`,
    width: annotation.width,
    height: annotation.height,
    layoutOptions: { "elk.nodeSize.constraints": "FIXED_SIZE" },
  }));
  const children: ElkNode[] = [
    ...(groupByParent.get(undefined) ?? []).map((group) =>
      groupToElk(group, groupByParent, nodesByGroup),
    ),
    ...(nodesByGroup.get(undefined) ?? []).map(nodeToElk),
    ...annotations,
  ];

  const edges: ElkExtendedEdge[] = view.edges.map((edge) => {
    const label: ElkLabel[] =
      edge.labelText === undefined
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
        "elk.layered.priority.direction": String(10_000 - (edge.order ?? 0)),
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

  const spacing = spacingFor(view.layout.spacing);
  return {
    id: ROOT_ID,
    children,
    edges,
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
    },
  };
}

function groupToElk(
  group: MeasuredGroup,
  groupsByParent: ReadonlyMap<string | undefined, readonly MeasuredGroup[]>,
  nodesByGroup: ReadonlyMap<string | undefined, readonly MeasuredNode[]>,
): ElkNode {
  const mode = group.layout.mode;
  const algorithm = mode === "grid" || mode === "pack" ? "box" : "layered";
  const direction =
    mode === "column"
      ? "DOWN"
      : mode === "row"
        ? "RIGHT"
        : directionFor(group.layout.direction);
  const children = [
    ...(groupsByParent.get(group.id) ?? []).map((child) =>
      groupToElk(child, groupsByParent, nodesByGroup),
    ),
    ...(nodesByGroup.get(group.id) ?? []).map(nodeToElk),
  ];
  const gridColumns = group.layout.columns ?? Math.max(1, Math.ceil(Math.sqrt(children.length)));
  const gridRows = Math.max(1, Math.ceil(children.length / gridColumns));
  return {
    id: group.id,
    children,
    layoutOptions: {
      "elk.algorithm": algorithm,
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
      "elk.nodeSize.constraints": "MINIMUM_SIZE",
      "elk.nodeSize.minimum": `[${Math.max(180, group.labelText.width + 48)},${group.titleHeight + 60}]`,
    },
  };
}

function nodeToElk(node: MeasuredNode): ElkNode {
  const ports: ElkPort[] = node.ports.map((port) => ({
    id: portReference(node.id, port.id),
    width: 8,
    height: 8,
    layoutOptions: {
      "elk.port.side": sideFor(port.side),
    },
  }));
  return {
    id: node.id,
    width: node.width,
    height: node.height,
    ports,
    layoutOptions: {
      "elk.nodeSize.constraints": "FIXED_SIZE",
      ...(ports.length === 0 ? {} : { "elk.portConstraints": "FIXED_SIDE" }),
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

  const edges: GeometryEdge[] = (graph.edges ?? [])
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
      return {
        id: edge.id,
        points,
        ...(label?.x === undefined || label.y === undefined
          ? {}
          : {
              label: {
                x: round(label.x + edgeOffset.x),
                y: round(label.y + edgeOffset.y),
                width: round(label.width ?? 0),
                height: round(label.height ?? 0),
                text: label.text ?? "",
              },
            }),
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

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
