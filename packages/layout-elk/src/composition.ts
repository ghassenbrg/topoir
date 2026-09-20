import { analyzeGeometry, type QualityReport, type GeometryView, type GeometryNode, type GeometryGroup, type GeometryEdge, type GeometryPort, type GeometryAnnotation, type LayoutResult, type LayoutEngine, type MeasuredView, type Point, type Rect, type MeasuredNode } from "@topoir/core";
import { ElkLayoutEngine } from "./index.js";
import { obstacleRoute, segmentHitsRect } from "./routing.js";
import { banded, type BandedSpacing } from "./banded.js";
import { orderForReading, ordersAlongReading, spinePositions, type OrderingHints } from "./ordering.js";

/** Compiler-owned composition. Fixed candidate order is also the tie-break order. */
export class CompositionEngine implements LayoutEngine {
  readonly id = "topoir-composition-v1";

  /**
   * @param hints what the caller's spine analysis found: which relationships are feedback
   * and must not order the layout, and which components the primary path runs through.
   * Empty by default, so nothing changes for a caller that does not supply one.
   */
  async layout(view: MeasuredView, hints: OrderingHints = {}): Promise<LayoutResult> {
    const kind = view.design?.composition ?? "topology";
    if (["sequence", "comparison", "swimlanes", "architecture-map"].includes(kind) && view.edges.some((edge) => edge.sourcePort || edge.targetPort)) {
      return { diagnostics: [{ code: "TOP402_COMPOSITION_PORT_UNSUPPORTED", severity: "error", message: `${kind} does not yet support explicit endpoint ports. Use topology/layers or omit the port constraints.` }] };
    }
    if (kind === "sequence") return { geometry: sequence(view), diagnostics: [], metrics: { candidatesEvaluated: 1 } };
    if (kind === "comparison" || kind === "swimlanes" || kind === "architecture-map") {
      // Lane distribution separates bundled connectors but costs bends, so let the score
      // decide rather than imposing it.
      const routings: [boolean, LaneOrder][] = [[true, "fan"], [true, "reach"], [false, "fan"]];
      const evaluated = routings.map(([distributeLanes, laneOrder]) => {
        const geometry = panels(view, kind, distributeLanes, laneOrder, hints);
        return { geometry, score: compositionScore(view, geometry) };
      });
      evaluated.sort((left, right) => left.score - right.score);
      const chosen = evaluated[0]!;
      return { geometry: chosen.geometry, diagnostics: [], metrics: { candidatesEvaluated: evaluated.length, compositionScore: chosen.score } };
    }
    if (kind === "architecture") {
      // Compiler-owned composition: bands are chosen here, so the free parameters are how
      // much room to give them and how connectors share a component side. Candidates are
      // ordered best-first and evaluation stops at the first defect-free one, because
      // scoring all nine costs several times a clean result and buys nothing.
      // A refinement budget that scales with the problem. Every candidate re-routes the
      // whole graph, so nine of them on a dense model costs tens of seconds for a
      // marginal gain; a small model can afford the full search.
      const density = view.edges.length;
      const allSpacings: BandedSpacing[] = [
        { node: 36, layer: 76 },
        { node: 48, layer: 104 },
        { node: 28, layer: 60 },
      ];
      const allRoutings: [boolean, LaneOrder][] = [[true, "fan"], [true, "reach"], [false, "fan"]];
      const spacings = density > 45 ? allSpacings.slice(0, 1) : density > 24 ? allSpacings.slice(0, 2) : allSpacings;
      const routings = density > 45 ? allRoutings.slice(0, 2) : allRoutings;
      // Ranked by how many measurable defects remain, then by the weighted score. A
      // crossing is a legibility cost; a hidden connector or a clipped label is a defect,
      // and no amount of weighting should let the second win.
      let best: { geometry: GeometryView; score: number; defects: number } | undefined;
      let evaluated = 0;
      for (const spacing of spacings) {
        const placed = banded(view, spacing, hints);
        for (const [distributeLanes, laneOrder] of routings) {
          const routed = separateCoincidentRoutes(view, refineRoutes(view, { ...placed, edges: routeEdges(view, placed.nodes, placed.groups, distributeLanes, laneOrder) }));
          const annotations = placeAnnotations(view, routed.nodes, routed.groups, routed.edges, placed.bounds.height);
          const extents = [...routed.nodes, ...routed.groups, ...annotations];
          const geometry = refineLabels(view, {
            ...routed,
            annotations,
            bounds: {
              x: 0,
              y: 0,
              width: Math.max(0, ...extents.map((rect) => rect.x + rect.width)) + 24,
              height: Math.max(0, ...extents.map((rect) => rect.y + rect.height)) + 24,
            },
          });
          evaluated += 1;
          // One analysis per candidate. This used to run three times — once for the
          // score, once for the defect count and once for the early exit.
          const report = analyzeGeometry(view, geometry);
          const score = scoreOf(report, geometry);
          const defects = defectsOf(report);
          if (!best || defects < best.defects || (defects === best.defects && score < best.score)) {
            best = { geometry, score, defects };
          }
          // Stopping early is only safe when the candidate is good on every axis the
          // score can see. Without the aspect condition the first geometrically legal
          // candidate won outright and the aspect term was never compared at all, which
          // is how a clean layout could still be an unusable shape.
          if (defects === 0 && report.metrics.edgeCrossings === 0 && report.metrics.aspectDeviation <= ASPECT_TOLERANCE) {
            return { geometry, diagnostics: [], metrics: { candidatesEvaluated: evaluated, compositionScore: score } };
          }
        }
      }
      if (!best) return { diagnostics: [{ code: "TOP400_LAYOUT_FAILED", severity: "error", message: "No composition candidate could be laid out." }] };
      return { geometry: best.geometry, diagnostics: [], metrics: { candidatesEvaluated: evaluated, compositionScore: best.score } };
    }
    const candidates: { result: LayoutResult; score: number }[] = [];
    const optimize = view.design?.optimize !== false && view.design !== undefined;
    const settle = async (seed: number, spacing: MeasuredView["layout"]["spacing"], wrap: boolean) => {
      const result = await new ElkLayoutEngine({ seed, wrap }).layout({ ...view, layout: { ...view.layout, spacing } });
      if (!result.geometry) return result;
      const geometry = refineLabels(view, separateCoincidentRoutes(view, optimize ? refineRoutes(view, result.geometry) : result.geometry));
      candidates.push({ result: { ...result, geometry }, score: compositionScore(view, geometry) });
      return { ...result, geometry };
    };
    for (const [seed, spacing] of (optimize ? [[1, view.layout.spacing], [7, "compact"], [19, "normal"]] : [[1, view.layout.spacing]]) as [number, MeasuredView["layout"]["spacing"]][]) {
      const result = await settle(seed, spacing, false);
      if (!result.geometry && !candidates.length && !optimize) return result;
    }
    // A layered graph does not wrap on its own, so a long pipeline runs off to one side
    // for as far as it needs — a 120-node chain measured 37,491x370 with every geometric
    // metric clean. Wrapping re-reads that as stacked rows, which is right for a ribbon
    // and wrong for a small diagram: wrapping the three-node quickstart hit the aspect
    // target exactly and was plainly worse, because its one straight connector became an
    // S-bend around two rows. So the trigger is length, not ratio — a diagram is only
    // re-cut once it is both off-target and too long to read across — and the wrapped
    // candidate still has to win on score.
    const worst = candidates.reduce(
      (acc, entry) => {
        if (!entry.result.geometry) return acc;
        const { metrics } = analyzeGeometry(view, entry.result.geometry);
        const extent = Math.max(entry.result.geometry.bounds.width, entry.result.geometry.bounds.height);
        return { deviation: Math.min(acc.deviation, metrics.aspectDeviation), extent: Math.min(acc.extent, extent) };
      },
      { deviation: Infinity, extent: Infinity },
    );
    if (candidates.length > 0 && worst.deviation > ASPECT_TOLERANCE && worst.extent > LEGIBLE_EXTENT) {
      await settle(1, view.layout.spacing, true);
    }
    candidates.sort((a, b) => a.score - b.score);
    const best = candidates[0];
    if (!best) return { diagnostics: [{ code: "TOP400_LAYOUT_FAILED", severity: "error", message: "No composition candidate could be laid out." }] };
    return { ...best.result, metrics: { ...best.result.metrics, candidatesEvaluated: candidates.length, compositionScore: best.score } };
  }
}

