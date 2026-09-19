import type { Diagnostic } from "@topoir/schema";
import type {
  GeometryEdge,
  GeometryGroup,
  GeometryView,
  MeasuredView,
  Point,
  Rect,
} from "./ir.js";

export interface QualityReport {
  readonly diagnostics: readonly Diagnostic[];
  readonly metrics: {
    readonly nodeOverlaps: number;
    readonly edgeNodeIntersections: number;
    readonly endpointBodyCrossings: number;
    readonly edgeCrossings: number;
    readonly nonOrthogonalSegments: number;
    readonly emptyRoutes: number;
    readonly illegalBoundaryCrossings: number;
    readonly labelOverlaps: number;
    readonly annotationOverlaps: number;
    readonly groupTitleIntersections: number;
  };
}

export function analyzeGeometry(view: MeasuredView, geometry: GeometryView): QualityReport {
  const diagnostics: Diagnostic[] = [];
  const nodeById = new Map(geometry.nodes.map((node) => [node.id, node]));
  const groupById = new Map(geometry.groups.map((group) => [group.id, group]));
  const semanticNodeById = new Map(view.nodes.map((node) => [node.id, node]));
  let nodeOverlaps = 0;
  let edgeNodeIntersections = 0;
  let endpointBodyCrossings = 0;
  let nonOrthogonalSegments = 0;
  let emptyRoutes = 0;
  let illegalBoundaryCrossings = 0;
  let labelOverlaps = 0;
  let annotationOverlaps = 0;
  let groupTitleIntersections = 0;
  const headings = geometry.groups.map((group) => ({ ...group, height: view.groups.find((g) => g.id === group.id)?.titleHeight ?? 38 }));

  for (let leftIndex = 0; leftIndex < geometry.nodes.length; leftIndex += 1) {
    const left = geometry.nodes[leftIndex];
    if (left === undefined) continue;
    for (let rightIndex = leftIndex + 1; rightIndex < geometry.nodes.length; rightIndex += 1) {
      const right = geometry.nodes[rightIndex];
      if (right !== undefined && rectsOverlap(left, right, 0.01)) {
        nodeOverlaps += 1;
        diagnostics.push(error("TOP410_NODE_OVERLAP", `Nodes ${JSON.stringify(left.id)} and ${JSON.stringify(right.id)} overlap.`));
      }
    }
  }

  for (const node of view.nodes) {
    if (node.group === undefined) continue;
    const nodeRect = nodeById.get(node.id);
    const groupRect = groupById.get(node.group);
    if (nodeRect !== undefined && groupRect !== undefined && !contains(groupRect, nodeRect, 0.01)) {
      diagnostics.push(error("TOP411_NODE_OUTSIDE_GROUP", `Node ${JSON.stringify(node.id)} is outside group ${JSON.stringify(node.group)}.`));
    }
  }

  for (const edgeGeometry of geometry.edges) {
    const edge = view.edges.find((candidate) => candidate.id === edgeGeometry.id);
    if (edgeGeometry.points.length < 2) {
      emptyRoutes += 1;
      diagnostics.push(error("TOP420_EDGE_ROUTE_EMPTY", `Edge ${JSON.stringify(edgeGeometry.id)} has no usable route.`));
      continue;
    }
    for (const [start, end] of segments(edgeGeometry)) {
      if (!isOrthogonal(start, end)) {
        nonOrthogonalSegments += 1;
        diagnostics.push(error("TOP421_EDGE_NOT_ORTHOGONAL", `Edge ${JSON.stringify(edgeGeometry.id)} contains a diagonal segment.`));
      }
      for (const node of geometry.nodes) {
        if (node.id === edge?.from || node.id === edge?.to) {
          // An endpoint may be touched perpendicularly but never crossed: a route that
          // re-enters its own source or target card reads as an arrow leaving the wrong side.
          if (segmentIntersectsInterior(start, end, node)) {
            endpointBodyCrossings += 1;
            diagnostics.push(warning("TOP424_EDGE_CROSSES_OWN_ENDPOINT", `Edge ${JSON.stringify(edgeGeometry.id)} runs back across its own endpoint ${JSON.stringify(node.id)}.`));
          }
          continue;
        }
        if (segmentIntersectsInterior(start, end, node)) {
          edgeNodeIntersections += 1;
          diagnostics.push(error("TOP422_EDGE_INTERSECTS_NODE", `Edge ${JSON.stringify(edgeGeometry.id)} passes through node ${JSON.stringify(node.id)}.`));
        }
      }
      for (const heading of headings) {
        if (segmentIntersectsInterior(start, end, heading)) {
          groupTitleIntersections += 1;
          diagnostics.push({ code: "TOP431_GROUP_TITLE_INTERSECTION", severity: "warning", message: `Edge ${JSON.stringify(edgeGeometry.id)} crosses the heading of group ${JSON.stringify(heading.id)}.` });
        }
      }
    }

    // Sequence messages attach to lifelines below actor headers, not node boxes.
    if (edge !== undefined && view.design?.composition !== "sequence") {
      for (const group of geometry.groups) {
        const sourceInside = belongsToGroup(edge.from, group.id, semanticNodeById, view.groups);
        const targetInside = belongsToGroup(edge.to, group.id, semanticNodeById, view.groups);
        const expected = sourceInside === targetInside ? 0 : 1;
        const actual = boundaryCrossingCount(edgeGeometry, group);
        if (actual !== expected) {
          illegalBoundaryCrossings += Math.abs(actual - expected);
          diagnostics.push({
            code: "TOP423_ILLEGAL_BOUNDARY_CROSSING",
            severity: "warning",
            message: `Edge ${JSON.stringify(edge.id)} crosses group ${JSON.stringify(group.id)} ${actual} times; expected ${expected}.`,
          });
        }
      }
    }

    if (edgeGeometry.label !== undefined) {
      const otherLabels = geometry.edges.slice(0, geometry.edges.indexOf(edgeGeometry)).flatMap((e) => e.label ? [{ ...e.label, id: `edge ${e.id}` }] : []);
      for (const obstacle of [...geometry.nodes, ...geometry.annotations, ...headings, ...otherLabels]) {
        if (rectsOverlap(edgeGeometry.label, obstacle, 0.01)) {
          labelOverlaps += 1;
          diagnostics.push({
            code: "TOP430_LABEL_OVERLAP",
            severity: "warning",
            message: `Label for edge ${JSON.stringify(edgeGeometry.id)} overlaps ${JSON.stringify(obstacle.id)}.`,
          });
        }
      }
    }
  }

  for (const [index, annotation] of geometry.annotations.entries()) {
    for (const obstacle of [...geometry.nodes, ...headings, ...geometry.annotations.slice(0, index)]) {
      if (rectsOverlap(annotation, obstacle, 0.01)) {
        annotationOverlaps += 1;
        diagnostics.push({ code: "TOP432_ANNOTATION_OVERLAP", severity: "warning", message: `Annotation ${JSON.stringify(annotation.id)} overlaps ${JSON.stringify(obstacle.id)}.` });
      }
    }
  }

  const edgeCrossings = countEdgeCrossings(geometry.edges);
  return {
    diagnostics,
    metrics: {
      nodeOverlaps,
      edgeNodeIntersections,
      endpointBodyCrossings,
      edgeCrossings,
      nonOrthogonalSegments,
      emptyRoutes,
      illegalBoundaryCrossings,
      labelOverlaps,
      annotationOverlaps,
      groupTitleIntersections,
    },
  };
}

