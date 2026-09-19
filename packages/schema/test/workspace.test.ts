import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import {
  acceptedFamilies,
  DIAGRAM_FAMILIES,
  findFamily,
  isWorkspaceDocument,
  topoirWorkspaceSchema,
  validateWorkspace,
  WORKSPACE_API_VERSION,
  WORKSPACE_KIND,
} from "../src/index.js";
import { generate } from "../scripts/generate-workspace-types.mts";

/**
 * T10 — the v1alpha2 workspace envelope and the family registry.
 *
 * `v1alpha1` remains fully supported through its own loader; this language is additive.
 * A document says which language it is written in and is validated against that language.
 */

const root = fileURLToPath(new URL("../../..", import.meta.url));

function workspace(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    apiVersion: WORKSPACE_API_VERSION,
    kind: WORKSPACE_KIND,
    metadata: { name: "example" },
    models: [{ id: "deployment", family: "architecture", body: { nodes: [{ id: "api", kind: "api", label: "API" }] } }],
    views: [{ id: "overview", model: "deployment" }],
    ...overrides,
  };
}

describe("the target examples", () => {
  it("accepts the architecture example the design package ships", async () => {
    const source = await readFile(`${root}/fixtures/workspace/architecture.topoir.yaml`, "utf8");
    const result = validateWorkspace(parse(source));
    expect(result.diagnostics.map((diagnostic) => `${diagnostic.path ?? ""} ${diagnostic.message}`)).toEqual([]);
    expect(result.ok).toBe(true);
  });

  for (const family of ["process", "interaction"] as const) {
    it(`rejects the ${family} example, because that family is not implemented`, async () => {
      // The honest outcome. These examples are design fixtures for T21/T23; accepting them
      // and producing nothing useful would be worse than rejecting them.
      const source = await readFile(`${root}/fixtures/workspace/${family}.topoir.yaml`, "utf8");
      const result = validateWorkspace(parse(source));
      expect(result.ok).toBe(false);
      const reported = result.diagnostics.filter((diagnostic) => diagnostic.code === "TOP105_FAMILY_NOT_IMPLEMENTED");
      expect(reported).toHaveLength(1);
      // The message says what is missing and which task will deliver it.
      expect(reported[0]?.message).toContain(family);
      expect(reported[0]?.message).toMatch(/T\d\d/u);
      expect(reported[0]?.path).toBe("/models/0/family");
    });
  }
});

describe("envelope", () => {
  it("accepts a minimal workspace", () => {
    const result = validateWorkspace(workspace());
    expect(result.diagnostics).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("rejects an unsupported apiVersion in the author's terms", () => {
    // Ajv alone reports "must be equal to constant", which tells an author nothing.
    const result = validateWorkspace(workspace({ apiVersion: "topoir.dev/v1alpha1" }));
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0]?.code).toBe("TOP103_UNSUPPORTED_API_VERSION");
    expect(result.diagnostics[0]?.message).toContain("v1alpha1 loader");
  });

  it("rejects an unsupported kind", () => {
    const result = validateWorkspace(workspace({ kind: "Architecture" }));
    expect(result.diagnostics[0]?.code).toBe("TOP103_UNSUPPORTED_API_VERSION");
  });

  it("rejects an unknown family and lists what is accepted", () => {
    const result = validateWorkspace(
      workspace({ models: [{ id: "m", family: "mindmap", body: {} }] }),
    );
    const reported = result.diagnostics.find((diagnostic) => diagnostic.code === "TOP104_UNKNOWN_FAMILY");
    expect(reported).toBeDefined();
    expect(reported?.message).toContain("architecture");
  });

  it("requires at least one model and one view", () => {
    expect(validateWorkspace(workspace({ models: [] })).ok).toBe(false);
    expect(validateWorkspace(workspace({ views: [] })).ok).toBe(false);
  });

  it("rejects an unknown top-level property rather than ignoring it", () => {
    const result = validateWorkspace(workspace({ modles: [] }));
    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain("TOP112_UNKNOWN_PROPERTY");
  });

  it("names the missing property when one is absent", () => {
    const result = validateWorkspace(workspace({ views: [{ id: "overview" }] }));
    expect(result.ok).toBe(false);
    expect(result.diagnostics.some((diagnostic) => diagnostic.message.includes("model"))).toBe(true);
  });

  it("recognizes a workspace document even when it is otherwise invalid", () => {
    // The loader must be able to route a broken v1alpha2 document to the right validator
    // rather than reporting it as a broken v1alpha1 document.
    expect(isWorkspaceDocument({ apiVersion: WORKSPACE_API_VERSION })).toBe(true);
    expect(isWorkspaceDocument({ kind: WORKSPACE_KIND })).toBe(true);
    expect(isWorkspaceDocument({ apiVersion: "topoir.dev/v1alpha1", kind: "Architecture" })).toBe(false);
    expect(isWorkspaceDocument("nonsense")).toBe(false);
  });
});

