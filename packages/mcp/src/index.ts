import { McpServer } from "@modelcontextprotocol/server";
import { TopoIRCompiler, TOPOIR_VERSION, AssetRegistry, capabilitiesOfKind, discoverAssets, themes } from "@topoir/sdk";
import { SUPPORTED_NODE_KINDS, topoirSchema } from "@topoir/schema";
import { z } from "zod";

const sourceSchema = z.string().min(1).max(2_000_000).describe("Complete TopoIR YAML or JSON document.");

export function createTopoIRMcpServer(options: { readonly assetDirectory?: string } = {}): McpServer {
  const server = new McpServer(
    { name: "topoir", version: TOPOIR_VERSION },
    { capabilities: { tools: {}, resources: {} } },
  );
  const compiler = new TopoIRCompiler();

  server.registerTool(
    "validate_document",
    {
      title: "Validate TopoIR document",
      description: "Parse and validate a complete TopoIR semantic architecture document. Returns stable, source-aware diagnostics without rendering.",
      inputSchema: z.object({
        source: sourceSchema,
        sourceName: z.string().max(1024).default("<mcp>"),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ source, sourceName }) => {
      const result = compiler.validate(source, sourceName);
      const report = { ok: result.ok, diagnostics: result.diagnostics };
      return {
        content: [{ type: "text", text: JSON.stringify(report, null, 2) }],
        structuredContent: report,
        isError: !result.ok,
      };
    },
  );

  server.registerTool(
    "render_document",
    {
      title: "Render TopoIR document",
      description: "Compile one view from a complete TopoIR document into deterministic SVG or PNG. Returns diagnostics and the artifact without writing files.",
      inputSchema: z.object({
        source: sourceSchema,
        sourceName: z.string().max(1024).default("<mcp>"),
        view: z.string().max(128).optional(),
        format: z.enum(["svg", "png"]).default("png"),
        scale: z.number().positive().max(8).default(1),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ source, sourceName, view, format, scale }) => {
      const result = await compiler.compile(source, {
        source: sourceName,
        format,
        ...(view === undefined ? {} : { view }),
        png: { scale },
        ...(options.assetDirectory === undefined ? {} : { assetDirectory: options.assetDirectory }),
      });
      const artifact = result.artifacts[0];
      const summary = {
        ok: result.ok,
        diagnostics: result.diagnostics,
        artifact:
          artifact === undefined
            ? undefined
            : {
                viewId: artifact.viewId,
                format: artifact.format,
                mediaType: artifact.mediaType,
                sha256: artifact.sha256,
                width: artifact.width,
                height: artifact.height,
              },
      };
      if (!result.ok || artifact === undefined) {
        return {
          content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
          structuredContent: summary,
          isError: true,
        };
      }
      if (artifact.format === "png") {
        const bytes = artifact.content as Uint8Array;
        return {
          content: [
            { type: "text", text: JSON.stringify(summary, null, 2) },
            { type: "image", data: Buffer.from(bytes).toString("base64"), mimeType: "image/png" },
          ],
          structuredContent: summary,
        };
      }
      return {
        content: [
          { type: "text", text: JSON.stringify(summary, null, 2) },
          {
            type: "resource",
            resource: {
              uri: `topoir://generated/${artifact.sha256}.svg`,
              mimeType: "image/svg+xml",
              text: artifact.content as string,
            },
          },
        ],
        structuredContent: summary,
      };
    },
  );

  server.registerTool(
    "inspect_document",
    {
      title: "Inspect TopoIR compiler stages",
      description: "Inspect the normalized semantic model, projected view, output geometry, or quality metrics for one TopoIR view.",
      inputSchema: z.object({
        source: sourceSchema,
        sourceName: z.string().max(1024).default("<mcp>"),
        view: z.string().max(128).optional(),
        stage: z.enum(["model", "view", "geometry", "metrics"]).default("model"),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ source, sourceName, view, stage }) => {
      if (stage === "model") {
        const result = compiler.validate(source, sourceName);
        const payload = {
          ok: result.ok,
          diagnostics: result.diagnostics,
          model: result.document === undefined ? undefined : withoutSourceMap(result.document),
        };
        return {
          content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
          structuredContent: payload,
          isError: !result.ok,
        };
      }
      const result = await compiler.compile(source, {
        source: sourceName,
        format: "svg",
        ...(options.assetDirectory === undefined ? {} : { assetDirectory: options.assetDirectory }),
        ...(view === undefined ? {} : { view }),
      });
      const compiled = result.views[0];
      const data = compiled === undefined ? undefined : stage === "view" ? compiled.view : stage === "geometry" ? compiled.geometry : compiled.metrics;
      const payload = { ok: result.ok, diagnostics: result.diagnostics, stage, data };
      return {
        content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
        structuredContent: payload,
        isError: !result.ok,
      };
    },
  );

  server.registerTool(
    "search_icons",
    {
      title: "Search TopoIR icons",
      description: "Discover offline technology logos, generic primitives and configured custom assets. Returns names, aliases, dimensions, sources and licenses. Search before designing; image bodies are omitted to save tokens.",
      inputSchema: z.object({ query: z.string().max(128).default(""), limit: z.number().int().min(1).max(100).default(25) }),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ query, limit }) => {
      const registry = new AssetRegistry();
      if (options.assetDirectory) {
        const inventory = await discoverAssets(options.assetDirectory, registry);
        if (inventory.diagnostics.length) return { content: [{ type: "text", text: JSON.stringify(inventory.diagnostics) }], isError: true };
      }
      const icons = registry.search(query, limit);
      return {
        content: [{ type: "text", text: JSON.stringify({ icons }, null, 2) }],
        structuredContent: { icons },
      };
    },
  );

  server.registerResource(
    "topoir-design",
    "topoir://docs/design",
    { title: "TopoIR visual design inventory", description: "Composition choices, visual languages and agent design workflow.", mimeType: "application/json" },
    // Generated from the capability registry, never a hand-maintained literal. This list
    // used to omit `architecture` and `architecture-map`, both implemented, so an agent
    // following discovery could not see the full tool.
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify({
      workflow: ["Identify audience and one takeaway", "Search built-in and custom assets", "Model entities and relationships", "Choose composition and visual language", "Set focus and ordered story edges", "Render and inspect the preview and quality metrics", "Revise intent only when it improves communication"],
      compositions: capabilitiesOfKind("composition"),
      intents: capabilitiesOfKind("intent"),
      formats: capabilitiesOfKind("format"),
      styles: themes.map(({ id, language }) => ({ id, language })),
      maturity: {
        implemented: "Works, and its quality is covered by the benchmarks.",
        experimental: "Produces output, but is not covered by a family acceptance gate.",
        advisory: "Accepted and recorded; deliberately does not change the drawing.",
        unsupported: "Accepted by the schema but not executed. Using it is reported as a diagnostic.",
      },
    }, null, 2) }] }),
  );

  server.registerResource(
    "topoir-schema",
    "topoir://schema/v1alpha1",
    { title: "TopoIR v1alpha1 JSON Schema", description: "Canonical TopoIR authoring schema.", mimeType: "application/schema+json" },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: "application/schema+json", text: JSON.stringify(topoirSchema, null, 2) }],
    }),
  );

  server.registerResource(
    "topoir-quickstart",
    "topoir://examples/quickstart",
    { title: "TopoIR quickstart", description: "Small valid semantic architecture example.", mimeType: "application/yaml" },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "application/yaml", text: quickstartExample }] }),
  );

  server.registerResource(
    "topoir-diagnostics",
    "topoir://docs/diagnostics",
    { title: "TopoIR diagnostic families", description: "Stable diagnostic code namespaces and repair guidance.", mimeType: "text/markdown" },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "text/markdown", text: diagnosticGuide }] }),
  );

  return server;
}

