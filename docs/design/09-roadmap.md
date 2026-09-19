# Dependency-ordered implementation roadmap

## Execution rules

Start at `T00`, then implement the lowest-numbered ready task whose dependencies are complete. Prefer finishing a milestone's integration gate before broadening active work. A task is complete only when its contract, implementation, tests, relevant previews and documentation are present and the status ledger links the evidence. Design text alone completes no implementation task.

Work in reviewable slices; a task can span several changes. Do not place unrelated family implementations and low-level component changes in one large PR. Keep v1alpha1 operational through adapters. Do not rewrite packages, replace dependencies, create a hosted service or publish artifacts solely because the long-term design mentions them.

The estimates below are relative size: S = bounded fix, M = several coordinated changes, L = substantial feature/module, XL = milestone-scale work that must be split into smaller implementation slices. They are not calendar promises. The critical path is T00 → M0 corrections → component/scene contract → presentation/quality contract → narrative/routing → promoted family acceptance.

Milestone sections group delivery outcomes, not an unconditional numeric execution sequence. In particular, T26/T27 supply APIs needed by the T25 integration gate and can run as soon as their dependencies are complete. Choose ready tasks from the entire dependency graph when the current milestone is waiting on integration or external review.

Current commands: `pnpm check`, `pnpm benchmark`, `pnpm benchmark:references`, `pnpm benchmark:generalization`. New commands named by a task must be implemented/documented before another task relies on them. Use focused `pnpm exec vitest run <test-file>` during iteration; run `pnpm check` at integration boundaries. Run affected visual suites after geometry/style changes and full corpora at the specified gates, rather than repeating every benchmark after every edit.

## M0 — trustworthy baseline and immediate corrections

### T00 — establish reproducible execution baseline (S)

- Dependencies: none.
- Read: review, architecture, quality, and handoff documents.
- Work: inspect current commit/worktree and instructions; run `pnpm check`; capture current reference/generalization reports; create public minimal regression fixtures from the review inputs. Record pre-existing failures without changing expectations.
- Locations: `fixtures/review/` (new), relevant existing tests, benchmark reports under ignored `.tmp`, implementation ledger.
- Acceptance: next agent can reproduce the input scenarios without private `.tmp/full-review` files; input documents and assertions expose the failures described below. Baseline test and benchmark counts are dated and associated with a commit.
- Verify: existing full check and both quality benchmarks once; YAML/JSON fixture parse.

### T01 — preserve assets and visible text (M)

- Dependencies: T00.
- Work: render all six schema-permitted asset roles; account for distinct roles even with shared image bytes; measure badges; report label abbreviation; preserve grapheme-safe wrapping. Make narrow corrections now, with reusable logic ready to migrate to ComponentPlan.
- Locations: `core/src/measure.ts`, `renderer-svg/src/component.ts`, `schema` diagnostics/types/schema, `sdk/test/component.test.ts`.
- Acceptance: six requested roles render six owned blocks; a 48-character wide badge fits or returns actionable overflow; long required labels never silently disappear; identifiers are not changed by inserted chunk spaces. Do not “fix” the asset defect by reducing the accepted schema maximum.
- Verify: focused component/text tests, rendered probe PNGs, affected examples and `pnpm check`.

### T02 — resolve fonts and make theme inheritance compositional (M)

- Dependencies: T00.
- Work: reject/report unsupported fonts rather than measuring a different family silently; replace theme-name branches with resolved tokens; normalize/validate color values; add basic visibility/contrast diagnostics.
- Locations: `core/src/theme.ts`, `core/src/font-measurer.ts`, renderer fonts/components, asset-color resolution, schema.
- Acceptance: empty style inheritance produces the same visible result as its base; dark logo backplates remain; font measurement and render family agree; white-on-white required text is diagnosed; invalid color strings do not reach rendering silently.
- Verify: base/extended style matrix, missing-font and invisible-text probes, SVG/PNG checks.

### T03 — geometry/artifact integrity and accurate dimensions (M)

