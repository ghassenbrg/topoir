# Implementation agent handoff

## Copyable start prompt

```text
Implement the TopoIR target design in this repository, incrementally, using
docs/design/README.md as the entry point and docs/design/09-roadmap.md as the
dependency-ordered work queue.

Read the applicable repository instructions, then read:
- docs/design/README.md
- docs/design/02-architecture.md
- docs/design/06-quality-and-evaluation.md
- docs/design/09-roadmap.md
- docs/design/IMPLEMENTATION_STATUS.md
- docs/full-review-2026-09-19.md

Inspect git status and current source before relying on historical test counts.
Preserve unrelated/uncommitted work. The new APIs and examples in docs/design are
target contracts, not existing implementations. Do not present them as shipped.

Start with T00 if it is unstarted. Then implement the lowest-numbered ready task,
beginning with T01, and continue through the M0 gate before broadening the change.
Read the owning contract documents for each task. Complete local implementation,
meaningful tests, relevant rendered previews, and documentation. Do not stop at a
plan or request confirmation for routine reversible work already in scope.

Keep v1alpha1 functional. Preserve source facts and stable IDs. Never fix a quality
failure by deleting required content, weakening an assertion, silently truncating
labels, ignoring a constraint, or blindly updating golden hashes. Inspect changed
visual output and record why it improved. The compiler remains deterministic and
model-independent; calling agents may perform design planning and critique.

Use focused tests while iterating, pnpm check at integration boundaries, and the
affected visual suites for layout/style changes. T00 captures the current full
reference/generalization baseline. Full corpora are required again at the roadmap
gates, not after every small edit. Add each promised new command before relying on
it. Do not assume ignored .tmp review artifacts exist in another checkout; port
minimal regression inputs into public fixtures/tests.

Update docs/design/IMPLEMENTATION_STATUS.md whenever a task changes state and at
each handoff: task ID, status, actual files, checks/results, preview/review evidence,
remaining defects, and next ready task. If implementation evidence requires a
design change, update its owning contract and docs/design/DECISIONS.md with the
rationale; do not silently reinterpret acceptance criteria.

If a task requires human visual approval that is not available, record that gate
as pending and continue independent ready implementation work. Never fabricate
reference approval. Do not publish packages, deploy a hosted service, or start
unrelated product work unless separately authorized. Do not delegate merely
because tasks can be parallelized; follow the session's delegation rules.

At the end of the work, report completed task IDs, changed behavior, exact
verification, remaining risks/gates, and the next task. Leave a concrete, reviewable
implementation rather than only recommendations.
```

## Initial task boundary

For a bounded first implementation request, append: **“Complete T00–T04 and the M0 gate, then stop with a handoff.”** This establishes trustworthy behavior before the deeper refactor. For ongoing work, request the next milestone explicitly or continue the existing authorized scope.

The design creation task has not implemented T00–T39. The previous review ran tests and probes, but T00 still needs to establish the implementation baseline and promote the regression inputs into durable fixtures.

## First-session commands

Run from the repository root, using the configured package manager and existing dependencies:

```sh
git status --short
git log -1 --oneline
pnpm check
pnpm benchmark:references
pnpm benchmark:generalization
```

Inspect the outputs and record them; a successful command exit is not evidence of presentation acceptance. References in `.tmp/screenshots` may be absent from a fresh checkout. The public benchmark requirements still apply, but unavailable private inputs must be reported, not recreated from guesses.

## M0 reproduction checklist

Use the current document envelope `topoir.dev/v1alpha1`/`Architecture` for regression inputs so failures are not confused with unsupported target syntax.

| Probe | Minimal scenario | Required assertion |
| --- | --- | --- |
| Asset roles | One service with six distinct valid `visual.assets` | Six owned visible images or a real resolution error; no silent sixth-role loss |
| Wide badge | One service with a valid 48-character wide badge | Measured and final badge/text fit, or explicit overflow diagnostic |
| Long label | One service whose label exceeds the default two lines | Full required content or explicit policy/disposition; never silent loss |
| Invisible text | White service text and white fill | Visible-text/contrast diagnostic |
| Font mismatch | An unknown `theme.font.family` | Supported resolved fallback or explicit failure; measurement/render agreement |
| Theme inheritance | Named dark theme versus `{extends: same-theme}` | Equal visible treatment, including asset backplate |
| Group focus | Focus a real group | Group emphasis changes or unsupported intent is reported |
| Exact selection | Two relationships sharing endpoints, request one | Explicit exact mode keeps one; legacy induced mode retains its documented behavior |
| Detached route | Inject layout geometry with routes translated outside all nodes/canvas | Attachment/bounds diagnostic, not a clean quality report |
| Missing region/note | Inject geometry dropping a declared group or annotation | Coverage failure |
| PNG scale | Render scale 2 | Logical and raster dimensions are explicit and match PNG IHDR |
| Output names | Two view IDs that collide on a target filesystem | Preflight error, no overwrite |
| Ribbon | Generalization seed 154, architecture family | Preserve as future T17 regression; do not require M0 to solve macro composition |

Some corrections need the later V2 contract, notably exact-selection mode and full acceptance profiles. M0 must expose and document the limitation; it must not silently change legacy projection or claim those later tasks complete.

## Handoff record template

```text
Task: Txx — name
State: in_progress / implemented_pending_gate / complete / blocked
Baseline commit and relevant worktree changes:
Behavior implemented:
Files changed:
Verification commands and exact outcomes:
Rendered/reviewed artifacts and hashes:
Design decisions or deviations:
Remaining defects or external gate:
Next ready task and reason:
```

A task can be `implemented_pending_gate` when code is complete but its visual/corpus/review acceptance remains outstanding. Do not label it complete and bury the missing gate in notes. “Blocked” identifies a concrete dependency or missing input; difficult implementation alone is not a blocker.
