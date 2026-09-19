# TopoIR target design and implementation program

Status: **design ready for implementation; implementation not started**.

Design version: 1.0, 2026-09-19. Reviewed baseline: `bc64cf2`, public document `v1alpha1`, packages `0.1.0-alpha.0`.

TopoIR will be a premium diagram design and compilation system for AI agents. Agents choose the explanation, semantic model, and visual intent. TopoIR supplies typed diagram families, coherent visual grammars, measured components, composition and routing, actionable quality feedback, stable revisions, and portable artifacts.

This directory is the implementation design for that target. All new APIs, package boundaries, schemas, commands, and gates below describe **target behavior**, unless explicitly labeled current. They must not be advertised as shipped merely because they appear here. The [review](../full-review-2026-09-19.md) is evidence about the baseline, not the target specification.

## Start here

An implementing agent should read this page, [architecture](02-architecture.md), [roadmap](09-roadmap.md), and [handoff](10-agent-handoff.md), then consult the contract documents for its first ready task. Start with `T00`; the first corrective implementation task is `T01`. Record progress in [implementation status](IMPLEMENTATION_STATUS.md).

| Document | Purpose |
| --- | --- |
| [01 — Product contract](01-product-contract.md) | User outcomes, scope, product boundaries, delivery experience |
| [02 — Architecture](02-architecture.md) | Compiler stages, ownership, interfaces, determinism, operational limits |
| [03 — Documents and semantics](03-document-contract.md) | Target envelope, identity, views, constraints, migrations |
| [04 — Components and visual grammar](04-components-and-styles.md) | Measurement, fonts, assets, silhouettes, scene and styles |
| [05 — Composition and routing](05-composition-and-routing.md) | Candidate generation, constraints, portals, routes, stability |
| [06 — Quality and evaluation](06-quality-and-evaluation.md) | Correctness gates, scoring, diagnostics, benchmark and release policy |
| [07 — Agent APIs and workbench](07-agent-api-and-workbench.md) | SDK/CLI/MCP, revisions, artifact delivery, review UI |
| [08 — Diagram families](08-diagram-families.md) | Family contracts, feature tiers, expansion and importers |
| [09 — Roadmap](09-roadmap.md) | Ordered tasks, dependencies, code locations, acceptance and verification |
| [10 — Agent handoff](10-agent-handoff.md) | Copyable implementation prompt and working protocol |
| [Decision log](DECISIONS.md) | Decisions, rationale, consequences, bounded experiments |
| [Implementation status](IMPLEMENTATION_STATUS.md) | Live execution ledger; initially all work is unstarted |
| [Target examples](examples/README.md) | Proposed architecture, process and sequence documents |

## Design authority

The user's requested outcome is authoritative. Within this directory, the product contract defines outcomes; documents 02–08 define behavior; the roadmap defines delivery order; the status file records evidence, not changes to behavior. When implementation evidence requires changing a contract, update its owning document and the decision log in the same change. Do not silently change an example or test to redefine success.

This design supersedes the architecture-only expansion direction in the existing root roadmap for the work described here. It preserves the six architecture reference cases as an acceptance suite and preserves existing stable diagnostic identities. Historical implementation claims in `PROGRESS.md` remain historical. Do not use them to mark these tasks complete.

The program is incremental. Keep the current compiler usable while replacing individual contracts. A full rewrite, runtime migration, dependency replacement, public package explosion, or hosted platform is not a prerequisite.

## Definition of the ultimate solution

1. Different reader questions lead to appropriate diagram families and structures.
2. The same facts can support multiple views without duplicated identities or invented behavior.
3. Visual variety comes from composition and grammar as well as color.
4. Every required fact and visible mark has traceable ownership and an explicit disposition.
5. Agents can discover capabilities, compare alternatives, understand defects, and revise efficiently.
6. Output remains legible at its intended size and stable under small edits.
7. Artifacts are portable, accessible, deterministic within a declared target, and accompanied by honest quality/provenance metadata.
8. Unsupported notation, impossible constraints, missing facts, and resource limits produce actionable results rather than misleading success.

## First milestone

M0 turns the review's reproduced failures into public regression fixtures and corrects content preservation, text overflow, font resolution, theme inheritance, artifact dimensions, intent discovery, and benchmark reporting. M1 then establishes the shared component contract that prevents these defects from recurring as diagram families expand. Completion is based on the gates in the roadmap, not a count of newly added features.
