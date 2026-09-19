import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  loadDocument,
  loadWorkspace,
  migrateToWorkspace,
  projectWorkspaceView,
  workspaceInventory,
  type NormalizedWorkspace,
} from "../src/index.js";
import { analyzeWorkspace, type v1alpha2 } from "../src/index.js";

/**
 * T11 — identities, projection, collapse and migration.
 *
 * The acceptance criteria, each with its own group below: views reuse identities without
 * editing shared facts; exact selection is exact; duplicate endpoint occurrences require
 * bindings; collapse has complete coverage; legacy migration preserves facts and IDs.
 */

const root = fileURLToPath(new URL("../../..", import.meta.url));

function doc(overrides: Partial<v1alpha2.DiagramWorkspace> = {}): v1alpha2.DiagramWorkspace {
  return {
    apiVersion: "topoir.dev/v1alpha2",
    kind: "DiagramWorkspace",
    metadata: { name: "w" },
    models: [
      {
        id: "m",
        family: "architecture",
        body: {
          nodes: [
            { id: "api", kind: "api", label: "API" },
            { id: "db", kind: "database", label: "Database" },
          ],
          edges: [
            { id: "writes", from: "api", to: "db", label: "write", kind: "write" },
            { id: "reads", from: "api", to: "db", label: "read", kind: "read" },
          ],
        },
      },
    ],
    views: [{ id: "overview", model: "m" }],
    ...overrides,
  } as v1alpha2.DiagramWorkspace;
}

function normalized(document: v1alpha2.DiagramWorkspace): NormalizedWorkspace {
  const result = analyzeWorkspace(document);
  if (result.workspace === undefined) {
    throw new Error(`workspace did not normalize: ${result.diagnostics.map((d) => d.message).join("; ")}`);
  }
  return result.workspace;
}

describe("views reuse identities without editing shared facts", () => {
  it("takes a label from the referenced entity when the element has none", () => {
    const workspace = normalized(
      doc({
        entities: [{ id: "checkout", kind: "software.service", label: "Checkout API" }],
        models: [{ id: "m", family: "architecture", body: { nodes: [{ id: "api", kind: "api", entity: "checkout" }] } }],
      } as Partial<v1alpha2.DiagramWorkspace>),
    );
    const result = projectWorkspaceView(workspace, "overview");
    expect(result.view?.nodes[0]?.label).toBe("Checkout API");
  });

  it("lets a local label win over the entity's, without changing the entity", () => {
    const document = doc({
      entities: [{ id: "checkout", kind: "software.service", label: "Checkout API" }],
      models: [{ id: "m", family: "architecture", body: { nodes: [{ id: "api", kind: "api", entity: "checkout", label: "Checkout (EU)" }] } }],
    } as Partial<v1alpha2.DiagramWorkspace>);
    const workspace = normalized(document);
    expect(projectWorkspaceView(workspace, "overview").view?.nodes[0]?.label).toBe("Checkout (EU)");
    // The shared fact is untouched: a view overrides its own display, not the model.
    expect(workspace.entities[0]?.label).toBe("Checkout API");
  });

  it("falls back to the element id rather than drawing a blank component", () => {
    const workspace = normalized(
      doc({ models: [{ id: "m", family: "architecture", body: { nodes: [{ id: "api", kind: "api" }] } }] } as Partial<v1alpha2.DiagramWorkspace>),
    );
    expect(projectWorkspaceView(workspace, "overview").view?.nodes[0]?.label).toBe("api");
  });

  it("rejects an element claiming an identity that does not exist", () => {
    const result = analyzeWorkspace(
      doc({ models: [{ id: "m", family: "architecture", body: { nodes: [{ id: "api", kind: "api", entity: "nowhere" }] } }] } as Partial<v1alpha2.DiagramWorkspace>),
    );
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain("TOP254_ENTITY_NOT_FOUND");
  });

  it("lets two views of one model differ without either editing the model", () => {
    const workspace = normalized(
      doc({
        views: [
          { id: "writes", model: "m", projection: { include: { elements: ["writes"] }, edgePolicy: "exact" } },
          { id: "all", model: "m" },
        ],
      }),
    );
    expect(projectWorkspaceView(workspace, "writes").view?.edges.map((edge) => edge.id)).toEqual(["writes"]);
    expect(projectWorkspaceView(workspace, "all").view?.edges.map((edge) => edge.id).sort()).toEqual(["reads", "writes"]);
    // Same model object, unmodified.
    expect(workspace.models[0]?.body.edges).toHaveLength(2);
  });
});

