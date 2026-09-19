import { describe, expect, it } from "vitest";
import { analyzeGeometry, type GeometryView, type MeasuredView } from "../src/index.js";

/**
 * T03 — geometry integrity against a hostile backend.
 *
 * `LayoutEngine` is a public extension point, so `analyzeGeometry` is the only thing
 * standing between a backend's output and a result the compiler calls ok. These build
 * geometry by hand rather than going through the real engine, which is the only way to
 * exercise the failures a correct engine never produces.
 */

function measured(overrides: Partial<MeasuredView> = {}): MeasuredView {
  return {
    id: "overview",
    title: "test",
    layout: { aspectRatio: 1.6, direction: "right", spacing: 1, engine: "elk" },
    groups: [],
    nodes: [
      { id: "a", kind: "service", label: "A", ports: [], width: 100, height: 60, labelText: text("A") },
      { id: "b", kind: "database", label: "B", ports: [], width: 100, height: 60, labelText: text("B") },
    ],
    edges: [{ id: "a-b", from: "a", to: "b", kind: "write" }],
    annotations: [],
    flows: [],
    ...overrides,
  } as unknown as MeasuredView;
}

function text(value: string) {
  return { lines: [value], lineHeight: 16, width: 20, height: 16, source: value, disposition: "rendered" as const };
}

function geometry(overrides: Partial<GeometryView> = {}): GeometryView {
  return {
    id: "overview",
    bounds: { x: 0, y: 0, width: 400, height: 200 },
    groups: [],
    nodes: [
      { id: "a", x: 20, y: 20, width: 100, height: 60, ports: [] },
      { id: "b", x: 260, y: 20, width: 100, height: 60, ports: [] },
    ],
    edges: [{ id: "a-b", points: [{ x: 120, y: 50 }, { x: 260, y: 50 }] }],
    annotations: [],
    ...overrides,
  } as unknown as GeometryView;
}

function codes(view: MeasuredView, geo: GeometryView): string[] {
  return analyzeGeometry(view, geo).diagnostics.map((diagnostic) => diagnostic.code);
}

describe("honest geometry passes", () => {
  it("reports nothing for a well-formed layout", () => {
    const report = analyzeGeometry(measured(), geometry());
    expect(report.diagnostics).toEqual([]);
    expect(report.metrics.detachedEndpoints).toBe(0);
    expect(report.metrics.outOfBoundsObjects).toBe(0);
    expect(report.metrics.regionNestingErrors).toBe(0);
  });

  it("tolerates a route that stops a few pixels short of its component", () => {
    // Routers legitimately stop short so a stroke butts against a border.
    const geo = geometry({ edges: [{ id: "a-b", points: [{ x: 124, y: 50 }, { x: 256, y: 50 }] }] } as never);
    expect(codes(measured(), geo)).not.toContain("TOP426_EDGE_ENDPOINT_DETACHED");
  });
});

describe("route attachment", () => {
  it("rejects a route whose source end floats free", () => {
    const geo = geometry({ edges: [{ id: "a-b", points: [{ x: 200, y: 50 }, { x: 260, y: 50 }] }] } as never);
    const report = analyzeGeometry(measured(), geo);
    const detached = report.diagnostics.filter((diagnostic) => diagnostic.code === "TOP426_EDGE_ENDPOINT_DETACHED");
    expect(detached).toHaveLength(1);
    expect(detached[0]?.severity).toBe("error");
    expect(detached[0]?.message).toContain("source");
    expect(detached[0]?.message).toContain('"a"');
    expect(report.metrics.detachedEndpoints).toBe(1);
  });

  it("rejects a route whose target end floats free", () => {
    const geo = geometry({ edges: [{ id: "a-b", points: [{ x: 120, y: 50 }, { x: 200, y: 50 }] }] } as never);
    const detached = analyzeGeometry(measured(), geo).diagnostics.filter((d) => d.code === "TOP426_EDGE_ENDPOINT_DETACHED");
    expect(detached).toHaveLength(1);
    expect(detached[0]?.message).toContain("target");
  });

  it("counts both ends when a whole route is translated away", () => {
    const geo = geometry({
      bounds: { x: 0, y: 0, width: 400, height: 200 },
      edges: [{ id: "a-b", points: [{ x: 1120, y: 1050 }, { x: 1260, y: 1050 }] }],
    } as never);
    const report = analyzeGeometry(measured(), geo);
    expect(report.metrics.detachedEndpoints).toBe(2);
    // The same translation also puts it outside the canvas, which is a separate failure.
    expect(report.metrics.outOfBoundsObjects).toBe(1);
  });
});