/**
 * Off-target by more than 3x in either direction. Mirrors the tolerance the quality model
 * warns at, so a candidate is never returned in a shape the analyzer then reports.
 */
const ASPECT_TOLERANCE = Math.log(3);

/**
 * How far a diagram may run along one axis before it stops being readable across. At the
 * usual card width this is roughly a dozen columns; past it the canvas is a ribbon that
 * no screen or slide shows at once, which is the only case where re-cutting the layout
 * is worth the reading order it costs.
 */
const LEGIBLE_EXTENT = 2600;

/** How many measurable defects remain. Crossings are a legibility cost, not a defect. */
function defectCount(view: MeasuredView, geometry: GeometryView): number {
  return defectsOf(analyzeGeometry(view, geometry));
}

function defectsOf({ metrics }: QualityReport): number {
  return (
    metrics.nodeOverlaps +
    metrics.edgeNodeIntersections +
    metrics.endpointBodyCrossings +
    metrics.nonOrthogonalSegments +
    metrics.emptyRoutes +
    metrics.droppedRelationships +
    metrics.droppedComponents +
    metrics.droppedLabels +
    metrics.labelOverlaps +
    metrics.annotationOverlaps +
    metrics.groupTitleIntersections +
    metrics.coincidentEdgeSegments +
    metrics.illegalBoundaryCrossings
  );
}

export function compositionScore(view: MeasuredView, geometry: GeometryView): number {
  return scoreOf(analyzeGeometry(view, geometry), geometry);
}

/**
 * Weights. The aspect term carries 4000 because at 500 it was worth half an edge
 * crossing, so the scorer preferred a 9:1 ribbon nobody can read over a single crossing;
 * at 4000 a 3x miss costs about four crossings, which is the trade actually wanted.
 */
