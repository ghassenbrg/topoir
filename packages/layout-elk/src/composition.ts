import { analyzeGeometry, type GeometryView, type GeometryNode, type GeometryGroup, type GeometryEdge, type LayoutResult, type LayoutEngine, type MeasuredView, type Point, type Rect, type MeasuredNode } from "@topoir/core";
import { ElkLayoutEngine } from "./index.js";
import { obstacleRoute, segmentHitsRect } from "./routing.js";

/** Compiler-owned composition. Fixed candidate order is also the tie-break order. */
export class CompositionEngine implements LayoutEngine {
  readonly id = "topoir-composition-v1";

  async layout(view: MeasuredView): Promise<LayoutResult> {
    const kind = view.design?.composition ?? "topology";
    if (["sequence", "comparison", "swimlanes"].includes(kind) && view.edges.some((edge) => edge.sourcePort || edge.targetPort)) {
      return { diagnostics: [{ code: "TOP402_COMPOSITION_PORT_UNSUPPORTED", severity: "error", message: `${kind} does not yet support explicit endpoint ports. Use topology/layers or omit the port constraints.` }] };
    }
    if (kind === "sequence") return { geometry: sequence(view), diagnostics: [], metrics: { candidatesEvaluated: 1 } };
    if (kind === "comparison" || kind === "swimlanes") return { geometry: panels(view, kind), diagnostics: [], metrics: { candidatesEvaluated: 1 } };
    const candidates: { result: LayoutResult; score: number }[] = [];
    const optimize = view.design?.optimize !== false && view.design !== undefined;
    for (const [seed, spacing] of (optimize ? [[1, view.layout.spacing], [7, "compact"], [19, "normal"]] : [[1, view.layout.spacing]]) as [number, MeasuredView["layout"]["spacing"]][]) {
      const result = await new ElkLayoutEngine({ seed }).layout({ ...view, layout: { ...view.layout, spacing } });
      if (result.geometry) {
        const geometry = refineLabels(view, optimize ? refineRoutes(view, result.geometry) : result.geometry);
        candidates.push({ result: { ...result, geometry }, score: compositionScore(view, geometry) });
      } else if (!candidates.length && !optimize) return result;
    }
    candidates.sort((a, b) => a.score - b.score);
    const best = candidates[0];
    if (!best) return { diagnostics: [{ code: "TOP400_LAYOUT_FAILED", severity: "error", message: "No composition candidate could be laid out." }] };
    return { ...best.result, metrics: { ...best.result.metrics, candidatesEvaluated: candidates.length, compositionScore: best.score } };
  }
}

export function compositionScore(view: MeasuredView, geometry: GeometryView): number {
  const q = analyzeGeometry(view, geometry);
  const defects = q.diagnostics.filter((d) => d.severity === "error").length;
  let length = 0, bends = 0;
  for (const edge of geometry.edges) {
    bends += Math.max(0, edge.points.length - 2);
    for (let i = 1; i < edge.points.length; i++) length += distance(edge.points[i - 1]!, edge.points[i]!);
  }
  const aspect = Math.abs(Math.log((geometry.bounds.width / Math.max(1, geometry.bounds.height)) / view.layout.aspectRatio));
  return defects * 1e9 + (q.metrics.labelOverlaps + q.metrics.annotationOverlaps + q.metrics.groupTitleIntersections) * 1e6 + q.metrics.illegalBoundaryCrossings * 10000 + q.metrics.edgeCrossings * 1000 + aspect * 500 + bends * 8 + length * 0.015;
}

