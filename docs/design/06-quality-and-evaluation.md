# Quality, diagnostics and acceptance

## Distinguish valid, rendered and accepted

The V2 result has independent fields:

- `valid`: source, family semantics and required constraints are satisfiable/validated; false if these fail or could not be established.
- `completion`: `complete`, `partial`, or `failed`, covering requested views and deterministic work budget.
- `quality.accepted`: the selected scene meets the requested quality profile; false when no complete scene exists.
- `artifacts[].status`: `accepted` or `diagnostic-preview`.

An artifact can exist without acceptance. A timeout cannot return `completion: complete`. An external model/agent cannot turn a failed acceptance result into success merely by suppressing diagnostics. The legacy `ok` field retains its previous meaning during compatibility support; new clients use explicit acceptance.

## Quality profiles

| Profile | Purpose | Acceptance rules |
| --- | --- | --- |
| `draft` | Inspect/revise early layouts | Semantic preservation, finite geometry, required constraints, resolved resources and no missing required content; other visible defects remain explicit |
| `presentation` | Share with readers | Draft rules plus zero forbidden visible defects, readable target-size text, sufficient contrast, meaningful label ownership and medium fit |
| `publication` | Export fixed reviewed artifacts | Presentation rules plus requested physical/export requirements, glyph/font portability and a matching review record when the release process requires one |

Default for new v1alpha2 render requests is `presentation`. Discovery/inspection does not imply acceptance. `--profile draft` is explicit. Legacy documents retain legacy compile behavior until the caller requests a profile, but newly detected data loss and font failures remain diagnostics. Default severity and profile impact are separately declared in the diagnostic registry.

## Coverage and correctness

Maintain a coverage table from required semantic element/field IDs through projected occurrences, measured content and scene primitives. Every item is rendered, explicitly represented by a summary/detail, explicitly abbreviated under policy, or intentionally omitted as optional. Missing groups, annotations, asset roles and labels are tested alongside nodes/edges.

Family checks validate meanings such as event order, decision outcomes, cardinality markers, time positions and real containment. Source-backed facts and declared assumptions are retained, but the compiler does not claim to prove that an agent understood the source correctly. Agent evaluation uses an independent required-fact inventory.

All geometry must be finite and within declared bounds. Validate nested groups, sibling opaque regions, correct attachment sites/normals, expected portal transitions, preserved arrow direction, zero-length routes, accidental coincidence, component/label/annotation collisions, route-through-ink, mark occlusion and final scene clipping. Intentional overlaps are explicit relationships between scene owners, such as a badge within its component or a declared overlay.

## Presentation gates

Initial deterministic rules:

1. Zero missing required semantic content, unintended abbreviated required labels, unresolved fonts/glyphs/assets, nonfinite geometry or required-constraint failures.
2. Zero clipped content, invalid attachments, unauthorized boundary transitions, hidden unrelated connector segments or overlapping unrelated text.
3. Effective text size meets the medium's declared minimum after fitting. Critical connector strokes remain at least 1 output logical pixel unless a validated publication style overrides that minimum.
4. Text contrast target is at least 4.5:1; large text and essential nontext boundaries/markers target at least 3:1. These are initial product thresholds; evaluate resolved/composited colors. Critical distinctions also need labels/markers/patterns, not only color.
5. The full scene fits the requested page/viewport; an off-target auto canvas is judged at its declared display size. Aspect alone is insufficient.
6. Every visible relationship label has an owned route/leader; an unowned floating label fails.

Crossings, bends, density and whitespace are optimization criteria, not universal zero limits. Store them by family, primary versus secondary relationship, and size/density bucket. “Ink coverage” means union of final visible mark bounds or an explicitly labeled approximation; retain legacy node-rectangle occupancy under that specific name. Do not use a topology occupancy threshold to reject intentional interaction whitespace.

## Quality report and selection vector

```ts
interface QualityReportV2 {
  profile: "draft" | "presentation" | "publication";
  accepted: boolean;
  coverage: ContentDisposition[];
  constraints: ConstraintOutcome[];
  violations: QualityViolation[];
  metrics: {
    semantic: Record<string, number>;
    visible: Record<string, number>;
    readability: Record<string, number>;
    stability: Record<string, number>;
  };
  evaluatedMedium: ResolvedMedium;
  selectionVector: number[];
  humanReview?: ReviewReference;
}
```

Minimize lexicographically: (1) semantic/required-constraint failures, (2) missing content or invalid geometry/resources, (3) requested-profile violations, (4) weighted preferred-constraint shortfall, (5) family readability objective, (6) stability cost when prior layout is requested, (7) normalized route complexity, (8) stable candidate ID. The family readability objective is a documented bounded combination of primary progression, target-size legibility margin, primary crossings, density and balance; it never overrides earlier terms. Include raw components in inspection.

If a prior-layout request includes explicit preferred stability constraints, those affect term 4 as well. Required pins stay in term 1. A candidate that fails an earlier term may still be returned as a diagnostic preview, but cannot win acceptance. Use the same selection contract for topology, architecture, panels and future families.

