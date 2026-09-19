# MCP server

`@topoir/mcp` implements the MCP 2026-07 protocol over stdio. It is local and stateless: tool calls accept a complete document, do not mutate files, do not access the network, and return artifacts in protocol content.

## Start

From a source checkout:

```bash
pnpm build
node packages/mcp/dist/bin.js
```

Example client configuration:

```json
{
  "mcpServers": {
    "topoir": {
      "command": "node",
      "args": ["/absolute/path/to/topoir/packages/mcp/dist/bin.js"]
    }
  }
}
```

## Tools

### `validate_document`

Input: complete `source`, optional `sourceName`. Returns `{ ok, diagnostics }`; invalid documents set MCP `isError`.

### `render_document`

Input: complete `source`, optional `sourceName`, `view`, `format` (`svg`/`png`), and PNG `scale`. PNG is returned as native image content. SVG is returned as an embedded `image/svg+xml` resource. Summary metadata includes dimensions and SHA-256 without filesystem writes.

### `inspect_document`

Input: complete `source`, optional `sourceName`/`view`, and `stage` (`model`, `view`, `geometry`, `metrics`). Use it to repair a diagnostic or understand a poor route; do not treat geometry as authoring input.

### `search_icons`

Searches the offline built-in and operator-configured custom inventory. Optional `query` and `limit` bound the response. Returns IDs, aliases, descriptions, dimensions, source and license, not image bodies. Set `TOPOIR_ASSETS=/absolute/path/to/topoir-assets` when starting the server to configure local assets. Tool inputs cannot select arbitrary directories. The server reads that inventory but never mutates it.

## Resources

- `topoir://schema/v1alpha1` — canonical JSON Schema.
- `topoir://examples/quickstart` — minimal valid YAML document.
- `topoir://docs/diagnostics` — diagnostic families and repair guidance.
- `topoir://docs/design` — composition families, visual languages, narrative and asset workflow.

The intentionally small surface encourages an agent to edit one diffable semantic document and compile it, rather than spending tokens on imperative graph mutations.