function belongsToGroup(
  nodeId: string,
  targetGroupId: string,
  nodes: ReadonlyMap<string, { readonly group?: string }>,
  groups: readonly { readonly id: string; readonly parent?: string }[],
): boolean {
  const groupById = new Map(groups.map((group) => [group.id, group]));
  let groupId = nodes.get(nodeId)?.group;
  while (groupId !== undefined) {
    if (groupId === targetGroupId) return true;
    groupId = groupById.get(groupId)?.parent;
  }
  return false;
}

function boundaryCrossingCount(edge: GeometryEdge, rect: Rect): number {
  const points = new Set<string>();
  for (const [start, end] of segments(edge)) {
    for (const point of segmentBoundaryIntersections(start, end, rect)) {
      points.add(`${round(point.x)},${round(point.y)}`);
    }
  }
  return points.size;
}

function segmentBoundaryIntersections(start: Point, end: Point, rect: Rect): Point[] {
  const result: Point[] = [];
  const minX = Math.min(start.x, end.x);
  const maxX = Math.max(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const maxY = Math.max(start.y, end.y);
  if (start.y === end.y && start.y >= rect.y && start.y <= rect.y + rect.height) {
    for (const x of [rect.x, rect.x + rect.width]) {
      if (x >= minX && x <= maxX) result.push({ x, y: start.y });
    }
  } else if (start.x === end.x && start.x >= rect.x && start.x <= rect.x + rect.width) {
    for (const y of [rect.y, rect.y + rect.height]) {
      if (y >= minY && y <= maxY) result.push({ x: start.x, y });
    }
  }
  return result;
}

function countEdgeCrossings(edges: readonly GeometryEdge[]): number {
  let count = 0;
  for (let leftIndex = 0; leftIndex < edges.length; leftIndex += 1) {
    const left = edges[leftIndex];
    if (left === undefined) continue;
    for (let rightIndex = leftIndex + 1; rightIndex < edges.length; rightIndex += 1) {
      const right = edges[rightIndex];
      if (right === undefined) continue;
      for (const leftSegment of segments(left)) {
        for (const rightSegment of segments(right)) {
          if (segmentsCross(leftSegment, rightSegment)) count += 1;
        }
      }
    }
  }
  return count;
}

function segmentsCross(left: readonly [Point, Point], right: readonly [Point, Point]): boolean {
  const [a, b] = left;
  const [c, d] = right;
  const leftHorizontal = a.y === b.y;
  const rightHorizontal = c.y === d.y;
  if (leftHorizontal === rightHorizontal) return false;
  const horizontal = leftHorizontal ? left : right;
  const vertical = leftHorizontal ? right : left;
  const [h1, h2] = horizontal;
  const [v1, v2] = vertical;
  const x = v1.x;
  const y = h1.y;
  const interiorHorizontal = x > Math.min(h1.x, h2.x) && x < Math.max(h1.x, h2.x);
  const interiorVertical = y > Math.min(v1.y, v2.y) && y < Math.max(v1.y, v2.y);
  return interiorHorizontal && interiorVertical;
}

function segments(edge: GeometryEdge): Array<readonly [Point, Point]> {
  const result: Array<readonly [Point, Point]> = [];
  for (let index = 1; index < edge.points.length; index += 1) {
    const start = edge.points[index - 1];
    const end = edge.points[index];
    if (start !== undefined && end !== undefined) result.push([start, end]);
  }
  return result;
}

function rectsOverlap(left: Rect, right: Rect, epsilon: number): boolean {
  return (
    left.x + epsilon < right.x + right.width &&
    left.x + left.width > right.x + epsilon &&
    left.y + epsilon < right.y + right.height &&
    left.y + left.height > right.y + epsilon
  );
}

function contains(outer: Rect, inner: Rect, epsilon: number): boolean {
  return (
    inner.x >= outer.x - epsilon &&
    inner.y >= outer.y - epsilon &&
    inner.x + inner.width <= outer.x + outer.width + epsilon &&
    inner.y + inner.height <= outer.y + outer.height + epsilon
  );
}

function segmentIntersectsInterior(start: Point, end: Point, rect: Rect): boolean {
  const epsilon = 0.01;
  if (start.x === end.x) {
    return (
      start.x > rect.x + epsilon &&
      start.x < rect.x + rect.width - epsilon &&
      Math.max(start.y, end.y) > rect.y + epsilon &&
      Math.min(start.y, end.y) < rect.y + rect.height - epsilon
    );
  }
  if (start.y === end.y) {
    return (
      start.y > rect.y + epsilon &&
      start.y < rect.y + rect.height - epsilon &&
      Math.max(start.x, end.x) > rect.x + epsilon &&
      Math.min(start.x, end.x) < rect.x + rect.width - epsilon
    );
  }
  return false;
}

function isOrthogonal(start: Point, end: Point): boolean {
  return start.x === end.x || start.y === end.y;
}

function error(code: string, message: string): Diagnostic {
  return { code, severity: "error", message };
}

function warning(code: string, message: string): Diagnostic {
  return { code, severity: "warning", message };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
