# TopoIR implementation ledger

Last updated: 2026-09-19 (Asia/Tokyo)

This file is the durable handoff record for the implementation. Update it whenever a decision is made, a milestone is verified, or the next action changes.

## Interruption handover prompt

Continue TopoIR from `/Users/ghassenbrg/git/topoir`. Read `.tmp/goals/TOPOIR_GOAL.md`, this file, `docs/visual-quality-plan.md`, and `docs/visual-benchmark.md`; inspect all six `.tmp/screenshots`; preserve the semantic/compiler split; run `pnpm check` and `pnpm benchmark:references`; continue the first unmet reference work package, record every verified change and remaining gap here, and never claim reference parity without side-by-side visual review.

## Active visual-quality redesign — 2026-09-19

The user reviewed v0.1 and requested a substantial redesign around presentation-grade quality. The prior v0.1 completion record below is historical; this new objective is **in progress**. Full requirements and primary-source research are tracked in [docs/visual-quality-plan.md](docs/visual-quality-plan.md).

Implemented so far: offline Devicon/Lucide/Kubernetes asset registry (3,021 SVG entries), checked aliases and custom SVG/PNG/JPEG/WebP inventory; passive SVG validation, metadata, intrinsic image measurement and aspect-preserving embeds; view-level design intent and narrative references; seven initial visual languages; heterogeneous shapes, replicas, focus, status and story numbering; deterministic topology candidate evaluation, sequence lifelines, structured region/domain panels; label refinement, obstacle routing and sub-pixel orthogonal canonicalization; CLI/MCP discovery; updated agent workflow; nine showcases plus a custom-asset example; a compiler-owned banded `architecture` composition with connector lanes and corridors. Artwork notices are embedded in SVG metadata and valid PNG iTXt chunks. Explicit ports in unsupported composition families produce an error instead of being silently ignored.

### Session record — 2026-09-19, Q1 measured components

The working tree was inherited mid-package with `pnpm check` failing two tests. Both were diagnosed and fixed rather than re-baselined:

- **Asset roles were conflated with the resolution fallback chain.** The previous implementation treated `[visual.asset, ...visual.assets, icon, technology, kind]` as one additive list, so any node with both a `technology` and a resolvable `kind` silently gained a second icon and a second attribution entry. That is what moved the quickstart golden SVG hash. A single exported `assetReferences()` in `@topoir/core` now defines the contract — an explicit `visual.assets` list is the complete ordered set, otherwise one asset resolves from `visual.asset` → `icon` → `technology` → `kind` — and measurement, rendering and attribution all call it, so they cannot diverge. The quickstart golden `26fce4879da6203b1bbba55e1a0d5f6fbbeb220e3ee7976bb1a8e39103865c4d` is restored byte-for-byte. Declaring both `visual.asset` and `visual.assets` now reports `TOP323_ASSET_OVERRIDDEN` instead of silently dropping one.
- **The `ref-06` direct-replication assertion was failing against an expanded fixture.** The regional groups were re-laid as column stacks so each corresponding pair occupies its own row; all five replication connectors (`deploy`, `wal`, `copy`, `registry-copy`, `secret-copy`) plus `peering` now run straight, up from three of six before. The assertion was kept as written, not weakened.

Implemented for Q1 (ref-04 Pockito):

- **Measured route compartments with real attachment slots.** `visual.portLabels: inside` renders a component's declared `ports` as labeled internal compartments. `MeasuredPort.slot` is computed during measurement; the ELK adapter pins those ports with `FIXED_POS` at the slot's own edge; the renderer draws the same measured rectangle. Verified visually: each of Traefik's `/app/*`, `/api/*`, `/mcp/*` connectors now leaves from its own compartment row.
- **Multiple ordered asset roles per component**, drawn side by side. Previously multiple assets were drawn at one position in icon/vertical layout, so they overlapped; the strip is now centred and the measured width reserves room for it.
- **`order` on ports**, so a gateway route table is an author-controlled sequence rather than an alphabetical one.
- **Sibling ordering contract fixed.** `stableSort` used `order ?? 0`, making "unranked" indistinguishable from `order: 0`, so one explicitly ranked node sank below unrelated unranked siblings. Explicitly ranked siblings now come first in declared rank, unranked follow by ID. Covered by a new test in `packages/core/test/core.test.ts`.

