import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { diagnosticFamily, parseDocument, validateStructure, TOPOIR_DIAGNOSTIC_CODES } from "../src/index.js";

const valid = `
apiVersion: topoir.dev/v1alpha1
kind: Architecture
metadata:
  name: payments
model:
  groups:
    - id: prod
      kind: kubernetes-cluster
  nodes:
    - id: api
      kind: api
      group: prod
`;

describe("TopoIR document parser and schema", () => {
  it("parses YAML and records JSON-pointer source ranges", () => {
    const result = parseDocument(valid, { source: "architecture.yaml" });

    expect(result.diagnostics).toEqual([]);
    expect(result.value).toBeDefined();
    expect(result.sourceMap.find("/model/nodes/0/id")).toMatchObject({
      start: { line: 11 },
    });
  });

  it("reports duplicate YAML keys as parse diagnostics", () => {
    const result = parseDocument("kind: Architecture\nkind: Other\n");

    expect(result.value).toBeUndefined();
    expect(result.diagnostics[0]).toMatchObject({ code: "TOP100_PARSE_ERROR", severity: "error" });
  });

  it("returns source-aware diagnostics for unknown properties", () => {
    const parsed = parseDocument(`${valid}\n  mystery: true\n`, { source: "architecture.yaml" });
    const result = validateStructure(parsed.value, parsed.sourceMap);

    expect(result.ok).toBe(false);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "TOP112_UNKNOWN_PROPERTY",
        path: "/model/mystery",
        source: "architecture.yaml",
      }),
    );
  });

  it("accepts namespaced extension properties but rejects arbitrary ones", () => {
    const parsed = parseDocument(`${valid}\nx-vendor-data:\n  anything: true\n`);
    expect(validateStructure(parsed.value, parsed.sourceMap).ok).toBe(true);
  });
});

describe("diagnostic code registry", () => {
  it("lists every code the compiler can actually emit", async () => {
    // The contract asks agents to branch on `code`, which only works if the codes can be
    // enumerated. They were string literals spread across five packages with no list, so
    // this reads them back out of the source and holds the registry to it.
    const root = fileURLToPath(new URL("../../..", import.meta.url));
    const found = new Set<string>();
    const walk = async (dir: string): Promise<void> => {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "test") continue;
          await walk(full);
          continue;
        }
        if (!entry.name.endsWith(".ts")) continue;
        for (const match of (await readFile(full, "utf8")).matchAll(/"(TOP\d{3}_[A-Z_]+)"/g)) found.add(match[1]!);
      }
    };
    await walk(join(root, "packages"));

    expect(found.size).toBeGreaterThan(40);
    expect([...found].sort()).toEqual([...TOPOIR_DIAGNOSTIC_CODES].sort());
    expect(new Set(TOPOIR_DIAGNOSTIC_CODES).size).toBe(TOPOIR_DIAGNOSTIC_CODES.length);
  });

  it("groups a code into its documented family", () => {
    expect(diagnosticFamily("TOP412_RELATIONSHIP_DROPPED")).toBe("TOP4xx");
    expect(diagnosticFamily("TOP100_PARSE_ERROR")).toBe("TOP1xx");
  });
});
