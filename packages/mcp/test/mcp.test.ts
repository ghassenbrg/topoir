import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { afterEach, describe, expect, it } from "vitest";
import { createTopoIRMcpServer } from "../src/index.js";

const closeables: Array<{ close(): Promise<void> }> = [];

afterEach(async () => {
  await Promise.allSettled(closeables.splice(0).map((item) => item.close()));
});

async function connectedPair() {
  const server = createTopoIRMcpServer();
  const client = new Client({ name: "topoir-test", version: "1.0.0" });
  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  closeables.push(client, server);
  return { client, server };
}

const source = `apiVersion: topoir.dev/v1alpha1
kind: Architecture
metadata:
  name: mcp-test
model:
  nodes:
    - id: api
      kind: api
`;

describe("TopoIR MCP server", () => {
  it("advertises a small task-level tool surface and documentation resources", async () => {
    const { client } = await connectedPair();
    const tools = await client.listTools();
    const resources = await client.listResources();

    expect(tools.tools.map((tool) => tool.name)).toEqual([
      "validate_document",
      "render_document",
      "inspect_document",
      "search_icons",
    ]);
    expect(resources.resources.map((resource) => resource.uri)).toEqual([
      "topoir://docs/design",
      "topoir://schema/v1alpha1",
      "topoir://examples/quickstart",
      "topoir://docs/diagnostics",
    ]);
  });

  it("validates complete documents with structured diagnostics", async () => {
    const { client } = await connectedPair();
    const valid = await client.callTool({ name: "validate_document", arguments: { source } });
    const invalid = await client.callTool({ name: "validate_document", arguments: { source: "kind: Architecture\n" } });

    expect(valid.structuredContent).toMatchObject({ ok: true, diagnostics: [] });
    expect(invalid.isError).toBe(true);
    expect(JSON.stringify(invalid.structuredContent)).toContain("TOP111_REQUIRED_PROPERTY");
  });

  it("renders PNG as native MCP image content without writing files", async () => {
    const { client } = await connectedPair();
    const result = await client.callTool({
      name: "render_document",
      arguments: { source, format: "png" },
    });

    expect(result.isError).not.toBe(true);
    expect(result.content.some((item) => item.type === "image" && item.mimeType === "image/png")).toBe(true);
    expect(result.structuredContent).toMatchObject({ ok: true, artifact: { format: "png" } });
  });

  it("serves the canonical JSON Schema resource", async () => {
    const { client } = await connectedPair();
    const result = await client.readResource({ uri: "topoir://schema/v1alpha1" });

    expect(result.contents[0]).toMatchObject({ mimeType: "application/schema+json" });
    expect("text" in (result.contents[0] ?? {}) ? result.contents[0]?.text : "").toContain("topoir.dev/v1alpha1");
  });
});
