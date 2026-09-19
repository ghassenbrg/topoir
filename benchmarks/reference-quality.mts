import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { TopoIRCompiler } from "../packages/sdk/dist/index.js";
import { loadReviewRecords, parityMet, parityOf } from "./review-records.mts";

// Private reference screenshots stay in .tmp; only requirements/fixtures are public.
const root = resolve(import.meta.dirname, "..");
const output = join(root, ".tmp/reference-benchmark");
const cases = JSON.parse(await readFile(join(root, "benchmarks/reference-cases.json"), "utf8")) as Array<{
  id: string; reference: string; source: string; coverage: string; required: string[]; gaps: string[];
}>;
const records = await loadReviewRecords(join(root, "benchmarks/reference-reviews.json"));
await mkdir(output, { recursive: true });
const results = [];
for (const entry of cases) {
  const source = await readFile(join(root, entry.source), "utf8");
  const first = await new TopoIRCompiler().compile(source, { format: "both" });
  const repeat = await new TopoIRCompiler().compile(source, { format: "both" });
  const deterministic = first.artifacts.length > 0 && first.artifacts.every((artifact, index) => artifact.sha256 === repeat.artifacts[index]?.sha256);
  for (const artifact of first.artifacts) await writeFile(join(output, `${entry.id}.${artifact.format}`), artifact.content);
  let referenceHash: string | null = null;
  try { referenceHash = createHash("sha256").update(await readFile(join(root, ".tmp/screenshots", entry.reference))).digest("hex"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  const metrics = first.views[0]?.metrics ?? {};
  // Three separate questions, reported separately. A clean counter is not a good shape,
  // and neither of them is visual acceptance.
  const geometryCounters = ["nodeOverlaps", "edgeNodeIntersections", "nonOrthogonalSegments", "emptyRoutes", "labelOverlaps", "annotationOverlaps", "groupTitleIntersections", "illegalBoundaryCrossings", "detachedEndpoints", "outOfBoundsObjects", "regionNestingErrors", "droppedRegions", "droppedAnnotations"] as const;
  // A counter that is absent is unknown, not zero. Reporting a missing metric as clean is
  // how an unimplemented check turns into a passing grade.
  const missingCounters = geometryCounters.filter((key) => metrics[key] === undefined);
  const cleanGeometry = first.ok && missingCounters.length === 0 && geometryCounters.every((key) => metrics[key] === 0);
  const shapeOnTarget = metrics["aspectDeviation"] !== undefined && metrics["aspectDeviation"] <= Math.log(3);
  const candidatePng = first.artifacts.find((artifact) => artifact.format === "png")?.sha256;
  const parity = parityOf(entry.id, referenceHash, candidatePng, records);
  results.push({
    ...entry,
    referenceHash,
    sourceSha256: createHash("sha256").update(source).digest("hex"),
    artifactHashes: first.artifacts.map(({ format, sha256 }) => ({ format, sha256 })),
    metrics,
    diagnostics: first.diagnostics,
    deterministic,
    cleanGeometry,
    missingCounters,
    shapeOnTarget,
    referenceParity: parity.status,
    referenceParityDetail: parity.detail,
  });
}
await writeFile(join(output, "report.json"), JSON.stringify({ automaticChecksAreNotVisualApproval: true, cases: results }, null, 2) + "\n");
const sections = results.map((entry) => `## ${entry.id}\n\nReference parity: **${entry.referenceParity}** — ${entry.referenceParityDetail}\n\nCoverage: ${entry.coverage}. Deterministic: ${entry.deterministic}. Clean measured geometry: ${entry.cleanGeometry}${entry.missingCounters.length ? ` (unknown: ${entry.missingCounters.join(", ")})` : ""}. Shape on target: ${entry.shapeOnTarget}.\n\nRequired: ${entry.required.join("; ")}.\n\n${entry.gaps.map((gap) => `- ${gap}`).join("\n")}\n\n${entry.referenceHash ? `![Reference ${entry.reference}](<${join(root, ".tmp/screenshots", entry.reference)}>)` : "Reference unavailable in this checkout; do not award visual approval."}\n\n![Generated candidate](<${join(output, `${entry.id}.png`)}>)\n`);
await writeFile(join(output, "report.md"), `# TopoIR reference benchmark\n\nThe six supplied screenshots are the acceptance benchmark. Automated checks cannot certify visual parity; only a recorded human review can, and each record is bound to the sha256 of the exact reference and candidate it was made against. See docs/visual-benchmark.md for the review protocol.\n\nApproved: ${results.filter((entry) => parityMet(entry.referenceParity)).length} / ${results.length}.\n\n${sections.join("\n")}`);
process.stdout.write(JSON.stringify({
  report: join(output, "report.md"),
  approved: results.filter((entry) => parityMet(entry.referenceParity)).length,
  total: results.length,
  cases: results.map(({ id, deterministic, cleanGeometry, shapeOnTarget, referenceParity, referenceParityDetail }) => ({ id, deterministic, cleanGeometry, shapeOnTarget, referenceParity, referenceParityDetail })),
}, null, 2) + "\n");
if (results.some((entry) => !entry.deterministic || entry.diagnostics.some((d) => d.severity === "error"))) process.exitCode = 1;
// Parity now fails only when it is genuinely unmet. Recording a real review changes this;
// a regenerated candidate invalidates its record and brings the failure back.
if (process.argv.includes("--require-parity") && !results.every((entry) => parityMet(entry.referenceParity))) {
  process.exitCode = 1;
}
