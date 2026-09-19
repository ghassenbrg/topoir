# Changelog

All notable changes will be documented here. Versions follow Semantic Versioning after 1.0; pre-1.0 schema compatibility is explicitly documented per release.

## 0.1.0-alpha.0 — unreleased

### Added

- Diagram shape as a measured quality property: `aspectRatio`, `aspectDeviation` and `inkCoverage` metrics with `TOP433_ASPECT_OFF_TARGET` and `TOP434_CANVAS_SPARSE`. A layout that is geometrically perfect and the wrong shape to read is no longer silent.
- Layered wrapping as a scored layout candidate, so a long pipeline is re-cut into stacked rows instead of running off to one side. A 120-node chain went from 37,491x370 to 3,624x4,798.
- `TOP414_EDGE_LABEL_DROPPED`, and label reconstruction from measured text when a layout backend returns no label box.
- `TOPOIR_DIAGNOSTIC_CODES` exported from `@topoir/schema`: the complete, machine-readable list of diagnostic codes, held to the source by a test.
- `--help` on every CLI command, and `TOP120_CLI_USAGE` (exit 2) for argument errors, which were previously reported as `TOP900_INTERNAL_ERROR`.
- Unit tests for the router, composition shape and the SVG renderer, which had none.

### Fixed

- The candidate search returned the first geometrically legal layout without ever comparing the aspect term, and that term was weighted below a single edge crossing.
- CI never ran on pushes to the default branch (`master`); the workflow only listened for `main`.
- The generalization console summary was truncated immediately before its two largest metrics.

### Added — visual-quality redesign

- View-level audience/takeaway/focus/story intent, node shapes/status/badges/replicas, and relationship emphasis/steps.
- Seven visual languages; deterministic topology candidate selection and local route/label repair; experimental sequence and structured domain/comparison layouts.
- Offline Devicon/Lucide/Kubernetes inventory (3,021 entries), aliases/provenance and local SVG/PNG/JPEG/WebP discovery with asset-aware measurement.
- Self-contained artwork attribution in SVG/PNG; explicit geometric arrowheads; expanded label/annotation/title quality metrics.
- CLI/MCP design and inventory discovery, eight visual showcases, a custom asset example, and reference screenshot benchmark/report with an explicit unmet parity gate.

### Added — initial compiler

- TopoIR `topoir.dev/v1alpha1` semantic JSON Schema and TypeScript types.
- Source-aware YAML/JSON parsing, strict structural validation, semantic normalization, multi-view projection, and stable TOP1xx/TOP2xx diagnostics.
- Semantic theme/template measurement, generic vector icons, explicit bundled font, compound ELK layout, ports, labeled orthogonal routing, and geometry-quality analysis.
- Renderer-neutral scene graph, canonical self-contained SVG, deterministic PNG, hashes, and artifact manifest.
- SDK, CLI, MCP 2026-07 server, and reusable TopoIR agent skill.
- Eleven architecture examples, six difficult regression fixtures, generated gallery, unit/property/integration/golden tests, and benchmark harness.