- Dependencies: T00.
- Work: add endpoint attachment/out-of-bounds checks, dropped group/annotation checks and nested/sibling region validation; distinguish PNG logical/pixel dimensions; detect output-name collisions before writes.
- Locations: `core/src/quality.ts`, `sdk/src/index.ts`, `renderer-svg/src/png.ts`, CLI artifact writing/tests.
- Acceptance: hostile adapter returning detached routes is rejected; scale-2 PNG reports actual IHDR dimensions; case-sensitive view IDs cannot overwrite each other on a case-insensitive target. Preserve legacy fields with additive explicit dimension fields until V2.
- Verify: injected bad geometry, missing objects, PNG header and multi-view collision tests.

### T04 — honest discovery and benchmark reporting (M)

- Dependencies: T00.
- Work: enumerate every existing composition in CLI/MCP discovery from one current-capability table; classify advisory/unsupported intent, including group focus, with explicit documentation/diagnostics until T12 implements it; consolidate synthetic generators; distinguish geometry counters, shape and acceptance; implement hash-bound review records and remove hardcoded parity decisions.
- Locations: MCP/CLI discovery, `benchmarks/generate-case.mts`, `generalization.mts`, `reference-quality.mts`, docs/tests.
- Acceptance: all implemented/experimental capabilities are discoverable; absent metrics fail/report unavailable rather than becoming zero; valid review records change parity status and stale hashes invalidate them; missing references remain unreviewable. Current reference status is not granted by this task.
- Verify: registry/discovery tests, benchmark summary snapshots and review-record invalidation tests.

M0 exit: T00–T04 complete, all reproduced failures fixed or explicitly diagnosed, existing supported examples remain usable, and baseline claims accurately describe measured evidence.

## M1 — shared components and complete scene

### T05 — define internal V2 component/scene interfaces (M)

- Dependencies: T01, T02, T03.
- Work: add ComponentPlan, content disposition, attachments, shaped text, semantic scene ownership and medium interfaces. Move shared scene types to core with renderer compatibility re-exports. Write architecture/process/interaction type fixtures to challenge graph-specific assumptions.
- Locations: `core/src/components/`, `core/src/scene/`, `core/src/ir.ts`, renderer type exports.
- Acceptance: no dependency cycle; one component plan can represent a gateway table, a process decision and an interaction participant. Public legacy API remains buildable.
- Verify: typecheck, dependency direction test, component-contract fixtures.

### T06 — versioned font and resource resolution (M)

- Dependencies: T02, T05.
- Work: introduce font registry, resolved face/hash/fallback chain, glyph-coverage diagnostics and immutable resolved assets. Preserve DejaVu legacy metrics. Add caching keyed by resource content.
- Locations: core font modules, assets registry, renderer font loading.
- Acceptance: layout and both exports use identical resolved resources; unknown glyphs/families are actionable; cached/uncached output is identical.
- Verify: font/glyph/resource tests, licenses retained, SVG/PNG agreement.

### T07 — implement measured block engine (L)

- Dependencies: T05, T06.
- Work: text, asset, row/column/grid/table, badge, stack and registered vector blocks; bounded width negotiation; true silhouette and ink bounds; content accounting and attachment intervals.
- Locations: `core/src/components` and dedicated tests.
- Acceptance: all legacy content can be expressed once; measured badges, table cells and multi-asset strips contain actual content; explicit ellipsis produces disposition data; no renderer reflow is needed.
- Verify: block property tests, extreme dimensions, mixed assets, glyph/baseline tests.

### T08 — migrate renderer/templates to ComponentPlan (L)

- Dependencies: T07.
- Work: migrate every current node/group/label/annotation plus title/legend; render resolved primitives only. Retain legacy visual defaults through a mapping layer.
- Locations: renderer component/build-scene, core measurement/theme adapters.
- Acceptance: geometry and drawing share attachments/silhouettes; rendering has no theme-name branching or independent wrapping; all visible authored content has scene ownership. Explain every changed golden.
- Verify: entire example/reference gallery, component raster inspection, determinism and `pnpm check`.

### T09 — final-scene QA and coverage (L)

- Dependencies: T08, T03.
- Work: validate actual ink/stroke bounds, scene clipping/occlusion, text ownership, contrast and complete content disposition. Keep family-specific intentional overlap exemptions explicit.
- Locations: `core/src/quality/scene.ts` (new), SDK result/quality assembly, tests.
- Acceptance: the long-badge, missing-role, unknown glyph, missing annotation and detached-arrow defects cannot pass presentation checks. Header/legend are evaluated with body content.
- Verify: hostile scene fixtures, raster spot checks, all existing examples with categorized diagnostics.