function scoreOf(q: QualityReport, geometry: GeometryView): number {
  const defects = q.diagnostics.filter((d) => d.severity === "error").length;
  let length = 0, bends = 0;
  for (const edge of geometry.edges) {
    bends += Math.max(0, edge.points.length - 2);
    for (let i = 1; i < edge.points.length; i++) length += distance(edge.points[i - 1]!, edge.points[i]!);
  }
  return (q.metrics.droppedRelationships + q.metrics.droppedComponents + q.metrics.droppedLabels) * 1e12 + defects * 1e9 + (q.metrics.labelOverlaps + q.metrics.annotationOverlaps + q.metrics.groupTitleIntersections) * 1e6 + q.metrics.endpointBodyCrossings * 20000 + q.metrics.illegalBoundaryCrossings * 10000 + q.metrics.coincidentEdgeSegments * 3000 + q.metrics.edgeCrossings * 1000 + q.metrics.aspectDeviation * 4000 + bends * 8 + length * 0.015;
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

interface Block { id: string; width: number; height: number; node?: MeasuredNode; children?: { block: Block; x: number; y: number }[]; parent?: string; order?: number | undefined; members: readonly string[] }

function panels(view: MeasuredView, kind: "comparison" | "swimlanes" | "architecture-map", distributeLanes: boolean, laneOrder: LaneOrder, hints: OrderingHints = {}): GeometryView {
  const spineIndex = spinePositions(hints.spine);
  const horizontal = view.layout.direction === "right" || view.layout.direction === "left";
  const membersOf = (groupId: string): string[] => [
    ...view.nodes.filter((node) => node.group === groupId).map((node) => node.id),
    ...view.groups.filter((child) => child.parent === groupId).flatMap((child) => membersOf(child.id)),
  ];
  const build = (id?: string): Block => {
    const group = view.groups.find((item) => item.id === id);
    // Sibling boundaries and sibling components are one sequence, not two. Listing every
    // boundary before every component put a load balancer that is step 3 of the author's
    // own story behind the two components it feeds, purely because it is not a boundary.
    // The root arranges regions into rows along the reading direction; a nested container
    // follows its own mode, and only orders by the path when that mode runs the same way.
    const mode = id === undefined ? "row" : view.groups.find((item) => item.id === id)?.layout.mode === "auto" ? "column" : view.groups.find((item) => item.id === id)?.layout.mode ?? "column";
    const along = id === undefined || ordersAlongReading(mode, horizontal) ? spineIndex : new Map<string, number>();
    const blocks: Block[] = orderForReading([
      ...view.groups.filter((item) => item.parent === id).map((item) => ({ ...build(item.id), order: item.order, members: membersOf(item.id) })),
      ...view.nodes.filter((item) => item.group === id).map((node) => ({ id: node.id, width: node.width, height: node.height, node, order: node.order, members: [node.id] })),
    ], along);
    const root = id === undefined;
    if (root && kind === "comparison") {
      const panels = blocks.filter((block) => block.node === undefined);
      const shared = blocks.filter((block) => block.node !== undefined);
      const panelGap = 180, sharedGap = 56, pad = 24;
      const panelWidth = panels.reduce((sum, block) => sum + block.width, 0) + Math.max(0, panels.length - 1) * panelGap;
      const sharedWidth = shared.reduce((sum, block) => sum + block.width, 0) + Math.max(0, shared.length - 1) * sharedGap;
      const width = Math.max(panelWidth, sharedWidth) + pad * 2;
      const sharedHeight = Math.max(0, ...shared.map((block) => block.height));
      const panelHeight = Math.max(0, ...panels.map((block) => block.height));
      const sharedStart = pad + (width - pad * 2 - sharedWidth) / 2;
      const panelStart = pad + (width - pad * 2 - panelWidth) / 2;
      let cursor = sharedStart;
      const sharedChildren = shared.map((block) => { const child = { block, x: cursor, y: pad }; cursor += block.width + sharedGap; return child; });
      cursor = panelStart;
      const panelY = pad + (shared.length ? sharedHeight + 72 : 0);
      const panelChildren = panels.map((block) => { const child = { block, x: cursor, y: panelY }; cursor += block.width + panelGap; return child; });
      return { id: "__root", width, height: panelY + panelHeight + pad, children: [...sharedChildren, ...panelChildren], members: [] };
    }
    if (root && kind === "architecture-map") {
      const regions = blocks.filter((block) => block.node === undefined);
      const shared = blocks.filter((block) => block.node !== undefined);
      const pad = 24, gap = 64, columnGap = 120;
      // Regions read in the order the primary path meets them, wrapped into rows.
      //
      // They used to be one lead region on the left with every other region stacked in a
      // column beside it. That shape puts the deepest component of the largest region at
      // maximum x, so the next step of the path — in the region below — is a long journey
      // back to the left, and every connector leaving that component crowds one face of
      // it. Rows in reading order keep each step near the last one.
      const rows = bestRowSplit(regions.map((block) => block), columnGap, gap, view.layout.aspectRatio > 0 ? view.layout.aspectRatio : 1.6);
      const rowWidth = (row: readonly Block[]): number =>
        row.reduce((sum, block) => sum + block.width, 0) + Math.max(0, row.length - 1) * columnGap;
      const rowHeight = (row: readonly Block[]): number => Math.max(0, ...row.map((block) => block.height));
      const regionsWidth = Math.max(0, ...rows.map(rowWidth));
      const regionsHeight = rows.reduce((sum, row) => sum + rowHeight(row), 0) + Math.max(0, rows.length - 1) * gap;
      const sharedWidth = shared.reduce((sum, block) => sum + block.width, 0) + Math.max(0, shared.length - 1) * gap;
      const width = Math.max(regionsWidth, sharedWidth) + pad * 2;
      const sharedHeight = Math.max(0, ...shared.map((block) => block.height));
      let cursor = pad + (width - pad * 2 - sharedWidth) / 2;
      const sharedChildren = shared.map((block) => { const child = { block, x: cursor, y: pad }; cursor += block.width + gap; return child; });
      const regionY = pad + (shared.length ? sharedHeight + gap : 0);
      const children: { block: Block; x: number; y: number }[] = [...sharedChildren];
      let y = regionY;
      for (const row of rows) {
        const band = rowHeight(row);
        let x = pad;
        for (const block of row) {
          // Centred in its band, so a short region beside a tall one does not read as
          // belonging to the top of it.
          children.push({ block, x, y: y + (band - block.height) / 2 });
          x += block.width + columnGap;
        }
        y += band + gap;
      }
      return { id: "__root", width, height: regionY + regionsHeight + pad, children, members: [] };
    }
    const cols = mode === "row" ? Math.max(1, blocks.length) : mode === "grid" || mode === "pack" ? group?.layout.columns ?? 2 : 1;
    const gap = root ? (kind === "comparison" ? 180 : 96) : group?.layout.gap ?? 48;
    const pad = root ? 24 : 28;
    const top = root ? 24 : 62;
    const colWidths = Array.from({ length: cols }, (_, col) => Math.max(0, ...blocks.filter((_, i) => i % cols === col).map((block) => block.width)));
    const rows = Math.ceil(blocks.length / cols);
    const rowHeights = Array.from({ length: rows }, (_, row) => Math.max(0, ...blocks.slice(row * cols, (row + 1) * cols).map((block) => block.height)));
    const children = blocks.map((block, i) => ({ block, x: pad + colWidths.slice(0, i % cols).reduce((a, b) => a + b + gap, 0), y: top + rowHeights.slice(0, Math.floor(i / cols)).reduce((a, b) => a + b + gap, 0) }));
    return { id: id ?? "__root", width: Math.max(group ? group.labelText.width + 56 : 0, pad * 2 + colWidths.reduce((a, b) => a + b, 0) + (cols - 1) * gap), height: top + pad + rowHeights.reduce((a, b) => a + b, 0) + Math.max(0, rows - 1) * gap, children, members: [], ...(group?.parent ? { parent: group.parent } : {}) };
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
  // No route-separation pass here, unlike the banded and layered families.
  //
  // Adding one was tried and reverted. Across the trust-zone content at eight aspect
  // targets it changed exactly one result and made it worse — 2 coincident segments became
  // 3 — because `separateOnce` reroutes through a grid search tuned to banded obstacles and
  // a panel row gives it a different structure to work with. Panel layouts *can* still
  // produce coincident routes (2 at a 1.6 target on that content) and nothing removes them;
  // that is an open routing defect for T18/T19, not something to paper over with a stage
  // that measurably does not help here.
  const edges = routeEdges(view, nodes, groups, distributeLanes, laneOrder);
  const annotations = placeAnnotations(view, nodes, groups, edges, root.height);
  return refineLabels(view, { id: view.id, nodes, groups, edges, annotations, bounds: { x: 0, y: 0, width: Math.max(root.width, ...annotations.map((a) => a.x + a.width + 24)), height: root.height + (annotations.length ? Math.max(...annotations.map((a) => a.height)) + 44 : 0) } });
}

/**
 * Wrap regions into the rows that come closest to the shape the author asked for.
 *
 * The split changes the bounding box and nothing else — routing quality is decided after
 * placement — so aspect is exactly the right thing to choose it by. Regions stay in reading
 * order within and across rows; only where the rows break is free.
 *
 * Every way of breaking `n` regions into consecutive rows is tried while that is cheap.
 * Beyond that the candidates are greedy wraps at each prefix width, which is a small
 * spread of sensible shapes rather than an exhaustive one.
 */
export function bestRowSplit<T extends { readonly width: number; readonly height: number }>(
  regions: readonly T[],
  columnGap: number,
  rowGap: number,
  target: number,
): T[][] {
  if (regions.length <= 1) return regions.length ? [[...regions]] : [];
  const shapeOf = (rows: readonly (readonly T[])[]): { width: number; height: number } => ({
    width: Math.max(0, ...rows.map((row) => row.reduce((sum, block) => sum + block.width, 0) + Math.max(0, row.length - 1) * columnGap)),
    height: rows.reduce((sum, row) => sum + Math.max(0, ...row.map((block) => block.height)), 0) + Math.max(0, rows.length - 1) * rowGap,
  });
  const split = (sizes: readonly number[]): T[][] => {
    const rows: T[][] = [];
    let cursor = 0;
    for (const size of sizes) { rows.push(regions.slice(cursor, cursor + size)); cursor += size; }
    if (cursor < regions.length) rows.push(regions.slice(cursor));
    return rows;
  };
  const candidates: T[][][] = [];
  if (regions.length <= 6) {
    // Every composition of n: each of the n-1 gaps is either a row break or not.
    for (let mask = 0; mask < 1 << (regions.length - 1); mask += 1) {
      const sizes: number[] = [];
      let run = 1;
      for (let gap = 0; gap < regions.length - 1; gap += 1) {
        if (mask & (1 << gap)) { sizes.push(run); run = 1; } else run += 1;
      }
      sizes.push(run);
      candidates.push(split(sizes));
    }
  } else {
    const budgets = new Set<number>([Math.max(...regions.map((block) => block.width))]);
    let running = 0;
    for (const [index, block] of regions.entries()) { running += block.width + (index ? columnGap : 0); budgets.add(running); }
    for (const budget of budgets) {
      const rows: T[][] = [[]];
      let used = 0;
      for (const block of regions) {
        const extra = (rows[rows.length - 1]!.length ? columnGap : 0) + block.width;
        if (rows[rows.length - 1]!.length && used + extra > budget) { rows.push([]); used = 0; }
        rows[rows.length - 1]!.push(block);
        used += rows[rows.length - 1]!.length === 1 ? block.width : extra;
      }
      candidates.push(rows);
    }
  }
  let best: { rows: T[][]; deviation: number } | undefined;
  for (const rows of candidates) {
    const { width, height } = shapeOf(rows);
    if (width <= 0 || height <= 0) continue;
    const deviation = Math.abs(Math.log(width / height / target));
    // Ties go to fewer rows: a wider, shallower arrangement reads across in one sweep.
    if (!best || deviation < best.deviation - 1e-9 || (Math.abs(deviation - best.deviation) <= 1e-9 && rows.length < best.rows.length)) {
      best = { rows, deviation };
    }
  }
  return best?.rows ?? [[...regions]];
}

/**
 * Pad an obstacle, but never so far that it swallows one of the route's own endpoints.
 *
 * The router has to drop an obstacle that encloses an endpoint, because the endpoint
 * would otherwise be unreachable. Padding a boundary by a few pixels is enough to engulf
 * a component sitting just outside it, and dropping the boundary then lets the connector
 * cut straight through a region it should never enter. Reducing the padding keeps the
 * barrier.
 */
function paddedClear(rect: Rect, padding: number, points: readonly Point[]): Rect {
  const encloses = (candidate: Rect, point: Point) =>
    point.x > candidate.x && point.x < candidate.x + candidate.width &&
    point.y > candidate.y && point.y < candidate.y + candidate.height;
  for (let amount = padding; amount > 0; amount -= 2) {
    const candidate = inflate(rect, amount);
    if (!points.some((point) => encloses(candidate, point))) return candidate;
  }
  return rect;
}

/** Every boundary a component sits inside, memoised per view. */
const ancestorCache = new WeakMap<MeasuredView, Map<string, Set<string>>>();
function ancestorsOf(view: MeasuredView, nodeId: string): Set<string> {
  let cache = ancestorCache.get(view);
  if (!cache) {
    cache = new Map();
    const parentOfGroup = new Map(view.groups.map((group) => [group.id, group.parent]));
    for (const node of view.nodes) {
      const chain = new Set<string>();
      let current = node.group;
      while (current !== undefined && !chain.has(current)) {
        chain.add(current);
        current = parentOfGroup.get(current);
      }
      cache.set(node.id, chain);
    }
    ancestorCache.set(view, cache);
  }
  return cache.get(nodeId) ?? new Set();
}

/**
 * Everything a connector must route around.
 *
 * The same list is used when routes are first laid and whenever a repair pass reroutes
 * one. The repair passes previously treated only boundary headings as obstacles and
 * ignored the boundaries themselves, so a repaired connector could cut straight through a
 * region it had no business entering — the most common boundary defect in the corpus.
 */
function routingObstacles(
  view: MeasuredView,
  geometry: { readonly nodes: readonly GeometryNode[]; readonly groups: readonly GeometryGroup[] },
  from: string | undefined,
  to: string | undefined,
  ends: readonly Point[],
  nodePadding: number,
): { obstacles: Rect[]; endpoints: Rect[]; crossOnce: Rect[] } {
  const belongs = (nodeId: string | undefined, groupId: string): boolean =>
    nodeId !== undefined && ancestorsOf(view, nodeId).has(groupId);
  const endpoints = geometry.nodes.filter((node) => node.id === from || node.id === to);
  const headings = geometry.groups.map((group) => ({
    ...group,
    height: view.groups.find((item) => item.id === group.id)?.titleHeight ?? 38,
  }));
  const outside = geometry.groups.filter((group) => !belongs(from, group.id) && !belongs(to, group.id));
  const crossOnce = geometry.groups.filter((group) => belongs(from, group.id) !== belongs(to, group.id));
  return {
    obstacles: [
      ...endpoints,
      ...geometry.nodes.filter((node) => node.id !== from && node.id !== to).map((node) => paddedClear(node, nodePadding, ends)),
      ...headings,
      ...outside.map((group) => paddedClear(group, 6, ends)),
    ],
    endpoints,
    crossOnce,
  };
}

export type LaneOrder = "fan" | "reach";

/**
 * Route every edge around the composition's own obstacles.
 *
 * An endpoint that names a port leaves through that port's side on a short stub, so the
 * arrow visibly belongs to the compartment it was measured against. Other endpoints leave
 * through the side facing the target. Both endpoint silhouettes, every other component,
 * every boundary heading and every boundary neither endpoint belongs to are obstacles.
 */
export function routeEdges(
  view: MeasuredView,
  nodes: readonly GeometryNode[],
  groups: readonly GeometryGroup[],
  distributeLanes = true,
  laneOrder: LaneOrder = "fan",
): GeometryEdge[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const belongs = (nodeId: string, groupId: string): boolean => {
    let current = view.nodes.find((node) => node.id === nodeId)?.group;
    while (current) {
      if (current === groupId) return true;
      current = view.groups.find((group) => group.id === current)?.parent;
    }
    return false;
  };
  const outward = (side: GeometryPort["side"], stub: number): Point =>
    side === "west" ? { x: -stub, y: 0 } : side === "east" ? { x: stub, y: 0 } : side === "north" ? { x: 0, y: -stub } : { x: 0, y: stub };

  // Which side of each component every endpoint leaves through. An endpoint that names a
  // port is already fixed to its measured compartment.
  const attachments = view.edges.map((edge) => {
    const source = nodeById.get(edge.from)!;
    const target = nodeById.get(edge.to)!;
    const sourcePort = edge.sourcePort === undefined ? undefined : source.ports.find((port) => port.id === edge.sourcePort);
    const targetPort = edge.targetPort === undefined ? undefined : target.ports.find((port) => port.id === edge.targetPort);
    const horizontal = Math.abs(source.x - target.x) > Math.abs(source.y - target.y);
    const forward = horizontal ? source.x < target.x : source.y < target.y;
    const sourceSide: GeometryPort["side"] = sourcePort ? sourcePort.side : horizontal ? (forward ? "east" : "west") : forward ? "south" : "north";
    const targetSide: GeometryPort["side"] = targetPort ? targetPort.side : horizontal ? (forward ? "west" : "east") : forward ? "north" : "south";
    return { edge, source, target, sourcePort, targetPort, sourceSide, targetSide };
  });

  /**
   * Spread the free endpoints that share one component side into lanes. Without this every
   * connector into a side collapses onto the same point and several relationships are
   * drawn as a single line. Lane order follows the far endpoint's position across the
   * side, so distributing them does not introduce crossings.
   */
  const lanes = new Map<string, number>();
  const corridors = new Map<string, number>();
  // One lane sequence per component side, whatever direction each connector runs in.
  // Separating arrivals from departures gives both the same fractions, so a connector
  // leaving a component lands on the point another one arrives at and the two are drawn
  // as a single line.
  type Attachment = (typeof attachments)[number];
  const buckets = new Map<string, { attachment: Attachment; role: "source" | "target" }[]>();
  for (const attachment of attachments) {
    for (const role of ["source", "target"] as const) {
      const fixed = role === "source" ? attachment.sourcePort : attachment.targetPort;
      if (fixed) continue;
      const node = role === "source" ? attachment.source : attachment.target;
      const side = role === "source" ? attachment.sourceSide : attachment.targetSide;
      const key = `${node.id}|${side}`;
      buckets.set(key, [...(buckets.get(key) ?? []), { attachment, role }]);
    }
  }
  if (distributeLanes) {
    for (const [key, bucket] of buckets) {
      if (bucket.length < 2) continue;
      const [nodeId, side] = key.split("|") as [string, GeometryPort["side"]];
      const across = side === "east" || side === "west" ? "y" : "x";
      const node = nodeById.get(nodeId)!;
      const far = (entry: (typeof bucket)[number]) =>
        entry.role === "source" ? entry.attachment.target : entry.attachment.source;
      // Lane order follows how far each connector has to run, coarsely bucketed: the
      // longest run takes the outermost lane, so its turn happens beyond every shorter
      // run and the horizontals nest instead of crossing. Runs of similar length fall in
      // the same bucket and are then ordered by the band they come from, which keeps
      // parallel approaches from a single column in their natural sequence.
      const runLength = (entry: (typeof bucket)[number]) => {
        const other = far(entry);
        return across === "y"
          ? Math.abs(other.x + other.width / 2 - (node.x + node.width / 2))
          : Math.abs(other.y + other.height / 2 - (node.y + node.height / 2));
      };
      const identity = (entry: (typeof bucket)[number]) => `${entry.attachment.edge.id}|${entry.role}`;
      const fanKey = (entry: (typeof bucket)[number]) => {
        const other = far(entry);
        return across === "y" ? other.y + other.height / 2 : other.x + other.width / 2;
      };
      // Two orderings are useful and neither wins everywhere, so both are scored.
      // "fan" spreads a bundle in the order of the components it reaches, which keeps a
      // fan-out monotone. "reach" gives the longest run the outermost lane, which keeps a
      // fan-in's long horizontals nested underneath the short ones.
      const ordered = [...bucket].sort((left, right) => {
        const primary =
          laneOrder === "fan"
            ? fanKey(left) - fanKey(right)
            : Math.round(runLength(left) / 64) - Math.round(runLength(right) / 64);
        if (primary !== 0) return primary;
        const secondary =
          laneOrder === "fan"
            ? Math.round(runLength(left) / 64) - Math.round(runLength(right) / 64)
            : fanKey(left) - fanKey(right);
        if (secondary !== 0) return secondary;
        return identity(left).localeCompare(identity(right), "en");
      });
      // A side that already carries measured route compartments keeps them: free
      // endpoints are distributed only across the part of the side the slots leave open.
      const measured = view.nodes.find((node) => node.id === nodeId);
      const reserved = (measured?.ports ?? []).flatMap((port) => (port.slot && (port.side === side || (port.side === "auto" && side === "east")) ? [port.slot] : []));
      const span = across === "y" ? (measured?.height ?? 1) : (measured?.width ?? 1);
      const blockedFrom = reserved.length === 0 ? 1 : Math.min(...reserved.map((slot) => (across === "y" ? slot.y : slot.x))) / Math.max(1, span);
      const limit = Math.max(0.2, blockedFrom);
      for (const [index, entry] of ordered.entries()) {
        lanes.set(identity(entry), (limit * (index + 1)) / (ordered.length + 1));
        // Each lane also turns at its own distance from the component, otherwise the
        // separated endpoints immediately rejoin into a single shared corridor.
        corridors.set(identity(entry), 18 + index * 16);
      }
    }
  }

  const sidePoint = (rect: Rect, side: GeometryPort["side"], fraction: number): Point =>
    side === "west" ? { x: rect.x, y: rect.y + rect.height * fraction }
    : side === "east" ? { x: rect.x + rect.width, y: rect.y + rect.height * fraction }
    : side === "north" ? { x: rect.x + rect.width * fraction, y: rect.y }
    : { x: rect.x + rect.width * fraction, y: rect.y + rect.height };

  // Deterministic order: longer runs are routed first so they claim the outer corridors
  // before the short connectors fill the cheap ones.
  const span = (entry: (typeof attachments)[number]) =>
    Math.abs(entry.source.x - entry.target.x) + Math.abs(entry.source.y - entry.target.y);
  const order = [...attachments].sort((left, right) => span(right) - span(left) || left.edge.id.localeCompare(right.edge.id, "en"));
  const taken: [Point, Point][] = [];
  const routed = new Map<string, GeometryEdge>();
  for (const { edge, source, target, sourcePort, targetPort, sourceSide, targetSide } of order) {
    const a: Point = sourcePort
      ? { x: sourcePort.x, y: sourcePort.y }
      : sidePoint(source, sourceSide, lanes.get(`${edge.id}|source`) ?? 0.5);
    const b: Point = targetPort
      ? { x: targetPort.x, y: targetPort.y }
      : sidePoint(target, targetSide, lanes.get(`${edge.id}|target`) ?? 0.5);

    // A compartment endpoint always stubs out so it visibly leaves the route row it is
    // drawn against. A laned endpoint stubs to its own corridor. Everything else leaves
    // directly, which keeps single connectors free of a pointless bend.
    const aStub = sourcePort ? 22 : (corridors.get(`${edge.id}|source`) ?? 0);
    const bStub = targetPort ? 22 : (corridors.get(`${edge.id}|target`) ?? 0);
    const aStep = aStub === 0 ? { x: 0, y: 0 } : outward(sourceSide, aStub);
    const bStep = bStub === 0 ? { x: 0, y: 0 } : outward(targetSide, bStub);
    const aFrom: Point = { x: a.x + aStep.x, y: a.y + aStep.y };
    const bTo: Point = { x: b.x + bStep.x, y: b.y + bStep.y };

    const { obstacles, crossOnce } = routingObstacles(view, { nodes, groups }, edge.from, edge.to, [a, b, aFrom, bTo], 10);
    const middle = route(aFrom, bTo, obstacles, taken, crossOnce, [source, target]);
    const points = simplify([a, ...middle, b]);
    for (let index = 1; index < points.length; index += 1) taken.push([points[index - 1]!, points[index]!]);
    const label = edge.labelText;
    routed.set(edge.id, {
      id: edge.id,
      points,
      ...(label
        ? {
            label: {
              x: (a.x + b.x) / 2 - (label.width + 14) / 2,
              y: (a.y + b.y) / 2 - label.height - 14,
              width: label.width + 14,
              height: label.height + 8,
              text: edge.label ?? edge.protocol ?? "",
            },
          }
        : {}),
    });
  }
  // Emit in document order so the scene graph stays stable.
  return view.edges.map((edge) => routed.get(edge.id)!);
}

/**
 * One edge's orthogonal route.
 *
 * `taken` carries the segments of the routes already chosen in this pass. Two connectors
 * that both have to bypass the same components would otherwise pick the same cheapest
 * corridor and be drawn on top of each other, so sharing a corridor is charged for. It is
 * a preference, not a prohibition: a route still takes a shared corridor when the
 * alternatives are far worse.
 */
function route(a: Point, b: Point, obstacles: readonly Rect[], taken: readonly [Point, Point][] = [], crossOnce: readonly Rect[] = [], protect: readonly Rect[] = []): Point[] {
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
  const scored = candidates.map((points) => {
    const simplified = simplify(points);
    let cost = 0;
    for (let index = 1; index < points.length; index += 1) {
      const start = points[index - 1]!, end = points[index]!;
      cost += distance(start, end);
      cost += obstacles.filter((rect) => intersects(start, end, rect)).length * 1e7;
      cost += sharedLength(start, end, taken) * 40;
    }
    // A boundary with one endpoint inside it should be entered once. A route that
    // wanders back out and in again reads as if it left the region and returned.
    for (const rect of crossOnce) cost += Math.abs(crossingCount(simplified, rect) - 1) * 6000;
    return { points: simplified, cost };
  });
  // The visibility-grid router is a peer candidate, not a last resort. It is the only one
  // that can find a route through a crowded scene, and scoring it against the cheap
  // candidates under the same cost function keeps simple connectors simple. It is also by
  // far the most expensive step, so it is skipped when a cheap candidate is already
  // faultless — it could not beat one.
  scored.sort((l, r) => l.cost - r.cost);
  const cheapest = scored[0];
  const flawless =
    cheapest !== undefined &&
    cheapest.cost < 1e7 &&
    cheapest.points.slice(1).every((point, index) => sharedLength(cheapest.points[index]!, point, taken) < 12) &&
    crossOnce.every((rect) => crossingCount(cheapest.points, rect) === 1);
  if (flawless) return cheapest.points;

  const lattice = obstacleRoute(a, b, obstacles, taken, protect);
  if (lattice && lattice.length >= 2) {
    const points = [...lattice];
    let cost = 0;
    for (let index = 1; index < points.length; index += 1) {
      const start = points[index - 1]!, end = points[index]!;
      cost += distance(start, end);
      cost += obstacles.filter((rect) => intersects(start, end, rect)).length * 1e7;
      cost += sharedLength(start, end, taken) * 40;
    }
    for (const rect of crossOnce) cost += Math.abs(crossingCount(points, rect) - 1) * 6000;
    // A lattice route bends more by nature, so only take it when it is genuinely better.
    scored.push({ points: simplify(points), cost: cost + Math.max(0, points.length - 3) * 10 });
  }
  scored.sort((l, r) => l.cost - r.cost);
  return scored[0]?.points ?? [a, b];
}

/** How many times a polyline passes through a rectangle's border. */
function crossingCount(points: readonly Point[], rect: Rect): number {
  const inside = (point: Point) =>
    point.x > rect.x && point.x < rect.x + rect.width && point.y > rect.y && point.y < rect.y + rect.height;
  let crossings = 0;
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1]!, end = points[index]!;
    const steps = Math.max(2, Math.ceil(distance(start, end) / 8));
    let previous = inside(start);
    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps;
      const current = inside({ x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t });
      if (current !== previous) crossings += 1;
      previous = current;
    }
  }
  return crossings;
}