function sequence(view: MeasuredView): GeometryView {
  const gap = Math.max(80, ...view.edges.map((e) => (e.labelText?.width ?? 0) + 24));
  let x = 24;
  const nodes: GeometryNode[] = view.nodes.map((node) => {
    const result = { id: node.id, x, y: 56, width: node.width, height: node.height, ports: [] };
    x += node.width + gap;
    return result;
  });
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const headBottom = Math.max(120, ...nodes.map((node) => node.y + node.height));
  const orderedEdges = [...view.edges].sort((a, b) => (a.step ?? a.order ?? 0) - (b.step ?? b.order ?? 0) || a.id.localeCompare(b.id, "en"));
  let y = headBottom + 58;
  const edges: GeometryEdge[] = orderedEdges.map((edge) => {
    const source = nodeById.get(edge.from)!, target = nodeById.get(edge.to)!;
    const a = source.x + source.width / 2, b = target.x + target.width / 2;
    const points = a === b ? [{ x: a, y }, { x: a + 52, y }, { x: a + 52, y: y + 32 }, { x: a, y: y + 32 }] : [{ x: a, y }, { x: b, y }];
    const result: GeometryEdge = { id: edge.id, points, ...(edge.labelText ? { label: { x: (a + b) / 2 - (edge.labelText.width + 14) / 2, y: y - edge.labelText.height - 15, width: edge.labelText.width + 14, height: edge.labelText.height + 8, text: edge.label ?? edge.protocol ?? "" } } : {}) };
    y += 68 + (a === b ? 32 : 0);
    return result;
  });
  const groupRects = view.groups.map((group) => {
    const descendants = new Set([group.id]);
    for (let i = 0; i < view.groups.length; i++) for (const g of view.groups) if (g.parent && descendants.has(g.parent)) descendants.add(g.id);
    const children = nodes.filter((node) => descendants.has(view.nodes.find((item) => item.id === node.id)?.group ?? ""));
    const left = Math.min(...children.map((node) => node.x)) - 12;
    return { id: group.id, x: children.length ? left : 12, y: 12, width: children.length ? Math.max(...children.map((node) => node.x + node.width)) - left + 12 : 160, height: headBottom + 6, ...(group.parent ? { parent: group.parent } : {}) };
  });
  const annotations = view.annotations.map((annotation, index) => ({ id: annotation.id, x: x + 12, y: 56 + index * (annotation.height + 20), width: annotation.width, height: annotation.height }));
  return { id: view.id, nodes, groups: groupRects, edges, annotations, bounds: { x: 0, y: 0, width: x - gap + 24 + (annotations.length ? Math.max(...annotations.map((a) => a.width)) + gap : 0), height: Math.max(y + 12, ...annotations.map((a) => a.y + a.height + 24)) } };
}

interface Block { id: string; width: number; height: number; node?: MeasuredNode; children?: { block: Block; x: number; y: number }[]; parent?: string }