M1 exit: all rendering consumes measured plans; the complete scene has semantic ownership and independently verified visible-content accounting.

## M2 — versioned semantics and executable presentation

### T10 — v1alpha2 envelope and family registry (L)

- Dependencies: T04, T05.
- Work: implement the document envelope/discriminated family schema; generate authoring types; registry-backed schema/examples/capability metadata. Register architecture first and experimental process/interaction schema stubs with honest maturity.
- Locations: schema source/schema generation, `core/src/families/registry.ts`, schema tests.
- Acceptance: supplied target examples validate structurally once their body schemas land; unsupported family/version fails clearly; generated types and runtime schema cannot drift.
- Verify: schema generation drift test, valid/invalid envelope corpus.

### T11 — identities, projection, collapse and migration (L)

- Dependencies: T10.
- Work: workspace entities, provenance, occurrences, exact/induced selection, explicit relationship binding, summaries and source-pointer migration. Maintain v1alpha1 loader.
- Locations: core semantic/view modules, schema migrations, SDK migration operation, CLI later.
- Acceptance: views reuse identities without editing shared facts; exact selection is exact; duplicate endpoint occurrences require bindings; collapse has complete coverage; legacy migration preserves facts/IDs and comments where feasible.
- Verify: migration inventory equality, selection/ambiguity tests, public legacy example corpus.

### T12 — presentation plan, medium and constraints (L)

- Dependencies: T10, T11, T07.
- Work: normalize intent/medium/content policy/regions, compile hard and preferred constraints, detect contradictions and resolve audience defaults. Add explicit optional pins.
- Locations: `core/src/presentation/`, schema, constraint tests.
- Acceptance: every accepted field is executable or explicitly advisory/unsupported; group focus works; medium and effective text minimum are explicit; contradictory required order returns constraint IDs.
- Verify: each constraint type and unknown/contradictory constraints; fixed-size medium normalization.

### T13 — resolved style grammar and reusable rules (L)

- Dependencies: T08, T10, T12.
- Work: named styles, selectors, complete token precedence, variants, semantic status/focus and per-occurrence rules; migrate legacy themes through mappings.
- Locations: core style registry/resolution, schema, assets metadata, examples.
- Acceptance: style inheritance is deterministic and acyclic; equivalent empty overrides are equivalent; semantic marker/color mapping survives focus/muting; generated style previews pass scene QA.
- Verify: family/style matrix and selector precedence tests.

### T14 — V2 acceptance profiles and candidate quality vector (M)

- Dependencies: T09, T12.
- Work: valid/completion/accepted distinction, profile rules, structured diagnostics and one candidate ranking contract. Preserve legacy `ok` separately.
- Locations: core quality registry/ranking, SDK V2 result, tests.
- Acceptance: artifact existence never implies acceptance; missing metrics are not zero; all families use the same hard-rule ordering; profile failures produce diagnostic previews.
- Verify: adversarial candidate comparisons, all profile transitions, partial multi-view results.

### T15 — separate composition from ELK translation (L)

- Dependencies: T12, T14.
- Work: factor planning, placement, routing and refinement from current `composition.ts`; introduce `packages/layout` orchestration and keep `layout-elk` as adapter; supply a legacy LayoutEngine adapter.
- Locations: current layout package and new layout package, SDK imports, workspace builds.
- Acceptance: backend capabilities are explicit, unsupported hard constraints fail; no dependency cycle; current layout remains available through adapter.
- Verify: backend contract tests, all architecture fixtures, packaging/typecheck.

M2 exit: V2 contracts can represent and inspect architecture, process and interaction without forcing all semantics into a topology graph. Examples and registry agree with implemented maturity.

## M3 — strong composition and architecture quality

### T16 — primary path and supporting regions (L)

