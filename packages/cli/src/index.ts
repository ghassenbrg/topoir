import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { TopoIRCompiler, TOPOIR_VERSION, AssetRegistry, capabilities, capabilitiesOfKind, discoverAssets, themes, type CompileArtifact } from "@topoir/sdk";
import { SUPPORTED_NODE_KINDS, topoirSchema, type Diagnostic } from "@topoir/schema";

export interface CliIO {
  readonly stdin: NodeJS.ReadableStream;
  readonly stdout: NodeJS.WritableStream;
  readonly stderr: NodeJS.WritableStream;
  readonly cwd: string;
}

const defaultIO: CliIO = {
  stdin: process.stdin,
  stdout: process.stdout,
  stderr: process.stderr,
  cwd: process.cwd(),
};

export async function runCli(argv: readonly string[], io: CliIO = defaultIO): Promise<number> {
  const [command, ...rest] = argv;
  try {
    // `topoir <command> --help` used to reach parseArgs, which rejects it as an unknown
    // option; the result was reported as TOP900_INTERNAL_ERROR with no usage text, so an
    // agent that guessed a flag was told the compiler had crashed.
    if (command !== undefined && COMMAND_USAGE[command] !== undefined && rest.some((item) => item === "--help" || item === "-h")) {
      io.stdout.write(`${COMMAND_USAGE[command]}\n`);
      return 0;
    }
    switch (command) {
      case undefined:
      case "help":
      case "--help":
      case "-h":
        io.stdout.write(helpText());
        return 0;
      case "--version":
      case "-v":
      case "version":
        io.stdout.write(`${TOPOIR_VERSION}\n`);
        return 0;
      case "validate":
        return await validateCommand(rest, io);
      case "render":
      case "export":
        return await renderCommand(rest, io);
      case "inspect":
        return await inspectCommand(rest, io);
      case "schema":
        io.stdout.write(`${JSON.stringify(topoirSchema, null, 2)}\n`);
        return 0;
      case "icons":
      case "assets":
        return await iconsCommand(rest, io);
      case "styles":
        io.stdout.write(`${JSON.stringify(themes.map(({ id, language }) => ({ id, language })), null, 2)}\n`);
        return 0;
      case "capabilities":
        // Generated from the one capability registry the MCP server also reads, so the
        // two surfaces cannot disagree about what this build can do.
        io.stdout.write(`${JSON.stringify({ version: TOPOIR_VERSION, capabilities: capabilities() }, null, 2)}\n`);
        return 0;
      case "doctor":
        return await doctorCommand(rest, io);
      default:
        io.stderr.write(`Unknown command ${JSON.stringify(command)}.\n\n${helpText()}`);
        return 2;
    }
  } catch (error) {
    if (error instanceof UsageError) {
      io.stderr.write(`${error.message}\n`);
      return 2;
    }
    // A bad flag is the caller's mistake, not an unexpected failure. TOP9xx is documented
    // as an uncaught runtime error, so reporting usage there tells an agent to branch the
    // wrong way entirely.
    if (isUsageFailure(error)) {
      io.stderr.write(`TOP120_CLI_USAGE ${error instanceof Error ? error.message : String(error)}\n\n${command !== undefined && COMMAND_USAGE[command] !== undefined ? `${COMMAND_USAGE[command]}\n` : helpText()}`);
      return 2;
    }
    io.stderr.write(`TOP900_INTERNAL_ERROR ${error instanceof Error ? error.message : String(error)}\n`);
    return 3;
  }
}

async function validateCommand(argv: readonly string[], io: CliIO): Promise<number> {
  const parsed = parseArgs({
    args: [...argv],
    allowPositionals: true,
    strict: true,
    options: {
      json: { type: "boolean", default: false },
      "warnings-as-errors": { type: "boolean", default: false },
    },
  });
  const input = requireOneInput(parsed.positionals, "validate");
  const source = await readSource(input, io);
  const result = new TopoIRCompiler().validate(source.text, source.name);
  const failed = !result.ok || (parsed.values["warnings-as-errors"] && result.diagnostics.some((item) => item.severity === "warning"));
  if (parsed.values.json) {
    io.stdout.write(`${JSON.stringify({ ok: !failed, diagnostics: result.diagnostics }, null, 2)}\n`);
  } else if (result.diagnostics.length === 0) {
    io.stdout.write(`Valid TopoIR document: ${source.name}\n`);
  } else {
    writeDiagnostics(result.diagnostics, io.stderr);
  }
  return failed ? 1 : 0;
}