Quality-engine blind spot closed:

- `analyzeGeometry` exempted an edge's own endpoints from intersection checks entirely, so a connector that ran back across its own source or target card was invisible. New metric `endpointBodyCrossings` and warning `TOP424_EDGE_CROSSES_OWN_ENDPOINT` (perpendicular departure still permitted, crossing is not). The metric immediately found 3 such defects in a `paired-regions` variant and 2 in the new `trust-zones` fixture. The `panels` router now treats both endpoints as exact-silhouette obstacles, and the composition score weights the metric. All 27 example/showcase/fixture documents now measure 0; `pnpm check` goldens are unchanged by the weighting because every selected candidate already scored 0.

Verified 2026-09-19 (second session): `pnpm check` passed all builds, strict typechecks and **56 tests in 11 files** (was 45 in 10); the third session took this to 60. `topoir doctor` passes schema, layout, SVG and PNG checks. `pnpm benchmark:references` compiles all six cases deterministically with clean geometry and correctly reports `referenceParity: NOT MET` for all six.

**Side-by-side visual review of ref-04 against `exple4.png` was performed and parity was NOT granted.** Rubric estimate: semantic completeness 3, typography/labels 3, assets/component grammar 3, story/emphasis 3 — but composition/grouping 2, flow/routing 2, finish 2. Acceptance needs all seven ≥3. Concrete reasons recorded in `benchmarks/reference-cases.json`: the identity service is placed above the request band so its quiet path spans the full canvas; two application-routing connectors cross because layer-internal placement does not follow the declared route order (route compartments fix attachment, not placement); the aspect ratio is wider than the reference with an empty lower cluster band; client fan-in is three parallel connectors rather than a merged bus. `ref-03` and `ref-06` gap text was also sharpened after visual review — ref-03's request path is semantically complete but doubles back instead of reading as one spine.

Previously verified: `pnpm check` passed all builds, strict typechecks and **45 tests in 10 files**. PNG checks validate every chunk CRC with Node zlib, decompress IDAT data, and inspect uncompressed attribution. Quality tests now cover label-to-label, annotation/node and route/heading defects. The visually reviewed quickstart SVG golden is `26fce4879da6203b1bbba55e1a0d5f6fbbeb220e3ee7976bb1a8e39103865c4d`; bounds remain `{ x: 0, y: 0, width: 1068.27, height: 198 }`. All eight showcases and the custom-asset example were rendered and visually inspected. Eight publishable tarballs were audited; a fresh local install passed CLI doctor, SDK/asset imports, Apache notice loading and custom-asset SVG/PNG rendering. No publication performed.

The user explicitly confirmed that the six screenshots are the acceptance benchmark. Added `benchmarks/reference-cases.json`, `pnpm benchmark:references`, and `docs/visual-benchmark.md`. The generated `.tmp/reference-benchmark/report.md` pairs each reference with a candidate and records exact gaps and hashes. All six current candidates compile deterministically with clean measured geometry, but **zero of six have reference-parity approval**. Pockito now reconstructs the full entity/relationship inventory with a real measured gateway route table, but its composition is still weaker than the reference; trust-zones and paired-regions are substantial; the remaining three are partial capability examples. A lightly styled whiteboard is not a substitute for the illustrated reference.

Next concrete implementation (superseded in part by the session record above — the `architecture` family closed the placement gap): **Q2 composition** in `docs/visual-quality-plan.md`. Q1's measured-component work is done for gateway route compartments, multiple asset roles and attachment slots; what remains before ref-04 can be re-reviewed is placement, not component grammar. In order: (1) **done** — the `architecture` family honours declared sibling rank, so a route table is no longer crossed by its own connectors; (2) narrative-spine placement, mixed local orientation and a secondary band for off-spine sinks — the blocking gap for ref-03's request spine and for ref-04's proportions, since an off-spine sink still occupies a full band in the main stack; (3) `ComponentPlan` ink bounds and the remaining Q1 extremes (nested actor headers); (4) full cloud/cluster fixtures for ref-02 and ref-01, boundary portals and rich sketch grammar. Public architecture/schema/assets/CLI/MCP docs and roadmap now distinguish current behavior from future contracts. The new visual-quality objective remains **in progress**, not complete or ready for a reference-quality release.

