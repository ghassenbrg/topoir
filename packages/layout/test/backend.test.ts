import { describe, expect, it } from "vitest";
import type { CompiledConstraint, LayoutResult, MeasuredView } from "@topoir/core";
import {
  admit,
  availableBackends,
  compositionBackend,
  elkBackend,
  NO_CAPABILITIES,
  orchestrate,
  OrchestratedLayoutEngine,
  selectBackend,
  type BackendCapabilities,
  type LayoutBackend,
} from "../src/index.js";

/**
 * T15 — the layout backend contract.
 *
 * Composition, placement, routing and refinement lived in one 940-line module with the ELK
 * translation, so "can this backend honour a required ordering constraint?" had no answer
 * short of reading it, and a caller could hand a backend a constraint it silently ignored.
 */

function constraint(overrides: Partial<CompiledConstraint> = {}): CompiledConstraint {
  return { id: "c", type: "order", strength: "required", priority: 5, items: ["a", "b"], ...overrides };
}

function backend(capabilities: Partial<BackendCapabilities> = {}, id = "test"): LayoutBackend {
  return {
    id,
    capabilities: { ...NO_CAPABILITIES, ...capabilities },
    layout: async (): Promise<LayoutResult> => ({
      geometry: { id: "v", bounds: { x: 0, y: 0, width: 10, height: 10 }, groups: [], nodes: [], edges: [], annotations: [] },
      diagnostics: [],
    }),
  };
}

const view = { id: "v", nodes: [], groups: [], edges: [], annotations: [], flows: [] } as unknown as MeasuredView;

describe("capabilities are explicit", () => {
  it("states what every shipped backend supports", () => {
    for (const shipped of availableBackends()) {
      expect(shipped.id.length, shipped.id).toBeGreaterThan(0);
      expect(typeof shipped.capabilities.routing, shipped.id).toBe("boolean");
      expect(Array.isArray(shipped.capabilities.constraints), shipped.id).toBe(true);
    }
  });

  it("does not claim capabilities the composition engine lacks", () => {
    // Honest, and the point of the exercise: the engine does containment, routing and
    // declared attachment sites, and it does not do constraints, alternatives or stability.
    const composition = compositionBackend();
    expect(composition.capabilities.containment).toBe(true);
    expect(composition.capabilities.routing).toBe(true);
    expect(composition.capabilities.attachments).toBe(true);
    expect(composition.capabilities.constraints).toEqual([]);
    expect(composition.capabilities.candidates).toBe(false);
    expect(composition.capabilities.stability).toBe(false);
  });

  it("exposes capabilities through the legacy engine adapter", () => {
    expect(new OrchestratedLayoutEngine(elkBackend()).capabilities.routing).toBe(true);
  });
});

describe("unsupported hard constraints fail", () => {
  it("refuses a required constraint the backend cannot enforce", () => {
    const result = admit(backend(), { constraints: [constraint()] });
    expect(result.admitted).toBe(false);
    expect(result.diagnostics[0]?.code).toBe("TOP470_CONSTRAINT_UNSUPPORTED");
    expect(result.diagnostics[0]?.severity).toBe("error");
    // The message says what to do about it.
    expect(result.diagnostics[0]?.message).toContain("preferred");
  });

  it("does not attempt layout when a required constraint cannot be honoured", async () => {
    // Returning geometry that ignored the constraint would misreport what was honoured,
    // and the caller would have no way to tell.
    const result = await orchestrate(view, backend(), { constraints: [constraint()] });
    expect(result.geometry).toBeUndefined();
    expect(result.diagnostics.some((diagnostic) => diagnostic.code === "TOP470_CONSTRAINT_UNSUPPORTED")).toBe(true);
  });

  it("warns but continues for a preferred constraint it cannot enforce", async () => {
    // A preference not being met is a legitimate outcome — but the caller is still told,
    // rather than left to infer it from the picture.
    const result = await orchestrate(view, backend(), { constraints: [constraint({ strength: "preferred" })] });
    expect(result.geometry).toBeDefined();
    expect(result.diagnostics[0]?.code).toBe("TOP471_CONSTRAINT_NOT_HONOURED");
    expect(result.diagnostics[0]?.severity).toBe("warning");
  });

  it("accepts a constraint the backend declares support for", async () => {
    const capable = backend({ constraints: ["order"] });
    const result = await orchestrate(view, capable, { constraints: [constraint()] });
    expect(result.diagnostics).toEqual([]);
    expect(result.geometry).toBeDefined();
  });

  it("reports a prior layout a backend cannot use, rather than silently ignoring it", async () => {
    const result = await orchestrate(view, backend(), {
      prior: { id: "v", bounds: { x: 0, y: 0, width: 1, height: 1 }, groups: [], nodes: [], edges: [], annotations: [] },
    });
    expect(result.diagnostics[0]?.code).toBe("TOP471_CONSTRAINT_NOT_HONOURED");
    expect(result.diagnostics[0]?.message).toContain("laid out afresh");
    // A warning, not a failure: the layout is still useful.
    expect(result.geometry).toBeDefined();
  });

  it("reports a candidate count a backend cannot produce", async () => {
    const result = await orchestrate(view, backend(), { candidates: 3 });
    expect(result.diagnostics[0]?.message).toContain("produces one arrangement");
  });

  it("says nothing when the request asks for nothing special", async () => {
    expect((await orchestrate(view, backend())).diagnostics).toEqual([]);
  });
});

describe("backend selection", () => {
  it("prefers the composition engine", () => {
    expect(selectBackend().backend.id).toBe(compositionBackend().id);
  });

  it("returns the preferred backend with its diagnostics when none can satisfy the request", () => {
    // A bare "no backend available" leaves a caller with nothing to act on.
    const { backend: chosen, diagnostics } = selectBackend({ constraints: [constraint({ type: "align" })] });
    expect(chosen.id).toBe(compositionBackend().id);
    expect(diagnostics.some((diagnostic) => diagnostic.code === "TOP470_CONSTRAINT_UNSUPPORTED")).toBe(true);
  });
});

describe("the orchestrator carries provenance", () => {
  it("names the backend that produced the geometry", async () => {
    const result = await orchestrate(view, backend({}, "named-backend"));
    expect(result.backend).toBe("named-backend");
  });

  it("names it even when admission refused the request", async () => {
    const result = await orchestrate(view, backend({}, "named-backend"), { constraints: [constraint()] });
    expect(result.backend).toBe("named-backend");
  });
});

describe("the legacy engine interface still works", () => {
  it("satisfies LayoutEngine", async () => {
    const engine = new OrchestratedLayoutEngine(backend());
    expect(engine.id).toBe("test");
    const result = await engine.layout(view);
    expect(result.geometry).toBeDefined();
  });

  it("defaults to the composition backend", () => {
    expect(new OrchestratedLayoutEngine().id).toBe(compositionBackend().id);
  });
});
