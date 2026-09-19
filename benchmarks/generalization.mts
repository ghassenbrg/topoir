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

const root = resolve(import.meta.dirname, "..");
const total = Number(process.argv[2] ?? 240);

/**
 * Deterministic RNG: the same run always produces the same corpus. The seed is avalanched
 * first, because consecutive seeds fed straight into a linear generator produce nearly
 * identical first draws — which silently collapsed the corpus onto one graph shape.
 */
function rng(seed: number): () => number {
  let state = seed >>> 0;
  state ^= state >>> 16;
  state = Math.imul(state, 0x7feb352d) >>> 0;
  state ^= state >>> 15;
  state = Math.imul(state, 0x846ca68b) >>> 0;
  state ^= state >>> 16;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const SHAPES = ["chain", "hub", "pipeline", "mesh", "tree", "bipartite", "islands"] as const;
const FAMILIES = ["architecture", "topology", "layers"] as const;
const THEMES = ["technical-clean", "cloud-architecture", "executive", "dark-engineering", "blueprint", "minimal"] as const;
const NODE_KINDS = ["service", "api", "worker", "database", "cache", "queue", "stream", "gateway", "client", "object-storage", "identity-provider", "pod", "container", "function", "external-system"] as const;
const GROUP_KINDS = ["cloud", "region", "vpc", "kubernetes-cluster", "namespace", "security-boundary", "external-zone", "logical"] as const;
const WORDS = ["payments", "ledger", "orders", "identity", "search", "routing", "ingest", "billing", "catalog", "inventory", "settlement", "reconciliation", "notification", "observability", "provisioning"];

interface Case {
  readonly id: string;
  readonly shape: string;
  readonly family: string;
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly depth: number;
  readonly document: unknown;
}

function build(seed: number): Case {
  const random = rng(seed);
  const pick = <T,>(list: readonly T[]): T => list[Math.floor(random() * list.length)]!;
  const between = (low: number, high: number) => low + Math.floor(random() * (high - low + 1));

  const shape = pick(SHAPES);
  const family = pick(FAMILIES);
  const nodeCount = between(3, 42);
  const depth = between(0, 3);
  const longLabels = random() < 0.3;
  const withCompartments = random() < 0.35;
  const withAnnotations = random() < 0.4;
  const authoredTheme = random() < 0.35;

  // Nested boundaries, up to `depth` levels.
  const groups: Record<string, unknown>[] = [];
  const groupIds: string[] = [];
  let frontier: (string | undefined)[] = [undefined];
  for (let level = 0; level < depth; level += 1) {
    const next: string[] = [];
    for (const parent of frontier) {
      const count = between(1, level === 0 ? 3 : 2);
      for (let index = 0; index < count; index += 1) {
        const id = `g${level}-${next.length}`;
        groups.push({
          id,
          kind: pick(GROUP_KINDS),
          label: `${pick(WORDS)} ${level === 0 ? "domain" : "zone"}`,
          ...(parent ? { parent } : {}),
          ...(random() < 0.4 ? { layout: { mode: pick(["column", "row", "grid", "auto"] as const) } } : {}),
        });
        groupIds.push(id);
        next.push(id);
      }
    }
    frontier = next;
    if (next.length > 6) break;
  }

  const nodes = Array.from({ length: nodeCount }, (_, index) => {
    const label = longLabels && random() < 0.4
      ? `${pick(WORDS)} ${pick(WORDS)} ${pick(WORDS)} service`
      : `${pick(WORDS)}-${index}`;
    return {
      id: `n${index}`,
      kind: pick(NODE_KINDS),
      label,
      ...(groupIds.length && random() < 0.85 ? { group: pick(groupIds) } : {}),
      ...(random() < 0.25 ? { description: `${pick(WORDS)} responsibility` } : {}),
      ...(random() < 0.2 ? { visual: { replicas: between(2, 12) } } : {}),
      ...(random() < 0.15 ? { technology: pick(["postgresql", "redis", "kafka", "nginx", "python", "go"]) } : {}),
    } as Record<string, unknown>;
  });

  // A gateway with a measured route table, in roughly a third of the corpus.
  const compartmentTargets: number[] = [];
  if (withCompartments && nodeCount >= 4 && family !== "layers") {
    const routes = between(2, 5);
    const ports = Array.from({ length: routes }, (_, index) => ({
      id: `r${index}`,
      label: `/${pick(WORDS)}/*`,
      side: "east",
      kind: "output",
      ...(random() < 0.6 ? { order: index } : {}),
    }));
    nodes[0] = { ...nodes[0], kind: "gateway", ports, visual: { portLabels: "inside" } };
    for (let index = 0; index < routes; index += 1) compartmentTargets.push(1 + (index % (nodeCount - 1)));
  }

  const pairs = new Map<string, [number, number]>();
  const add = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= nodeCount || to >= nodeCount) return;
    pairs.set(`${from}-${to}`, [from, to]);
  };
  switch (shape) {
    case "chain":
      for (let index = 1; index < nodeCount; index += 1) add(index - 1, index);
      break;
    case "hub":
      for (let index = 1; index < nodeCount; index += 1) add(0, index);
      for (let index = 0; index < between(0, 6); index += 1) add(between(1, nodeCount - 1), 0);
      break;
    case "pipeline": {
      const width = Math.max(2, Math.floor(Math.sqrt(nodeCount)));
      for (let index = 0; index + width < nodeCount; index += 1) add(index, index + width);
      break;
    }
    case "mesh":
      for (let index = 0; index < nodeCount * 1.6; index += 1) add(between(0, nodeCount - 1), between(0, nodeCount - 1));
      break;
    case "tree":
      for (let index = 1; index < nodeCount; index += 1) add(Math.floor((index - 1) / 2), index);
      break;
    case "bipartite": {
      const half = Math.max(1, Math.floor(nodeCount / 2));
      for (let index = 0; index < half; index += 1) {
        add(index, half + (index % Math.max(1, nodeCount - half)));
        if (random() < 0.5) add(index, half + ((index + 1) % Math.max(1, nodeCount - half)));
      }
      break;
    }
    case "islands":
      for (let index = 1; index < nodeCount; index += 1) if (index % 4 !== 0) add(index - 1, index);
      break;
  }
  // A few cycles and parallel relationships, which real models have.
  for (let index = 0; index < between(0, 3); index += 1) add(between(0, nodeCount - 1), between(0, nodeCount - 1));

  const edges = [...pairs.values()].map(([from, to], index) => ({
    id: `e${index}`,
    from: `n${from}`,
    to: `n${to}`,
    ...(random() < 0.7 ? { label: longLabels && random() < 0.3 ? `${pick(WORDS)} ${pick(WORDS)}` : pick(WORDS) } : {}),
    ...(random() < 0.3 ? { kind: pick(["request", "read", "write", "publish", "consume", "authenticate", "async"] as const) } : {}),
  }));
  for (const [index, target] of compartmentTargets.entries()) {
    edges.push({ id: `rt${index}`, from: "n0", to: `n${target}`, sourcePort: `r${index}`, label: `route ${index}` } as never);
  }

  const annotations = withAnnotations
    ? Array.from({ length: between(1, 3) }, (_, index) => ({
        id: `a${index}`,
        kind: pick(["note", "warning", "callout"] as const),
        text: `${pick(WORDS)} ${pick(WORDS)} constraint worth recording for the reader.`,
        ...(random() < 0.7 ? { anchor: `n${between(0, nodeCount - 1)}` } : {}),
      }))
    : [];

  const theme = authoredTheme
    ? {
        extends: pick(THEMES),
        ...(random() < 0.6 ? { canvas: { background: "#0F1420", foreground: "#EAF0FA", muted: "#94A6BF" } } : {}),
        ...(random() < 0.5 ? { font: { labelSize: between(12, 18), lineHeight: 1.25 } } : {}),
        ...(random() < 0.5 ? { node: { radius: between(0, 18) } } : {}),
        ...(random() < 0.4 ? { edge: { palette: ["#3D8BFD", "#E06C9F", "#3FBF8F", "#E8A33D"] } } : {}),
      }
    : pick(THEMES);

  return {
    id: `case-${String(seed).padStart(4, "0")}`,
    shape,
    family,
    nodeCount,
    edgeCount: edges.length,
    depth,
    document: {
      apiVersion: "topoir.dev/v1alpha1",
      kind: "Architecture",
      metadata: { name: `generated-${seed}` },
      model: { ...(groups.length ? { groups } : {}), nodes, edges, ...(annotations.length ? { annotations } : {}) },
      views: [
        {
          id: "overview",
          theme,
          design: { composition: family },
          layout: { direction: family === "layers" ? "down" : "right" },
        },
      ],
    },
  };
}

