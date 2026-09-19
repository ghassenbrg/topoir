# Presentation quality redesign

Status: foundation implemented; reference-quality objective remains in progress. This supersedes the prior v0.1 completion claim for the new visual-quality objective. Quality is assessed on actual output, not feature counts or passing unit tests. The user's six screenshots are the binding [visual benchmark](visual-benchmark.md).

## Reference audit

All six files in `.tmp/screenshots/` were inspected on 2026-09-19.

| Reference | Visual strengths | Compiler requirement |
| --- | --- | --- |
| exple1.jpg | Asymmetric producer / broker / consumer regions, message payloads, file shapes, two colored flows | Mixed group composition, semantic flow hierarchy, explanatory callouts |
| exple2.jpg | Three aligned repeated clusters, client screenshots, distinct remote domains | Aspect-aware assets, repeated workloads, domain alignment, secondary paths |
| exple3.jpg | Dominant request path; storage beneath compute; four trust zones | Narrative spine, semantic shapes, grouped local arrangement, attached notes |
| exple4.png | Recognizable logos, stacked pods, gateway routes, quiet identity links | Real asset resolution, stack components, multi-row detail, relationship emphasis |
| exple5.png | Vertical explanation, unequal visual weight, sketch forms, observability surround | Different visual grammars, layered composition, emphasis and intentional annotation |
| exple6.png | Paired regions, icon-led services, aligned replication links | Region comparison, icon-first components, repeated semantic structure |

Some references also have crossings, oversized empty regions, and small labels. These are not qualities to copy. TopoIR should retain their expressive range while measuring legibility and routing defects.

## Research and decisions

Primary sources reviewed 2026-09-19:

