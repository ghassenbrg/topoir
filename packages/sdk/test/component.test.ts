import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { TopoIRCompiler } from "../src/index.js";

/**
 * Q1 acceptance for measured components: a component's internal route compartments are
 * measured before layout, layout pins each connector to the compartment it is drawn
 * against, and neither survives only at one particular label length or route count.
 */

interface RouteCase {
  readonly routes: readonly { readonly id: string; readonly label: string }[];
  readonly assets?: readonly string[];
}

function gatewayDocument({ routes, assets }: RouteCase): string {
  return JSON.stringify({
    apiVersion: "topoir.dev/v1alpha1",
    kind: "Architecture",
    metadata: { name: "gateway-routes" },
    model: {
      nodes: [
        {
          id: "gateway",
          kind: "gateway",
          label: "Edge gateway",
          ports: routes.map((route, index) => ({ id: route.id, label: route.label, side: "east", kind: "output", order: index })),
          visual: { portLabels: "inside", ...(assets ? { assets } : {}) },
        },
        ...routes.map((route, index) => ({ id: `target-${route.id}`, kind: "service", label: `Service ${route.id}`, order: index })),
      ],
      edges: routes.map((route) => ({ id: `route-${route.id}`, from: "gateway", to: `target-${route.id}`, sourcePort: route.id, label: route.label })),
    },
  });
}

async function compileGateway(input: RouteCase) {
  const result = await new TopoIRCompiler().compile(gatewayDocument(input));
  const view = result.views[0];
  if (view === undefined) throw new Error("no view compiled");
  const measured = view.measured.nodes.find((node) => node.id === "gateway");
  const geometry = view.geometry.nodes.find((node) => node.id === "gateway");
  if (measured === undefined || geometry === undefined) throw new Error("gateway missing from output");
  return { result, view, measured, geometry };
}

describe("measured route compartments", () => {
  const perturbations: readonly (RouteCase & { readonly name: string })[] = [
    { name: "two short routes", routes: [{ id: "app", label: "/app/*" }, { id: "api", label: "/api/*" }] },
    { name: "three routes", routes: [{ id: "app", label: "/app/*" }, { id: "api", label: "/api/*" }, { id: "mcp", label: "/mcp/*" }] },
    {
      name: "five routes with one long label",
      routes: [
        { id: "app", label: "/app/*" },
        { id: "api", label: "/api/v2/very/long/resource/path/*" },
        { id: "mcp", label: "/mcp/*" },
        { id: "admin", label: "/admin/*" },
        { id: "health", label: "/healthz" },
      ],
    },
    { name: "single route", routes: [{ id: "only", label: "/*" }] },
  ];

  for (const perturbation of perturbations) {
    it(`keeps every connector on its own compartment: ${perturbation.name}`, async () => {
      const { result, view, measured, geometry } = await compileGateway(perturbation);

      expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
      expect(measured.ports).toHaveLength(perturbation.routes.length);
      // Declared route order is the drawn order.
      expect(measured.ports.map((port) => port.id)).toEqual(perturbation.routes.map((route) => route.id));

      for (const port of measured.ports) {
        const slot = port.slot;
        expect(slot, `slot for ${port.id}`).toBeDefined();
        if (slot === undefined) continue;
        // The compartment stays inside its component.
        expect(slot.x).toBeGreaterThanOrEqual(0);
        expect(slot.y).toBeGreaterThanOrEqual(0);
        expect(slot.x + slot.width).toBeLessThanOrEqual(measured.width);
        expect(slot.y + slot.height).toBeLessThanOrEqual(measured.height);
        // The measured label fits the compartment it is drawn in.
        expect(port.labelText?.width ?? 0).toBeLessThanOrEqual(slot.width);

        const geometryPort = geometry.ports.find((candidate) => candidate.id === port.id);
        expect(geometryPort, `geometry port for ${port.id}`).toBeDefined();
        if (geometryPort === undefined) continue;
        // Layout attaches the connector at the compartment it is drawn against.
        expect(geometryPort.y).toBeCloseTo(geometry.y + slot.y + slot.height / 2, 1);
        expect(geometryPort.x).toBeCloseTo(geometry.x + geometry.width + 4, 1);
      }

      // Compartments never overlap each other.
      const slots = measured.ports.flatMap((port) => (port.slot ? [port.slot] : []));
      for (let i = 1; i < slots.length; i += 1) {
        expect(slots[i]!.y).toBeGreaterThanOrEqual(slots[i - 1]!.y + slots[i - 1]!.height);
      }

      expect(view.metrics).toMatchObject({ nodeOverlaps: 0, edgeNodeIntersections: 0, endpointBodyCrossings: 0, nonOrthogonalSegments: 0, emptyRoutes: 0 });
      const svg = String(result.artifacts[0]?.content);
      for (const route of perturbation.routes) expect(svg).toContain(route.label);
    });
  }

  it("widens the component for a long route label instead of clipping it", async () => {
    const short = await compileGateway({ routes: [{ id: "app", label: "/a" }] });
    const long = await compileGateway({ routes: [{ id: "app", label: "/a/very/long/route/prefix/that/must/fit/*" }] });
    expect(long.measured.width).toBeGreaterThan(short.measured.width);
    expect(long.measured.ports[0]!.labelText!.width).toBeLessThanOrEqual(long.measured.ports[0]!.slot!.width);
  });

  it("lays multiple asset roles side by side inside the measured component", async () => {
    const { result, measured } = await compileGateway({
      routes: [{ id: "app", label: "/app/*" }],
      assets: ["k8s:ingress", "lucide:waypoints", "lucide:shield"],
    });
    expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
    expect(measured.assetSizes?.length).toBe(3);

    const svg = String(result.artifacts[0]?.content);
    const xs = [...svg.matchAll(/<image[^>]*\sx="([\d.]+)"/g)].map((match) => Number(match[1]));
    // Three distinct horizontal positions: the roles do not stack on one another.
    expect(new Set(xs).size).toBeGreaterThanOrEqual(3);
  });

  it("reports a separate visual.asset that visual.assets replaces", async () => {
    const source = {
      apiVersion: "topoir.dev/v1alpha1",
      kind: "Architecture",
      metadata: { name: "asset-override" },
      model: { nodes: [{ id: "gateway", kind: "gateway", visual: { asset: "lucide:waypoints", assets: ["k8s:ingress"] } }] },
    };
    const result = await new TopoIRCompiler().compile(JSON.stringify(source));
    expect(result.ok).toBe(true);
    expect(result.diagnostics.map((d) => d.code)).toContain("TOP323_ASSET_OVERRIDDEN");
  });
});

