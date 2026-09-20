import { describe, expect, it } from "vitest";
import type { MeasuredView } from "@topoir/core";
import { analyzeSpine, orderingExclusions, readingOrder } from "../src/index.js";

/**
 * T16 — the request spine.
 *
 * Layering treats every relationship as forward progress, so a feedback relationship —
 * a callback, an ack, a retry — pushes its target a band further along and the primary
 * flow stops reading in the order it happens in.
 */

function view(
  nodes: readonly { id: string; kind?: string }[],
  edges: readonly { id: string; from: string; to: string; kind?: string }[],
): MeasuredView {
  return {
    id: "overview",
    nodes: nodes.map((node) => ({ id: node.id, kind: node.kind ?? "service", label: node.id, ports: [] })),
    edges: edges.map((edge) => ({ ...edge, kind: edge.kind ?? "request" })),
    groups: [],
    annotations: [],
    flows: [],
  } as unknown as MeasuredView;
}

const chain = view(
  [{ id: "client", kind: "client" }, { id: "api" }, { id: "worker" }],
  [
    { id: "e1", from: "client", to: "api" },
    { id: "e2", from: "api", to: "worker" },
  ],
);

describe("the spine is the primary path", () => {
  it("follows the longest chain of advancing relationships", () => {
    expect(analyzeSpine(chain).spine).toEqual(["client", "api", "worker"]);
  });

  it("does not let a write to state extend the primary path", () => {
    // A database write is a branch off the request, not progress along it. Without this a
    // three-tier system reads with the database in the middle of the flow.
    const withState = view(
      [{ id: "client", kind: "client" }, { id: "api" }, { id: "db", kind: "database" }],
      [
        { id: "e1", from: "client", to: "api" },
        { id: "store", from: "api", to: "db", kind: "write" },
      ],
    );
    const analysis = analyzeSpine(withState);
    expect(analysis.spine).toEqual(["client", "api"]);
    expect(analysis.supporting.has("db")).toBe(true);
    expect(analysis.edgeRoles.get("store")).toBe("branch");
  });

  it("takes an explicit story as the order outright", () => {
    // The author said what the order is; inferring a different one would override them.
    const analysis = analyzeSpine(chain, { story: ["e2", "e1"] });
    expect(analysis.spine).toEqual(["api", "worker", "client"]);
  });

  it("is deterministic", () => {
    expect(analyzeSpine(chain).spine).toEqual(analyzeSpine(chain).spine);
  });
});

describe("relationship roles", () => {
  const cyclic = view(
    [{ id: "client", kind: "client" }, { id: "api" }, { id: "worker" }],
    [
      { id: "e1", from: "client", to: "api" },
      { id: "e2", from: "api", to: "worker" },
      { id: "cb", from: "worker", to: "client" },
    ],
  );

  it("roles a callback as feedback, not as progress", () => {
    const analysis = analyzeSpine(cyclic);
    expect(analysis.spine).toEqual(["client", "api", "worker"]);
    expect(analysis.edgeRoles.get("e1")).toBe("spine");
    expect(analysis.edgeRoles.get("e2")).toBe("spine");
    expect(analysis.edgeRoles.get("cb")).toBe("feedback");
  });

  it("starts the spine where requests enter, not alphabetically", () => {
    /**
     * On a pure cycle every node begins a chain of the same length. Picking alphabetically
     * produced a spine running *backwards* through the model, which then marked the real
     * request as feedback, excluded it from ordering, and placed the entry point last —
     * strictly worse than not doing spine analysis at all.
     */
    const analysis = analyzeSpine(cyclic);
    expect(analysis.spine[0]).toBe("client");
    expect(orderingExclusions(analysis)).toEqual(new Set(["cb"]));
  });

  it("never puts the same component in the spine twice", () => {
    // A repeated component makes the index map take its *last* position, which mis-roles
    // every relationship touching it.
    const analysis = analyzeSpine(cyclic);
    expect(new Set(analysis.spine).size).toBe(analysis.spine.length);
  });

  it("excludes only feedback from ordering", () => {
    const analysis = analyzeSpine(cyclic);
    expect(orderingExclusions(analysis).has("e1")).toBe(false);
    expect(orderingExclusions(analysis).has("cb")).toBe(true);
  });

  it("excludes nothing from an acyclic model", () => {
    expect(orderingExclusions(analyzeSpine(chain)).size).toBe(0);
  });
});