- [ELK Layered](https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-layered.html) supports compound graphs, ports and orthogonal routing. Keep it as one topology solver, with compiler-owned composition and quality selection.
- [ELK phase overview](https://eclipse.dev/elk/blog/posts/2025/25-08-21-layered.html) separates layer assignment, crossing minimization, placement and routing. Adjust the responsible stage instead of accumulating arbitrary options.
- [D2 layouts](https://d2lang.com/tour/layouts/), [icons](https://d2lang.com/tour/icons/) and [sequence diagrams](https://d2lang.com/tour/sequence-diagrams/) set a stronger baseline than Mermaid. TopoIR must offer auditable narrative intent, asset discovery and quality reports, not claim that icons or multiple engines are unique.
- [Graphviz attributes](https://graphviz.org/doc/info/attrs.html) offer mature rank/cluster controls. Retain as an alternative backend candidate; changing backend alone does not supply design reasoning.
- [Diagrams clusters](https://diagrams.mingrammer.com/docs/guides/cluster) and [custom images](https://diagrams.mingrammer.com/docs/nodes/custom) demonstrate infrastructure coverage. TopoIR should improve the authoring contract, offline vector inventory, semantic emphasis and measured composition.
- [tldraw license](https://tldraw.dev/community/license): its SDK is not a permissive open-source foundation. An interactive editor is not required for this compiler redesign.

## Architecture

Agent: intent → audience and takeaway → semantic model → view design (composition, visual language, focal entities, ordered story, annotations, asset choices).

Compiler: validate → project view → resolve assets → resolve design grammar → measure components → generate bounded composition candidates → route → refine labels/annotations → measure quality → select deterministically → build scene → SVG/PNG.

Design intent must not require coordinates. Multiple views may select different compositions and languages from one model. The core has no model API calls. Agents discover the inventory once, use narrow searches, render, inspect diagnostics and preview, then revise semantics or design intent only when useful.

## Implementation and acceptance ledger

- [x] Initial view design contract: audience, takeaway, focus/story, composition; node shape/emphasis/status/badges/replica summary. References validated.
- [x] Seven initial visual languages affecting shape, measurement, connectors, grouping, typography and icon treatment.
- [x] Topology/layers, sequence and structured domain/comparison families; bounded deterministic topology candidate evaluation and route/label refinement.
- [x] Offline SVG inventory, aliases, provenance, notices and explicit provider-art policy.
- [x] Custom SVG/PNG/JPEG/WebP discovery, metadata/search, intrinsic dimensions, safe aspect-preserving embeds and self-contained exports.
- [x] SDK/CLI/MCP discovery and agent workflow; diverse showcases and custom-asset example.
- [x] Asset/design/geometry regression tests and PNG attribution checksum/decompression checks.
- [x] Public documentation and repeatable screenshot benchmark report with per-case gaps.
- [x] Measured internal route compartments with real attachment slots: a component's declared ports are measured before layout, layout pins each connector to the compartment it is drawn against, and the renderer draws that same measured rectangle. Perturbed over 1/2/3/5 routes and long labels.
- [x] Multiple ordered asset roles per component, drawn side by side in both horizontal and icon layouts, with every drawn role attributed.
- [x] Compiler-owned `architecture` composition: containers solved bottom-up into layers and bands, boundaries placed as contiguous measured blocks, explicit sibling rank honoured as a hard constraint, unranked siblings relaxed by barycenter.
- [x] Connector lanes and corridors: endpoints sharing a component side are distributed across it, each lane turns at its own distance, and both lane orderings plus a no-lane variant are scored.
- [x] Coincident-connector detection (`TOP425`) and a separation pass for every family. All 27 example, showcase and fixture documents now measure zero coincident connectors, zero hard geometry defects and zero label or heading overlaps.
- [ ] Comparative visual approval for ref-04 confirmed by the user, then the remaining five screenshots.
- [ ] General repeated-region correspondence, narrative-spine placement, boundary portals, insets and rich illustrative sketch grammar.

The checked items establish a usable foundation. They do not complete the last two items. The `architecture` family resolved the placement gap for ref-04 — a route table is no longer crossed by its own connectors, because the composition, not the graph backend, now decides layer-internal order. ELK's `crossingMinimization.semiInteractive`, `forceNodeModelOrder` and `INTERACTIVE` were each measured first and none honoured node rank under `INCLUDE_CHILDREN`, which is why the composition is compiler-owned rather than another backend option. The banded composition has no narrative-spine or secondary-band placement yet: an off-spine sink still occupies a full band in the main stack, which is why ref-04 is squarer than its reference. Existing comparison rows align when their measured structures match; they are not a general symmetry solver. Replica badges do not instantiate workload copies. Story/focus currently emphasize the scene rather than constrain placement. The audience field guides agents rather than invoking a hidden design model.

## Critical alternative comparison

The decisions below are engineering judgments based on primary documentation, not a completed competitive performance bake-off. Before claiming superiority, render equivalent full-complexity cases in D2 and at least one model-first tool and retain versions, source and output alongside TopoIR's rubric scores.

| Alternative | Useful capability / reason to evaluate | Decision for TopoIR |
| --- | --- | --- |
| [ELK Layered](https://eclipse.dev/elk/reference/algorithms/org-eclipse-elk-layered.html) | Compound graphs, ports, labels and orthogonal routing | Keep as first macro solver. Own measured components, composition, legal crossings and quality outside it. |
| [Graphviz](https://graphviz.org/docs/attrs/splines/) | Mature layered graphs and clusters; orthogonal mode documents port/label limitations | Benchmark as an alternate backend, not an automatic replacement for a difficult ELK output. |
| [Dagre](https://github.com/dagrejs/dagre/wiki) | Small JS, renderer-independent directed layout, speed-oriented design | Useful flat-graph baseline; insufficient on its own for the reference routing/containment requirements. |
| [libavoid](https://www.adaptagrams.org/documentation/libavoid.html) | Dedicated obstacle-avoiding polyline/orthogonal connectors | Evaluate only when the current local repair fails reference routes. Native/WASM binding, redistribution terms and deployment burden need an explicit spike. |
| [D2](https://d2lang.com/tour/layouts/) | Architecture-oriented language with multiple layout engines and [sequence support](https://d2lang.com/tour/sequence-diagrams/) | Primary output benchmark. Do not build a DSL wrapper and mistake existing D2 capabilities for differentiation. |
| [Diagrams](https://diagrams.mingrammer.com/docs/guides/cluster) | Familiar infrastructure components and nested clusters | Asset/infra baseline; choose semantic documents over executable diagram programs for agent validation and diffs. |
| [Structurizr DSL](https://docs.structurizr.com/dsl) / [LikeC4](https://likec4.dev/) | Model-first architecture with derived views | Borrow model/view separation. Multiple views alone are not unique; TopoIR must demonstrate richer deterministic visual composition. |
| [tldraw](https://tldraw.dev/community/license) | Interactive drawing workflow, but SDK licensing differs from permissive OSS expectations | Not a compiler foundation; browser editing remains a separate future consumer. |

Do not introduce a second layout engine just to increase the library list. Each adapter must improve a failing fixture, retain semantic correctness and justify runtime/license cost. Constraint solving complements graph layout for alignment and regions, not as an unbounded replacement for every stage. Rust/WASM is deferred until profiling identifies a real CPU or memory bottleneck.

## Implementation-ready next work packages

Use the current package boundaries initially. Do not split routing, themes and templates into many published packages until their contracts stabilize. Estimated effort below is directional for one experienced engineer with visual review support, not a delivery promise.

### Q1 — full reference fixtures and measurable component contract (1–2 weeks)

Dependencies: current semantic/view/asset pipeline. First target: ref-04 Pockito, then ref-03.

Add a compiler-internal `ComponentPlan` containing measured content blocks, silhouette bounds, named attachment slots, ink bounds and accessibility text. A block is text, asset, badge, stack, or a constrained row/column of blocks. It is not arbitrary executable SVG. Derive the plan from semantic node kind plus visual intent before layout; render that same plan afterward so measurement and drawing cannot diverge.

Add route entries to gateway semantic data (stable ID, label/protocol, target reference) and compile them into measured internal compartments with attachment slots. Keep these distinct from infrastructure groups: a gateway compartment is not a namespace. Introduce view-scoped appearance overrides rather than duplicating the semantic model to change one view's emphasis. Generate or parity-test TypeScript types against canonical JSON Schema and add explicit migration fixtures for every alpha contract change.

Acceptance: full Pockito entity/edge inventory, three distinct gateway routes, workload stacks and at least two asset roles per workload where appropriate; no author coordinates; no scene overflow, wrong arrow direction or dropped relationships. Perturb labels, number of routes and asset aspect ratios. Add cases for long badges, diamonds/cylinders, nested actor headers and multi-edge/self-loop behavior; current basic component tests are not sufficient for those extremes.

### Q2 — architecture composition and repeated correspondence (2–3 weeks)

Depends on Q1 dimensions/attachment slots. Separate a `CompositionPlan` (regions, local orientation, row correspondence, story spine and reserved routing space) from `GeometryView` (final rectangles and paths). Introduce semantic constraints for `align`, `order`, `near`, `separate`, corresponding repeated items, and primary-story direction with documented hard/soft semantics. Infeasible hard constraints produce diagnostics; soft constraint violations are reported, never silently presented as satisfied.

Lay out internals bottom-up, then outer regions, reserve ports/corridors, and relayout only affected regions within a fixed iteration cap. Repeated rows derive shared heights from all corresponding components, so a long label or a different replica count cannot break alignment. A story spine influences placement before secondary dependencies, not merely edge thickness. Mixed orientation allows storage beneath compute inside a left-to-right request view.

Acceptance: ref-03 four unequal zones, ref-06 full regional inventory, ref-02 three unequal clusters and image clients. Validate on held-out label/node/edge perturbations to prevent fixture-specific coordinate logic. Reject named ports in unsupported composition families until they are actually implemented.

### Q3 — boundary-aware routing and visual quality refinement (2–4 weeks)

Depends on Q1/Q2. Represent edge endpoints, expected ancestor-boundary crossings, allowed portals and routing lanes explicitly. Reserve legal exits before global routing; do not treat every enclosing group as a solid obstacle. Route around unrelated components and heading/annotation ink boxes, distribute parallel links into lanes, and place labels on owned segments with finite candidates.

Use lexicographic candidate selection: semantic/constraint validity first; hard geometry defects second; legibility third; crossings, bends, aspect/whitespace and stability afterward. The current weighted score is an initial heuristic; it is not proof of optimality. Stop at a fixed candidate/refinement count, emit the best candidate's complete diagnostics, and never erase a failed required connection to improve a score. If the reference suite exposes persistent routing failures, run a bounded libavoid versus current-router spike before committing to native/WASM.

Acceptance: zero hard defects and overlapping text, no unauthorized boundary crossings, and visually traceable primary/secondary flows at reference density. Include edge/annotation intersections, sibling-group overlap, endpoint/silhouette checks and final scene clipping in the quality engine; current metrics do not cover every one of these. Record per-case bends/crossings/route length and compare against reviewed baselines rather than insisting every graph has zero crossings.

### Q4 — richer visual language and reference acceptance (1–3 weeks)

Depends on stable measured components. Add deterministic sketch silhouettes, illustrative queue/worker/storage compositions, observability surround and typography appropriate to ref-05. Extend payload/file components and anchored callouts for ref-01. Consider Rough.js or a small seeded vector grammar only after measuring actual output/bundle/license implications; no unresearched dependency choice is implied. Isometric is an optional later grammar, not a prerequisite for matching these six references.

Run the complete [review protocol](visual-benchmark.md). A maintainer records every dimension's score and the user confirms the overall quality. No reference receives approval from automatic feature counts. If one visual language remains weak, label it experimental instead of broadening the release claim.

### Q5 — reproducibility, performance and release hardening (1–2 weeks)

Depends on Q1–Q4 for a reference-quality release; evaluation alphas may precede it with explicit limits. Add a content-addressed compile context: compiler/theme/asset/font versions, normalized view hash, layout options and optional prior geometry. Never fetch remote artwork while compiling. Cache discovery, font metrics and component plans by content hash; agent calls should search narrow inventories and reuse a model across views.

Benchmark small (10), medium (100), dense (300) and stress (1,000) node workloads separately for parsing, asset resolution, measurement, placement, routing and rendering. Publish hardware/runtime details and p50/p95 after enough runs; current five-run timings are only local smoke evidence. Establish regression budgets from a measured baseline. Add worker time/memory limits and a PNG pixel budget before exposing untrusted server-side compilation.

For revision stability, pass previous geometry explicitly and quantify unchanged-node displacement plus rerouted-edge fraction on add/remove/rename fixtures. Stable sorting alone is not layout stability. Audit tarballs, dependency licenses, runtime asset/font files, Node/platform support, security limits and coordinated publication. No npm or GitHub release is authorized by completing this plan.

## Focused release and exclusions

An evaluation alpha needs schema/semantic correctness, safe assets, one polished default language, nested topology and a small set of useful composition families, SVG/PNG, CLI/SDK/MCP, repairable diagnostics and honest examples. It does not need every visual language perfected or every future format. A **reference-quality** release additionally requires Q1–Q4's benchmark gate; do not conflate the two milestones.

Defer collaborative editing, embedded models, importers beyond reliable deterministic extraction, PDF/editable formats, arbitrary code plugins, generalized insets and isometric scenes until the screenshots' requirements are met. The open-source value proposition is tested output quality plus a semantic/agent contract—not an expanding inventory of features.

## Icon licensing decision

[Devicon](https://github.com/devicons/devicon) distributes its collection under [MIT](https://raw.githubusercontent.com/devicons/devicon/master/LICENSE), with a brand-policy notice. Preserve attribution and identify logos as third-party marks; do not imply endorsement or a trademark license. [Lucide](https://lucide.dev/license) supplies generic primitives under ISC (with retained notices for inherited Feather assets).

[Kubernetes resource icons](https://github.com/kubernetes/community/blob/main/icons/README.md) explicitly offer Apache-2.0 or CC-BY-4.0. TopoIR includes the 38-entry Iconify distribution under Apache-2.0 with the full license and notices; Kubernetes trademark terms still apply. The installed inventory has 1,058 Devicon entries and 1,925 Lucide entries plus those 38 resource icons. Counts come from the pinned package data, which may include variants beyond upstream's headline icon count.

[Simple Icons](https://github.com/simple-icons/simple-icons/blob/develop/DISCLAIMER.md) explicitly distinguishes the repository's CC0 license from individual marks. Do not treat its entire catalog as automatically cleared. [Azure](https://learn.microsoft.com/en-us/azure/architecture/icons/) permits copying/distributing icons only for stated architecture/training/documentation uses and restricts transformations. [AWS](https://aws.amazon.com/architecture/icons/) permits diagram usage but does not establish unrestricted MIT-style redistribution. [Google Cloud](https://cloud.google.com/icons) provides a download, which alone is not an unrestricted redistribution license. Provider-native packs require their own reviewed terms; support user-supplied packs and clearly named generic service fallbacks where native assets are not bundled.
