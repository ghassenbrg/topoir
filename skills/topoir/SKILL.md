---
name: topoir
description: Design and render architecture, infrastructure, incident, request-sequence and data-flow diagrams with TopoIR using semantic models, visual intent, technology icons and custom assets. Use for SVG/PNG technical visuals, not freeform illustration.
---

# TopoIR

Model what the architecture means; let TopoIR own geometry, routing, styling, icons, and rendering.

## Workflow

1. Inspect the system sources the user placed in scope. Identify components, containment boundaries, relationships, protocols, and the questions each diagram should answer.
2. Choose the audience and the one takeaway for each view. Decide what the viewer should see first, second and third. Reuse one semantic model across focused views.
3. Discover the available visuals with `topoir styles` and narrow `topoir assets search <concept> --json` queries. If the consumer has a local inventory, include `--assets ./topoir-assets` in discovery, inspect and render commands. Look at custom names, aliases, descriptions and dimensions before choosing assets. Do not load the full SVG inventory into the model context.
3. Create or update a versioned `*.topoir.yaml` document. Use stable opaque IDs and semantic kinds. Never calculate SVG coordinates or add layout-engine-specific options.
4. Run `topoir validate <file>`. Repair every error by code and location before rendering.
5. Run `topoir render <file> --view <id> --format svg --output <path> --manifest`. Inspect the rendered artifact, not just command success.
6. Inspect the PNG preview at a legible scale. Check the takeaway, focal hierarchy, title and labels, meaningful grouping, route collisions, icon recognition, secondary paths and composition. Improve the semantic or design choices when needed; the compiler owns geometry. Inspect `--stage metrics` to distinguish routing defects from a poor storytelling choice. Passing validation alone does not establish visual quality.

Use `--warnings-as-errors` for checked-in release artifacts. Use `topoir inspect <file> --stage geometry --view <id>` when routing or containment needs diagnosis.

## Authoring rules

- Use one strict containment tree through `group.parent` and `node.group`. Use tags for cross-cutting concerns such as `auth`, `observability`, or `data`; do not force overlapping taxonomies into nested groups.
- Give every group, node, edge, flow, annotation, and view a stable unique ID. Labels may change without changing identity.
- Prefer semantic `kind`, `technology`, `protocol`, and `flow` values over appearance directives. A flow may define a meaningful color/style for a legend; individual edge styling is the exception.
- Define ports only when the interface or boundary side matters. Ports belong to nodes and edges reference them with `sourcePort` or `targetPort`.
- Keep node descriptions short enough to scan. Put explanations in annotations or documentation rather than turning every node into a paragraph.
- A view `include` selector using a group includes its descendants. Visible nodes bring their ancestor groups into the view. Edges appear when both endpoints are visible.
- Treat `x-*` fields as namespaced metadata, not as a path to raw geometry or undocumented ELK options.
- Set `technology: postgresql` for automatic lookup, `icon: devicon:postgresql` for an explicit registry entry, or `visual.asset: custom:payment-api` for configured local artwork. Search first. Generic cloud-service fallbacks are not official provider artwork; do not describe them as such.

## Design decisions

Set `views[].design` and `views[].theme`. Choose based on communication needs, not a default look:

- `composition: topology` for relationships and nested deployment; `layers` for vertical architecture or pipelines.
- `sequence` for ordered requests and responses. Give participants `order` and relationships `step`; repeated messages remain separate edges.
- `comparison` for before/after or paired regions; groups become side-by-side panels. Align counterpart components with consistent order and structure.
- `swimlanes` for domain ownership. Top-level groups become lanes; use nested row/column/grid layouts when needed.
- `cloud-architecture` emphasizes icons; `dark-engineering` uses technical component shapes; `executive` uses large editorial cards; `minimal` uses compact rules; `blueprint` uses angular connectors and outlines; `whiteboard` uses deterministic sketch accents. These affect measurement and rendering, not just colors.
- Use `design.takeaway` for a concise explanation, `design.focus` for focal node IDs and `design.story` for ordered edge IDs. Primary paths should dominate; set secondary/control relationships to `emphasis: secondary` or `muted`. Use `status: failure|warning|success` when meaningful.
- Node `visual` supports `shape: card|icon|cylinder|stack|pill|diamond|image`, `badge`, `replicas`, `status`, `emphasis`, and `asset`. A replica count means repeated instances represented compactly; do not invent counts.

The engine evaluates a bounded set of deterministic topology candidates when a design intent is present. It does not call a model. Use tokens to reason about meaning and presentation; do not hand-author positions, routes or SVG.

## Minimal document

```yaml
apiVersion: topoir.dev/v1alpha1
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
      protocol: PostgreSQL
      kind: write
views:
  - id: overview
    layout:
      direction: right
```

For the full structural contract, use `topoir schema`. For machine-native operation, prefer the MCP tools `validate_document`, `render_document`, `inspect_document`, and `search_icons`; pass complete documents rather than fragmented graph mutations.