### Session record — 2026-09-19, compiler-owned composition for ref-04

The objective for this session was to reach `exple4.png`'s quality bar for ref-04.

**Why a new composition family.** The blocking defect was that a gateway's route table was crossed by its own connectors, because ELK chose layer-internal order. Three documented ELK levers were tried and measured before writing any new layout code: `crossingMinimization.semiInteractive` with per-node `elk.position`, `crossingMinimization.forceNodeModelOrder`, and `crossingMinimization.strategy: INTERACTIVE`. Under `hierarchyHandling: INCLUDE_CHILDREN` the first two changed nothing on the target fixture and the third failed to produce a layout at all. They were all reverted. That is what justified the compiler-owned `architecture` family the plan already called for, rather than another backend option.

**Implemented.**

- **`architecture` composition** (`packages/layout-elk/src/banded.ts`). Every container — the canvas and each boundary — is solved as its own small problem, bottom-up, so a boundary is placed as one measured block whose padding and heading belong to that block, and is therefore always contiguous. Items are assigned to layers along the view direction by bounded relaxation (a cycle cannot loop forever; a leftover backward edge goes to the router), then ordered into bands. A container's own `layout.mode` picks its arrangement: `column`/`row` keep one fixed lane in declared sequence, `grid` uses fixed columns, anything else layers. Explicit sibling `order` is a hard constraint; unranked siblings relax by barycenter and then by ID.
- **Connector lanes and corridors.** Endpoints sharing a component side are distributed across it, skipping the part of the side occupied by measured route compartments, and each lane turns at its own distance so separated endpoints do not immediately rejoin one corridor. Two lane orderings are useful and neither wins everywhere — "fan" (by the band each connector reaches) suits fan-out, "reach" (longest run outermost) suits fan-in — so both, plus a no-lane variant, are scored and the best kept.
- **`TOP425_EDGE_SEGMENTS_COINCIDENT` and a separation pass.** `analyzeGeometry` now detects connectors drawn along the same line for a visible stretch. This immediately exposed a real defect in a shipped example: `checkout-platform` had two relationships drawn on top of each other for 1,046px. `route()` now charges for corridors already taken, routes are laid in a deterministic order, and a `separateCoincidentRoutes` pass re-routes offenders for every family, keeping a new route only when it shares strictly less line and still touches nothing it should not.
- **Route labels anchor to their own polyline.** They previously anchored to the straight-line midpoint between endpoints and floated in open space whenever a route bent.
- Fixture: ref-04 now matches the reference's boundary structure (Clients, cluster, the API pair, a labelled state cluster) instead of over-nesting, and declares its reading order and aspect target.

**Verified.** `pnpm check` passes all builds, strict typechecks and **60 tests in 11 files** (was 45 in 10 at the start of the redesign). `pnpm benchmark:references` compiles all six cases deterministically with clean geometry and still reports `referenceParity: NOT MET` for all six. Across all 27 example, showcase and fixture documents: **zero** node overlaps, edge/node intersections, endpoint crossings, non-orthogonal segments, empty routes, boundary violations, label overlaps, annotation overlaps, heading intersections and coincident connectors. The suite now asserts every one of those per published example, so the class cannot silently return.

**ref-04 measured result.** 1380×846, aspect 1.63, 21 bends, **0 edge crossings, 0 coincident connectors, 0 defects of every measured kind** — against a previous 2 crossings and a flattened gateway.

