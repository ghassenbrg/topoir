# Roadmap

The product direction is stable even while the v1alpha1 schema evolves: agents express architecture semantics; TopoIR deterministically handles layout, routing, styling, icons, validation, and rendering.

## v0.1 — compiler proof

- Versioned YAML/JSON schema and source-aware diagnostics.
- Nested boundaries, semantic nodes/ports/edges/flows/annotations, and multiple views.
- ELK compound layout, row/column/grid/pack constraints, orthogonal routing, and quality metrics.
- Polished technical-clean theme, generic vector icons, self-contained SVG and PNG.
- SDK, non-interactive CLI, MCP server, and agent skill.
- Ten-plus examples, difficult fixtures, property tests, visual golden, benchmark, and release automation.

The compiler foundation is implemented. The visual-quality redesign adds offline assets, design intent and several composition families. This is **not** a declaration that the reference screenshots have been matched. The release candidate still needs the quality and packaging gates recorded in [`PROGRESS.md`](PROGRESS.md). Publication is a separate explicit maintainer action.

## Next — reference-quality milestone (before broad feature expansion)

- Maintain all six screenshot cases with equivalent-complexity semantic fixtures and paired visual review. Partial showcase coverage does not pass the gate.
- Start with Pockito: composite ingress route compartments, multi-asset workloads, strong data path and quiet identity branch.
- Introduce a measured component contract with silhouettes, named attachment slots, nested content and intrinsic assets. Keep internal component layout distinct from infrastructure containment.
- Add narrative-spine composition, mixed group orientation and explicit repeated-row correspondence. Test unequal labels and an additional cluster, not only symmetric toy examples.
- Reserve boundary portals and routing corridors, assign lanes for parallel flows, then refine labels/annotations against actual scene ink bounds.
- Implement genuinely illustrative sketch grammar and an observability surround for reference 5. Do not count a palette/border variant as complete.
- Require the [reference acceptance rubric](docs/visual-benchmark.md) on all six cases before claiming reference-level presentation quality.

These work packages and decision gates are specified in [the technical plan](docs/visual-quality-plan.md). Sequence follows dependencies, not calendar promises.

## v0.2 — stability and controlled extension

- Explicit previous-geometry input and measured revision stability with unchanged-node displacement and route churn.
- Expanded instance semantics, bus/hyperedge routing and overlay regions beyond tree containment.
- Operator-installed, versioned provider packs with retained terms; generic cloud fallbacks remain clearly identified. Kubernetes resource artwork is already included.
- Cache resolved assets and measured components by content hash; profile before introducing workers or Rust/WASM.

## v0.3 — lifecycle and interoperability

- Architecture diff views.
- Deterministic Kubernetes, Compose, Terraform, OpenAPI, and AsyncAPI importers.
- PDF/HTML output and selected editable-format exports.
- Overlay lenses for ownership, security, cost, health, or change state.
- Insets, detail lenses and advanced visual grammars after the reference gate; selected isometric components only if semantic clarity survives projection.

## v1.0 — stable toolchain

- Stable schema/compiler/diagnostic contracts with migrations.
- Cross-platform artifact reproducibility guarantees and published performance envelopes.
- Audited plugin/asset extension model.
- Mature documentation, governance, compatibility policy, and contributor release process.

Not planned as the core product: an embedded LLM, collaborative whiteboard, pixel-first editor, arbitrary code plugins, or required hosted service.
