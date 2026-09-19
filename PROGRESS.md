# TopoIR implementation ledger

Last updated: 2026-09-19 (Asia/Tokyo)

This file is the durable handoff record for the implementation. Update it whenever a decision is made, a milestone is verified, or the next action changes.

## Active visual-quality redesign — 2026-09-19

The user reviewed v0.1 and requested a substantial redesign around presentation-grade quality. The prior v0.1 completion record below is historical; this new objective is **in progress**. Full requirements and primary-source research are tracked in [docs/visual-quality-plan.md](docs/visual-quality-plan.md).

Implemented so far: offline Devicon/Lucide/Kubernetes asset registry (3,021 SVG entries), checked aliases and custom SVG/PNG/JPEG/WebP inventory; passive SVG validation, metadata, intrinsic image measurement and aspect-preserving embeds; view-level design intent and narrative references; seven initial visual languages; heterogeneous shapes, replicas, focus, status and story numbering; deterministic topology candidate evaluation, sequence lifelines, structured region/domain panels; label refinement, obstacle routing and sub-pixel orthogonal canonicalization; CLI/MCP discovery; updated agent workflow; eight showcases plus a custom-asset example. Artwork notices are embedded in SVG metadata and valid PNG iTXt chunks. Explicit ports in unsupported composition families produce an error instead of being silently ignored.

Verified 2026-09-19: `pnpm check` passes all builds, strict typechecks and **45 tests in 10 files**. PNG checks validate every chunk CRC with Node zlib, decompress IDAT data, and inspect uncompressed attribution. Quality tests now cover label-to-label, annotation/node and route/heading defects. The visually reviewed quickstart SVG golden is `26fce4879da6203b1bbba55e1a0d5f6fbbeb220e3ee7976bb1a8e39103865c4d`; bounds remain `{ x: 0, y: 0, width: 1068.27, height: 198 }`. All eight showcases and the custom-asset example were rendered and visually inspected. Eight publishable tarballs were audited; a fresh local install passed CLI doctor, SDK/asset imports, Apache notice loading and custom-asset SVG/PNG rendering. No publication performed.

The user explicitly confirmed that the six screenshots are the acceptance benchmark. Added `benchmarks/reference-cases.json`, `pnpm benchmark:references`, and `docs/visual-benchmark.md`. The generated `.tmp/reference-benchmark/report.md` pairs each reference with a candidate and records exact gaps and hashes. All six current candidates compile deterministically with clean measured geometry, but **zero of six have reference-parity approval**. Five are partial capability examples; Pockito reconstructs the semantic graph but flattens the gateway and lacks comparable composition. Small regional rows and a lightly styled whiteboard are not substitutes for the full references.

Next concrete implementation: Q1 in `docs/visual-quality-plan.md`—a shared measured component plan with internal gateway route compartments, multiple asset roles, silhouette/attachment slots and ink bounds; use the complete Pockito reference first. Then narrative-spine/mixed-orientation composition, full cloud/cluster fixtures, boundary portals and rich sketch grammar. Public architecture/schema/assets/CLI/MCP docs and roadmap now distinguish current behavior from future contracts. The new visual-quality objective remains **in progress**, not complete or ready for a reference-quality release.

## Product contract

- Agents author architecture semantics; TopoIR owns deterministic validation, normalization, measurement, layout, port assignment, routing, styling, icon resolution, and rendering.
- The canonical source format is a versioned semantic YAML/JSON document. Geometry is compiler output, never required author input.
- The compiler is a staged pipeline with typed intermediate representations and a replaceable layout backend.
- SVG is the canonical artifact. PNG is a deterministic rasterization of that SVG.
- Nested boundaries, ports, cross-boundary edges, edge labels, annotations, multiple views, stable IDs, diagnostics, and reproducibility are foundational—not later editor features.
- v0.1 is a focused compiler/CLI/SDK/MCP release, not a Mermaid wrapper, generic canvas editor, or SaaS.

## Reference-derived engine requirements

The six reference screenshots in `.tmp/screenshots/` have been inspected. Together they require:

- arbitrary nested cloud/network/Kubernetes/application boundaries;
- orthogonal, colored, dashed and solid flows with labels, arrows, fan-in/fan-out, and legal boundary crossings;
- heterogeneous nodes: services, pods, databases, caches, queues, files, gateways, clients, vendor services, and notes;
- repeated layouts, rows, columns, grids, mirrored regions, balanced whitespace, legends, and presentation-level visual hierarchy;
- explicit ports and routing corridors to avoid nodes, labels, and container titles;
- deterministic templates/icons whose measured dimensions participate in layout.

## Architecture decisions

1. Public semantic IR is separate from normalized, measured, geometry, and scene-graph IRs.
2. JSON Schema 2020-12 is the canonical wire contract; TypeScript types mirror it and runtime validation uses Ajv.
3. YAML parsing preserves source locations so diagnostics can identify a file/range.
4. ELK Layered is the first macro layout adapter because it supports compound graphs, ports, labels, multi-edges, and orthogonal routing. No raw ELK options leak into the semantic schema.
5. Deterministic row/column/grid layout is implemented alongside ELK for architecture patterns that should remain aligned and symmetric.
6. Theme, font, icon, and node-template resolution happen before measurement/layout.
7. Cross-boundary routing is represented explicitly and validated; local orthogonal repair can be added without changing public IR.
8. Rendering targets a backend-neutral scene graph. SVG is first; PNG uses resvg.
9. Layout stability uses stable ordering and an optional prior geometry input. Hidden process-global state is forbidden.
10. Initial implementation uses TypeScript ESM, Node.js 22+, pnpm, strict compiler settings, and a small publishable package surface.

## Milestones

