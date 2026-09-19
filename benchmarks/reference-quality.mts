import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { TopoIRCompiler } from "../packages/sdk/dist/index.js";

// Private reference screenshots stay in .tmp; only requirements/fixtures are public.
const root = resolve(import.meta.dirname, "..");
const output = join(root, ".tmp/reference-benchmark");
const cases = JSON.parse(await readFile(join(root, "benchmarks/reference-cases.json"), "utf8")) as Array<{
  id: string; reference: string; source: string; coverage: string; required: string[]; gaps: string[];
}>;
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
  const cleanGeometry = first.ok && ["nodeOverlaps", "edgeNodeIntersections", "nonOrthogonalSegments", "emptyRoutes", "labelOverlaps", "annotationOverlaps", "groupTitleIntersections", "illegalBoundaryCrossings"].every((key) => metrics[key] === 0);
  results.push({ ...entry, referenceHash, sourceSha256: createHash("sha256").update(source).digest("hex"), artifactHashes: first.artifacts.map(({ format, sha256 }) => ({ format, sha256 })), metrics, diagnostics: first.diagnostics, deterministic, cleanGeometry, referenceParity: "NOT MET — documented gaps; human review required" });
}
await writeFile(join(output, "report.json"), JSON.stringify({ automaticChecksAreNotVisualApproval: true, cases: results }, null, 2) + "\n");
const sections = results.map((entry) => `## ${entry.id}\n\nReference parity: **${entry.referenceParity}**\n\nCoverage: ${entry.coverage}. Deterministic: ${entry.deterministic}. Clean measured geometry: ${entry.cleanGeometry}.\n\nRequired: ${entry.required.join("; ")}.\n\n${entry.gaps.map((gap) => `- ${gap}`).join("\n")}\n\n${entry.referenceHash ? `![Reference ${entry.reference}](<${join(root, ".tmp/screenshots", entry.reference)}>)` : "Reference unavailable in this checkout; do not award visual approval."}\n\n![Generated candidate](<${join(output, `${entry.id}.png`)}>)\n`);
await writeFile(join(output, "report.md"), `# TopoIR reference benchmark\n\nThe six supplied screenshots are the acceptance benchmark. Automated checks cannot certify visual parity. See docs/visual-benchmark.md for the review protocol.\n\n${sections.join("\n")}`);
process.stdout.write(JSON.stringify({ report: join(output, "report.md"), cases: results.map(({ id, deterministic, cleanGeometry, referenceParity }) => ({ id, deterministic, cleanGeometry, referenceParity })) }, null, 2) + "\n");
if (results.some((entry) => !entry.deterministic || entry.diagnostics.some((d) => d.severity === "error"))) process.exitCode = 1;
if (process.argv.includes("--require-parity")) process.exitCode = 1; // No reference has been approved yet.