function withoutSourceMap<T extends { readonly sourceMap: unknown }>(value: T): Omit<T, "sourceMap"> {
  const { sourceMap: _sourceMap, ...rest } = value;
  return rest;
}

const quickstartExample = `apiVersion: topoir.dev/v1alpha1
kind: Architecture
metadata:
  name: payments
  title: Payments Platform
model:
  groups:
    - id: production
      kind: kubernetes-cluster
  nodes:
    - id: api
      kind: api
      group: production
    - id: postgres
      kind: database
      technology: postgresql
  edges:
    - id: api-to-postgres
      from: api
      to: postgres
      label: SQL
      kind: write
views:
  - id: overview
    layout:
      direction: right
`;

const diagnosticGuide = `# TopoIR diagnostics

- **TOP1xx** — parsing and JSON Schema structure. Repair syntax, required fields, types, or unknown properties.
- **TOP2xx** — semantic IDs, containment, references, ports, flows, annotations, and views.
- **TOP3xx** — theme, template, font, and icon resolution.
- **TOP4xx** — layout, routing, overlap, crossing, label, and geometry quality.
- **TOP5xx** — rendering and export.
- **TOP9xx** — unexpected internal failures.

Treat errors as blocking. Warnings produce an artifact but identify a quality issue worth correcting or reporting.
`;
