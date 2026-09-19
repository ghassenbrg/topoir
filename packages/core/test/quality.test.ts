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
        { id: "first", points: [{ x: 100, y: 20 }, { x: 300, y: 20 }], label: { x: 150, y: 160, width: 50, height: 20, text: "one" } },
        { id: "second", points: [{ x: 300, y: 220 }, { x: 100, y: 220 }], label: { x: 155, y: 165, width: 50, height: 20, text: "two" } },
      ],
      annotations: [{ id: "note", x: 50, y: 90, width: 80, height: 30 }],
    };
    const report = analyzeGeometry(view, geometry);
    expect(report.metrics).toMatchObject({ labelOverlaps: 1, annotationOverlaps: 1, groupTitleIntersections: 1 });
    expect(report.diagnostics.map((d) => d.code)).toEqual(expect.arrayContaining(["TOP430_LABEL_OVERLAP", "TOP431_GROUP_TITLE_INTERSECTION", "TOP432_ANNOTATION_OVERLAP"]));
  });
});