describe("exact selection is exact", () => {
  /**
   * The review's finding: "Including one edge between two nodes also included the other
   * edge connecting those nodes." Useful as a default, and impossible to opt out of.
   */
  it("keeps only the selected relationship", () => {
    const workspace = normalized(doc({ views: [{ id: "v", model: "m", projection: { include: { elements: ["writes"] }, edgePolicy: "exact" } }] }));
    const result = projectWorkspaceView(workspace, "v");
    expect(result.view?.edges.map((edge) => edge.id)).toEqual(["writes"]);
    // Both endpoints are visible, and `reads` still does not appear.
    expect(result.view?.nodes.map((node) => node.id).sort()).toEqual(["api", "db"]);
  });

  it("still induces the sibling under the default policy", () => {
    // Unchanged behaviour, deliberately: this is what v1alpha1 does and what migration
    // produces, so switching to exact has to be the author's decision.
    const workspace = normalized(doc({ views: [{ id: "v", model: "m", projection: { include: { elements: ["writes"] } } }] }));
    expect(projectWorkspaceView(workspace, "v").view?.edges.map((edge) => edge.id).sort()).toEqual(["reads", "writes"]);
  });

  it("records the unselected relationship as omitted, with the policy as the reason", () => {
    const workspace = normalized(doc({ views: [{ id: "v", model: "m", projection: { include: { elements: ["writes"] }, edgePolicy: "exact" } }] }));
    const reads = projectWorkspaceView(workspace, "v").coverage.find((entry) => entry.element === "reads");
    expect(reads?.disposition).toBe("omitted");
    expect(reads?.reason).toContain("exact");
  });

  it("never keeps a relationship whose endpoint was excluded", () => {
    const workspace = normalized(
      doc({ views: [{ id: "v", model: "m", projection: { include: { elements: ["writes"] }, exclude: { elements: ["db"] }, edgePolicy: "exact" } }] }),
    );
    expect(projectWorkspaceView(workspace, "v").view?.edges).toEqual([]);
  });
});

describe("duplicate endpoint occurrences require bindings", () => {
  const twice = (connections?: v1alpha2.Projection["connections"]) =>
    doc({
      views: [
        {
          id: "v",
          model: "m",
          projection: {
            occurrences: [{ id: "db-detail", element: "db", role: "repeated" }],
            ...(connections === undefined ? {} : { connections }),
          },
        },
      ],
    });

  it("refuses to guess which occurrence a relationship meets", () => {
    // `db` now appears twice. Drawing to either one without being told is a coin flip that
    // silently produces the wrong diagram.
    const result = projectWorkspaceView(normalized(twice()), "v");
    const reported = result.diagnostics.filter((diagnostic) => diagnostic.code === "TOP262_CONNECTION_AMBIGUOUS");
    expect(reported.length).toBeGreaterThan(0);
    expect(reported[0]?.severity).toBe("error");
    expect(reported[0]?.message).toContain("db-detail");
    expect(result.view).toBeUndefined();
  });

  it("accepts the binding and routes to the occurrence it names", () => {
    const result = projectWorkspaceView(
      normalized(twice([{ relationship: "writes", to: "db-detail" }, { relationship: "reads", to: "db" }])),
      "v",
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.view?.edges.find((edge) => edge.id === "writes")?.to).toBe("db-detail");
    expect(result.view?.edges.find((edge) => edge.id === "reads")?.to).toBe("db");
  });

  it("rejects a binding to an occurrence the view does not contain", () => {
    const result = projectWorkspaceView(normalized(twice([{ relationship: "writes", to: "nowhere" }])), "v");
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain("TOP261_CONNECTION_BINDING_INVALID");
  });

  it("needs no binding when an element appears once", () => {
    expect(projectWorkspaceView(normalized(doc()), "overview").diagnostics).toEqual([]);
  });

  it("rejects an occurrence of an element the view does not include", () => {
    const result = projectWorkspaceView(
      normalized(doc({ views: [{ id: "v", model: "m", projection: { include: { elements: ["api"] }, occurrences: [{ id: "x", element: "db" }] } }] })),
      "v",
    );
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain("TOP259_OCCURRENCE_ELEMENT_NOT_FOUND");
  });
});