function panels(view: MeasuredView, kind: "comparison" | "swimlanes"): GeometryView {
  const build = (id?: string): Block => {
    const group = view.groups.find((item) => item.id === id);
    const blocks: Block[] = [
      ...view.groups.filter((item) => item.parent === id).map((item) => build(item.id)),
      ...view.nodes.filter((item) => item.group === id).map((node) => ({ id: node.id, width: node.width, height: node.height, node })),
    ];
    const root = id === undefined;
    const mode = root ? "row" : group?.layout.mode === "auto" ? "column" : group?.layout.mode ?? "column";
    const cols = mode === "row" ? Math.max(1, blocks.length) : mode === "grid" || mode === "pack" ? group?.layout.columns ?? 2 : 1;
    const gap = root ? (kind === "comparison" ? 180 : 96) : group?.layout.gap ?? 48;
    const pad = root ? 24 : 28;
    const top = root ? 24 : 62;
    const colWidths = Array.from({ length: cols }, (_, col) => Math.max(0, ...blocks.filter((_, i) => i % cols === col).map((block) => block.width)));
    const rows = Math.ceil(blocks.length / cols);
    const rowHeights = Array.from({ length: rows }, (_, row) => Math.max(0, ...blocks.slice(row * cols, (row + 1) * cols).map((block) => block.height)));
    const children = blocks.map((block, i) => ({ block, x: pad + colWidths.slice(0, i % cols).reduce((a, b) => a + b + gap, 0), y: top + rowHeights.slice(0, Math.floor(i / cols)).reduce((a, b) => a + b + gap, 0) }));
    return { id: id ?? "__root", width: Math.max(group ? group.labelText.width + 56 : 0, pad * 2 + colWidths.reduce((a, b) => a + b, 0) + (cols - 1) * gap), height: top + pad + rowHeights.reduce((a, b) => a + b, 0) + Math.max(0, rows - 1) * gap, children, ...(group?.parent ? { parent: group.parent } : {}) };
  };
  const root = build();
  const nodes: GeometryNode[] = [], groups: GeometryGroup[] = [];
  const walk = (block: Block, x: number, y: number) => {
    if (block.node) nodes.push({ id: block.id, x, y, width: block.width, height: block.height, ports: [] });
    else {
      if (block !== root) groups.push({ id: block.id, x, y, width: block.width, height: block.height, ...(block.parent ? { parent: block.parent } : {}) });
      for (const child of block.children ?? []) walk(child.block, x + child.x, y + child.y);
    }
  };
  walk(root, 0, 0);
  const annotations = view.annotations.map((annotation, index) => ({ id: annotation.id, x: 24 + index * (annotation.width + 24), y: root.height + 20, width: annotation.width, height: annotation.height }));
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edges: GeometryEdge[] = view.edges.map((edge) => {
    const source = nodeById.get(edge.from)!, target = nodeById.get(edge.to)!;
    const horizontal = Math.abs(source.x - target.x) > Math.abs(source.y - target.y);
    const forward = horizontal ? source.x < target.x : source.y < target.y;
    const a = horizontal ? { x: source.x + (forward ? source.width : 0), y: source.y + source.height / 2 } : { x: source.x + source.width / 2, y: source.y + (forward ? source.height : 0) };
    const b = horizontal ? { x: target.x + (forward ? 0 : target.width), y: target.y + target.height / 2 } : { x: target.x + target.width / 2, y: target.y + (forward ? 0 : target.height) };
    const obstacles = nodes.map((node) => node === source || node === target ? node : inflate(node, 10));
    const points = route(a, b, obstacles);
    return { id: edge.id, points, ...(edge.labelText ? { label: { x: (a.x + b.x) / 2 - (edge.labelText.width + 14) / 2, y: (a.y + b.y) / 2 - edge.labelText.height - 14, width: edge.labelText.width + 14, height: edge.labelText.height + 8, text: edge.label ?? edge.protocol ?? "" } } : {}) };
  });
  return refineLabels(view, { id: view.id, nodes, groups, edges, annotations, bounds: { x: 0, y: 0, width: Math.max(root.width, ...annotations.map((a) => a.x + a.width + 24)), height: root.height + (annotations.length ? Math.max(...annotations.map((a) => a.height)) + 44 : 0) } });
}

function route(a: Point, b: Point, obstacles: readonly Rect[]): Point[] {
  const midX = (a.x + b.x) / 2, midY = (a.y + b.y) / 2;
  const candidates: Point[][] = [
    [a, { x: b.x, y: a.y }, b], [a, { x: a.x, y: b.y }, b],
    [a, { x: midX, y: a.y }, { x: midX, y: b.y }, b],
    [a, { x: a.x, y: midY }, { x: b.x, y: midY }, b],
  ];
  const xs = [...new Set(obstacles.flatMap((o) => [o.x - 8, o.x + o.width + 8]))];
  const ys = [...new Set(obstacles.flatMap((o) => [o.y - 8, o.y + o.height + 8]))];
  for (const x of xs) candidates.push([a, { x, y: a.y }, { x, y: b.y }, b]);
  for (const y of ys) candidates.push([a, { x: a.x, y }, { x: b.x, y }, b]);
  const scored = candidates.map((points) => ({ points: simplify(points), cost: points.slice(1).reduce((sum, p, i) => sum + distance(points[i]!, p) + obstacles.filter((r) => intersects(points[i]!, p, r)).length * 1e7, 0) }));
  scored.sort((l, r) => l.cost - r.cost);
  if ((scored[0]?.cost ?? 0) >= 1e7) {
    const detour = obstacleRoute(a, b, obstacles);
    if (detour) return [...detour];
  }
  return scored[0]?.points ?? [a, b];
}