async function renderCommand(argv: readonly string[], io: CliIO): Promise<number> {
  const parsed = parseArgs({
    args: [...argv],
    allowPositionals: true,
    strict: true,
    options: {
      output: { type: "string", short: "o", default: "." },
      format: { type: "string", short: "f", default: "svg" },
      view: { type: "string", short: "V" },
      json: { type: "boolean", default: false },
      manifest: { type: "boolean", default: false },
      scale: { type: "string", default: "1" },
      assets: { type: "string" },
      "warnings-as-errors": { type: "boolean", default: false },
    },
  });
  const input = requireOneInput(parsed.positionals, "render");
  const format = parseFormat(parsed.values.format);
  const scale = Number(parsed.values.scale);
  if (!Number.isFinite(scale) || scale <= 0 || scale > 8) throw new UsageError("--scale must be greater than 0 and at most 8.");
  const source = await readSource(input, io);
  const result = await new TopoIRCompiler().compile(source.text, {
    source: source.name,
    format,
    ...(parsed.values.view === undefined ? {} : { view: parsed.values.view }),
    png: { scale },
    ...(parsed.values.assets === undefined ? {} : { assetDirectory: resolve(io.cwd, parsed.values.assets) }),
  });
  const warningsFailed = parsed.values["warnings-as-errors"] && result.diagnostics.some((item) => item.severity === "warning");
  if (!result.ok || warningsFailed) {
    if (parsed.values.json) {
      io.stdout.write(`${JSON.stringify({ ok: false, diagnostics: result.diagnostics }, null, 2)}\n`);
    } else {
      writeDiagnostics(result.diagnostics, io.stderr);
    }
    return 1;
  }

  const output = parsed.values.output ?? ".";
  const written = await writeArtifacts(result.artifacts, output, io);
  let manifestPath: string | undefined;
  if (parsed.values.manifest && result.manifest !== undefined) {
    if (output === "-") throw new UsageError("--manifest cannot be combined with --output -.");
    const manifestDirectory = artifactDirectory(output, result.artifacts, io.cwd);
    await mkdir(manifestDirectory, { recursive: true });
    manifestPath = join(manifestDirectory, "topoir.manifest.json");
    await writeFile(manifestPath, `${JSON.stringify(result.manifest, null, 2)}\n`, "utf8");
  }
  if (parsed.values.json) {
    io.stdout.write(`${JSON.stringify({ ok: true, files: written, manifest: manifestPath, diagnostics: result.diagnostics }, null, 2)}\n`);
  } else if (output !== "-") {
    written.forEach((file) => io.stderr.write(`Rendered ${file}\n`));
    if (manifestPath !== undefined) io.stderr.write(`Wrote ${manifestPath}\n`);
    writeDiagnostics(result.diagnostics, io.stderr);
  }
  return 0;
}

async function inspectCommand(argv: readonly string[], io: CliIO): Promise<number> {
  const parsed = parseArgs({
    args: [...argv],
    allowPositionals: true,
    strict: true,
    options: {
      stage: { type: "string", short: "s", default: "model" },
      view: { type: "string", short: "V" },
      assets: { type: "string" },
    },
  });
  const input = requireOneInput(parsed.positionals, "inspect");
  const source = await readSource(input, io);
  const stage = parsed.values.stage ?? "model";
  if (stage === "model") {
    const result = new TopoIRCompiler().validate(source.text, source.name);
    if (!result.ok || result.document === undefined) {
      writeDiagnostics(result.diagnostics, io.stderr);
      return 1;
    }
    io.stdout.write(`${JSON.stringify(result.document, sourceMapReplacer, 2)}\n`);
    return 0;
  }
  if (!["view", "geometry", "metrics", "manifest"].includes(stage)) {
    throw new UsageError("--stage must be one of model, view, geometry, metrics, or manifest.");
  }
  const result = await new TopoIRCompiler().compile(source.text, {
    source: source.name,
    format: "svg",
    ...(parsed.values.assets === undefined ? {} : { assetDirectory: resolve(io.cwd, parsed.values.assets) }),
    ...(parsed.values.view === undefined ? {} : { view: parsed.values.view }),
  });
  if (result.views.length === 0) {
    writeDiagnostics(result.diagnostics, io.stderr);
    return 1;
  }
  const extract = (compiled: (typeof result.views)[number]): unknown => {
    if (stage === "view") return compiled.view;
    if (stage === "geometry") return compiled.geometry;
    return compiled.metrics;
  };
  const payload = stage === "manifest"
    ? result.manifest
    : result.views.length === 1
      ? (result.views[0] === undefined ? undefined : extract(result.views[0]))
      : Object.fromEntries(result.views.map((view) => [view.view.id, extract(view)]));
  io.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  return result.ok ? 0 : 1;
}

