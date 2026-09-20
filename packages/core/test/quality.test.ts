import { describe, expect, it } from "vitest";
import { analyzeGeometry, loadDocument, measureView, projectView, resolveTheme, type GeometryView } from "../src/index.js";

describe("visual quality defects", () => {
  it("counts labels, annotations and boundary headings as obstacles", () => {
    const document = loadDocument(JSON.stringify({ apiVersion: "topoir.dev/v1alpha1", kind: "Architecture", metadata: { name: "quality" }, model: { groups: [{ id: "domain", kind: "system" }], nodes: [{ id: "a", kind: "api", group: "domain" }, { id: "b", kind: "database", group: "domain" }], edges: [{ id: "first", from: "a", to: "b" }, { id: "second", from: "b", to: "a" }], annotations: [{ id: "note", text: "Note" }] } })).document!;
    const view = measureView(projectView(document), resolveTheme("technical-clean"));
    const geometry: GeometryView = {
      id: "overview", bounds: { x: 0, y: 0, width: 400, height: 300 },
      groups: [{ id: "domain", x: 0, y: 0, width: 400, height: 300 }],
      nodes: [{ id: "a", x: 40, y: 80, width: 100, height: 60, ports: [] }, { id: "b", x: 250, y: 80, width: 100, height: 60, ports: [] }],
      edges: [
        // "Domain" is drawn 16px in and measures about 56px wide, so this crosses the text.
        { id: "first", points: [{ x: 20, y: 20 }, { x: 70, y: 20 }], label: { x: 150, y: 160, width: 50, height: 20, text: "one" } },
        { id: "second", points: [{ x: 300, y: 220 }, { x: 100, y: 220 }], label: { x: 155, y: 165, width: 50, height: 20, text: "two" } },
      ],
      annotations: [{ id: "note", x: 50, y: 90, width: 80, height: 30 }],
    };
    const report = analyzeGeometry(view, geometry);
    expect(report.metrics).toMatchObject({ labelOverlaps: 1, annotationOverlaps: 1, groupTitleIntersections: 1 });
    expect(report.diagnostics.map((d) => d.code)).toEqual(expect.arrayContaining(["TOP430_LABEL_OVERLAP", "TOP431_GROUP_TITLE_INTERSECTION", "TOP432_ANNOTATION_OVERLAP"]));
  });

  it("does not count the empty band beside a boundary's title", () => {
    /**
     * A heading obstacle used to be the region's whole width by the title's height. On a
     * wide region that reserves hundreds of pixels of corridor for a few characters, and a
     * connector entering from above had to go round to the region's edge and come in
     * sideways — two bends and, on the agent-request map, a 570px excursion in the
     * diagram's primary path.
     *
     * What a reader minds is a connector drawn through the words. The band to the right of
     * them is empty, and crossing it costs nothing. The router and this analysis share one
     * definition of the box, so a route that is legal is not then counted as a defect.
     */
    const document = loadDocument(JSON.stringify({ apiVersion: "topoir.dev/v1alpha1", kind: "Architecture", metadata: { name: "title-band" }, model: { groups: [{ id: "domain", kind: "system" }], nodes: [{ id: "a", kind: "api", group: "domain" }], edges: [] } })).document!;
    const view = measureView(projectView(document), resolveTheme("technical-clean"));
    const at = (x: number): GeometryView => ({
      id: "overview", bounds: { x: 0, y: 0, width: 400, height: 300 },
      groups: [{ id: "domain", x: 0, y: 0, width: 400, height: 300 }],
      nodes: [{ id: "a", x: 40, y: 120, width: 100, height: 60, ports: [] }],
      edges: [{ id: "drop", points: [{ x, y: 0 }, { x, y: 120 }] }],
      annotations: [],
    });
    // Through the title's own ink.
    expect(analyzeGeometry(view, at(40)).metrics.groupTitleIntersections, "crossing the words is still a defect").toBe(1);
    // Through the empty band well to the right of it.
    expect(analyzeGeometry(view, at(300)).metrics.groupTitleIntersections, "crossing the empty band beside them is not").toBe(0);
  });
});