describe("component grammar extremes", () => {
  it("compiles long badges, cylinders, diamonds, self-loops and multi-edges without hard defects", async () => {
    const source = {
      apiVersion: "topoir.dev/v1alpha1",
      kind: "Architecture",
      metadata: { name: "extremes" },
      model: {
        nodes: [
          { id: "api", kind: "api", label: "Ingest API", visual: { badge: "CANARY 10% · REGION ap-northeast-1 · platform", shape: "pill" } },
          { id: "store", kind: "database", label: "Primary store", technology: "postgresql", visual: { shape: "cylinder" } },
          { id: "router", kind: "gateway", label: "Decision router", visual: { shape: "diamond" } },
          { id: "worker", kind: "worker", label: "Retry worker", visual: { replicas: 24 } },
        ],
        edges: [
          { id: "retry", from: "worker", to: "worker", kind: "async", label: "retry backoff" },
          { id: "write", from: "api", to: "store", kind: "write", label: "SQL" },
          { id: "read", from: "api", to: "store", kind: "read", label: "read replica" },
          { id: "decide", from: "api", to: "router", label: "route" },
          { id: "dispatch", from: "router", to: "worker", label: "dispatch" },
        ],
      },
    };
    const result = await new TopoIRCompiler().compile(JSON.stringify(source));
    expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.views[0]?.metrics).toMatchObject({
      nodeOverlaps: 0,
      edgeNodeIntersections: 0,
      endpointBodyCrossings: 0,
      nonOrthogonalSegments: 0,
      emptyRoutes: 0,
    });
    // Both parallel edges survive as separate routes.
    expect(result.views[0]?.geometry.edges.filter((edge) => edge.id === "write" || edge.id === "read")).toHaveLength(2);
    const badge = String(result.artifacts[0]?.content);
    expect(badge).toContain("24 replicas");
  });
});

