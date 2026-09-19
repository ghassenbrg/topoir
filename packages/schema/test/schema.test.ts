import { describe, expect, it } from "vitest";
import { parseDocument, validateStructure } from "../src/index.js";

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