- Dependencies: T15, T12.
- Work: request-spine strategy, branch/feedback decomposition, state/supporting bands and mixed local orientation.
- Acceptance: trust-zone primary flow reads in the requested progression; Pockito gateway route order stays correct and identity has a supporting region; impossible monotonic paths are reported.
- Verify: both reference fixtures plus unequal labels/extra branches/cycles; target-size visual review.

### T17 — correspondence, wrapping and overview/detail (L)

- Dependencies: T15, T11.
- Work: shared repeated tracks, missing counterparts, banded/ELK wrapping and explicit summary/detail candidate support.
- Acceptance: three unequal regions align; seed 154 fits readable pages or returns a supported split recommendation; the small quickstart stays simple; all required facts have coverage.
- Verify: asymmetric regional corpus, pipeline sizes, summary/detail inventories and continuation labels.

### T18 — boundary portals, routing lanes and junctions (XL)

- Dependencies: T15, T07.
- Work: implement RoutePlan/attachments/portal reservation, intentional junctions/buses, capacity and obstacle routing with bounded local placement repair. Split implementation into attachment, portal, junction and routing slices. Run the documented dedicated-router experiment only if failures remain.
- Acceptance: no required relationship hidden or detached; legal boundary transitions follow ancestry; intentional sharing is distinct from accidental coincidence; difficult cycles/fan-out fail honestly if infeasible.
- Verify: routing property tests, endpoint/silhouette fixtures, dense corpus, stage performance comparison.

### T19 — distinct candidates and full-page fitting (L)

- Dependencies: T16, T17, T18, T13, T14.
- Work: finite macro shortlist, reasoned candidate reports, label/annotation placement and chrome-aware medium fitting; deterministic mode budgets and partial-deadline behavior.
- Acceptance: variants differ structurally when requested; final text size is measured after fitting; no candidate buys acceptance through silent omissions or hidden route defects.
- Verify: same facts/different questions corpus, mode determinism, candidate reports, timeout/cancellation.

### T20 — architecture promotion gate (XL)

- Dependencies: T19, T04.
- Work: finish all six semantic reference fixtures, public perturbations and full architecture acceptance corpus; obtain/record visual evidence and actual human decisions where available.
- Acceptance: deterministic gates pass on accepted artifacts; equivalent-complexity references and held-out cases meet rubric; unavailable human confirmation remains pending rather than fabricated. Implementation progress on independent families continues while review is pending.
- Verify: `pnpm check`, reference suite, full generalization, target-size gallery, performance/packaging report.

M3 exit: architecture is promoted only when T20 evidence supports it. Finishing the illustrated reference does not block T21/T23 implementation when their dependencies are ready.

## M4 — prove real diagram families

### T21 — process semantic model and validation (M)

- Dependencies: T10, T11, T12.
- Work: process schema, start/end/tasks/decisions/fork/join, lane ownership, exception transitions and source mappings.
- Acceptance: decisions/outcomes and lane semantics are validated; loops are legal; unsupported BPMN features are not advertised.
- Verify: process example, valid/invalid semantic corpus and source diagnostics.

### T22 — process components and layout (L)

- Dependencies: T21, T15, T18, T14.
- Work: flow and swimlane strategies, outcome labels, join/fork notation, subprocess invocation and family quality rules.
- Acceptance: readers can follow success and exception paths; lane boundaries do not inherit infrastructure crossing semantics; all process marks participate in scene QA.
- Verify: process visual/property/generation corpus with dense branching and long outcome labels.

### T23 — interaction event model and validation (L)

- Dependencies: T10, T11, T12.
- Work: participants, ordered/nested event tree, messages/replies, activations, notes and alt/opt/loop/par fragments.
- Acceptance: partial order, branch validity, reply binding and activation balance are checked; migration invents no events.
- Verify: interaction target example, event-tree invalid cases, provenance and temporal-order assertions.

### T24 — interaction layout and notation (L)

- Dependencies: T23, T08, T14, T15.
- Work: participant spacing, event tracks, lifelines/activations, fragment bounds, self-messages and event notes; specialized QA without global orthogonal-node assumptions.
- Acceptance: all Tier A interaction notation is readable at target size; uneven headers/long messages do not clip; nested/parallel fragments retain semantics.
- Verify: interaction visual corpus and perturbations, final-scene checks and deterministic output.

### T25 — first multi-family promotion gate (XL)