- [x] M0 — repository and tooling foundation
- [x] M1 — versioned schema, parser, source map, structured diagnostics
- [x] M2 — semantic normalization, view selection, references and invariants
- [x] M3 — theme/templates/icons, deterministic text measurement
- [x] M4 — nested layout, ports, orthogonal routing, quality validation
- [x] M5 — scene graph, canonical SVG, PNG export
- [x] M6 — SDK and agent-focused CLI
- [x] M7 — MCP server and agent skill
- [x] M8 — examples, fixtures, visual regression, fuzz/property/performance coverage
- [x] M9 — public-release documentation, CI, packaging, security and release workflows

## Verified work

- Read `.tmp/goals/TOPOIR_GOAL.md` completely (913 lines, 18,410 bytes).
- Inspected every supplied reference image: `exple1.jpg` through `exple6.png`.
- Researched and compared ELK, TALA/D2, Dagre, Graphviz, Structurizr, LikeC4, Sprotty, yFiles, and libavoid before selecting the initial architecture.
- Verified the repository began with only `README.md`, `LICENSE`, `.gitignore`, the goal, and reference screenshots.
- Added a pnpm/TypeScript 6 strict ESM workspace with reproducible dependency lockfile and explicit native-build allowlist.
- Implemented `@topoir/schema`: v1alpha1 JSON Schema, typed semantic contract, YAML/JSON parser, JSON-pointer source map, Ajv structural validation, and TOP1xx diagnostics.
- Implemented `@topoir/core` front end: document-wide IDs, group cycle checks, group/node/edge/port/flow/annotation/view reference checks, deterministic defaults/order, and multi-view selection with containment closure.
- Added the polished `technical-clean` semantic theme, generic vector icons for all initial node kinds, deterministic text wrapping, and exact glyph measurement through fontkit using bundled DejaVu Sans. SVG embeds the same font and PNG rasterization disables system fonts.
- Implemented the ELK adapter for compound graphs, explicit ports, hierarchy edges, labels, deterministic ordering/seed, row/column/grid/pack hints, and absolute coordinate reconstruction for edge containers.
- Added geometry quality gates for overlaps, containment, empty/non-orthogonal routes, edge-through-node failures, edge crossings, label overlap, and boundary crossing anomalies.
- Implemented a backend-neutral scene graph, layered SVG renderer with rounded orthogonal edges and semantic arrows/styles, accessible title/description, self-contained fonts, and resvg PNG export.
- Implemented `@topoir/sdk` orchestration and stable artifact manifests/hashes.
- Implemented agent-oriented CLI commands: `validate`, `render`/`export`, `inspect`, `schema`, `icons`, and `doctor`; supports stdin/stdout, JSON results, manifests, all views, and stable exit codes.
- Added the MCP 2026-07 server with four task-level tools (`validate_document`, `render_document`, `inspect_document`, `search_icons`) and three resources (schema, quickstart, diagnostics).
- Added and validated `skills/topoir/SKILL.md` using the canonical local skill validator.
- Added 11 complete architecture examples and regenerated their PNG gallery with the final bundled-font pipeline. Visually inspected the multi-region, Kubernetes platform, and data platform renders for hierarchy, routes, labels, icons, clipping, and boundary behavior.
- Added six adversarial topology fixtures covering deep nesting, cross-boundary fan-out, cycles, disconnected grids, long pipelines, and parallel edges.
- Added deterministic geometry/SVG golden assertions, fixture-wide compilation checks, example-wide rendering checks, PNG signature coverage, CLI subprocess integration, MCP in-memory protocol integration, and a fast-check property suite over 24 generated graphs.
- The final quickstart geometry golden is `{ x: 0, y: 0, width: 1068.27, height: 198 }`; its canonical SVG SHA-256 is `f26802cb4c6f12d81ec70fa5163d11023b73d4aa75bb3844313fedd473813493`.
- Added a 120-node/149-edge/12-group compiler benchmark. On Node v24.11.0 on the development machine, five final-pipeline iterations measured 139.28 ms minimum, 158.34 ms median, and 365.75 ms maximum. These are development measurements, not a cross-platform performance guarantee.
- Added public README and package READMEs, architecture/schema/CLI/MCP/diagnostics/assets documentation, contribution/security policies, changelog, roadmap, Node 22/24 CI, Dependabot, and tag-gated provenance publishing workflow.
- Audited every package tarball: required `dist`, README, LICENSE, schema, exports, bins, engines, and rewritten sibling dependency versions are present. A clean install using the complete local tarball set passed `topoir doctor`, rendered the quickstart SVG, and imported `TopoIRCompiler` from the packaged SDK.
- Final verification: `pnpm check` passes all builds, strict type checks, and 24 tests in 7 files. `topoir doctor` passes schema, layout, SVG, and PNG checks.

## Historical v0.1 handoff (superseded by the active redesign above)

The v0.1 implementation and release-readiness audit are complete. The repository is ready for a maintainer review and the first coordinated `0.1.0-alpha.0` package publication.

## Historical v0.1 remaining-work record

No required v0.1 implementation work remains. Publishing to npm and creating the GitHub release require maintainer credentials and an explicit release action. Product expansion belongs to the v0.2+ roadmap: repeated-region constraints, bus routing, boundary portals, local route repair, optional previous geometry, and separately licensed icon packs.

## Handoff notes

- Workspace: `/Users/ghassenbrg/git/topoir`
- `.tmp/` is intentionally ignored and contains non-distributable project inputs/reference images.
- Preserve the semantic/compiler boundary. Do not add coordinates to the authoring schema or expose layout-engine-specific configuration as the public API.
- Update this ledger before ending a work session, including exact test results and the next concrete action.