## Diagnostic contract

Preserve existing `TOPxxx_NAME` identities. Extend the central registry rather than allocating codes in arbitrary files. Reserve `TOP5xx` for final-scene/legibility checks, `TOP6xx` for presentation constraints and family capabilities, `TOP7xx` for revisions/export/resource limits; retain current parse, semantic, asset, layout and internal-error families. Allocate exact numbers in implementation with a uniqueness test and generated docs.

A V2 diagnostic adds `stage`, `entityRefs`, `occurrenceIds`, `constraintIds`, `sceneIds`, `sourcePointers`, optional `bounds`, `profileImpact`, and `repairs`. Repair entries have operation kind, target, rationale, preconditions, expected impact and whether semantic facts would change. They are proposals; automatic compiler repair is limited to equivalent presentation changes allowed by input policy.

Diagnostics are ordered by stage, severity, stable owner and code. Do not duplicate the same violation in candidate selection and final reporting. A rendering crop uses diagnostic scene bounds and padding; it cannot change or hide the underlying full preview. If no safe repair is known, report that directly.

## Evaluation suites

| Suite | Contents | When |
| --- | --- | --- |
| Contract unit tests | Schemas, migrations, fonts, styles, component content, metrics and patches | Every PR |
| Invariant/property tests | Typed valid models, hostile geometry adapters, missing content, random perturbations | Every PR subset; full scheduled run |
| Family visual baselines | Small/medium/dense scenes and notation extremes at target size | Every rendering/layout PR; release |
| Architecture references | Complete six reference fixtures and reviewed output | Related changes; family promotion |
| Generalization corpus | Versioned deterministic inputs and held-out seeds, all supported families | PR subset and full release gate |
| Revision corpus | Label edit, new node, moved boundary, deletion, medium/style change | Every layout/API PR |
| Agent benchmark | Scoped briefs, required-fact inventories, discovery and bounded repair | Milestone and release |
| Performance/packaging | Stage p50/p95, memory, bytes, fresh package install, OS/runtime matrix | Milestone and release |

Factor the synthetic generator into one implementation. Persist failing/shrunk inputs in public fixtures rather than relying on ignored `.tmp` files. Label reports precisely: selected geometry counters, visible correctness, medium fit, and human acceptance are separate rates. An absent metric is unavailable, never silently zero.

Each family gets at least 12 curated cases across three complexity bands, 100 generated valid cases, 20 invalid-semantic cases, 10 revision cases, and 20 held-out briefs before promotion. These are initial minimum corpus sizes; increase coverage for newly discovered classes. Sequence, process and other families need their own generators, not architecture nodes with a renamed family.

## Required regression seeds and probes

Port the review's six-asset omission, long badge overflow, silent label abbreviation, invisible paint, unsupported font, empty theme inheritance, group focus, exact edge selection, detached endpoints and PNG scale metadata into public tests with minimal source fixtures. Include architecture seed 154 and the existing small quickstart to test that wrapping solves the former without damaging the latter.

Test final primitive bounds and raster output where appropriate. “Compiles without error” is not an assertion that a badge fits. Hash tests establish reproducibility, not quality; each updated visual baseline needs a reason and inspected preview.

## Human review and approval records

A review record stores case ID, input/required-inventory hash, reference hash, artifact hashes, compiler/family/style versions, medium, rubric scores, reviewer identity/role, decision and notes. Store operational review timestamps outside canonical output. Any bound hash mismatch invalidates approval. Missing private screenshots mean that case is unreviewable; they do not prevent unrelated compiler work or justify invented parity.

Rubric dimensions: semantic completeness, composition/grouping, flow/notation, typography/labels, components/assets, story/emphasis and finish. Use 0–4 anchored scores: 0 broken, 1 major repair, 2 usable draft, 3 presentation-ready, 4 exemplary. A promoted reference requires every dimension at least 3 and no deterministic gate failure. Agent critique is evidence; human confirmation is recorded only when actually obtained. The reference command reads records instead of hardcoding success or failure.

## Release and service targets

Promoted families must pass all deterministic presentation gates on their accepted corpus. Generated cases that cannot meet the requested medium must return useful unaccepted results, not false acceptance. Track successful acceptance rate separately from honest failure rate.

Proposed end-to-end product target: 90% of held-out briefs per promoted family usable within three agent revisions without manual geometry edits, with zero invented required facts in accepted results. Calibrate with reader tasks: follow the main path, identify a boundary, explain an exception, compare regions. Report disagreement between reviewers and unsupported inputs separately.

Initial performance objective on a declared reference machine: balanced-mode p95 under 5 seconds for ordinary views up to 40 drawable occurrences and 80 relationships; large models up to 200 occurrences use a separately reported envelope, with a 30-second initial target. Native raster memory and artifact bytes are measured separately. These are targets to validate, not claims about current performance.

Release verification includes Node versions supported by the repository, Linux/macOS and a Windows packaging/filename check before declaring Windows support. Reproducibility promises remain target-specific until evidence supports cross-target equivalence. Quality status is not inferred from test count or CI success alone.
