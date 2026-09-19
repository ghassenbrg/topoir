# Compiler architecture

TopoIR keeps semantics, geometry, and rendering separate so agents never need to reverse-engineer a layout engine.

## Stages

1. `SourceDocument` — YAML/JSON text plus file identity.
2. Structural validation — the v1alpha1 JSON Schema rejects unknown properties except namespaced `x-*` extensions. The YAML concrete syntax tree supplies JSON-pointer source ranges.
3. `NormalizedDocument` — semantic defaults are explicit, IDs are ordered deterministically, references are resolved, containment is checked as a tree, and invalid documents stop here.
4. `ViewGraph` — a view selects groups/nodes/edges/tags, closes over group descendants and containment ancestors, and retains only referenced flows/annotations.
5. `MeasuredView` — the resolved theme, templates, icons, wrapped text, labels, and annotations have deterministic dimensions before layout begins.
6. `GeometryView` — a replaceable `LayoutEngine` returns absolute rectangles, ports, labels, and routed polylines. `CompositionEngine` chooses topology/layers (ELK), temporal sequence, or structured comparison/domain panels. Topology views with design intent evaluate three fixed seed/spacing candidates unless `design.optimize: false`; route repair and label placement happen before deterministic score selection.
7. Quality analysis — hard failures include node overlap, node containment failure, missing/diagonal routes, and routes through unrelated nodes. Boundary crossings, label-to-label/node/annotation/heading overlaps, annotation overlaps, and edge/title intersections are warnings and feed numeric metrics. They are release-quality defects even when compilation is allowed for inspection.
8. `Scene` — renderer-neutral primitives are ordered by visual layer: canvas, nested boundaries, edges, nodes, edge labels, annotations, legend.
9. Artifact rendering — canonical SVG embeds an explicit font; PNG is rasterized from that exact SVG with system fonts disabled. A stable manifest records hashes and dimensions.

## Invariants

- Authoring IR has stable IDs and semantic constraints, not coordinates.
- A node belongs to at most one group; a group has at most one parent. Tags and views model cross-cutting concerns.
- Theme/icon/font resolution and text measurement precede layout.
- All renderer coordinates are absolute and rounded to two decimal places.
- Layout adapters do not leak private options into the public schema.
- Compiler caches, when added, must be output-neutral.
- No stage reads network resources or process-global layout history.

## Why ELK first

ELK Layered supports compound graphs, hierarchy edges, ports, multiple edges, edge labels, orthogonal routing, and deterministic seeds. Graphviz's orthogonal mode does not fully support ports and labels; Dagre remains useful as a comparison/fallback but has a smaller compound/routing surface. ELK is therefore an adapter, not the product architecture: TopoIR owns semantic normalization, measurement, geometry contracts, quality gates, scene construction, and deterministic artifacts.

Grid/pack groups use ELK Box with deterministic ordering and an aspect target derived from requested columns. Row/column groups remain compound layered graphs. The composition layer can repair obstructed segments with a rectilinear visibility-grid search. It does not yet provide boundary portals, lane allocation or globally optimized routing; keep those separate from macro placement.

## Intent versus implementation

The agent selects audience, takeaway, view membership, composition, focal nodes, ordered story edges, component meaning and assets. It does not draw geometry. `audience` is currently advisory information for the agent; it does not automatically choose a theme. `focus` and `story` influence rendering, but do not yet enforce a geometrically dominant narrative spine. The sequence family uses edge `step`/`order`; it is not a complete UML sequence language. Comparison and swimlanes are structured panel layouts, not general constraint solvers, and explicit edge ports are rejected there instead of silently discarded.

The [technical plan](visual-quality-plan.md) records the decisions, alternatives and implementation work needed to close these gaps. The [reference benchmark](visual-benchmark.md) is the product acceptance test; passing compiler tests alone does not establish presentation quality.

## Cross-boundary routing

ELK returns each hierarchy edge relative to its lowest common container. The adapter walks the containment tree, records absolute offsets, and translates every edge section and label into root coordinates. Quality analysis then compares each route's boundary intersections against the source/target ancestry.

Explicit author ports become fixed-side ELK ports. Edges without ports are assigned by the layout backend; the resulting boundary point remains compiler output.

## Stability

Normalized entities sort by explicit `order` then stable ID. The default view prefers `overview` and otherwise uses stable view order. Layout receives a fixed seed and model order. SVG serialization fixes element/layer order, attribute order, precision, marker IDs, embedded assets, and newline behavior. Artifact manifests omit time and machine paths except the caller-supplied source identity.

An optional prior-geometry stability input is planned; it will be explicit, hashed compiler input rather than hidden mutable state.