- Dependencies: T20, T22, T24, T27.
- Work: evaluate architecture/process/interaction using their separate corpus matrices, published examples, compatibility migration and installed packages.
- Acceptance: registry truthfully labels supported features; promoted families pass semantic/visual gates; v1alpha1 remains usable. This gate establishes compiler/family readiness; workbench and full end-to-end product promotion also require T32.
- Verify: all promoted-family suites, sample end-to-end agent briefs, Linux/macOS package smoke checks, documented platform envelope.

## M5 — agent workflow and stable revisions

### T26 — shared application operations and resources (L)

- Dependencies: T14, T11, T13.
- Work: V2 SDK discover/getExample/compile/inspect/compare/explain/export operations; stage-selective inspection, content-addressed resource store and compact summaries.
- Acceptance: no forced SVG render for model/view inspection; compile/compare expose quality and input fingerprints; expired handles fail predictably; stateless source input remains complete.
- Verify: SDK stage/caching/resource-lifetime tests and deterministic cached/uncached comparison.

### T27 — CLI/MCP V2 and progressive discovery (L)

- Dependencies: T26, T04.
- Work: expose implemented additive commands/tools from the shared application API, family examples, native previews, diagnostic crops and resource descriptors; update agent skill. Revision operations become discoverable only after T28; the preview command becomes available with T31. Never advertise a target command before its implementation exists.
- Acceptance: CLI and MCP agree on acceptance and diagnostics; available feature inventory is generated; failure previews are labeled; existing callers remain supported.
- Verify: CLI subprocess and MCP protocol integration, example-discovery-to-render smoke flow.

### T28 — atomic revisions and source preservation (L)

- Dependencies: T11, T26.
- Work: revision hash/preconditions, typed semantic/presentation operations, dependency-aware rename/delete, YAML/source-preserving edits, undo snapshots and invalidation output; enable the corresponding CLI/MCP operations and their discovery entries.
- Acceptance: stale writes fail; no partial transaction or implicit cascade; source facts and presentation remain distinct; formatting regeneration is reported.
- Verify: concurrency/stale revision, rename references, undo, invalid transactions and YAML-comment tests.

### T29 — prior geometry and stable local layout (L)

- Dependencies: T28, T19.
- Work: versioned prior input, changed-region detection, unchanged ordering/attachment preferences, displacement/churn metrics.
- Acceptance: label-only edits do not reorder unrelated regions; incompatible prior state is diagnosed; required constraints still win; fresh and stable modes are explicit and reproducible.
- Verify: revision corpus and target-size before/after review, fingerprint invalidation.

M5 exit: an agent can discover, render, diagnose, compare and revise a document with stable identities and bounded output. End-to-end acceptance is measured at T32.

## M6 — complete delivery and visual review

### T30 — artifact contracts, PDF/HTML and efficient delivery (L)

- Dependencies: T09, T26, T06.
- Work: manifest V2, logical/raster/physical dimensions, atomic file packages, PDF and static interactive HTML, source/coverage metadata; profile deterministic font subsetting/resource sharing.
- Acceptance: formats agree on content and dimensions; attribution/resources travel with output; HTML has text/keyboard navigation; partial export cannot appear complete. Optimize font size only if measurements prove exactness is preserved.
- Verify: PDF/PNG/SVG metadata/render checks, HTML navigation, fresh export package with no network access.

### T31 — local review workbench (XL)

- Dependencies: T27, T28, T29, T30.
- Work: local SDK service, view navigation, hit-testing/selection, quality overlays, variants, source-linked edits, pins, undo and export. Start with one view and one revision path, then add variants/history.
- Acceptance: user can point to a route defect, inspect its source, change presentation and undo it; drag creates explicit constraints; stale sessions do not overwrite source; loopback write boundaries hold.
- Verify: browser user-flow tests, keyboard navigation, stale-revision and export checks, visual inspection at different viewport sizes.

### T32 — end-to-end premium workflow gate (XL)

- Dependencies: T25, T31, T29.
- Work: held-out agent briefs, reader tasks and repair-turn accounting; stage latency/memory/bytes, cancellation/limits, packaging/platform matrix; publish honest supported envelope in docs.
- Acceptance: documented target acceptance rate is measured per family; no false-success semantic/scene failures; user correction and exports work; unmet targets remain explicit release blockers for the affected claim.
- Verify: agent benchmark, reader rubric, full checks, performance and packaged fresh-install report.

