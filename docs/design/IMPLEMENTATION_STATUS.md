# Implementation status

Last updated: 2026-09-19. This file is the live execution ledger for the design program.

**Program state: in progress. Next task: T01. Current milestone: M0 (T00–T04).**

The full review previously verified `bc64cf2`: 91 tests in 15 files passed; 240/240 synthetic cases compiled without hard geometry defects; 220/240 passed the selected defect counters; six reference candidates were deterministic with no approved parity recorded. These are historical baseline observations, not evidence that the tasks below are implemented. The design-writing task added documents/examples only.

Allowed task states: `not_started`, `in_progress`, `implemented_pending_gate`, `complete`, `blocked`. A task waiting on human visual review can use `implemented_pending_gate`; record the specific gate and continue independent ready work. Keep exact commands, outcomes and artifact evidence in session entries.

| Task | Milestone | State | Evidence / blocker |
| --- | --- | --- | --- |
| T00 | M0 | complete | Baseline at `dfad55c` recorded; 12 review defects reproduced as public fixtures + `it.fails` assertions. See session entry. |
| T01 | M0 | not_started | |
| T02 | M0 | not_started | |
| T03 | M0 | not_started | |
| T04 | M0 | not_started | |
| T05 | M1 | not_started | |
| T06 | M1 | not_started | |
| T07 | M1 | not_started | |
| T08 | M1 | not_started | |
| T09 | M1 | not_started | |
| T10 | M2 | not_started | |
| T11 | M2 | not_started | |
| T12 | M2 | not_started | |
| T13 | M2 | not_started | |
| T14 | M2 | not_started | |
| T15 | M2 | not_started | |
| T16 | M3 | not_started | |
| T17 | M3 | not_started | |
| T18 | M3 | not_started | |
| T19 | M3 | not_started | |
| T20 | M3 | not_started | |
| T21 | M4 | not_started | |
| T22 | M4 | not_started | |
| T23 | M4 | not_started | |
| T24 | M4 | not_started | |
| T25 | M4 | not_started | |
| T26 | M5 | not_started | |
| T27 | M5 | not_started | |
| T28 | M5 | not_started | |
| T29 | M5 | not_started | |
| T30 | M6 | not_started | |
| T31 | M6 | not_started | |
| T32 | M6 | not_started | |
| T33 | M7 | not_started | |
| T34 | M7 | not_started | |
| T35 | M7 | not_started | |
| T36 | M7 | not_started | |
| T37 | M7 | not_started | |
| T38 | M7 | not_started | |
| T39 | M7 | not_started | |

## Milestone gates

| Gate | State | Required evidence |
| --- | --- | --- |
| M0 trustworthy baseline | in_progress | T00–T04 corrections and honest reports |
| M1 shared components/scene | not_started | Single measured contract and complete visible accounting |
| M2 versioned presentation | not_started | Schema/migration/constraints/registry and examples agree |
| M3 architecture quality | not_started | T20 corpus and actual review decisions |
| M4 multi-family compiler | not_started | T25 architecture/process/interaction acceptance |
| M5 agent revision | not_started | Shared API/discovery/transactions/prior layout |
| M6 premium workflow | not_started | T32 end-to-end, workbench, exports and performance |
| M7 target catalog | not_started | T39 all promoted Tier B/C families and extension policy |

## Session entries

### Design package creation — 2026-09-19

- Added target architecture, document/component/layout/quality/API/family contracts, roadmap, decision log and copyable implementation handoff.
- Added three proposed v1alpha2 examples. They are design fixtures, not accepted inputs for today's v1alpha1 compiler.
- Verified internal document links and Markdown code-fence balance, matched all 40 roadmap task IDs to this ledger, checked that the task dependency graph is acyclic, and parsed all three YAML examples successfully. Runtime/schema compatibility tests for v1alpha2 remain implementation work.
- No implementation task has been started. The next agent should begin T00 and preserve any unrelated worktree changes.

Append implementation sessions below with task IDs, files, verification, visual evidence, decisions, remaining defects/gates and next ready task.

### T00 — reproducible execution baseline — 2026-09-19

**Task: T00 — establish reproducible execution baseline. State: complete.**

Baseline commit `dfad55c`, clean worktree apart from the untracked `docs/design/` and
`docs/full-review-2026-09-19.md` already present at session start. No unrelated work was modified.

**Environment note.** `pnpm` is not on `PATH` in this environment; `corepack pnpm` resolves
pnpm 11.19.0. Nested workspace scripts shell out to a bare `pnpm`, so the commands below were
run with a `pnpm -> corepack pnpm` shim on `PATH`. This is an environment detail, not a repo change.

**Measured baseline at `dfad55c`, before any T00 file was added:**

| Command | Outcome |
| --- | --- |
| `pnpm check` | build + typecheck clean; **91 tests in 15 files passed** |
| `pnpm benchmark:references` | 6/6 cases deterministic with clean geometry; **0/6 reference parity** — all six report "NOT MET — documented gaps; human review required" |
| `pnpm benchmark:generalization` | 240 cases, **20 soft failures / 220 passed**; 216/240 within 3x aspect target; widest aspect **46.0:1**; mean ink coverage 12.8%; 28/240 canvases under 6% ink |