describe("supporting components", () => {
  it("classifies state and identity as supporting", () => {
    const withSupport = view(
      [{ id: "client", kind: "client" }, { id: "api" }, { id: "db", kind: "database" }, { id: "idp", kind: "identity-provider" }],
      [
        { id: "e1", from: "client", to: "api" },
        { id: "store", from: "api", to: "db", kind: "write" },
        { id: "auth", from: "api", to: "idp", kind: "authenticate" },
      ],
    );
    const analysis = analyzeSpine(withSupport);
    expect([...analysis.supporting].sort()).toEqual(["db", "idp"]);
  });

  it("does not call a spine component supporting", () => {
    const analysis = analyzeSpine(chain);
    for (const id of analysis.spine) expect(analysis.supporting.has(id), id).toBe(false);
  });

  it("ignores a component with no relationships at all", () => {
    const orphaned = view([{ id: "client", kind: "client" }, { id: "api" }, { id: "alone" }], [{ id: "e1", from: "client", to: "api" }]);
    expect(analyzeSpine(orphaned).supporting.has("alone")).toBe(false);
  });
});

describe("impossible monotonic paths are reported", () => {
  const cyclic = view(
    [{ id: "a" }, { id: "b" }, { id: "c" }],
    [
      { id: "e1", from: "a", to: "b" },
      { id: "e2", from: "b", to: "c" },
      { id: "e3", from: "c", to: "a" },
    ],
  );

  it("reports a required order the model's own cycle makes impossible", () => {
    // The difference between "the layout ignored your constraint" and "what you asked for
    // cannot exist" — the second is actionable, the first leaves an author guessing.
    const analysis = analyzeSpine(cyclic, { requiredOrder: [["a", "b", "c"]], viewId: "overview" });
    const reported = analysis.diagnostics.filter((diagnostic) => diagnostic.code === "TOP472_MONOTONIC_PATH_IMPOSSIBLE");
    expect(reported).toHaveLength(1);
    expect(reported[0]?.severity).toBe("error");
    expect(reported[0]?.message).toContain("cycle");
    // The message names the cycle, so an author knows which relationship to break.
    expect(reported[0]?.message).toMatch(/"a".*->.*"a"/u);
  });

  it("says nothing about an order the model can satisfy", () => {
    const acyclic = view([{ id: "a" }, { id: "b" }], [{ id: "e1", from: "a", to: "b" }]);
    expect(analyzeSpine(acyclic, { requiredOrder: [["a", "b"]] }).diagnostics).toEqual([]);
  });

  it("only considers cycles among the constrained components", () => {
    /**
     * The same 3-cycle, but the requirement covers only `a` and `b`. The path between
     * *those two* is a -> b with no way back, so the ordering is satisfiable and reporting
     * it would be a false alarm. A cycle elsewhere in the model does not make this
     * particular ordering impossible.
     */
    expect(analyzeSpine(cyclic, { requiredOrder: [["a", "b"]] }).diagnostics).toEqual([]);
    // Widen the requirement to include the component that closes the cycle, and it is.
    expect(
      analyzeSpine(cyclic, { requiredOrder: [["a", "b", "c"]] }).diagnostics.map((diagnostic) => diagnostic.code),
    ).toContain("TOP472_MONOTONIC_PATH_IMPOSSIBLE");
  });

  it("ignores a cycle among components no requirement mentions", () => {
    const elsewhere = analyzeSpine(
      view([{ id: "a" }, { id: "b" }, { id: "x" }, { id: "y" }], [
        { id: "e1", from: "a", to: "b" },
        { id: "c1", from: "x", to: "y" },
        { id: "c2", from: "y", to: "x" },
      ]),
      { requiredOrder: [["a", "b"]] },
    );
    expect(elsewhere.diagnostics).toEqual([]);
  });

  it("reports a story step that is not a relationship", () => {
    expect(analyzeSpine(chain, { story: ["nope"] }).diagnostics[0]?.code).toBe("TOP251_DESIGN_REFERENCE_NOT_FOUND");
  });
});