/** How much of a segment runs along a segment that another route already occupies. */
function sharedLength(start: Point, end: Point, taken: readonly [Point, Point][]): number {
  const tolerance = 1.5;
  const vertical = Math.abs(start.x - end.x) < tolerance;
  let shared = 0;
  for (const [otherStart, otherEnd] of taken) {
    const otherVertical = Math.abs(otherStart.x - otherEnd.x) < tolerance;
    if (otherVertical !== vertical) continue;
    const axis = vertical ? "x" : "y";
    if (Math.abs(start[axis] - otherStart[axis]) > tolerance) continue;
    const along = vertical ? "y" : "x";
    const overlap =
      Math.min(Math.max(start[along], end[along]), Math.max(otherStart[along], otherEnd[along])) -
      Math.max(Math.min(start[along], end[along]), Math.min(otherStart[along], otherEnd[along]));
    if (overlap > shared) shared = overlap;
  }
  return Math.max(0, shared);
}

/** Place labels beside long segments; avoid nodes, other labels and group headings. */
export function refineLabels(view: MeasuredView, geometry: GeometryView): GeometryView {
  const occupied: Rect[] = [...geometry.nodes, ...geometry.annotations, ...geometry.groups.map((g) => ({ ...g, height: view.groups.find((item) => item.id === g.id)?.titleHeight ?? 38 }))];

  /**
   * Where a label may sit: alongside its own route, offset far enough to clear whatever
   * is next to it. Anchoring to the straight-line midpoint between endpoints leaves the
   * label floating in open space whenever the route bends, so candidates come from the
   * polyline itself and are scored against the polyline's midpoint.
   */
  const placements = (edge: GeometryEdge): { anchor: Point; candidates: Rect[] } => {
    const label = edge.label!;
    const anchor = midpointAlong(edge.points);
    const candidates: Rect[] = [];
    for (let i = 1; i < edge.points.length; i++) {
      const a = edge.points[i - 1]!, b = edge.points[i]!;
      if (distance(a, b) < label.height + 8) continue;
      for (const t of [0.5, 0.35, 0.65, 0.2, 0.8, 0.42, 0.58, 0.28, 0.72, 0.12, 0.88]) {
        const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
        // Several clearances, so a crowded corridor does not force an overlap.
        for (const clearance of [6, 20, 38, 60]) {
          if (a.y === b.y) for (const sign of [-1, 1]) candidates.push({ ...label, x: x - label.width / 2, y: sign < 0 ? y - label.height - clearance : y + clearance });
          else for (const sign of [-1, 1]) candidates.push({ ...label, x: sign < 0 ? x - label.width - clearance : x + clearance, y: y - label.height / 2 });
        }
      }
    }
    if (candidates.length === 0) candidates.push({ ...label, x: anchor.x - label.width / 2, y: anchor.y - label.height - 6 });
    return { anchor, candidates };
  };

  const collides = (rect: Rect) => occupied.some((other) => overlap(inflate(rect, 3), other));
  const outOfBounds = (rect: Rect) =>
    rect.x < 0 || rect.y < 0 || rect.x + rect.width > geometry.bounds.width || rect.y + rect.height > geometry.bounds.height;

  // Hardest first. Placing labels in edge order lets an easy label take the one free slot
  // a constrained label needed, so order by how many free positions each one still has.
  const pending = geometry.edges
    .map((edge, index) => ({ edge, index, ...(edge.label ? placements(edge) : { anchor: { x: 0, y: 0 }, candidates: [] as Rect[] }) }))
    .filter((entry) => entry.edge.label !== undefined);
  const freedom = new Map(pending.map((entry) => [entry.edge.id, entry.candidates.filter((rect) => !collides(rect) && !outOfBounds(rect)).length]));
  pending.sort((left, right) => (freedom.get(left.edge.id)! - freedom.get(right.edge.id)!) || left.index - right.index);

  const chosenById = new Map<string, Rect>();
  for (const { edge, anchor, candidates } of pending) {
    const cost = (rect: Rect) =>
      occupied.filter((other) => overlap(inflate(rect, 3), other)).length * 1e8 +
      (outOfBounds(rect) ? 1e7 : 0) +
      distance({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }, anchor);
    const chosen = [...candidates].sort((left, right) => cost(left) - cost(right))[0]!;
    occupied.push(chosen);
    chosenById.set(edge.id, chosen);
  }

  const edges = geometry.edges.map((edge) => {
    const chosen = chosenById.get(edge.id);
    return chosen && edge.label ? { ...edge, label: { ...edge.label, ...chosen } } : edge;
  });
  return { ...geometry, edges };
}