The 20 generalization failures are all soft counters: `coincidentEdgeSegments` (13 cases),
`illegalBoundaryCrossings` (7), `labelOverlaps` (1), `groupTitleIntersections` (1). No hard
geometry defects. These are pre-existing and were recorded, not changed.

**Behavior implemented.** None. T00 adds no product behavior by design. It converts the review's
private probes into public, reproducible regression inputs.

**Files added:**

- `fixtures/review/` — 11 `v1alpha1` documents plus `README.md`
- `packages/sdk/test/review-regression.test.ts` — 15 assertions over those fixtures

**Fixture inventory and what each one proves at `dfad55c`:**

| Fixture | Reproduced defect | Owning task |
| --- | --- | --- |
| `six-assets` | 6 requested asset roles, **5 images drawn**, `ok: true`, 0 diagnostics | T01 |
| `wide-badge` | 48-char badge measures 529.45px inside a 148px node and runs off both canvas edges | T01 |
| `long-label` | 124-char label rendered as `"Primary service for / account reconciliation…"`, `droppedLabels: 0`, 0 diagnostics | T01 |
| `invisible-text` | white text on white fill; node renders blank, 0 diagnostics | T02 |
| `unknown-font` | `scene.fontFamily = "Invented Font Family"` while the SVG embeds only `DejaVu Sans` | T02 |
| `theme-dark-base` / `theme-dark-extends` | named theme draws 1 asset backplate; `{extends: same-theme}` draws 0 | T02 |
| `annotated-regions` | carrier for three hostile-geometry probes (below) | T03 |
| `colliding-view-ids` | view ids `Overview` and `overview` produce 2 artifacts with 1 case-folded file name | T03 |
| `group-focus` | `design.focus` on a real group yields a byte-identical SVG with 0 diagnostics | T04, T12 |
| `shared-endpoints` | selecting `api-writes` also induces `api-reads` | T04, T11 |
| `ribbon-seed-154` | generalization seed 154 lays out at **10713 x 233 (46:1)** | T17 |

**Hostile-geometry probes** run `annotated-regions` through a custom `LayoutEngine` — a supported
public extension point — that rewrites the geometry the real engine returned:

- routes translated +100,000px off every node and off the canvas: result is still **`ok: true`**, with only an *incidental* `TOP423_ILLEGAL_BOUNDARY_CROSSING` warning. There is no attachment or bounds check.
- declared group dropped from geometry: **`ok: true`**, no coverage failure.
- declared annotation dropped from geometry: **`ok: true`**, no coverage failure.

**Assertion style.** Assertions state target behavior. Still-broken cases use vitest `it.fails`,
which passes only while the assertion genuinely fails. When an owning task lands its fix,
`it.fails` errors with "expected test to fail", forcing promotion to `it`. Two cases use plain
`it` because they record contracted behavior rather than a defect: induced edge selection
(T11 must add an exact mode without breaking induced mode) and the seed-154 ribbon shape
(M0 is explicitly not required to solve macro composition).

Each `it.fails` was verified to fail for the intended reason by running the file with
`it.fails` rewritten to `it`: 12 failed with the expected assertion messages, 2 passed. The
first draft of the detached-route probe failed with a `TypeError` from a wrong `LayoutEngine`
shape and an over-weak "any diagnostic" assertion that an incidental warning satisfied; both
were corrected before acceptance.

**Verification:**

| Command | Outcome |
| --- | --- |
| `pnpm exec vitest run packages/sdk/test/review-regression.test.ts` | 15 passed |
| inverted-probe run (`it.fails` → `it`) | 12 failed with intended messages, 2 passed |
| `pnpm check` | build + typecheck clean; **106 tests in 16 files passed** (91 baseline + 15 new) |
| fixture parse check | all 11 fixtures `validate.ok = true`, `compile.ok = true` |
| `topoir render ... --output ...` | README command verified against the real CLI |

**Rendered visual evidence** (`.tmp/review/*.png`, inspected, not merely generated):

- `six-assets.png` — five icons drawn; `devicon:kubernetes` absent with no diagnostic.
- `wide-badge.png` — badge text runs continuously across the full canvas width and past both edges.
- `long-label.png` — label truncated after `"account reconciliation…"`; 111 of 124 characters absent.
- `invisible-text.png` — node body renders as a blank white rectangle; the label is not visible.

**Design decisions.** None. No contract was changed, so `DECISIONS.md` is untouched.

**Scope notes.**

- `fixtures/review/` is a subdirectory, and `packages/sdk/test/fixtures.test.ts` uses non-recursive `readdir`, so these deliberately defective inputs are not swept into the topology matrix that asserts clean compilation. This was checked, not assumed.
- The `.tmp/full-review` artifacts happened to exist in this checkout and were used as the source of truth for the exact probe inputs. They remain ignored; the fixtures no longer depend on them.
- `fixtures/review/README.md` documents an initially wrong CLI flag that was corrected to `--output` after running the command.

**Remaining defects.** All 12 reproduced defects are unfixed by design; each is assigned above.
The 20 soft generalization failures and 0/6 reference parity are unchanged.

**Outstanding gates.** M0 gate open. No human visual review has been obtained or claimed; the six
reference cases remain at "NOT MET — human review required".

**Next ready task: T01** (preserve assets and visible text). Its dependency T00 is complete, and
its three probes — `six-assets`, `wide-badge`, `long-label` — are in place and failing as intended.