const HARD = ["nodeOverlaps", "edgeNodeIntersections", "nonOrthogonalSegments", "emptyRoutes", "endpointBodyCrossings", "droppedRelationships", "droppedComponents", "droppedLabels"] as const;
const SOFT = ["labelOverlaps", "annotationOverlaps", "groupTitleIntersections", "coincidentEdgeSegments", "illegalBoundaryCrossings"] as const;

const failures: string[] = [];
const shapes: { tag: string; aspect: number; deviation: number; ink: number }[] = [];
const totals: Record<string, number> = {};
const byFamily: Record<string, { clean: number; runs: number }> = {};
let compiled = 0;
let cleanHard = 0;
let cleanAll = 0;
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

  const metrics = (result.views[0]?.metrics ?? {}) as Record<string, number>;
  let hard = 0;
  let soft = 0;
  for (const key of HARD) {
    totals[key] = (totals[key] ?? 0) + (metrics[key] ?? 0);
    hard += metrics[key] ?? 0;
  }
  for (const key of SOFT) {
    totals[key] = (totals[key] ?? 0) + (metrics[key] ?? 0);
    soft += metrics[key] ?? 0;
  }
  totals["edgeCrossings"] = (totals["edgeCrossings"] ?? 0) + (metrics["edgeCrossings"] ?? 0);
  // Shape is a quality property the defect counts cannot express: a diagram can satisfy
  // every rule above and still be the wrong rectangle to read.
  shapes.push({ tag, aspect: metrics["aspectRatio"] ?? 0, deviation: metrics["aspectDeviation"] ?? 0, ink: metrics["inkCoverage"] ?? 0 });
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
  ``,
  `## Defect totals across the corpus`,
  ``,
  `| Metric | Total |`,
  `| --- | ---: |`,
  ...[...HARD, ...SOFT, "edgeCrossings"].map((key) => `| ${key} | ${totals[key] ?? 0} |`),
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