async function iconsCommand(argv: readonly string[], io: CliIO): Promise<number> {
  const parsed = parseArgs({
    args: [...argv],
    allowPositionals: true,
    strict: true,
    options: { json: { type: "boolean", default: false }, assets: { type: "string" }, limit: { type: "string", default: "50" } },
  });
  const [subcommand = "list", query = ""] = parsed.positionals;
  if (subcommand !== "list" && subcommand !== "search") throw new UsageError("icons supports `list` or `search <query>`. ");
  const registry = new AssetRegistry();
  if (parsed.values.assets) {
    const inventory = await discoverAssets(resolve(io.cwd, parsed.values.assets), registry);
    if (inventory.diagnostics.length) { writeDiagnostics(inventory.diagnostics, io.stderr); return 1; }
  }
  const limit = Number(parsed.values.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 5000) throw new UsageError("--limit must be an integer from 1 to 5000.");
  const icons = registry.search(subcommand === "search" ? query : "", limit);
  if (parsed.values.json) io.stdout.write(`${JSON.stringify({ total: registry.size, icons }, null, 2)}\n`);
  else icons.forEach((icon) => io.stdout.write(`${icon.id}\t${icon.name}\t${icon.license}\n`));
  return 0;
}

async function doctorCommand(argv: readonly string[], io: CliIO): Promise<number> {
  if (argv.length > 0) throw new UsageError("doctor does not accept arguments.");
  const smoke = `apiVersion: topoir.dev/v1alpha1\nkind: Architecture\nmetadata:\n  name: doctor\nmodel:\n  nodes:\n    - id: ok\n      kind: service\n`;
  const result = await new TopoIRCompiler().compile(smoke, { format: "both", source: "<doctor>" });
  const report = {
    ok: result.ok && result.artifacts.some((item) => item.format === "png"),
    topoir: TOPOIR_VERSION,
    node: process.version,
    platform: `${process.platform}-${process.arch}`,
    checks: {
      schema: result.document !== undefined,
      layout: result.views.length === 1,
      svg: result.artifacts.some((item) => item.format === "svg"),
      png: result.artifacts.some((item) => item.format === "png"),
    },
    diagnostics: result.diagnostics,
  };
  io.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  return report.ok ? 0 : 1;
}

async function readSource(input: string, io: CliIO): Promise<{ text: string; name: string }> {
  if (input === "-") {
    const chunks: Buffer[] = [];
    for await (const chunk of io.stdin) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return { text: Buffer.concat(chunks).toString("utf8"), name: "<stdin>" };
  }
  const path = resolve(io.cwd, input);
  return { text: await readFile(path, "utf8"), name: path };
}

async function writeArtifacts(
  artifacts: readonly CompileArtifact[],
  output: string,
  io: CliIO,
): Promise<string[]> {
  if (output === "-") {
    if (artifacts.length !== 1) throw new UsageError("--output - requires exactly one view and one format.");
    const artifact = artifacts[0];
    if (artifact === undefined) throw new Error("Compiler returned no artifact.");
    io.stdout.write(artifact.content);
    return ["<stdout>"];
  }
  const absolute = resolve(io.cwd, output);
  const outputLooksLikeFile = artifacts.length === 1 && [".svg", ".png"].includes(extname(absolute).toLowerCase());
  if (outputLooksLikeFile) {
    const artifact = artifacts[0];
    if (artifact === undefined) throw new Error("Compiler returned no artifact.");
    if (extname(absolute).slice(1).toLowerCase() !== artifact.format) {
      throw new UsageError(`Output extension must be .${artifact.format}.`);
    }
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, artifact.content);
    return [absolute];
  }
  await mkdir(absolute, { recursive: true });
  const written: string[] = [];
  for (const artifact of artifacts) {
    const path = join(absolute, artifact.fileName);
    await writeFile(path, artifact.content);
    written.push(path);
  }
  return written;
}