describe("reference fixture", () => {
  it("keeps the Pockito gateway route table wired to its own connectors", async () => {
    const result = await new TopoIRCompiler().compile(await readFile(resolve("examples/pockito-reference.topoir.yaml"), "utf8"));
    const view = result.views[0]!;
    const measured = view.measured.nodes.find((node) => node.id === "traefik")!;
    const geometry = view.geometry.nodes.find((node) => node.id === "traefik")!;

    expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
    expect(measured.ports.map((port) => port.id)).toEqual(["app", "api", "mcp"]);

    for (const [routeId, target] of [["app", "pockito-webapp"], ["api", "pockito-api"], ["mcp", "pockito-mcp"]] as const) {
      const slot = measured.ports.find((port) => port.id === routeId)!.slot!;
      const port = geometry.ports.find((candidate) => candidate.id === routeId)!;
      expect(port.y).toBeCloseTo(geometry.y + slot.y + slot.height / 2, 1);
      const edge = view.geometry.edges.find((candidate) => candidate.id === `traefik-${target.replace("pockito-", "")}`)!;
      // The connector starts at the compartment that owns the route.
      expect(edge.points[0]!.y).toBeCloseTo(port.y, 1);
    }

    expect(view.metrics).toMatchObject({
      nodeOverlaps: 0,
      edgeNodeIntersections: 0,
      endpointBodyCrossings: 0,
      nonOrthogonalSegments: 0,
      emptyRoutes: 0,
      labelOverlaps: 0,
      groupTitleIntersections: 0,
    });
  });
});