describe("declared content coverage", () => {
  it("rejects geometry that drops a declared group", () => {
    const view = measured({
      groups: [{ id: "zone", kind: "vpc", label: "Zone", titleHeight: 38, padding: { top: 0, right: 0, bottom: 0, left: 0 }, labelText: text("Zone") }],
    } as never);
    const report = analyzeGeometry(view, geometry());
    expect(report.diagnostics.map((d) => d.code)).toContain("TOP415_REGION_DROPPED");
    expect(report.metrics.droppedRegions).toBe(1);
  });

  it("rejects geometry that drops a declared annotation", () => {
    const view = measured({
      annotations: [{ id: "note", kind: "note", text: "Kept 30 days", width: 100, height: 40, textLayout: text("Kept 30 days") }],
    } as never);
    const report = analyzeGeometry(view, geometry());
    expect(report.diagnostics.map((d) => d.code)).toContain("TOP416_ANNOTATION_DROPPED");
    expect(report.metrics.droppedAnnotations).toBe(1);
  });
});

describe("canvas bounds", () => {
  it("rejects a component placed outside the declared canvas", () => {
    const geo = geometry({
      nodes: [
        { id: "a", x: 20, y: 20, width: 100, height: 60, ports: [] },
        { id: "b", x: 5000, y: 20, width: 100, height: 60, ports: [] },
      ],
      edges: [{ id: "a-b", points: [{ x: 120, y: 50 }, { x: 5000, y: 50 }] }],
    } as never);
    const report = analyzeGeometry(measured(), geo);
    const outside = report.diagnostics.filter((d) => d.code === "TOP417_GEOMETRY_OUT_OF_BOUNDS");
    expect(outside.length).toBeGreaterThanOrEqual(1);
    expect(outside[0]?.severity).toBe("error");
    expect(outside.some((d) => d.message.includes('"b"'))).toBe(true);
  });

  it("allows a mark sitting exactly on the canvas edge", () => {
    const geo = geometry({
      bounds: { x: 0, y: 0, width: 360, height: 80 },
      nodes: [
        { id: "a", x: 0, y: 0, width: 100, height: 60, ports: [] },
        { id: "b", x: 260, y: 0, width: 100, height: 60, ports: [] },
      ],
      edges: [{ id: "a-b", points: [{ x: 100, y: 30 }, { x: 260, y: 30 }] }],
    } as never);
    expect(codes(measured(), geo)).not.toContain("TOP417_GEOMETRY_OUT_OF_BOUNDS");
  });
});

describe("region nesting", () => {
  const nested = (): MeasuredView =>
    measured({
      groups: [
        { id: "outer", kind: "cloud", label: "Outer", titleHeight: 38, padding: { top: 0, right: 0, bottom: 0, left: 0 }, labelText: text("Outer") },
        { id: "inner", kind: "vpc", parent: "outer", label: "Inner", titleHeight: 38, padding: { top: 0, right: 0, bottom: 0, left: 0 }, labelText: text("Inner") },
      ],
    } as never);

  it("accepts a child boundary contained by its parent", () => {
    const geo = geometry({
      groups: [
        { id: "outer", x: 0, y: 0, width: 380, height: 180 },
        { id: "inner", x: 10, y: 10, width: 200, height: 120, parent: "outer" },
      ],
    } as never);
    expect(codes(nested(), geo)).not.toContain("TOP418_REGION_OUTSIDE_PARENT");
  });

  it("rejects a child boundary that escapes its parent", () => {
    const geo = geometry({
      groups: [
        { id: "outer", x: 0, y: 0, width: 100, height: 100 },
        { id: "inner", x: 10, y: 10, width: 300, height: 120, parent: "outer" },
      ],
    } as never);
    const report = analyzeGeometry(nested(), geo);
    expect(report.diagnostics.map((d) => d.code)).toContain("TOP418_REGION_OUTSIDE_PARENT");
    expect(report.metrics.regionNestingErrors).toBeGreaterThanOrEqual(1);
  });

  it("rejects one unrelated boundary containing another", () => {
    const view = measured({
      groups: [
        { id: "left", kind: "vpc", label: "Left", titleHeight: 38, padding: { top: 0, right: 0, bottom: 0, left: 0 }, labelText: text("Left") },
        { id: "right", kind: "vpc", label: "Right", titleHeight: 38, padding: { top: 0, right: 0, bottom: 0, left: 0 }, labelText: text("Right") },
      ],
    } as never);
    const geo = geometry({
      groups: [
        { id: "left", x: 0, y: 0, width: 380, height: 180 },
        { id: "right", x: 20, y: 20, width: 100, height: 100 },
      ],
    } as never);
    expect(codes(view, geo)).toContain("TOP419_REGION_OVERLAP");
  });

  it("does not report ancestry as an overlap", () => {
    // Containment is exactly what nesting looks like, so it must not be reported twice.
    const geo = geometry({
      groups: [
        { id: "outer", x: 0, y: 0, width: 380, height: 180 },
        { id: "inner", x: 10, y: 10, width: 200, height: 120, parent: "outer" },
      ],
    } as never);
    expect(codes(nested(), geo)).not.toContain("TOP419_REGION_OVERLAP");
  });
});