function artifactDirectory(output: string, artifacts: readonly CompileArtifact[], cwd: string): string {
  const absolute = resolve(cwd, output);
  return artifacts.length === 1 && [".svg", ".png"].includes(extname(absolute).toLowerCase()) ? dirname(absolute) : absolute;
}

function writeDiagnostics(diagnostics: readonly Diagnostic[], stream: NodeJS.WritableStream): void {
  for (const diagnostic of diagnostics) {
    const location =
      diagnostic.source === undefined
        ? ""
        : `${diagnostic.source}${diagnostic.range === undefined ? "" : `:${diagnostic.range.start.line}:${diagnostic.range.start.column}`}: `;
    stream.write(`${location}${diagnostic.severity} ${diagnostic.code} ${diagnostic.message}\n`);
    if (diagnostic.hint !== undefined) stream.write(`  hint: ${diagnostic.hint}\n`);
  }
}

function requireOneInput(positionals: readonly string[], command: string): string {
  if (positionals.length !== 1 || positionals[0] === undefined) {
    throw new UsageError(`${command} requires exactly one input file, or - for stdin.`);
  }
  return positionals[0];
}

function parseFormat(value: string | undefined): "svg" | "png" | "both" {
  if (value === "svg" || value === "png" || value === "both") return value;
  throw new UsageError("--format must be svg, png, or both.");
}

function sourceMapReplacer(key: string, value: unknown): unknown {
  return key === "sourceMap" ? undefined : value;
}

function helpText(): string {
  return `TopoIR ${TOPOIR_VERSION} — semantic architecture visual compiler

Usage:
  topoir validate <file|-> [--json] [--warnings-as-errors]
  topoir render <file|-> [-o path|-] [-f svg|png|both] [-V view|all] [--manifest]
  topoir inspect <file|-> [--stage model|view|geometry|metrics|manifest] [-V view]
  topoir schema
  topoir capabilities
  topoir icons list [--json]
  topoir icons search <query> [--json]
  topoir doctor

Exit codes: 0 success, 1 document/compile failure, 2 usage error, 3 I/O/internal failure.
`;
}

class UsageError extends Error {}

/** Node reports every argument-parsing problem with an `ERR_PARSE_ARGS_*` code. */
function isUsageFailure(error: unknown): boolean {
  return typeof (error as { code?: unknown })?.code === "string" && String((error as { code: string }).code).startsWith("ERR_PARSE_ARGS_");
}

/** Per-command usage, so `topoir <command> --help` answers instead of failing. */
const COMMAND_USAGE: Record<string, string> = {
  capabilities: `topoir capabilities

List every composition, intent, style and output format this build exposes, each with the
maturity it has actually reached: implemented, experimental, advisory or unsupported. The
MCP design inventory is generated from the same table, so the two cannot disagree.`,
  validate: `topoir validate <file|-> [--json] [--warnings-as-errors] [--assets <directory>]

Parse, structurally validate and check semantic references.`,
  render: `topoir render <file|-> [-o|--output path|-] [-f|--format svg|png|both] [-V|--view id|all]
                            [--manifest] [--assets <directory>] [--json] [--warnings-as-errors]

Compile one or all views to SVG, PNG or both.`,
  export: `topoir export <file|-> [-o|--output path|-] [-f|--format svg|png|both] [-V|--view id|all]
                            [--manifest] [--assets <directory>] [--json] [--warnings-as-errors]

Alias of the render command.`,
  inspect: `topoir inspect <file|-> [--stage model|view|geometry|metrics|manifest] [-V|--view id] [--assets <directory>]

Print a normalized pipeline stage as JSON.`,
  icons: `topoir icons list [--json] [--assets <directory>]
topoir icons search <query> [--json] [--assets <directory>]

Search the offline asset inventory with provenance.`,
  assets: `topoir assets list [--json] [--assets <directory>]
topoir assets search <query> [--json] [--assets <directory>]

Alias of the icons command.`,
  doctor: `topoir doctor [--json]

Verify schema, layout, SVG and native PNG support.`,
};
