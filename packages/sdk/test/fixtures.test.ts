import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { TopoIRCompiler } from "../src/index.js";

describe("topology regression matrix", () => {
  it("compiles every difficult fixture without hard geometry failures", async () => {
    const directory = resolve(process.cwd(), "fixtures");
    const files = (await readdir(directory)).filter((file) => file.endsWith(".topoir.yaml")).sort();
    expect(files.length).toBeGreaterThanOrEqual(6);

    for (const file of files) {
      const path = resolve(directory, file);
      const source = await readFile(path, "utf8");
      const result = await new TopoIRCompiler().compile(source, { source: path, format: "svg" });
      expect(
        result.diagnostics.filter((diagnostic) => diagnostic.severity === "error"),
        `${file}: ${result.diagnostics.map((item) => `${item.code} ${item.message}`).join("; ")}`,
      ).toEqual([]);
      expect(result.views[0]?.metrics).toMatchObject({
        nodeOverlaps: 0,
        edgeNodeIntersections: 0,
        nonOrthogonalSegments: 0,
        emptyRoutes: 0,
      });
    }
  });

  it("keeps every published example renderable", async () => {
    const directory = resolve(process.cwd(), "examples");
    const files = (await readdir(directory)).filter((file) => file.endsWith(".topoir.yaml")).sort();
    expect(files.length).toBeGreaterThanOrEqual(10);

    for (const file of files) {
      const path = resolve(directory, file);
      const source = await readFile(path, "utf8");
      const result = await new TopoIRCompiler().compile(source, { source: path, format: "svg" });
      expect(
        result.diagnostics.filter((diagnostic) => diagnostic.severity === "error"),
        `${file}: ${result.diagnostics.map((item) => `${item.code} ${item.message}`).join("; ")}`,
      ).toEqual([]);
      expect(result.artifacts).toHaveLength(1);
      // No published example may hide a relationship behind another connector or clip a label.
      for (const view of result.views) {
        expect(view.metrics, `${file} [${view.id}]`).toMatchObject({
          nodeOverlaps: 0,
          edgeNodeIntersections: 0,
          endpointBodyCrossings: 0,
          nonOrthogonalSegments: 0,
          emptyRoutes: 0,
          labelOverlaps: 0,
          annotationOverlaps: 0,
          groupTitleIntersections: 0,
          coincidentEdgeSegments: 0,
        });
      }
    }
  });

  it("honors explicit grid column counts for repeated architecture elements", async () => {
    const path = resolve(process.cwd(), "fixtures/disconnected-grid.topoir.yaml");
    const source = await readFile(path, "utf8");
    const result = await new TopoIRCompiler().compile(source, { source: path, format: "svg" });
    const memberIds = new Set(["alpha", "beta", "gamma", "delta", "epsilon", "zeta"]);
    const xCoordinates = new Set(
      result.views[0]?.geometry.nodes
        .filter((node) => memberIds.has(node.id))
        .map((node) => node.x),
    );

    expect(xCoordinates.size).toBe(3);
  });
});