**Side-by-side review against `exple4.png` (agent review, not an approval).** Scores on the [visual benchmark](docs/visual-benchmark.md) rubric: semantic completeness 4, composition and grouping 3, flow and routing 4, typography and labels 3, assets and component grammar 3, story and emphasis 4, finish 3. All seven reach the required 3. The two 4s for flow and story reflect that the candidate has no crossings where the reference does, and carries a takeaway, focus emphasis, numbered story and flow legend that the reference has none of. The three 3s are honest: the canvas is squarer than the reference (1.63 against 2.35) because the platform services occupy one tall band where the reference uses two columns plus a lower identity band, and five vendor logos are clearly identified generic symbols rather than provider artwork, by the standing licensing decision.

**This is not a parity declaration.** The benchmark reserves approval for a maintainer record plus the user's confirmation of the overall visual bar, and states plainly that an agent's visual critique is evidence, not approval. `benchmarks/reference-cases.json` records ref-04 as `full-reconstruction — reviewed, awaiting user confirmation`.

**Quickstart golden re-baselined after visual review.** The label-anchoring fix moved both quickstart labels from on top of their connectors to clearly above them at the true route midpoint; geometry bounds are unchanged at `{ x: 0, y: 0, width: 1068.27, height: 198 }`. New SVG SHA-256: `6b87dca6546a5f7bedbe682be22217814c585a96eb5142079cfcf37830373462`. Every gallery render was regenerated and the changed ones inspected.

**Deliberate trade to record.** Revealing hidden connectors costs visible crossings. `trust-zones` went from 5 crossings with 5 hidden relationships to 13 crossings with none; `paired-regions` went from 6 crossings to 3 with none hidden. A connector drawn underneath another is not visible at all, so this is the right direction, but the crossing counts are the honest cost and are recorded per case.

**Removed rather than shipped.** A band-balancing pass that split an over-tall layer reached the reference's proportions (aspect 2.65) but cost 3–7 crossings and never won a candidate, so it was deleted rather than left in as unused machinery.

### Session record — 2026-09-19, generalization over arbitrary input

The user's requirement changed the acceptance target: the six screenshots are the quality
*bar*, not the target *set*. A compiler that looks good on six hand-written fixtures and
poor on everything else is not a usable agent tool. Two things were added to measure that
honestly.

**`pnpm benchmark:generalization [n]`** compiles a deterministic corpus of synthetic
architectures — seven graph shapes, 3–42 components, 0–3 nesting levels, varying density,
long labels, route compartments, annotations, every composition family, named and authored
themes — and reports how often output is actually clean. `benchmarks/generate-case.mts`
holds the generator so repro scripts share it. Seeds are avalanched: consecutive seeds fed
straight into a linear generator collapsed the first corpus onto a single graph shape.

**Untuned-input check.** Stripping every hand-tuned value from the ref-04 fixture (ten
`order` hints, the aspect target, the spacing pick) changed the result only slightly —
same composition, same dimensions, zero hard defects, one extra crossing. The engine, not
the tuning, is carrying that case. The residual is ordering: without a declared rank,
siblings and route compartments fall back to alphabetical-by-ID.

**Three engine bugs found by the corpus, all in our ELK adapter, none in ELK:**

- Every relationship was declared on the ELK root. ELK requires a hierarchy-crossing edge
  on the lowest common ancestor of its endpoints, and threw `UnsupportedGraphException` as
  soon as endpoints sat at different depths. **15.5% of inputs produced no diagram at all.**
- A boundary with `layout.mode: grid|pack` used ELK's `box` packer, which cannot lay out
  edges and stops the layered pass reaching boundaries below it. A boundary is now packed
  only when nothing inside it is connected to anything.
- After moving edges onto their ancestors, `fromElkGraph` still read only root-level edges
  and **silently dropped 11 of ref-04's 14 relationships** while every quality metric
  reported clean. Edges are now collected from every container.

That last bug exposed a hole in the quality model itself: nothing checked that what the
author declared actually reached the diagram. `TOP412_RELATIONSHIP_DROPPED` and
`TOP413_COMPONENT_DROPPED` are now errors and dominate the composition score, so a backend
that loses an entity can never win a candidate.

