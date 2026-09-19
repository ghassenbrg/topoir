import { readdir, readFile, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { describe, expect, it } from "vitest";
import { TopoIRCompiler } from "../src/index.js";

describe("visual design compiler", () => {
  it("renders every showcase without geometry errors", async () => {
    const folder = resolve("examples/showcase");
    for (const name of (await readdir(folder)).filter((file) => file.endsWith(".yaml"))) {
      const result = await new TopoIRCompiler().compile(await readFile(join(folder, name), "utf8"));
      expect(result.diagnostics.filter((d) => d.severity === "error"), name).toEqual([]);
      expect(result.ok, name).toBe(true);
      expect(result.views[0]?.metrics, name).toMatchObject({ nodeOverlaps: 0, edgeNodeIntersections: 0, endpointBodyCrossings: 0, nonOrthogonalSegments: 0, emptyRoutes: 0, labelOverlaps: 0, coincidentEdgeSegments: 0 });
    }
  });

  it("lays sequence messages in declared temporal order with persistent lifelines", async () => {
    const source = await readFile(resolve("examples/showcase/request-sequence.topoir.yaml"), "utf8");
    const result = await new TopoIRCompiler().compile(source);
    const edges = result.views[0]!.geometry.edges;
    expect(edges.map((edge) => edge.id)).toEqual(["login", "token", "request", "jwks", "forward", "response"]);
    for (let index = 1; index < edges.length; index++) expect(edges[index]!.points[0]!.y).toBeGreaterThan(edges[index - 1]!.points[0]!.y);
    expect(String(result.artifacts[0]?.content)).toContain('id="lifelines"');
  });

  it("aligns corresponding regional components and keeps replication routes direct", async () => {
    const result = await new TopoIRCompiler().compile(await readFile(resolve("examples/showcase/paired-regions.topoir.yaml"), "utf8"));
    const geometry = result.views[0]!.geometry;
    const nodes = new Map(geometry.nodes.map((node) => [node.id, node]));
    for (const name of ["api", "db", "store"]) expect(nodes.get(`${name}-a`)?.y).toBe(nodes.get(`${name}-b`)?.y);
    for (const id of ["deploy", "wal", "copy"]) expect(geometry.edges.find((edge) => edge.id === id)?.points).toHaveLength(2);
  });

  it("keeps candidate selection and assets byte-deterministic", async () => {
    const source = await readFile(resolve("examples/showcase/kubernetes.topoir.yaml"), "utf8");
    const compiler = new TopoIRCompiler();
    const a = await compiler.compile(source), b = await compiler.compile(source);
    expect(a.views[0]?.metrics["candidatesEvaluated"]).toBe(3);
    expect(a.artifacts[0]?.sha256).toBe(b.artifacts[0]?.sha256);
  });

  it("validates narrative references", () => {
    const source = { apiVersion: "topoir.dev/v1alpha1", kind: "Architecture", metadata: { name: "bad" }, model: {}, views: [{ id: "overview", design: { focus: ["missing"], story: ["missing-edge"] } }] };
    expect(new TopoIRCompiler().validate(JSON.stringify(source)).diagnostics.filter((d) => d.code === "TOP251_DESIGN_REFERENCE_NOT_FOUND")).toHaveLength(2);
  });

  it("embeds a configured custom logo in SVG and PNG without file references", async () => {
    const directory = await mkdtemp(join(tmpdir(), "topoir-design-"));
    await writeFile(join(directory, "payment.svg"), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 40"><rect width="160" height="40" fill="#4433CC"/></svg>');
    const source = JSON.stringify({ apiVersion: "topoir.dev/v1alpha1", kind: "Architecture", metadata: { name: "assets" }, model: { nodes: [{ id: "payment", kind: "api", visual: { shape: "image", asset: "custom:payment" } }] } });
    const result = await new TopoIRCompiler().compile(source, { assetDirectory: directory, format: "both" });
    expect(result.ok).toBe(true);
    const svg = String(result.artifacts.find((a) => a.format === "svg")?.content);
    expect(svg).toContain('preserveAspectRatio="xMidYMid meet"');
    expect(svg).toContain("data:image/svg+xml;base64,");
    expect(svg).not.toContain(directory);
    expect(result.views[0]?.measured.nodes[0]?.imageSize).toEqual({ width: 240, height: 60 });
    expect(result.artifacts.find((a) => a.format === "png")?.content).toBeInstanceOf(Uint8Array);
  });

  it("does not silently discard explicit ports in experimental composition families", async () => {
    const source = { apiVersion: "topoir.dev/v1alpha1", kind: "Architecture", metadata: { name: "ports" }, model: { nodes: [{ id: "a", kind: "api", ports: [{ id: "out", side: "east" }] }, { id: "b", kind: "database" }], edges: [{ id: "write", from: "a", to: "b", sourcePort: "out" }] }, views: [{ id: "overview", design: { composition: "comparison" } }] };
    const result = await new TopoIRCompiler().compile(JSON.stringify(source));
    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((d) => d.code)).toContain("TOP402_COMPOSITION_PORT_UNSUPPORTED");
  });

  it("measures composite port compartments and multiple assets before layout", async () => {
    const source = { apiVersion: "topoir.dev/v1alpha1", kind: "Architecture", metadata: { name: "composite" }, model: { nodes: [{ id: "gateway", kind: "gateway", ports: [{ id: "app", label: "/app/*", side: "east" }, { id: "api", label: "/api/*", side: "east" }], visual: { assets: ["lucide:waypoints", "k8s:ingress"], portLabels: "inside" } }] } };
    const result = await new TopoIRCompiler().compile(JSON.stringify(source));
    const node = result.views[0]?.measured.nodes[0];
    expect(result.ok).toBe(true);
    expect(node?.ports.every((port) => port.labelText !== undefined)).toBe(true);
    expect(node?.assetSizes?.length).toBeGreaterThanOrEqual(2);
    expect(node?.height).toBeGreaterThan(100);
    expect(String(result.artifacts[0]?.content)).toContain("/app/*");
  });
});

describe("agent-authored design", () => {
  const document = (theme: unknown) => ({
    apiVersion: "topoir.dev/v1alpha1",
    kind: "Architecture",
    metadata: { name: "authored" },
    model: {
      groups: [
        { id: "a", kind: "region", label: "Alpha", visual: { fill: "#FFF7ED", stroke: "#EA580C" } },
        { id: "b", kind: "region", label: "Beta", visual: { fill: "#EFF6FF", stroke: "#2563EB" } },
      ],
      nodes: [
        { id: "n1", kind: "service", label: "One", group: "a" },
        { id: "n2", kind: "service", label: "Two", group: "b" },
      ],
      edges: [{ id: "e", from: "n1", to: "n2", label: "sync" }],
    },
    views: [{ id: "overview", theme }],
  });

  it("gives sibling boundaries of the same kind their own colours", async () => {
    const result = await new TopoIRCompiler().compile(JSON.stringify(document("technical-clean")));
    expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
    const svg = String(result.artifacts[0]?.content);
    // The theme paints both regions identically; only the per-boundary override separates them.
    expect(svg).toContain("#FFF7ED");
    expect(svg).toContain("#EA580C");
    expect(svg).toContain("#EFF6FF");
  });

  it("layers authored design tokens over a named base", async () => {
    const result = await new TopoIRCompiler().compile(
      JSON.stringify(
        document({
          extends: "technical-clean",
          canvas: { background: "#0F1420", foreground: "#EAF0FA" },
          font: { labelSize: 17 },
          node: { radius: 2 },
          edge: { palette: ["#3D8BFD", "#E06C9F"] },
        }),
      ),
    );
    expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
    const svg = String(result.artifacts[0]?.content);
    expect(svg, "authored canvas").toContain("#0F1420");
    expect(svg, "authored label size").toContain('font-size="17"');
    // Everything not overridden still comes from the base.
    expect(result.views[0]?.metrics).toMatchObject({ nodeOverlaps: 0, emptyRoutes: 0 });
  });

  it("rejects a design token outside its documented range", async () => {
    const result = await new TopoIRCompiler().compile(
      JSON.stringify(document({ extends: "technical-clean", font: { labelSize: 400 } })),
    );
    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((d) => d.code)).toContain("TOP110_SCHEMA_INVALID");
  });
});