/**
 * Place notes beside what they explain.
 *
 * An annotation's `anchor` names the component, boundary or relationship it describes.
 * Positions are tried outward from that anchor and the first one that collides with
 * nothing is taken; an unanchored note, or one with nowhere free to go, falls back to a
 * row under the diagram. Without this a note is dropped in a corner and the reader has to
 * guess what it refers to.
 */
export function placeAnnotations(
  view: MeasuredView,
  nodes: readonly GeometryNode[],
  groups: readonly GeometryGroup[],
  edges: readonly GeometryEdge[],
  contentHeight: number,
): GeometryAnnotation[] {
  const anchors = new Map<string, Rect>();
  for (const node of nodes) anchors.set(node.id, node);
  for (const group of groups) anchors.set(group.id, group);
  for (const edge of edges) {
    if (edge.points.length < 2) continue;
    const mid = midpointAlong(edge.points);
    anchors.set(edge.id, { x: mid.x, y: mid.y, width: 1, height: 1 });
  }
  // Boundaries only block a note at their heading; their interior is fair game.
  const occupied: Rect[] = [
    ...nodes,
    ...groups.map((group) => ({ ...group, height: view.groups.find((item) => item.id === group.id)?.titleHeight ?? 38 })),
  ];

  const placed: GeometryAnnotation[] = [];
  let fallbackX = 24;
  for (const annotation of view.annotations) {
    const anchor = annotation.anchor === undefined ? undefined : anchors.get(annotation.anchor);
    let chosen: Rect | undefined;
    if (anchor) {
      const gap = 20;
      for (const distance of [gap, gap + 40, gap + 96, gap + 180]) {
        const candidates: Rect[] = [
          { x: anchor.x + anchor.width + distance, y: anchor.y, width: annotation.width, height: annotation.height },
          { x: anchor.x - annotation.width - distance, y: anchor.y, width: annotation.width, height: annotation.height },
          { x: anchor.x, y: anchor.y + anchor.height + distance, width: annotation.width, height: annotation.height },
          { x: anchor.x, y: anchor.y - annotation.height - distance, width: annotation.width, height: annotation.height },
          { x: anchor.x + anchor.width + distance, y: anchor.y + anchor.height + distance, width: annotation.width, height: annotation.height },
        ];
        chosen = candidates.find(
          (candidate) =>
            candidate.x >= 0 &&
            candidate.y >= 0 &&
            ![...occupied, ...placed].some((other) => overlap(inflate(candidate, 6), other)),
        );
        if (chosen) break;
      }
    }
    if (!chosen) {
      chosen = { x: fallbackX, y: contentHeight + 52, width: annotation.width, height: annotation.height };
      fallbackX += annotation.width + 24;
    }
    placed.push({ id: annotation.id, x: round2(chosen.x), y: round2(chosen.y), width: chosen.width, height: chosen.height });
  }
  return placed;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** The point halfway along a polyline by arc length, used to anchor that route's label. */
function midpointAlong(points: readonly Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  const first = points[0]!;
  if (points.length === 1) return first;
  let total = 0;
  for (let i = 1; i < points.length; i++) total += distance(points[i - 1]!, points[i]!);
  let travelled = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!, b = points[i]!;
    const length = distance(a, b);
    if (travelled + length >= total / 2) {
      const t = length === 0 ? 0 : (total / 2 - travelled) / length;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    travelled += length;
  }
  return points[points.length - 1]!;
}

function simplify(points: readonly Point[]): Point[] {
  const unique = points.filter((p, i) => i === 0 || p.x !== points[i - 1]!.x || p.y !== points[i - 1]!.y);
  return unique.filter((p, i) => i === 0 || i === unique.length - 1 || !((unique[i - 1]!.x === p.x && unique[i + 1]!.x === p.x) || (unique[i - 1]!.y === p.y && unique[i + 1]!.y === p.y)));
}

/**
 * Pull apart routes that are drawn on top of each other.
 *
 * Whatever produced the routes — the graph backend or this engine — two connectors can end
 * up sharing a long stretch of line, and the viewer then sees one relationship where the
 * model has two. Each offending route is re-routed once with every other route's segments
 * charged as occupied, and the new route is kept only when it genuinely shares less line
 * and still touches no component it does not belong to.
 */
/**
 * Shift interior segments that lie on top of each other apart.
 *
 * Rerouting cannot always help: when two connectors genuinely need the same corridor,
 * the only free lattice line is the one they are both on. Moving one of them a few pixels
 * sideways keeps both routes valid and makes two relationships visible as two lines. Only
 * interior segments move, so neither route leaves its endpoints, and a shift is kept only
 * when it hits nothing.
 */
function nudgeCoincidentSegments(view: MeasuredView, geometry: GeometryView): GeometryView {
  const minimum = 12;
  const step = 11;
  const edges = geometry.edges.map((edge) => ({ ...edge, points: [...edge.points] }));

  const blocked = (points: readonly Point[], obstacles: readonly Rect[]) =>
    points.slice(1).some((point, index) => obstacles.some((rect) => segmentHitsRect(points[index]!, point, rect)));

  // Obstacles depend only on the edge, so build them once rather than per pair.
  const context = new Map<string, { obstacles: Rect[]; crossOnce: Rect[] }>();
  for (const edge of edges) {
    const semantic = view.edges.find((candidate) => candidate.id === edge.id);
    const ends = [edge.points[0]!, edge.points[edge.points.length - 1]!];
    context.set(edge.id, routingObstacles(view, geometry, semantic?.from, semantic?.to, ends, 6));
  }

  for (let left = 0; left < edges.length; left += 1) {
    for (let right = left + 1; right < edges.length; right += 1) {
      const first = edges[left]!;
      const second = edges[right]!;
      const firstSegments = first.points.slice(1).map((point, i) => [first.points[i]!, point] as [Point, Point]);
      // A segment is interior only when both of its points are, so this starts at 2: at
      // index 1 the moved point is `points[0]`, the endpoint anchored to its component.
      // Shifting that detached the connector from the component it claims to connect,
      // by exactly `step` px, which the endpoint-attachment check now catches.
      for (let index = 2; index < second.points.length - 1; index += 1) {
        const start = second.points[index - 1]!;
        const end = second.points[index]!;
        if (sharedLength(start, end, firstSegments) < minimum) continue;
        const { obstacles, crossOnce } = context.get(second.id)!;
        // Moving a segment must not push the route in or out of a boundary it already
        // crosses correctly, so the crossing count may never get worse.
        const boundaryCost = (points: readonly Point[]) =>
          crossOnce.reduce((sum, rect) => sum + Math.abs(crossingCount(points, rect) - 1), 0);
        const before = boundaryCost(second.points);
        const vertical = Math.abs(start.x - end.x) < 1.5;
        for (const delta of [step, -step, step * 2, -step * 2]) {
          const moved = [...second.points];
          moved[index - 1] = vertical ? { ...start, x: start.x + delta } : { ...start, y: start.y + delta };
          moved[index] = vertical ? { ...end, x: end.x + delta } : { ...end, y: end.y + delta };
          if (blocked(moved, obstacles)) continue;
          if (sharedLength(moved[index - 1]!, moved[index]!, firstSegments) >= minimum) continue;
          if (boundaryCost(moved) > before) continue;
          second.points = moved;
          break;
        }
      }
    }
  }
  return { ...geometry, edges: edges.map((edge) => ({ ...edge, points: simplify(edge.points) })) };
}

function separateCoincidentRoutes(view: MeasuredView, geometry: GeometryView, passes?: number): GeometryView {
  // Each pass reroutes offending connectors through the grid search, so a dense model
  // gets fewer sweeps; the first pass does most of the work in every case.
  const budget = passes ?? (geometry.edges.length > 45 ? 1 : geometry.edges.length > 24 ? 2 : 3);
  // Moving one route frees the corridor another wanted, so repeat until nothing improves.
  let current = geometry;
  for (let pass = 0; pass < budget; pass += 1) {
    const next = separateOnce(view, current);
    if (next.edges.every((edge, index) => edge.points === current.edges[index]?.points)) return nudgeCoincidentSegments(view, next);
    current = next;
  }
  return nudgeCoincidentSegments(view, current);
}

function separateOnce(view: MeasuredView, geometry: GeometryView): GeometryView {
  const minimum = 12;
  const segmentsOf = (edge: GeometryEdge): [Point, Point][] =>
    edge.points.slice(1).map((point, index) => [edge.points[index]!, point] as [Point, Point]);
  const sharedWith = (edge: GeometryEdge, others: readonly GeometryEdge[]): number => {
    const taken = others.flatMap(segmentsOf);
    return Math.max(0, ...segmentsOf(edge).map(([start, end]) => sharedLength(start, end, taken)));
  };

  const edges = [...geometry.edges];
  // Shortest first: a long trunk keeps its corridor and the short connectors move aside.
  const order = [...edges]
    .map((edge, index) => ({ edge, index, length: segmentsOf(edge).reduce((sum, [start, end]) => sum + distance(start, end), 0) }))
    .sort((left, right) => left.length - right.length || left.edge.id.localeCompare(right.edge.id, "en"));

  for (const { index } of order) {
    const edge = edges[index]!;
    const others = edges.filter((_, position) => position !== index);
    const before = sharedWith(edge, others);
    if (before < minimum || edge.points.length < 2) continue;

    const semantic = view.edges.find((candidate) => candidate.id === edge.id);
    const start = edge.points[0]!;
    const end = edge.points[edge.points.length - 1]!;
    const { obstacles, endpoints, crossOnce } = routingObstacles(view, geometry, semantic?.from, semantic?.to, [start, end], 8);
    const points = simplify([start, ...route(start, end, obstacles, others.flatMap(segmentsOf), crossOnce, endpoints), end]);
    const candidate: GeometryEdge = { ...edge, points };
    const hitsSomething = segmentsOf(candidate).some(([from, to]) => obstacles.some((rect) => segmentHitsRect(from, to, rect)));
    if (hitsSomething) continue;
    if (sharedWith(candidate, others) >= before) continue;
    edges[index] = candidate;
  }
  return { ...geometry, edges };
}

function refineRoutes(view: MeasuredView, geometry: GeometryView): GeometryView {
  const edges = geometry.edges.map((edge) => {
    const semantic = view.edges.find((e) => e.id === edge.id);
    if (edge.points.length < 2) return edge;
    const start = edge.points[0]!;
    const end = edge.points[edge.points.length - 1]!;
    const { obstacles, endpoints } = routingObstacles(view, geometry, semantic?.from, semantic?.to, [start, end], 6);
    if (!edge.points.slice(1).some((point, i) => obstacles.some((rect) => segmentHitsRect(edge.points[i]!, point, rect)))) return edge;
    const points = obstacleRoute(start, end, obstacles, [], endpoints);
    return points ? { ...edge, points } : edge;
  });
  return { ...geometry, edges };
}
function distance(a: Point, b: Point): number { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }
function inflate(r: Rect, padding: number): Rect { return { x: r.x - padding, y: r.y - padding, width: r.width + padding * 2, height: r.height + padding * 2 }; }
function overlap(a: Rect, b: Rect): boolean { return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height; }
function intersects(a: Point, b: Point, r: Rect): boolean { return a.x === b.x ? a.x > r.x && a.x < r.x + r.width && Math.max(a.y, b.y) > r.y && Math.min(a.y, b.y) < r.y + r.height : a.y > r.y && a.y < r.y + r.height && Math.max(a.x, b.x) > r.x && Math.min(a.x, b.x) < r.x + r.width; }