**Measured result, 200 diverse architectures.** Compile success went **84.5% → 100%**.
Free of hard geometry defects: **100%**. Free of every measured defect: 64.5%. Output is
deterministic: 0/40 sampled cases differ between two compiles of the same source.

**Where the remaining defects are — the finding that should drive the next decision.**

| Class | Total |
| --- | ---: |
| Placement (overlaps, containment, dropped entities, orthogonality) | **0** |
| Routing (coincident connectors, illegal boundary crossings, crossings) | 1,016 / 379 / 6,505 |
| Label and annotation placement | 28 / 5 |

**Placement is solved; routing is the bottleneck.** Every remaining defect is a router or
label-placement defect.

**By composition family:** topology (ELK) 97.0% fully clean, layers (ELK) 56.7%,
architecture (compiler-owned) 41.1%. The family built for ref-04 is the weakest in
general. Earlier family percentages were inflated by the dropped-edge bug. A
boundary-crossing penalty added to the compiler-owned router produced no measurable
improvement, which indicates its fixed candidate enumerator — not its cost function — is
the limit.

### Router spike — libavoid versus the compiler's own router

The generalization corpus showed every remaining defect was a routing defect, so the
engine question was narrowed to the router and settled with a measurement rather than an
opinion. `pnpm spike:router [n]` routes identical placements two ways and compares them;
`libavoid-js` is a **dev-only** dependency for this, never shipped.

**Result: do not adopt libavoid.** Three reasons, in order of weight:

1. **It cannot express nested boundaries.** `libavoid-js@0.5.0-beta.5` does not bind
   `ClusterRef`, although it exposes `clusterCrossingPenalty`. Architecture diagrams are
   made of nested regions, and without clusters libavoid scored 420 illegal boundary
   crossings against our 112 on the same placements.
2. **Licence.** libavoid is LGPL-2.1-or-later; TopoIR is MIT. Shipping it would force an
   optional peer dependency, so most consumers would not get it anyway.
3. **Cost.** 618 ms against 82 ms per diagram — 7.6× slower after our improvements.

**What the spike was worth.** libavoid demonstrated that a proper obstacle-avoiding
router reaches *zero* component and heading intersections where our candidate enumerator
had 86 and 61. That is what motivated the real fix: `obstacleRoute` was already an
orthogonal visibility-grid A* with bend penalties — the same algorithm family libavoid
uses — but it was only invoked as a last resort when every cheap candidate failed. It is
now a peer candidate scored under the same cost function, extended with corridor
occupancy so two connectors do not collapse onto one line.

Two bugs surfaced while promoting it. The search returned nothing for 10% of connectors
because an endpoint can sit inside a neighbour's inflated obstacle in a dense scene,
making it unreachable; enclosing obstacles are now dropped. Dropping them then let a
route run back across its own component, so endpoint silhouettes are explicitly protected
in both the composition router and `refineRoutes`.

| Measure (40 cases, identical placements) | ours before | libavoid | ours after |
| --- | ---: | ---: | ---: |
| Fully clean | 20.0% | 25.0% | **30.0%** |
| Component intersections | 86 | 0 | 78 |
| Heading intersections | 61 | 0 | 43 |
| Coincident connectors | 325 | 578 | **171** |
| Mean time | 26 ms | 618 ms | 82 ms |

**Effect on the real pipeline, 200 diverse architectures:**

| | Session start | Now |
| --- | ---: | ---: |
| Compiled without error | 84.5% | **100%** |
| Free of hard geometry defects | 84.5% | **100%** |
| Free of every measured defect | 56.0% | **75.5%** |
| Coincident connectors | 1,016 | **261** |

Every hard defect class — component overlaps, component intersections, endpoint
crossings, non-orthogonal segments, empty routes, dropped relationships, dropped
components, heading intersections — is now zero across the corpus. What remains is 261
coincident connectors, 28 label overlaps and 5 annotation overlaps, plus edge crossings,
which are a legibility cost rather than a defect. `pnpm check` passes 60 tests in 11 files.

### Session record — generalization to arbitrary input