describe("identity and projection", () => {
  it("accepts entities linked from family elements", () => {
    const result = validateWorkspace(
      workspace({
        entities: [{ id: "checkout", kind: "software.service", label: "Checkout API" }],
        models: [{ id: "m", family: "architecture", body: { nodes: [{ id: "api", kind: "api", entity: "checkout" }] } }],
      }),
    );
    expect(result.diagnostics).toEqual([]);
  });

  it("accepts both edge policies and rejects a third", () => {
    for (const edgePolicy of ["induced", "exact"]) {
      const result = validateWorkspace(
        workspace({ views: [{ id: "v", model: "deployment", projection: { edgePolicy } }] }),
      );
      expect(result.diagnostics, edgePolicy).toEqual([]);
    }
    expect(validateWorkspace(workspace({ views: [{ id: "v", model: "deployment", projection: { edgePolicy: "all" } }] })).ok).toBe(false);
  });

  it("accepts explicit occurrences and connection bindings", () => {
    const result = validateWorkspace(
      workspace({
        views: [
          {
            id: "v",
            model: "deployment",
            projection: {
              occurrences: [{ id: "api-detail", element: "api", role: "detail" }],
              connections: [{ relationship: "submit", to: "api-detail" }],
            },
          },
        ],
      }),
    );
    expect(result.diagnostics).toEqual([]);
  });
});

describe("presentation", () => {
  it("accepts a declared medium", () => {
    const result = validateWorkspace(
      workspace({
        views: [{ id: "v", model: "deployment", presentation: { medium: { kind: "slide", width: 1600, height: 900, minTextSize: 16 } } }],
      }),
    );
    expect(result.diagnostics).toEqual([]);
  });

  it("rejects a medium with no kind", () => {
    expect(validateWorkspace(workspace({ views: [{ id: "v", model: "deployment", presentation: { medium: { width: 800 } } }] })).ok).toBe(false);
  });

  it("accepts each constraint type with its own required fields", () => {
    const constraints = [
      { id: "c1", type: "order", items: ["a", "b"], axis: "x" },
      { id: "c2", type: "place-relative", subject: "a", reference: "b", side: "below", gap: 48 },
      { id: "c3", type: "align", items: ["a", "b"], axis: "y" },
      { id: "c4", type: "group", items: ["a", "b"] },
    ];
    for (const constraint of constraints) {
      const result = validateWorkspace(workspace({ views: [{ id: "v", model: "deployment", presentation: { constraints: [constraint] } }] }));
      expect(result.diagnostics, constraint.type).toEqual([]);
    }
  });

  it("rejects a constraint missing the fields its own type needs", () => {
    // `place-relative` without a reference is not a weaker constraint, it is meaningless.
    const result = validateWorkspace(
      workspace({ views: [{ id: "v", model: "deployment", presentation: { constraints: [{ id: "c", type: "place-relative", subject: "a" }] } }] }),
    );
    expect(result.ok).toBe(false);
  });

  it("accepts required content that may never be dropped to make a diagram fit", () => {
    const result = validateWorkspace(
      workspace({
        views: [{ id: "v", model: "deployment", presentation: { contentPolicy: { detail: "standard", required: [{ element: "api", field: "label" }] } } }],
      }),
    );
    expect(result.diagnostics).toEqual([]);
  });
});

describe("family registry", () => {
  it("declares a maturity and a summary for every family", () => {
    for (const family of DIAGRAM_FAMILIES) {
      expect(["supported", "experimental", "planned"], family.id).toContain(family.maturity);
      expect(family.summary.length, family.id).toBeGreaterThan(20);
    }
  });

  it("names the owning task for every family that is not yet supported", () => {
    for (const family of DIAGRAM_FAMILIES) {
      if (family.maturity === "supported") continue;
      expect(family.plannedIn, family.id).toMatch(/^T\d\d$/u);
    }
  });

  it("accepts only families whose bodies the schema can validate", () => {
    const accepted = acceptedFamilies().map((family) => family.id);
    const branches = (topoirWorkspaceSchema as { $defs: { model: { oneOf: { properties: { family: { const: string } } }[] } } }).$defs.model.oneOf;
    // Both directions: nothing advertised as accepted lacks a body schema, and no body
    // schema exists for a family the registry does not advertise.
    expect(branches.map((branch) => branch.properties.family.const).sort()).toEqual([...accepted].sort());
  });

  it("finds a family by id and reports an unknown one as undefined", () => {
    expect(findFamily("architecture")?.maturity).toBe("supported");
    expect(findFamily("mindmap")).toBeUndefined();
  });
});

describe("generated types cannot drift from the schema", () => {
  it("matches what the generator produces from the schema right now", async () => {
    // The schema is the wire authority. If this fails, the schema changed and the types
    // were not regenerated: run `pnpm --filter @topoir/schema generate`.
    const onDisk = await readFile(`${root}/packages/schema/src/workspace-types.ts`, "utf8");
    expect(onDisk).toBe(generate());
  });

  it("generates a type for every schema definition", () => {
    const generated = generate();
    const defs = Object.keys((topoirWorkspaceSchema as { $defs: Record<string, unknown> }).$defs);
    for (const key of defs) {
      const name = key.charAt(0).toUpperCase() + key.slice(1);
      expect(generated, key).toMatch(new RegExp(`export (interface|type) ${name}\\b`, "u"));
    }
    expect(generated).toContain("export interface DiagramWorkspace");
  });
});
