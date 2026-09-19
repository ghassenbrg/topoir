import { describe, expect, it } from "vitest";
import { loadDocument, projectView } from "../src/index.js";

const architecture = `
apiVersion: topoir.dev/v1alpha1
kind: Architecture
metadata:
  name: checkout
  title: Checkout Platform
model:
  groups:
    - id: prod
      kind: environment
    - id: cluster
      kind: kubernetes-cluster
      parent: prod
      tags: [runtime]
  nodes:
    - id: api
      kind: api
      group: cluster
      tags: [runtime]
      ports:
        - id: sql
          side: east
    - id: db
      kind: database
      technology: postgresql
      tags: [data]
  flows:
    - id: persistence
      color: "#2563EB"
  edges:
    - id: api-to-db
      from: api
      to: db
      sourcePort: sql
      label: SQL
      flow: persistence
  annotations:
    - id: warning
      kind: warning
      text: Encrypted in transit
      anchor: api-to-db
views:
  - id: runtime
    include:
      tags: [runtime]
  - id: data
    include:
      nodes: [api, db]
`;

describe("semantic compiler", () => {
  it("normalizes defaults and stable order", () => {
    const result = loadDocument(architecture, { source: "checkout.topoir.yaml" });

    expect(result.diagnostics).toEqual([]);
    expect(result.document?.model.groups.map((item) => item.id)).toEqual(["cluster", "prod"]);
    expect(result.document?.model.nodes.find((item) => item.id === "api")).toMatchObject({
      label: "Api",
      ports: [{ id: "sql", label: "Sql", side: "east", kind: "bidirectional" }],
    });
    expect(result.document?.model.edges[0]).toMatchObject({
      kind: "dependency",
      direction: "forward",
      style: "solid",
    });
  });

  it("projects tag-selected groups with descendants and containment ancestors", () => {
    const result = loadDocument(architecture);
    const view = projectView(result.document!, "runtime");

    expect(view.groups.map((item) => item.id)).toEqual(["cluster", "prod"]);
    expect(view.nodes.map((item) => item.id)).toEqual(["api"]);
    expect(view.edges).toEqual([]);
  });

  it("uses an overview view as the deterministic default", () => {
    const withOverview = architecture.replace(
      "views:\n",
      "views:\n  - id: overview\n    title: Preferred overview\n",
    );
    const result = loadDocument(withOverview);
    const view = projectView(result.document!);

    expect(view.id).toBe("overview");
  });

  it("includes edges, annotations, and referenced flows when endpoints are visible", () => {
    const result = loadDocument(architecture);
    const view = projectView(result.document!, "data");

    expect(view.edges.map((item) => item.id)).toEqual(["api-to-db"]);
    expect(view.flows.map((item) => item.id)).toEqual(["persistence"]);
    expect(view.annotations.map((item) => item.id)).toEqual(["warning"]);
    expect(view.groups.map((item) => item.id)).toEqual(["cluster", "prod"]);
  });

  it("reports reference and containment errors with stable codes", () => {
    const invalid = architecture
      .replace("parent: prod", "parent: cluster")
      .replace("to: db", "to: missing")
      .replace("sourcePort: sql", "sourcePort: http");
    const result = loadDocument(invalid, { source: "invalid.yaml" });

    expect(result.document).toBeUndefined();
    expect(result.diagnostics.map((item) => item.code)).toEqual(
      expect.arrayContaining([
        "TOP211_GROUP_CYCLE",
        "TOP231_EDGE_TARGET_NOT_FOUND",
        "TOP232_SOURCE_PORT_NOT_FOUND",
      ]),
    );
    expect(result.diagnostics.every((item) => item.source === "invalid.yaml")).toBe(true);
  });
});

describe("deterministic sibling ordering", () => {
  const mixed = `
apiVersion: topoir.dev/v1alpha1
kind: Architecture
metadata:
  name: ordering
model:
  nodes:
    - { id: zebra, kind: service }
    - { id: third, kind: service, order: 2 }
    - { id: alpha, kind: service }
    - { id: first, kind: service, order: 0 }
    - { id: second, kind: service, order: 1 }
  edges:
    - { id: b-unranked, from: first, to: second }
    - { id: a-ranked, from: second, to: third, order: 5 }
`;

  it("ranks explicitly ordered siblings ahead of unranked ones instead of treating a missing order as zero", () => {
    const result = loadDocument(mixed, { source: "ordering.yaml" });
    expect(result.diagnostics.filter((item) => item.severity === "error")).toEqual([]);
    const view = projectView(result.document!);

    // Ranked nodes keep their declared sequence; unranked nodes follow, by ID.
    expect(view.nodes.map((node) => node.id)).toEqual(["first", "second", "third", "alpha", "zebra"]);
    // An unranked sibling never sorts above a ranked one just because it sorts earlier by ID.
    expect(view.edges.map((edge) => edge.id)).toEqual(["a-ranked", "b-unranked"]);
  });
});