describe("collapse has complete coverage", () => {
  const nested = doc({
    models: [
      {
        id: "m",
        family: "architecture",
        body: {
          groups: [{ id: "platform", kind: "kubernetes-cluster", label: "Platform" }],
          nodes: [
            { id: "client", kind: "client", label: "Client" },
            { id: "api", kind: "api", label: "API", group: "platform" },
            { id: "db", kind: "database", label: "Database", group: "platform" },
          ],
          edges: [
            { id: "call", from: "client", to: "api", kind: "request" },
            { id: "store", from: "api", to: "db", kind: "write" },
          ],
        },
      },
    ],
    views: [{ id: "v", model: "m", projection: { collapse: [{ element: "platform", mode: "summary" }] } }],
  });

  it("represents a collapsed component rather than dropping it", () => {
    const result = projectWorkspaceView(normalized(nested), "v");
    const api = result.coverage.find((entry) => entry.element === "api");
    expect(api?.disposition).toBe("representedBy");
    expect(api?.representative).toBe("platform");
    // Nothing inside the summary is drawn as its own component.
    expect(result.view?.nodes.map((node) => node.id)).toEqual(["client"]);
  });

  it("accounts for every model element, with no element unmentioned", () => {
    const result = projectWorkspaceView(normalized(nested), "v");
    const covered = new Set(result.coverage.map((entry) => entry.element));
    for (const id of ["client", "api", "db", "call", "store"]) expect(covered, id).toContain(id);
  });

  it("reports a relationship wholly inside a summary as represented by it", () => {
    const store = projectWorkspaceView(normalized(nested), "v").coverage.find((entry) => entry.element === "store");
    expect(store?.disposition).toBe("representedBy");
    expect(store?.representative).toBe("platform");
  });

  it("rejects collapsing something that is not a container", () => {
    const result = projectWorkspaceView(
      normalized(doc({ views: [{ id: "v", model: "m", projection: { collapse: [{ element: "api", mode: "summary" }] } }] })),
      "v",
    );
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain("TOP258_COLLAPSE_TARGET_INVALID");
  });
});

