/**
 * Generalization harness.
 *
 * The six reference screenshots set the quality bar; they are not the target set. A
 * compiler that only looks good on six hand-written fixtures is not a usable tool, so this
 * harness compiles a large, deterministic spread of synthetic architectures — varying
 * size, nesting depth, relationship density, hub shape, label length, route compartments,
 * annotations, composition family and authored design tokens — and reports how often the
 * output is actually clean.
 *
 * Run: pnpm benchmark:generalization [count]
 */
import { writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { TopoIRCompiler } from "../packages/sdk/dist/index.js";
// One generator, shared with the test suite. This file used to carry a byte-identical
// private copy of `rng` and `build`; the corpus the benchmark measured and the corpus the
// tests asserted against could have drifted apart without either noticing.
import { build } from "./generate-case.mts";

const root = resolve(import.meta.dirname, "..");
const total = Number(process.argv[2] ?? 240);

/**
 * Geometry counters, separated from shape and from acceptance.
 *
 * A clean counter is not a good shape, and neither of them is presentation acceptance.
 * The report states the three separately so a rising number cannot be read as a passing
 * grade, and so "we measured this and it was zero" cannot be confused with "we never
 * measured it".
 */
const HARD = ["nodeOverlaps", "edgeNodeIntersections", "nonOrthogonalSegments", "emptyRoutes", "endpointBodyCrossings", "droppedRelationships", "droppedComponents", "droppedLabels", "droppedRegions", "droppedAnnotations", "detachedEndpoints", "outOfBoundsObjects", "regionNestingErrors"] as const;
const SOFT = ["labelOverlaps", "annotationOverlaps", "groupTitleIntersections", "coincidentEdgeSegments", "illegalBoundaryCrossings"] as const;

const failures: string[] = [];
const shapes: { tag: string; aspect: number; deviation: number; ink: number }[] = [];
const totals: Record<string, number> = {};
const byFamily: Record<string, { clean: number; runs: number }> = {};
let compiled = 0;
let cleanHard = 0;
let cleanAll = 0;
let shapeOnTarget = 0;
/** Counters the compiler did not report. An absent metric is unknown, never zero. */
const unavailable = new Set<string>();
const started = Date.now();

for (let seed = 1; seed <= total; seed += 1) {
  const testCase = build(seed);
  const tag = `${testCase.id} ${testCase.shape}/${testCase.family} n=${testCase.nodeCount} e=${testCase.edgeCount} d=${testCase.depth}`;
  let result;
  try {
    result = await new TopoIRCompiler().compile(JSON.stringify(testCase.document), { source: `<${testCase.id}>`, format: "svg" });
  } catch (error) {
    failures.push(`${tag} THREW ${(error as Error).message.split("\n")[0]}`);
    continue;
  }
  const errors = result.diagnostics.filter((item) => item.severity === "error");
  if (errors.length > 0) {
    failures.push(`${tag} ERROR ${errors.map((item) => item.code).join(",")} :: ${errors[0]!.message.slice(0, 120)}`);
    continue;
  }
  if (result.artifacts.length === 0) {
    failures.push(`${tag} produced no artifact`);
    continue;
  }
  compiled += 1;
  const family = byFamily[testCase.family] ?? { clean: 0, runs: 0 };
  family.runs += 1;

  const metrics = (result.views[0]?.metrics ?? {}) as Record<string, number | undefined>;
  let hard = 0;
  let soft = 0;
  // A counter the compiler did not report is recorded as unavailable, not folded in as a
  // zero. Treating an absent metric as clean is how an unimplemented or removed check
  // silently becomes a passing grade.
  for (const key of [...HARD, ...SOFT, "edgeCrossings"] as const) {
    const value = metrics[key];
    if (value === undefined) {
      unavailable.add(key);
      continue;
    }
    totals[key] = (totals[key] ?? 0) + value;
    if ((HARD as readonly string[]).includes(key)) hard += value;
    else if ((SOFT as readonly string[]).includes(key)) soft += value;
  }
  // Shape is a quality property the defect counts cannot express: a diagram can satisfy
  // every rule above and still be the wrong rectangle to read.
  const deviation = metrics["aspectDeviation"];
  if (deviation === undefined) unavailable.add("aspectDeviation");
  else if (deviation <= Math.log(3)) shapeOnTarget += 1;
  shapes.push({ tag, aspect: metrics["aspectRatio"] ?? 0, deviation: deviation ?? 0, ink: metrics["inkCoverage"] ?? 0 });
  if (hard === 0) cleanHard += 1;
  if (hard === 0 && soft === 0) {
    cleanAll += 1;
    family.clean += 1;
  } else if (hard > 0) {
    failures.push(`${tag} HARD ${HARD.filter((key) => metrics[key]).map((key) => `${key}=${metrics[key]}`).join(" ")}`);
  } else {
    failures.push(`${tag} soft ${SOFT.filter((key) => metrics[key]).map((key) => `${key}=${metrics[key]}`).join(" ")}`);
  }
  byFamily[testCase.family] = family;
}

const pct = (value: number) => `${((value / total) * 100).toFixed(1)}%`;
const lines = [
  `# TopoIR generalization report`,
  ``,
  `Corpus: ${total} synthetic architectures, deterministic seeds 1..${total}.`,
  `Elapsed: ${((Date.now() - started) / 1000).toFixed(1)}s`,
  ``,
  `| Outcome | Count | Share |`,
  `| --- | ---: | ---: |`,
  `| Compiled without error | ${compiled} | ${pct(compiled)} |`,
  `| Free of hard geometry defects | ${cleanHard} | ${pct(cleanHard)} |`,
  `| Free of every measured defect | ${cleanAll} | ${pct(cleanAll)} |`,
  `| Within 3x of the requested shape | ${shapeOnTarget} | ${pct(shapeOnTarget)} |`,
  ``,
  `These are geometry and shape measurements. **Neither is presentation acceptance**: a`,
  `diagram can satisfy every counter here, sit at the requested proportion, and still fail`,
  `to explain anything. Visual acceptance is recorded per reference case in the reference`,
  `benchmark, and only a human review can grant it.`,
  ``,
  `## Defect totals across the corpus`,
  ``,
  `| Metric | Total |`,
  `| --- | ---: |`,
  ...[...HARD, ...SOFT, "edgeCrossings"].map((key) => `| ${key} | ${unavailable.has(key) ? "unavailable — not reported by the compiler" : totals[key] ?? 0} |`),
  ...(unavailable.size
    ? ["", `> **${unavailable.size} counter(s) were not reported by the compiler and are unknown, not zero:** ${[...unavailable].sort().join(", ")}. A corpus result that depends on them is not trustworthy until they are restored.`]
    : []),
  ``,
  `## Shape`,
  ``,
  `| Measure | Value |`,
  `| --- | ---: |`,
  `| Within 3x of the aspect target | ${shapes.filter((item) => item.deviation <= Math.log(3)).length} / ${shapes.length} |`,
  `| Widest produced aspect | ${shapes.length ? Math.max(...shapes.map((item) => item.aspect)).toFixed(1) : 0}:1 |`,
  `| Mean component ink coverage | ${shapes.length ? (100 * shapes.reduce((sum, item) => sum + item.ink, 0) / shapes.length).toFixed(1) : 0}% |`,
  `| Canvases under 6% ink | ${shapes.filter((item) => item.ink < 0.06).length} / ${shapes.length} |`,
  ``,
  `## By composition family`,
  ``,
  `| Family | Fully clean | Runs | Share |`,
  `| --- | ---: | ---: | ---: |`,
  ...Object.entries(byFamily).map(([name, value]) => `| ${name} | ${value.clean} | ${value.runs} | ${((value.clean / value.runs) * 100).toFixed(1)}% |`),
  ``,
  `## Cases needing attention (${failures.length})`,
  ``,
  ...(failures.length ? failures.slice(0, 120).map((line) => `- ${line}`) : ["- none"]),
];

await mkdir(join(root, ".tmp/generalization"), { recursive: true });
await writeFile(join(root, ".tmp/generalization/report.md"), `${lines.join("\n")}\n`);
// Print through the defect table rather than a fixed line count: the hardcoded 26 cut
// the summary off immediately before `illegalBoundaryCrossings` and `edgeCrossings`,
// so the two largest numbers in the run never reached the terminal.
const familyHeading = lines.indexOf(`## By composition family`);
console.log(lines.slice(0, familyHeading > 0 ? familyHeading : lines.length).join("\n"));
console.log(`\nfailures: ${failures.length}  →  .tmp/generalization/report.md`);
for (const line of failures.slice(0, 20)) console.log(`  ${line}`);
