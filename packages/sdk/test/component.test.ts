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