describe("legacy migration preserves facts and IDs", () => {
  it("migrates every published v1alpha1 example with an identical element inventory", async () => {
    // Inventory equality is the strong form: it cannot pass by spot-checking fields, and
    // it fails if migration drops, renames or invents a single element.
    const files: string[] = [];
    for (const directory of ["examples", "examples/showcase", "fixtures"]) {
      for (const entry of await readdir(`${root}/${directory}`)) {
        if (entry.endsWith(".topoir.yaml")) files.push(`${directory}/${entry}`);
      }
    }
    expect(files.length).toBeGreaterThan(20);

    for (const file of files) {
      const loaded = loadDocument(await readFile(`${root}/${file}`, "utf8"), { source: file });
      if (loaded.document === undefined) continue;
      const migrated = migrateToWorkspace(loaded.document);
      expect(migrated.workspace, file).toBeDefined();
      expect(workspaceInventory(migrated.workspace!), file).toEqual(migrated.inventory);
    }
  }, 120_000);

  it("produces a workspace that validates against the v1alpha2 schema", async () => {
    const loaded = loadDocument(await readFile(`${root}/examples/checkout-platform.topoir.yaml`, "utf8"));
    const migrated = migrateToWorkspace(loaded.document!);
    const round = loadWorkspace(JSON.stringify(migrated.workspace));
    expect(round.diagnostics.filter((diagnostic) => diagnostic.severity === "error")).toEqual([]);
    expect(round.workspace).toBeDefined();
  });

  it("keeps view ids and titles", async () => {
    const loaded = loadDocument(await readFile(`${root}/examples/checkout-platform.topoir.yaml`, "utf8"));
    const migrated = migrateToWorkspace(loaded.document!);
    expect(migrated.workspace?.views.map((view) => view.id)).toEqual(loaded.document?.views?.map((view) => view.id));
  });

  it("migrates selection to induced, because that is what v1alpha1 does", () => {
    // Migrating to `exact` would change which relationships appear, which is not migration.
    const source = {
      apiVersion: "topoir.dev/v1alpha1" as const,
      kind: "Architecture" as const,
      metadata: { name: "x" },
      model: { nodes: [{ id: "a", kind: "api" as const }] },
      views: [{ id: "v", include: { nodes: ["a"] } }],
    };
    const migrated = migrateToWorkspace(source as never);
    expect(migrated.workspace?.views[0]?.projection?.edgePolicy).toBe("induced");
    expect(migrated.workspace?.views[0]?.projection?.include?.elements).toEqual(["a"]);
  });

  it("reports what it could not carry across rather than dropping it silently", () => {
    // `layout.aspectRatio` is a proportion with no size. Turning it into a medium would put
    // dimensions in the document that the author never wrote.
    const source = {
      apiVersion: "topoir.dev/v1alpha1" as const,
      kind: "Architecture" as const,
      metadata: { name: "x" },
      model: { nodes: [{ id: "a", kind: "api" as const }] },
      views: [{ id: "v", layout: { aspectRatio: 2.5, spacing: "compact" as const } }],
    };
    const migrated = migrateToWorkspace(source as never);
    const reported = migrated.diagnostics.filter((diagnostic) => diagnostic.code === "TOP271_MIGRATION_NOT_REPRESENTABLE");
    expect(reported.length).toBe(2);
    expect(reported[0]?.message).toContain("aspectRatio");
    expect(reported[0]?.severity).toBe("warning");
  });

  it("invents no entities", () => {
    // Migration translates; it does not model. Entities are an authoring decision.
    const source = {
      apiVersion: "topoir.dev/v1alpha1" as const,
      kind: "Architecture" as const,
      metadata: { name: "x" },
      model: { nodes: [{ id: "a", kind: "api" as const, label: "A" }] },
      views: [{ id: "v" }],
    };
    expect(migrateToWorkspace(source as never).workspace?.entities).toBeUndefined();
  });

  it("says so when it supplies a default view", () => {
    const source = {
      apiVersion: "topoir.dev/v1alpha1" as const,
      kind: "Architecture" as const,
      metadata: { name: "x" },
      model: { nodes: [{ id: "a", kind: "api" as const }] },
    };
    const migrated = migrateToWorkspace(source as never);
    expect(migrated.workspace?.views.map((view) => view.id)).toEqual(["overview"]);
    expect(migrated.diagnostics.map((diagnostic) => diagnostic.code)).toContain("TOP270_MIGRATION_DEFAULT_APPLIED");
  });
});

describe("workspace reference integrity", () => {
  it("rejects a view pointing at a model that does not exist", () => {
    const result = analyzeWorkspace(doc({ views: [{ id: "v", model: "nowhere" }] }));
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain("TOP255_MODEL_NOT_FOUND");
  });

  it("rejects duplicate ids within a namespace", () => {
    const result = analyzeWorkspace(doc({ views: [{ id: "v", model: "m" }, { id: "v", model: "m" }] }));
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain("TOP201_DUPLICATE_ID");
  });

  it("rejects a style inheritance cycle", () => {
    const result = analyzeWorkspace(
      doc({ styles: [{ id: "a", extends: "b", tokens: {} }, { id: "b", extends: "a", tokens: {} }] } as Partial<v1alpha2.DiagramWorkspace>),
    );
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain("TOP256_STYLE_CYCLE");
  });

  it("rejects provenance citing an undeclared source", () => {
    const result = analyzeWorkspace(
      doc({
        entities: [{ id: "e", kind: "k", label: "E", provenance: [{ source: "nowhere", relation: "observed" }] }],
      } as Partial<v1alpha2.DiagramWorkspace>),
    );
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain("TOP253_SOURCE_NOT_FOUND");
  });

  it("accepts provenance citing a declared source", () => {
    const result = analyzeWorkspace(
      doc({
        sources: [{ id: "repo", kind: "repository", locator: "git@example.com:checkout" }],
        entities: [{ id: "e", kind: "k", label: "E", provenance: [{ source: "repo", relation: "observed" }] }],
      } as Partial<v1alpha2.DiagramWorkspace>),
    );
    expect(result.diagnostics).toEqual([]);
  });
});
