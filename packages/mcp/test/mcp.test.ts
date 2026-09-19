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

describe("TopoIR MCP capability discovery", () => {
  /**
   * T04. The design inventory used to be a hand-maintained literal listing five
   * compositions while the schema accepted seven. It is generated from the capability
   * registry now, and this asserts the MCP surface agrees with the CLI surface rather
   * than merely being non-empty.
   */
  it("generates the design inventory from the capability registry", async () => {
    const { capabilitiesOfKind } = await import("@topoir/sdk");
    const { client } = await connectedPair();
    const result = await client.readResource({ uri: "topoir://docs/design" });
    const first = result.contents[0];
    const text = first !== undefined && "text" in first ? String(first.text) : "";
    const inventory = JSON.parse(text) as {
      compositions: { id: string; maturity: string }[];
      intents: { id: string; maturity: string }[];
      formats: { id: string }[];
      maturity: Record<string, string>;
    };

    expect(inventory.compositions).toEqual(capabilitiesOfKind("composition"));
    expect(inventory.intents).toEqual(capabilitiesOfKind("intent"));
    expect(inventory.formats).toEqual(capabilitiesOfKind("format"));
    // The two the old literal omitted.
    const ids = inventory.compositions.map((composition) => composition.id);
    expect(ids).toContain("architecture");
    expect(ids).toContain("architecture-map");
    // Every maturity value used is explained in the same payload.
    for (const composition of [...inventory.compositions, ...inventory.intents]) {
      expect(Object.keys(inventory.maturity), composition.id).toContain(composition.maturity);
    }
  });
});