describe("banded architecture composition", () => {
  const document = (extra: Record<string, unknown> = {}) => ({
    apiVersion: "topoir.dev/v1alpha1",
    kind: "Architecture",
    metadata: { name: "banded" },
    model: {
      groups: [
        { id: "edge", kind: "external-zone", label: "Edge", layout: { mode: "column" } },
        { id: "core", kind: "kubernetes-cluster", label: "Core" },
        { id: "stores", kind: "logical", label: "Stores", parent: "core", order: 9, layout: { mode: "column" } },
      ],
      nodes: [
        { id: "client-a", kind: "client", group: "edge", order: 0 },
        { id: "client-b", kind: "client", group: "edge", order: 1 },
        { id: "gateway", kind: "gateway", group: "core", order: 0, ports: [{ id: "one", label: "/one/*", side: "east", order: 0 }, { id: "two", label: "/two/*", side: "east", order: 1 }], visual: { portLabels: "inside" } },
        { id: "svc-one", kind: "service", group: "core", order: 1 },
        { id: "svc-two", kind: "service", group: "core", order: 2 },
        { id: "cache", kind: "cache", group: "stores", order: 0 },
        { id: "db", kind: "database", group: "stores", order: 1 },
      ],
      edges: [
        { id: "a-gw", from: "client-a", to: "gateway" },
        { id: "b-gw", from: "client-b", to: "gateway" },
        { id: "gw-one", from: "gateway", to: "svc-one", sourcePort: "one" },
        { id: "gw-two", from: "gateway", to: "svc-two", sourcePort: "two" },
        { id: "one-cache", from: "svc-one", to: "cache" },
        { id: "one-db", from: "svc-one", to: "db" },
        { id: "two-db", from: "svc-two", to: "db" },
      ],
      ...extra,
    },
    views: [{ id: "overview", layout: { direction: "right" }, design: { composition: "architecture" } }],
  });

  it("places boundaries as contiguous blocks and honours declared sibling rank", async () => {
    const result = await new TopoIRCompiler().compile(JSON.stringify(document()));
    expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
    const view = result.views[0]!;
    const nodes = new Map(view.geometry.nodes.map((node) => [node.id, node]));
    const groups = new Map(view.geometry.groups.map((group) => [group.id, group]));

    // Layers advance along the view direction.
    expect(nodes.get("gateway")!.x).toBeGreaterThan(groups.get("edge")!.x);
    expect(nodes.get("svc-one")!.x).toBeGreaterThan(nodes.get("gateway")!.x);
    expect(groups.get("stores")!.x).toBeGreaterThan(nodes.get("svc-one")!.x);

    // Declared rank is the drawn order across the layer.
    expect(nodes.get("client-a")!.y).toBeLessThan(nodes.get("client-b")!.y);
    expect(nodes.get("svc-one")!.y).toBeLessThan(nodes.get("svc-two")!.y);
    expect(nodes.get("cache")!.y).toBeLessThan(nodes.get("db")!.y);

    // Every boundary fully contains its own members and nothing else.
    for (const [child, parent] of [["client-a", "edge"], ["client-b", "edge"], ["cache", "stores"], ["db", "stores"], ["gateway", "core"]] as const) {
      const node = nodes.get(child)!;
      const box = groups.get(parent)!;
      expect(node.x, `${child} in ${parent}`).toBeGreaterThanOrEqual(box.x);
      expect(node.y, `${child} in ${parent}`).toBeGreaterThanOrEqual(box.y);
      expect(node.x + node.width).toBeLessThanOrEqual(box.x + box.width);
      expect(node.y + node.height).toBeLessThanOrEqual(box.y + box.height);
    }
    expect(groups.get("stores")!.parent).toBe("core");

    expect(view.metrics).toMatchObject({
      nodeOverlaps: 0,
      edgeNodeIntersections: 0,
      endpointBodyCrossings: 0,
      nonOrthogonalSegments: 0,
      emptyRoutes: 0,
      labelOverlaps: 0,
      groupTitleIntersections: 0,
      coincidentEdgeSegments: 0,
    });
  });

  it("attaches gateway connectors to their own compartments in the banded family", async () => {
    const result = await new TopoIRCompiler().compile(JSON.stringify(document()));
    const view = result.views[0]!;
    const measured = view.measured.nodes.find((node) => node.id === "gateway")!;
    const geometry = view.geometry.nodes.find((node) => node.id === "gateway")!;
    for (const [routeId, edgeId] of [["one", "gw-one"], ["two", "gw-two"]] as const) {
      const slot = measured.ports.find((port) => port.id === routeId)!.slot!;
      const port = geometry.ports.find((candidate) => candidate.id === routeId)!;
      expect(port.y).toBeCloseTo(geometry.y + slot.y + slot.height / 2, 1);
      expect(view.geometry.edges.find((edge) => edge.id === edgeId)!.points[0]!.y).toBeCloseTo(port.y, 1);
    }
  });

  it("is deterministic and survives a perturbed label and an extra relationship", async () => {
    const first = await new TopoIRCompiler().compile(JSON.stringify(document()));
    const second = await new TopoIRCompiler().compile(JSON.stringify(document()));
    expect(first.artifacts[0]?.sha256).toBe(second.artifacts[0]?.sha256);

    const perturbed = document();
    perturbed.model.nodes[3]!.label = "A considerably longer service label than before";
    perturbed.model.edges.push({ id: "two-cache", from: "svc-two", to: "cache" });
    const changed = await new TopoIRCompiler().compile(JSON.stringify(perturbed));
    expect(changed.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
    expect(changed.views[0]?.metrics).toMatchObject({
      nodeOverlaps: 0,
      edgeNodeIntersections: 0,
      endpointBodyCrossings: 0,
      nonOrthogonalSegments: 0,
      emptyRoutes: 0,
      labelOverlaps: 0,
    });
    expect(changed.views[0]?.geometry.edges.some((edge) => edge.id === "two-cache")).toBe(true);
  });

  it("does not leave two relationships drawn as one line", async () => {
    // Three connectors converge on one component from different distances.
    const fanIn = {
      apiVersion: "topoir.dev/v1alpha1",
      kind: "Architecture",
      metadata: { name: "fan-in" },
      model: {
        nodes: [
          { id: "far", kind: "gateway", order: 0 },
          { id: "mid", kind: "service", order: 1 },
          { id: "near", kind: "service", order: 2 },
          { id: "idp", kind: "identity-provider", order: 3 },
        ],
        edges: [
          { id: "far-idp", from: "far", to: "idp", kind: "authenticate" },
          { id: "mid-idp", from: "mid", to: "idp", kind: "authenticate" },
          { id: "near-idp", from: "near", to: "idp", kind: "authorize" },
          { id: "far-mid", from: "far", to: "mid" },
          { id: "mid-near", from: "mid", to: "near" },
        ],
      },
      views: [{ id: "overview", layout: { direction: "right" }, design: { composition: "architecture" } }],
    };
    const result = await new TopoIRCompiler().compile(JSON.stringify(fanIn));
    expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
    expect(result.views[0]?.metrics["coincidentEdgeSegments"]).toBe(0);
    // Each connector approaches the identity provider along its own corridor, so all three
    // relationships remain separately traceable even where they share an arrival point.
    const approaches = result.views[0]!.geometry.edges
      .filter((edge) => edge.id.endsWith("-idp"))
      .map((edge) => {
        const penultimate = edge.points[edge.points.length - 2]!;
        return `${Math.round(penultimate.x)},${Math.round(penultimate.y)}`;
      });
    expect(new Set(approaches).size).toBe(3);
  });
});
