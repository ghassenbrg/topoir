# Design decisions

These decisions define the target implementation. Their selection does not mean their code is implemented. Amend with evidence when necessary; changes to public semantics require coordinated contract, example, migration and test updates.

| ID | Decision | Rationale and consequence |
| --- | --- | --- |
| D01 | Preserve and incrementally evolve the TypeScript compiler | Existing semantics, determinism, diagnostics, assets and renderer are useful; a rewrite adds risk without addressing the main product gap. |
| D02 | Use a small common kernel plus typed families | Temporal events, ER fields and process decisions retain their own semantics instead of becoming labeled service nodes. |
| D03 | Add v1alpha2 `DiagramWorkspace`; retain v1alpha1 loading | New identity/projection/presentation contracts need a clear version boundary and an explicit migration. |
| D04 | Separate entities, model elements, view occurrences and presentation regions | Reuse facts across views, support repeated details, and avoid conflating visual grouping with real containment. |
| D05 | Make presentation constraints executable and inspectable | Audience/focus/story must have defined effects; required versus preferred constraints are never silently conflated. |
| D06 | Keep coordinates unnecessary; allow explicit presentation overrides | Agents work semantically by default, while users can correct exceptional arrangements without abandoning source ownership. |
| D07 | Measure one ComponentPlan and render it without recomputation | Correctness extends through badges, fonts, assets, silhouettes and internal compartments; future components reuse one contract. |
| D08 | Resolve styles into tokens; no renderer branches on style names | Empty inheritance is equivalent and named styles compose predictably. |
| D09 | Preserve ELK as a capability-declared adapter | Compiler-owned planning supplies narrative/region behavior; alternative backends need measured justification. |
| D10 | Use macro candidates plus bounded local refinement | Structural alternatives improve explanatory variety; seed variations alone do not. |
| D11 | Evaluate the final scene and report acceptance separately | Geometric legality cannot establish content preservation, target-size readability or presentation quality. |
| D12 | Keep the compiler model-independent | Agent planning/critique is an outer workflow; core operation remains local, deterministic and testable. |
| D13 | Deterministic work budgets; wall-time cutoff is explicitly partial | Avoid hidden latency-dependent changes to canonical output while allowing responsive cancellation. |
| D14 | Prior geometry is explicit hashed input | Stable revisions are possible without process-global mutable history. |
| D15 | One SDK application layer backs CLI/MCP/workbench | Prevent capability/diagnostic drift and repeated implementation of business logic. |
| D16 | Introduce a local review workbench after scene/revision contracts | Pointing, comparison and correction are valuable; a hosted multiplayer whiteboard is not needed first. |
| D17 | Promote architecture, process and interaction first | These offer immediate value while challenging graph-centric abstractions with real semantic variety. |
| D18 | Extend with bundled families and declarative packs first | Stabilize contracts before exposing executable extension interfaces; source documents never install code. |
| D19 | SVG/PNG first, PDF/HTML next, selected editable formats later | Match near-term delivery needs and report external-format loss honestly. |
| D20 | Bind visual review to input/output/version hashes | Approval is evidence for a specific result and becomes stale when that result changes. |
| D21 | Generate authoring types and capability documentation from canonical registries | Eliminate independent enum/schema/docs lists that can drift. |
| D22 | Treat evaluation numbers as measured gates, not marketing claims | Corpus counters, visible quality, human acceptance and agent success are reported independently. |

## Bounded experiments

These experiments have an owner task and do not block earlier ready work.

| Experiment | Owner | Question | Default if evidence is inconclusive |
| --- | --- | --- | --- |
| Dedicated routing backend | T18 | Does a router such as libavoid materially improve remaining portal/obstacle cases with acceptable runtime/distribution cost? | Keep current router and expose unsupported envelope honestly. |
| Font subsetting and shared-resource export | T30 | Can artifact size drop while preserving exact glyph output, portable text and determinism? | Keep complete resolved fonts for canonical standalone export. |
| Complex-script SVG representation | T06/T38 | Which supported scripts can use SVG text with matched shaping, and which require glyph outlines? | Outline only affected runs, preserve semantic text, report editability limitation. |
| Workbench framework | T31 | Which small TypeScript UI implementation best meets selection, accessibility and local deployment requirements? | Choose the simplest maintained implementation that passes those flows; do not couple core to it. |
| Readability objective calibration | T19/T32 | Which bounded family objective best predicts reader success among already valid candidates? | Preserve raw metrics, use conservative heuristics, retain human review. |
| External editable export | T38 | Which format preserves the most requested meaning and editability for an initial supported subset? | Ship one well-tested subset with loss reports; do not promise all formats. |

## Change entry template

```text
Decision ID:
Date and task:
Previous behavior/assumption:
New decision:
Evidence and affected fixtures:
Compatibility/migration impact:
Updated contracts/examples/tests:
Remaining uncertainty:
```
