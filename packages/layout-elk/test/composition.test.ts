import { describe, expect, it } from "vitest";
import { analyzeGeometry, loadDocument, measureView, projectView, resolveTheme, type GeometryView, type MeasuredView } from "@topoir/core";
import { CompositionEngine, compositionScore } from "../src/composition.js";

/**
 * Guards the class of defect that the geometry model could not see: a diagram that
 * satisfies every placement and routing rule and is still the wrong shape to read.
 */

const ASPECT_TOLERANCE = Math.log(3);

function chain(count: number, options: { grouped?: boolean; labels?: boolean } = {}): MeasuredView {
  const { grouped = true, labels = true } = options;
  const groups = grouped
    ? Array.from({ length: Math.ceil(count / 12) }, (_, index) => ({ id: `ns-${index}`, kind: "namespace" }))
    : [];
  const document = loadDocument(
    JSON.stringify({
      apiVersion: "topoir.dev/v1alpha1",
      kind: "Architecture",
      metadata: { name: "chain" },
      model: {
        groups,
        nodes: Array.from({ length: count }, (_, index) => ({
          id: `svc-${index}`,
          kind: "service",
          ...(grouped ? { group: `ns-${Math.floor(index / 12)}` } : {}),
        })),
        edges: Array.from({ length: count - 1 }, (_, index) => ({
          id: `link-${index}`,
          from: `svc-${index}`,
          to: `svc-${index + 1}`,
          ...(labels ? { label: "request" } : {}),
        })),
      },
      views: [{ id: "overview", layout: { direction: "right", spacing: "compact" } }],
    }),
  ).document!;
  return measureView(projectView(document), resolveTheme("technical-clean"));
}

const layout = async (view: MeasuredView): Promise<GeometryView> => {
  const result = await new CompositionEngine().layout(view);
  expect(result.geometry, result.diagnostics.map((item) => item.message).join("; ")).toBeDefined();
  return result.geometry!;
};

describe("composition shape", () => {
  it("does not return a ribbon for a long chain", async () => {
    // Before the shape term reached the candidate search this compiled to 37,491x370 —
    // an aspect ratio of 101:1 — and reported no warnings and no defects at all.
    const geometry = await layout(chain(60));
    const { metrics } = analyzeGeometry(chain(60), geometry);
    expect(metrics.aspectDeviation).toBeLessThanOrEqual(ASPECT_TOLERANCE);
    expect(geometry.bounds.width / geometry.bounds.height).toBeLessThan(6);
  }, 60_000);

  it("reports the shape it produced", async () => {
    const view = chain(60);
    const { metrics } = analyzeGeometry(view, await layout(view));
    expect(metrics.aspectRatio).toBeGreaterThan(0);
    expect(metrics.inkCoverage).toBeGreaterThan(0);
    expect(metrics.inkCoverage).toBeLessThanOrEqual(1);
  }, 60_000);

  it("leaves a small diagram alone rather than wrapping it", async () => {
    // Wrapping a three-node chain reaches the aspect target and is plainly worse: its one
    // straight connector becomes an S-bend around two rows. Re-cutting is for ribbons.
    const view = chain(3, { grouped: false });
    const geometry = await layout(view);
    expect(geometry.bounds.height).toBeLessThan(400);
    expect(geometry.bounds.width).toBeGreaterThan(geometry.bounds.height);
  }, 60_000);

  it("keeps every declared edge label, whatever the backend returns", async () => {
    // The wrapped candidate is laid out without label boxes, because ELK's wrapping pass
    // throws on labelled edges. Labels then vanished from the diagram with every metric
    // still clean.
    const view = chain(60);
    const geometry = await layout(view);
    const declared = view.edges.filter((edge) => edge.labelText !== undefined);
    expect(declared.length).toBeGreaterThan(0);
    for (const edge of declared) {
      expect(geometry.edges.find((item) => item.id === edge.id)?.label?.text, edge.id).toBeTruthy();
    }
    expect(analyzeGeometry(view, geometry).metrics.droppedLabels).toBe(0);
  }, 60_000);

  it("is deterministic", async () => {
    const view = chain(24);
    expect(await layout(view)).toEqual(await layout(chain(24)));
  }, 60_000);
});

describe("compositionScore", () => {
  // Four components and two relationships, all of them placed and routed in every
  // candidate below, so the comparison is about shape and crossings alone and is not
  // swamped by the dropped-entity term.
  const view = measureView(
    projectView(
      loadDocument(
        JSON.stringify({
          apiVersion: "topoir.dev/v1alpha1",
          kind: "Architecture",
          metadata: { name: "score" },
          model: {
            nodes: ["a", "b", "c", "d"].map((id) => ({ id, kind: "service" })),
            edges: [
              { id: "first", from: "a", to: "b" },
              { id: "second", from: "c", to: "d" },
            ],
          },
          views: [{ id: "overview", layout: { direction: "right" } }],
        }),
      ).document!,
    ),
    resolveTheme("technical-clean"),
  );

  const nodes = [
    { id: "a", x: 40, y: 40, width: 180, height: 64, ports: [] },
    { id: "b", x: 40, y: 700, width: 180, height: 64, ports: [] },
    { id: "c", x: 700, y: 40, width: 180, height: 64, ports: [] },
    { id: "d", x: 700, y: 700, width: 180, height: 64, ports: [] },
  ];
  // Straight down each column: no crossing.
  const parallel = [
    { id: "first", points: [{ x: 130, y: 104 }, { x: 130, y: 700 }] },
    { id: "second", points: [{ x: 790, y: 104 }, { x: 790, y: 700 }] },
  ];
  // The same two relationships taken the long way round each other, which crosses twice
  // and touches nothing else.
  const crossing = [
    { id: "first", points: [{ x: 130, y: 104 }, { x: 130, y: 300 }, { x: 900, y: 300 }, { x: 900, y: 600 }, { x: 130, y: 600 }, { x: 130, y: 700 }] },
    { id: "second", points: [{ x: 790, y: 104 }, { x: 790, y: 250 }, { x: 20, y: 250 }, { x: 20, y: 650 }, { x: 790, y: 650 }, { x: 790, y: 700 }] },
  ];
  const build = (edges: typeof parallel, width: number, height: number): GeometryView => ({
    id: "overview",
    bounds: { x: 0, y: 0, width, height },
    groups: [],
    nodes,
    edges,
    annotations: [],
  });

  it("prefers the candidate closer to the view's aspect target", () => {
    const onTarget = build(parallel, 1280, 800);
    const ribbon = build(parallel, 16000, 320);
    expect(compositionScore(view, onTarget)).toBeLessThan(compositionScore(view, ribbon));
  });

  it("weighs a badly wrong shape above a couple of edge crossings", () => {
    // At the previous weight of 500 the aspect term was worth half a crossing, so the
    // scorer correctly preferred an unreadable ribbon over a crossing.
    const ribbon = build(parallel, 16000, 320);
    const crossed = build(crossing, 1280, 800);
    expect(analyzeGeometry(view, ribbon).metrics.edgeCrossings).toBe(0);
    expect(analyzeGeometry(view, crossed).metrics.edgeCrossings).toBeGreaterThan(0);
    expect(compositionScore(view, crossed)).toBeLessThan(compositionScore(view, ribbon));
  });
});
