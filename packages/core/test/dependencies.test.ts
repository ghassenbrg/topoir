import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * T05 — the workspace layering, asserted rather than assumed.
 *
 * Moving shared scene types into core is only safe if core stays below the renderer. A
 * cycle would not necessarily fail a build — bundlers and TypeScript both tolerate some —
 * but it would make the packages impossible to reason about and would eventually surface
 * as an initialization-order bug that is very hard to attribute.
 */

const root = fileURLToPath(new URL("../../..", import.meta.url));

/** Allowed workspace dependencies, low to high. A package may depend only on those below it. */
const LAYERS: readonly (readonly string[])[] = [
  ["@topoir/schema", "@topoir/assets"],
  ["@topoir/core"],
  ["@topoir/layout-elk", "@topoir/renderer-svg"],
  ["@topoir/layout"],
  ["@topoir/sdk"],
  ["@topoir/cli", "@topoir/mcp"],
];

function layerOf(name: string): number {
  const index = LAYERS.findIndex((layer) => layer.includes(name));
  if (index < 0) throw new Error(`Unknown workspace package ${name}; add it to the layer table.`);
  return index;
}

async function workspaceDependencies(): Promise<Map<string, string[]>> {
  const packages = await readdir(join(root, "packages"));
  const graph = new Map<string, string[]>();
  for (const directory of packages) {
    const manifest = JSON.parse(await readFile(join(root, "packages", directory, "package.json"), "utf8")) as {
      name: string;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    graph.set(
      manifest.name,
      [...Object.keys(manifest.dependencies ?? {}), ...Object.keys(manifest.devDependencies ?? {})].filter((dependency) =>
        dependency.startsWith("@topoir/"),
      ),
    );
  }
  return graph;
}

describe("workspace dependency direction", () => {
  it("has no cycle between workspace packages", async () => {
    const graph = await workspaceDependencies();
    const state = new Map<string, "visiting" | "done">();
    const cycles: string[] = [];
    const visit = (name: string, path: readonly string[]): void => {
      if (state.get(name) === "done") return;
      if (state.get(name) === "visiting") {
        cycles.push([...path, name].join(" -> "));
        return;
      }
      state.set(name, "visiting");
      for (const dependency of graph.get(name) ?? []) visit(dependency, [...path, name]);
      state.set(name, "done");
    };
    for (const name of graph.keys()) visit(name, []);
    expect(cycles).toEqual([]);
  });

  it("never depends upward through the layers", async () => {
    const graph = await workspaceDependencies();
    const violations: string[] = [];
    for (const [name, dependencies] of graph) {
      for (const dependency of dependencies) {
        if (layerOf(dependency) >= layerOf(name)) violations.push(`${name} depends on ${dependency}`);
      }
    }
    expect(violations).toEqual([]);
  });

  it("keeps core independent of the renderer and the layout backend", async () => {
    // This is the property that makes it correct for SceneDocument to live in core:
    // quality analysis and export both need scene types, and neither should have to pull
    // in an SVG package to get them.
    const graph = await workspaceDependencies();
    expect(graph.get("@topoir/core") ?? []).toEqual(["@topoir/schema"]);
  });

  it("does not let core import from a higher package in source", async () => {
    // The manifest is one half of it; an import that bypasses the manifest is the other.
    const forbidden = /@topoir\/(renderer-svg|layout-elk|sdk|cli|mcp)/u;
    const offenders: string[] = [];
    const walk = async (directory: string): Promise<void> => {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        const full = join(directory, entry.name);
        if (entry.isDirectory()) {
          await walk(full);
          continue;
        }
        if (!entry.name.endsWith(".ts")) continue;
        const contents = await readFile(full, "utf8");
        for (const line of contents.split("\n")) {
          if (/^\s*import\b/u.test(line) && forbidden.test(line)) offenders.push(`${full}: ${line.trim()}`);
        }
      }
    };
    await walk(join(root, "packages/core/src"));
    expect(offenders).toEqual([]);
  });
});
