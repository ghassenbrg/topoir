import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { TopoIRCompiler } from "../src/index.js";

describe("generated graph properties", () => {
  it("keeps generated directed graphs overlap-free with orthogonal non-empty routes", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 10 }),
        fc.array(fc.tuple(fc.nat(), fc.nat()), { minLength: 1, maxLength: 24 }),
        async (nodeCount, rawEdges) => {
          const nodes = Array.from({ length: nodeCount }, (_, index) => ({
            id: `node-${String(index).padStart(2, "0")}`,
            kind: index % 4 === 0 ? "database" : index % 3 === 0 ? "worker" : "service",
          }));
          const pairs = new Map<string, readonly [number, number]>();
          for (const [rawSource, rawTarget] of rawEdges) {
            const source = rawSource % nodeCount;
            const target = rawTarget % nodeCount;
            if (source === target) continue;
            const key = `${source}-${target}`;
            pairs.set(key, [source, target]);
          }
          const edges = [...pairs.values()].map(([source, target], index) => ({
            id: `edge-${String(index).padStart(2, "0")}`,
            from: nodes[source]?.id,
            to: nodes[target]?.id,
            label: `flow ${index}`,
          }));
          const document = {
            apiVersion: "topoir.dev/v1alpha1",
            kind: "Architecture",
            metadata: { name: "generated" },
            model: { nodes, edges },
          };
          const result = await new TopoIRCompiler().compile(JSON.stringify(document), {
            source: "<generated>",
            format: "svg",
          });

          expect(result.diagnostics.filter((item) => item.severity === "error")).toEqual([]);
          expect(result.views[0]?.metrics).toMatchObject({
            nodeOverlaps: 0,
            edgeNodeIntersections: 0,
            nonOrthogonalSegments: 0,
            emptyRoutes: 0,
          });
        },
      ),
      { numRuns: 24, seed: 20260918 },
    );
  });
});