## M7 — wider catalog and extensibility

### T33 — ER and class (XL)

- Dependencies: T25, T07, T18.
- Work: attribute/method compartments, keys/cardinalities and relationship markers, field attachment routing and family schemas.
- Acceptance: semantics/markers survive layout; named field connections remain correct under long labels and dense relationships; family-specific evaluation gates pass.
- Verify: schemas, visual/invalid/generated/revision corpora and examples for each family separately.

### T34 — state and hierarchy (XL)

- Dependencies: T25, T15.
- Work: nested/parallel state and guarded transitions; rooted/balanced/radial hierarchies with explicit cross-links and collapse.
- Acceptance: nested scopes, cycles/roots and branch identity remain correct; no inherited topology rule incorrectly rejects the notation.
- Verify: independent state/hierarchy corpus gates, cross-family style and stable-edit checks.

### T35 — comparison/diff and timeline (XL)

- Dependencies: T25, T29, T17.
- Work: snapshot identity matching/property diffs, correspondence scenes; instant/relative axes, durations, lanes and milestones.
- Acceptance: renaming does not imply replacement; uncertain matches are explicit; time/duration is faithfully positioned and does not come from graph rank.
- Verify: diff inventories, time-zone/interval edge cases, visual/agent/revision suites.

### T36 — lineage and conceptual grammars (XL)

- Dependencies: T33, T17, T13.
- Work: dataset/column lineage and explicit transformations; typed sets/cycles/matrices/surrounds with rich measured illustrations.
- Acceptance: aggregation preserves derivation inventory; conceptual meaning survives styles; illustrative output has a real grammar beyond card decoration.
- Verify: full family gates plus illustrated reference and realistic explanatory briefs.

### T37 — source importers and reconciliation (XL)

- Dependencies: T28, plus the promoted target family for each importer.
- Work: Kubernetes/Compose → architecture, schema → ER, event trace → interaction, then separately scoped Terraform/OpenAPI/AsyncAPI mappings. Start with one importer per implementation slice.
- Acceptance: output includes source coverage, unsupported constructs and inferred facts; reimport preserves authored presentation and stable IDs; unrelated/sensitive source data is excluded.
- Verify: golden source-to-model inventories, unknown constructs, reconciliation conflicts and deterministic hashes.

### T38 — versioned packs and editable interoperability (XL)

- Dependencies: T32, T33, T34.
- Work: stabilize declarative style/asset/template packs, multilingual font packs and operator-installed family interfaces; implement one editable exporter with explicit loss reporting before adding others.
- Acceptance: documents cannot execute/install code; resources/versions/terms are retained; multilingual output has matched shaping and QA; editable export preserves text/identity for supported features.
- Verify: pack compatibility/security boundary tests, glyph corpus, round-trip supported-subset fixtures and loss reports.

### T39 — complete target catalog gate (XL)

- Dependencies: T32–T38; optional specialist Tier D work is excluded.
- Work: promote each Tier B/C family independently, run cross-family style/medium/agent matrix, finalize compatibility and extension policies, refresh public roadmap and handoff.
- Acceptance: every advertised feature has working semantics, discoverability, examples, quality and a supported envelope. No family is promoted only because its enum/schema exists. Remaining specialist features are explicitly scoped as future work.
- Verify: full family and end-to-end evaluation, target-platform packaging, release documentation and review records.

## Integration and change policy

- New public syntax needs a schema/type/example/test update together.
- New diagnostic codes need a central registry entry, source/owner details and a repair expectation.
- A changed golden needs inspected output and an explanation; no automatic wholesale re-baseline.
- A dependency replacement needs a measured failing case, comparative results and a decision entry.
- A task blocked on human reference review does not block independent implementation tasks. Record the exact outstanding gate.
- Shipping/publishing/deploying is separate from completing local implementation and remains governed by the user's authorization. Do not create approval rituals for ordinary reversible implementation work.
- Keep the status file current at every handoff, including failures, changed files and next ready task.