Objective set by the user: the tool must produce good diagrams for *anything an agent
describes*, not just the six references. libavoid was dropped (see
[routing decision](docs/routing-decision.md)) and the compiler-owned `architecture` family
was taken from 41.1% to above 90% on the generalization corpus.

**Measured over 200 diverse synthetic architectures** (`pnpm benchmark:generalization`):

| | Session start | Now |
| --- | ---: | ---: |
| Compiled without error | 84.5% | **100%** |
| Free of hard geometry defects | 84.5% | **100%** |
| Free of every measured defect | 56.0% | **92.5%** |
| `architecture` family fully clean | 41.1% | **91.8%** |
| `topology` family fully clean | 97.0% | 98.5% |
| `layers` family fully clean | 60.0% | 86.7% |
| Coincident connectors | 1,016 | **41** |
| Label overlaps | 28 | **2** |
| Annotation overlaps | 5 | **0** |

Every hard defect class is zero: component overlaps, component intersections, endpoint
crossings, non-orthogonal segments, empty routes, dropped relationships, dropped
components, heading intersections.

**What was wrong, in the order the corpus exposed it.**

- *Notes were never anchored.* `annotation.anchor` was validated and used for view
  filtering but no layout family read it — notes were dropped in a row under the diagram.
  `placeAnnotations` now tries positions outward from the anchor and takes the first that
  collides with nothing, which is also what the references do with their callouts.
- *Labels were placed in edge order.* An easy label took the one free slot a constrained
  label needed. Placement is now hardest-first, with four clearances and eleven positions
  per segment instead of one clearance and five.
- *The repair passes ignored boundaries.* `refineRoutes` and `separateCoincidentRoutes`
  treated only boundary headings as obstacles, never the boundaries themselves, so a
  repaired connector could cut straight through a region — the single largest source of
  illegal boundary crossings. All three routing paths now share one obstacle builder.
- *Lane buckets were split by direction.* A connector arriving at a component and one
  leaving it were assigned lanes from separate sequences, so both landed on the same point
  and two relationships were drawn as one line. One sequence per component side now.
- *Padding swallowed endpoints.* Inflating a boundary by a few pixels could engulf a
  component just outside it; the router then had to drop the boundary entirely and was
  free to cut through it. `paddedClear` reduces the padding instead of discarding the
  barrier.
- *Rerouting cannot always help.* When two connectors genuinely need the same corridor,
  `nudgeCoincidentSegments` shifts an interior segment of one aside — the technique
  libavoid demonstrated — keeping both routes valid and both relationships visible.
- *A declared column never wrapped.* Forty components in one lane produced a boundary
  3,449px tall that every unrelated connector then had to cut through. Lanes now wrap past
  a legible extent.

**Performance.** One dense case took 46 seconds to compile. The grid search is the
expensive step and was being run roughly 1,800 times per diagram: nine candidates, each
re-routing every connector across three separation passes. Candidate and separation
budgets now scale with relationship count, the search is skipped when a cheap route is
already faultless, and evaluation stops at the first defect-free candidate. The corpus
went from 237s to 141s **and quality improved**, because fewer candidates also meant less
over-refinement.

**Agent-authored design (started).** The design system had 49 tokens and the agent could
express exactly one thing about it: a seven-way theme enum. `view.theme` now accepts an
authored token set that `extends` a named base, and boundaries and notes take a per-instance
`visual`, so sibling regions of the same kind can be told apart — which is how the
references separate one environment from another. Ranges are enforced by the schema.
Still outstanding from that plan: named styles, and the legibility gates (contrast,
minimum size, palette distinctness) that are meant to make the freedom safe. Until those
land, an authored design can be legal and still unreadable.

**Guarding it.** `packages/sdk/test/generalization.test.ts` compiles 16 cases from the
same generator on every `pnpm check`, requiring zero hard defects on all of them, at least
83% fully clean, and byte-identical output across two compiles of the same source. The
threshold is a floor to be raised, not a target. `pnpm check` passes **62 tests in 12
files** in 33s.

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