/** Place labels beside long segments; avoid nodes, other labels and group headings. */
export function refineLabels(view: MeasuredView, geometry: GeometryView): GeometryView {
  const occupied: Rect[] = [...geometry.nodes, ...geometry.annotations, ...geometry.groups.map((g) => ({ ...g, height: view.groups.find((item) => item.id === g.id)?.titleHeight ?? 38 }))];
  const edges = geometry.edges.map((edge) => {
    if (!edge.label) return edge;
    const label = edge.label;
    const candidates: Rect[] = [label];
    for (let i = 1; i < edge.points.length; i++) {
      const a = edge.points[i - 1]!, b = edge.points[i]!;
      for (const t of [0.5, 0.25, 0.75]) {
        const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
        if (a.y === b.y) for (const sign of [-1, 1]) candidates.push({ ...label, x: x - label.width / 2, y: sign < 0 ? y - label.height - 6 : y + 6 });
        else for (const sign of [-1, 1]) candidates.push({ ...label, x: sign < 0 ? x - label.width - 6 : x + 6, y: y - label.height / 2 });
      }
    }
    const cost = (r: Rect) => occupied.filter((o) => overlap(inflate(r, 3), o)).length * 1e8 + (r.x < 0 || r.y < 0 || r.x + r.width > geometry.bounds.width || r.y + r.height > geometry.bounds.height ? 1e7 : 0) + distance(r, label);
    candidates.sort((a, b) => cost(a) - cost(b));
    const chosen = candidates[0]!;
    occupied.push(chosen);
    return { ...edge, label: { ...label, ...chosen } };
  });
  return { ...geometry, edges };
}

function simplify(points: readonly Point[]): Point[] {
  const unique = points.filter((p, i) => i === 0 || p.x !== points[i - 1]!.x || p.y !== points[i - 1]!.y);
  return unique.filter((p, i) => i === 0 || i === unique.length - 1 || !((unique[i - 1]!.x === p.x && unique[i + 1]!.x === p.x) || (unique[i - 1]!.y === p.y && unique[i + 1]!.y === p.y)));
}

function refineRoutes(view: MeasuredView, geometry: GeometryView): GeometryView {
  const edges = geometry.edges.map((edge) => {
    const semantic = view.edges.find((e) => e.id === edge.id);
    const obstacles = [
      ...geometry.nodes.map((node) => node.id === semantic?.from || node.id === semantic?.to ? node : inflate(node, 6)),
      ...geometry.groups.map((group) => ({ ...group, height: view.groups.find((g) => g.id === group.id)?.titleHeight ?? 38 })),
    ];
    if (edge.points.length < 2 || !edge.points.slice(1).some((point, i) => obstacles.some((rect) => segmentHitsRect(edge.points[i]!, point, rect)))) return edge;
    const points = obstacleRoute(edge.points[0]!, edge.points[edge.points.length - 1]!, obstacles);
    return points ? { ...edge, points } : edge;
  });
  return { ...geometry, edges };
}
function distance(a: Point, b: Point): number { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }
function inflate(r: Rect, padding: number): Rect { return { x: r.x - padding, y: r.y - padding, width: r.width + padding * 2, height: r.height + padding * 2 }; }
function overlap(a: Rect, b: Rect): boolean { return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height; }
function intersects(a: Point, b: Point, r: Rect): boolean { return a.x === b.x ? a.x > r.x && a.x < r.x + r.width && Math.max(a.y, b.y) > r.y && Math.min(a.y, b.y) < r.y + r.height : a.y > r.y && a.y < r.y + r.height && Math.max(a.x, b.x) > r.x && Math.min(a.x, b.x) < r.x + r.width; }
