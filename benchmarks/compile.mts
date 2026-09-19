import { performance } from "node:perf_hooks";
import { TopoIRCompiler } from "../packages/sdk/dist/index.js";

const nodeCount = Number(process.env["TOPOIR_BENCH_NODES"] ?? 120);
const iterations = Number(process.env["TOPOIR_BENCH_ITERATIONS"] ?? 5);
if (!Number.isInteger(nodeCount) || nodeCount < 2 || nodeCount > 2_000) {
  throw new Error("TOPOIR_BENCH_NODES must be an integer from 2 through 2000.");
}
if (!Number.isInteger(iterations) || iterations < 1 || iterations > 100) {
  throw new Error("TOPOIR_BENCH_ITERATIONS must be an integer from 1 through 100.");
}

const groups = Array.from({ length: Math.ceil(nodeCount / 12) }, (_, index) => ({
  id: `namespace-${String(index).padStart(3, "0")}`,
  kind: "namespace",
  parent: "cluster",
}));
const nodes = Array.from({ length: nodeCount }, (_, index) => ({
  id: `service-${String(index).padStart(4, "0")}`,
  kind: index % 11 === 0 ? "database" : index % 5 === 0 ? "worker" : "service",
  group: groups[Math.floor(index / 12)]?.id,
}));
const edges = nodes.slice(1).flatMap((node, index) => {
  const previous = nodes[index];
  const skip = nodes[index >= 5 ? index - 5 : 0];
  return [
    { id: `chain-${index}`, from: previous?.id, to: node.id, label: "request" },
    ...(index % 4 === 0 && skip !== undefined
      ? [{ id: `skip-${index}`, from: skip.id, to: node.id, label: "event", kind: "async", style: "dashed" }]
      : []),
  ];
});
const source = JSON.stringify({
  apiVersion: "topoir.dev/v1alpha1",
  kind: "Architecture",
  metadata: { name: "benchmark", title: "TopoIR Compiler Benchmark" },
  model: {
    groups: [{ id: "cloud", kind: "cloud" }, { id: "cluster", kind: "kubernetes-cluster", parent: "cloud" }, ...groups],
    nodes,
    edges,
  },
  views: [{ id: "overview", layout: { direction: "right", spacing: "compact" } }],
});

const compiler = new TopoIRCompiler();
const durations: number[] = [];
let width = 0;
let height = 0;
for (let iteration = 0; iteration < iterations; iteration += 1) {
  const start = performance.now();
  const result = await compiler.compile(source, { source: "<benchmark>", format: "svg" });
  durations.push(performance.now() - start);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((item) => `${item.code} ${item.message}`).join("\n"));
  }
  width = result.views[0]?.geometry.bounds.width ?? 0;
  height = result.views[0]?.geometry.bounds.height ?? 0;
}

const sorted = [...durations].sort((left, right) => left - right);
const report = {
  nodeCount,
  edgeCount: edges.length,
  groupCount: groups.length + 2,
  iterations,
  milliseconds: {
    min: round(sorted[0] ?? 0),
    median: round(sorted[Math.floor(sorted.length / 2)] ?? 0),
    max: round(sorted[sorted.length - 1] ?? 0),
    mean: round(durations.reduce((sum, value) => sum + value, 0) / durations.length),
  },
  geometry: { width, height },
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
