import { describe, expect, it } from "vitest";
import { capabilities, capabilitiesOfKind, intentDiagnostics, schemaCompositions, themes, type ViewGraph } from "../src/index.js";

/**
 * T04 — discovery has to describe this build, not a stale hand-written list.
 *
 * The review found MCP design discovery advertising five compositions while the schema
 * accepted seven, omitting `architecture` and `architecture-map` — both implemented, and
 * `architecture` is the default for system diagrams. An agent following discovery could
 * not see the full tool. The list was a literal that had fallen behind.
 */

describe("capability registry", () => {
  it("advertises exactly the compositions the schema accepts", () => {
    // Both directions matter. Missing an entry hides a real capability; inventing one
    // advertises something the schema will reject.
    const advertised = capabilitiesOfKind("composition").map((capability) => capability.id).sort();
    const accepted = [...schemaCompositions()].sort();
    expect(accepted.length).toBeGreaterThan(0);
    expect(advertised).toEqual(accepted);
  });

  it("includes the two compositions the old inventory omitted", () => {
    const advertised = capabilitiesOfKind("composition").map((capability) => capability.id);
    expect(advertised).toContain("architecture");
    expect(advertised).toContain("architecture-map");
  });

  it("advertises every built-in style", () => {
    expect(capabilitiesOfKind("style").map((capability) => capability.id).sort()).toEqual(themes.map((theme) => theme.id).sort());
  });

  it("gives every capability a maturity and a summary", () => {
    for (const capability of capabilities()) {
      expect(capability.maturity, capability.id).toBeDefined();
      expect(capability.summary.length, capability.id).toBeGreaterThan(10);
    }
  });

  it("names the owning task for anything not yet implemented", () => {
    // "Not implemented" without a plan is how a gap becomes permanent and invisible.
    for (const capability of capabilities()) {
      if (capability.maturity === "experimental" || capability.maturity === "unsupported") {
        expect(capability.plannedIn, capability.id).toMatch(/^T\d\d$/u);
      }
    }
  });

  it("uses unique ids", () => {
    const ids = capabilities().map((capability) => capability.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

function view(overrides: Partial<ViewGraph> = {}): ViewGraph {
  return {
    id: "overview",
    title: "test",
    groups: [{ id: "platform", kind: "kubernetes-cluster", label: "Platform" }],
    nodes: [{ id: "api", kind: "api", label: "API", ports: [] }],
    edges: [],
    annotations: [],
    flows: [],
    ...overrides,
  } as unknown as ViewGraph;
}

describe("unexecuted intent", () => {
  it("reports focus on a boundary, which this build does not apply", () => {
    const diagnostics = intentDiagnostics(view({ design: { focus: ["platform"] } } as never));
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.code).toBe("TOP252_INTENT_NOT_APPLIED");
    expect(diagnostics[0]?.severity).toBe("warning");
    expect(diagnostics[0]?.message).toContain("platform");
  });

  it("says nothing about focus on a component, which is applied", () => {
    expect(intentDiagnostics(view({ design: { focus: ["api"] } } as never))).toEqual([]);
  });

  it("says nothing when no focus is declared", () => {
    expect(intentDiagnostics(view())).toEqual([]);
  });

  it("names every unapplied boundary, not just the first", () => {
    const diagnostics = intentDiagnostics(
      view({
        groups: [
          { id: "platform", kind: "kubernetes-cluster", label: "Platform" },
          { id: "edge", kind: "vpc", label: "Edge" },
        ],
        design: { focus: ["platform", "edge", "api"] },
      } as never),
    );
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.message).toContain("platform");
    expect(diagnostics[0]?.message).toContain("edge");
  });

  it("matches the maturity the registry advertises for focus", () => {
    // The diagnostic and the advertised maturity have to tell the same story; if focus is
    // ever implemented, both change together or discovery starts lying again.
    const focus = capabilitiesOfKind("intent").find((capability) => capability.id === "design.focus");
    expect(focus?.maturity).toBe("unsupported");
    expect(focus?.summary).toContain("TOP252_INTENT_NOT_APPLIED");
  });
});