describe("an authored path and an inferred one are not the same claim", () => {
  it("marks a story as authored", () => {
    expect(analyzeSpine(chain, { story: ["e1", "e2"] }).source).toBe("authored");
  });

  it("marks a path it worked out itself as inferred", () => {
    expect(analyzeSpine(chain).source).toBe("inferred");
  });

  it("offers only an authored path as a reading order", () => {
    /**
     * Excluding feedback from layer assignment is sound however the path was found — a
     * cycle-closing relationship is not forward progress either way. Reordering siblings
     * is not: on a mesh the longest advancing chain is an artefact of the graph, and
     * letting it override the barycenter traded two defects for two others across the
     * generalization corpus. So an inferred path does not get to reorder anything.
     */
    expect(readingOrder(analyzeSpine(chain, { story: ["e1", "e2"] }))).toEqual(["client", "api", "worker"]);
    expect(readingOrder(analyzeSpine(chain))).toBeUndefined();
  });

  it("still excludes feedback from an inferred path", () => {
    const cyclic = view(
      [{ id: "client", kind: "client" }, { id: "api" }],
      [{ id: "e1", from: "client", to: "api" }, { id: "cb", from: "api", to: "client" }],
    );
    const analysis = analyzeSpine(cyclic);
    expect(analysis.source).toBe("inferred");
    expect(orderingExclusions(analysis)).toEqual(new Set(["cb"]));
  });

  it("does not call a story authored when none of its steps exist", () => {
    // Otherwise a typo in every step produces an empty "authored" order that silently
    // outranks the inferred one.
    expect(analyzeSpine(chain, { story: ["nope"] }).source).toBe("inferred");
  });
});

describe("what a supporting component hangs off", () => {
  const withStores = view(
    [
      { id: "client", kind: "client" }, { id: "frontend" }, { id: "core" },
      { id: "redis", kind: "cache" }, { id: "postgres", kind: "database" },
    ],
    [
      { id: "open", from: "client", to: "frontend" },
      { id: "invoke", from: "frontend", to: "core" },
      { id: "session", from: "frontend", to: "redis", kind: "write" },
      { id: "context", from: "core", to: "postgres", kind: "write" },
    ],
  );

  it("names the component that writes to it", () => {
    // Without this a store is placed by packing order, and the reader has to trace a
    // connector to find out whose state it is.
    const { anchors } = analyzeSpine(withStores);
    expect(anchors.get("redis")).toBe("frontend");
    expect(anchors.get("postgres")).toBe("core");
  });

  it("anchors nothing to a component on the path itself", () => {
    const { anchors } = analyzeSpine(withStores);
    for (const id of analyzeSpine(withStores).spine) expect(anchors.has(id), id).toBe(false);
  });

  it("prefers a writer on the primary path over one off it", () => {
    // A store written by both belongs under the component the reader is following.
    const shared = view(
      [{ id: "client", kind: "client" }, { id: "core" }, { id: "worker" }, { id: "db", kind: "database" }],
      [
        { id: "open", from: "client", to: "core" },
        { id: "spawn", from: "core", to: "worker", kind: "write" },
        { id: "w1", from: "worker", to: "db", kind: "write" },
        { id: "w2", from: "core", to: "db", kind: "write" },
      ],
    );
    expect(analyzeSpine(shared, { story: ["open"] }).anchors.get("db")).toBe("core");
  });

  it("is independent of the order the relationships were declared in", () => {
    const reversed = view(
      [{ id: "client", kind: "client" }, { id: "core" }, { id: "worker" }, { id: "db", kind: "database" }],
      [
        { id: "w1", from: "worker", to: "db", kind: "write" },
        { id: "w2", from: "core", to: "db", kind: "write" },
        { id: "open", from: "client", to: "core" },
        { id: "spawn", from: "core", to: "worker", kind: "write" },
      ],
    );
    expect(analyzeSpine(reversed, { story: ["open"] }).anchors.get("db")).toBe("core");
  });

  it("says nothing about a component nothing reaches", () => {
    const orphaned = view([{ id: "client", kind: "client" }, { id: "alone" }], []);
    expect(analyzeSpine(orphaned).anchors.has("alone")).toBe(false);
  });

  it("does not anchor a component to itself", () => {
    const loop = view([{ id: "a", kind: "client" }, { id: "b" }], [{ id: "self", from: "b", to: "b" }, { id: "e", from: "a", to: "b" }]);
    expect(analyzeSpine(loop).anchors.get("b")).not.toBe("b");
  });
});
