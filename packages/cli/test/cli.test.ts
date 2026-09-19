import { execFile, spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const temporaryDirectories: string[] = [];
const cli = resolve(process.cwd(), "packages/cli/dist/bin.js");
const example = resolve(process.cwd(), "examples/checkout-platform.topoir.yaml");

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { force: true, recursive: true })));
});

describe("TopoIR CLI", () => {
  it("validates with machine-readable diagnostics", async () => {
    const { stdout } = await execFileAsync(process.execPath, [cli, "validate", example, "--json"]);
    expect(JSON.parse(stdout)).toEqual({ ok: true, diagnostics: [] });
  });

  it("renders named views and a deterministic manifest", async () => {
    const directory = await mkdtemp(resolve(tmpdir(), "topoir-cli-"));
    temporaryDirectories.push(directory);
    const { stdout } = await execFileAsync(process.execPath, [
      cli,
      "render",
      example,
      "--view",
      "data",
      "--format",
      "svg",
      "--output",
      directory,
      "--manifest",
      "--json",
    ]);
    const report = JSON.parse(stdout) as { readonly ok: boolean; readonly files: readonly string[]; readonly manifest: string };
    const svg = await readFile(report.files[0] ?? "", "utf8");
    const manifest = JSON.parse(await readFile(report.manifest, "utf8")) as { readonly artifacts: readonly unknown[] };

    expect(report.ok).toBe(true);
    expect(svg).toContain("Checkout Platform — Data Flow");
    expect(manifest.artifacts).toHaveLength(1);
  });

  it("uses exit code 1 for document failures and keeps diagnostics on stdout in JSON mode", async () => {
    const result = spawnSync(process.execPath, [cli, "validate", "-", "--json"], {
      input: "kind: Architecture\n",
      encoding: "utf8",
    });
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("TOP111_REQUIRED_PROPERTY");
  });
});

describe("TopoIR CLI capability discovery", () => {
  /**
   * T04. MCP design discovery advertised five compositions while the schema accepted
   * seven, so an agent following discovery could not see `architecture` — the default for
   * system diagrams — or `architecture-map`. Both surfaces now read one registry, and
   * these assert that the CLI surface really exposes it.
   */
  it("lists every composition the schema accepts, with its maturity", async () => {
    const { stdout } = await execFileAsync(process.execPath, [cli, "capabilities"]);
    const parsed = JSON.parse(stdout) as {
      version: string;
      capabilities: { id: string; kind: string; maturity: string; summary: string; plannedIn?: string }[];
    };

    const compositions = parsed.capabilities.filter((capability) => capability.kind === "composition");
    const schema = JSON.parse((await execFileAsync(process.execPath, [cli, "schema"])).stdout) as {
      $defs: { design: { properties: { composition: { enum: string[] } } } };
    };
    expect(compositions.map((capability) => capability.id).sort()).toEqual([...schema.$defs.design.properties.composition.enum].sort());
    expect(compositions.map((capability) => capability.id)).toContain("architecture");
    expect(compositions.map((capability) => capability.id)).toContain("architecture-map");

    // Maturity is stated, so an agent can tell a benchmarked capability from one that
    // merely produces output.
    for (const capability of parsed.capabilities) {
      expect(["implemented", "experimental", "advisory", "unsupported"], capability.id).toContain(capability.maturity);
    }
    expect(parsed.capabilities.some((capability) => capability.maturity !== "implemented")).toBe(true);
  });

  it("answers `capabilities --help` instead of failing", async () => {
    const { stdout } = await execFileAsync(process.execPath, [cli, "capabilities", "--help"]);
    expect(stdout).toContain("topoir capabilities");
    expect(stdout).toContain("maturity");
  });
});
