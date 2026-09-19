import { describe, expect, it } from "vitest";
import { build } from "../../../benchmarks/generate-case.mts";
import { TopoIRCompiler } from "../src/index.js";

/**
 * Quality has to be a property of the compiler, not of the hand-written fixtures.
 *
 * The six reference screenshots set the bar; they are not the target set. These cases come
 * from the same generator as `pnpm benchmark:generalization`, which sweeps a much larger
 * corpus — this is the subset small enough to guard every change. The thresholds are the
 * floor, not the goal: raise them when the harness shows the compiler has moved past them.
 */

const HARD = [
  "nodeOverlaps",
  "edgeNodeIntersections",
  "nonOrthogonalSegments",
  "emptyRoutes",
  "endpointBodyCrossings",
  "droppedRelationships",
  "droppedComponents",
] as const;
const SOFT = ["labelOverlaps", "annotationOverlaps", "groupTitleIntersections", "coincidentEdgeSegments", "illegalBoundaryCrossings"] as const;

describe("arbitrary architectures", () => {
  it("compiles a diverse corpus with no hard geometry defect and stays legible", async () => {
    const total = 16;
    let clean = 0;
    const notes: string[] = [];

    for (let seed = 1; seed <= total; seed += 1) {
      const testCase = build(seed);
      const label = `${testCase.id} ${testCase.shape}/${testCase.family} n=${testCase.nodeCount} d=${testCase.depth}`;
      const result = await new TopoIRCompiler().compile(JSON.stringify(testCase.document), {
        source: `<${testCase.id}>`,
        format: "svg",
      });

      expect(
        result.diagnostics.filter((item) => item.severity === "error"),
        `${label}: ${result.diagnostics.map((item) => item.code).join(",")}`,
      ).toEqual([]);
      expect(result.artifacts, label).toHaveLength(1);

      const metrics = (result.views[0]?.metrics ?? {}) as Record<string, number>;
      // Nothing the author declared may vanish, overlap, or be drawn diagonally.
      for (const key of HARD) expect(metrics[key] ?? 0, `${label}: ${key}`).toBe(0);
      const soft = SOFT.reduce((sum, key) => sum + (metrics[key] ?? 0), 0);
      if (soft === 0) clean += 1;
      else notes.push(`${label}: ${SOFT.filter((key) => metrics[key]).map((key) => `${key}=${metrics[key]}`).join(" ")}`);
    }

    // Floor, measured at 92.5% across 200 cases when this was written.
    expect(clean / total, `fully clean ${clean}/${total}\n${notes.join("\n")}`).toBeGreaterThanOrEqual(0.83);
  }, 120_000);

  it("produces the same bytes for the same source", async () => {
    for (const seed of [3, 29]) {
      const source = JSON.stringify(build(seed).document);
      const first = await new TopoIRCompiler().compile(source, { format: "svg" });
      const second = await new TopoIRCompiler().compile(source, { format: "svg" });
      expect(first.artifacts[0]?.sha256, `seed ${seed}`).toBe(second.artifacts[0]?.sha256);
    }
  }, 60_000);
});
