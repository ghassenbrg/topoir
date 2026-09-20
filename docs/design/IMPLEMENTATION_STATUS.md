# Implementation status

Last updated: 2026-09-20. This file is the live execution ledger for the design program.

**Program state: in progress. M0, M1 and M2 complete. Current task: T18 (routing), then T17. Current milestone: M3 (T16–T20).**

The full review previously verified `bc64cf2`: 91 tests in 15 files passed; 240/240 synthetic cases compiled without hard geometry defects; 220/240 passed the selected defect counters; six reference candidates were deterministic with no approved parity recorded. These are historical baseline observations, not evidence that the tasks below are implemented. The design-writing task added documents/examples only.

Allowed task states: `not_started`, `in_progress`, `implemented_pending_gate`, `complete`, `blocked`. A task waiting on human visual review can use `implemented_pending_gate`; record the specific gate and continue independent ready work. Keep exact commands, outcomes and artifact evidence in session entries.

| Task | Milestone | State | Evidence / blocker |
| --- | --- | --- | --- |
| T00 | M0 | complete | Baseline at `dfad55c` recorded; 12 review defects reproduced as public fixtures + `it.fails` assertions. See session entry. |
| T01 | M0 | complete | Six asset roles, measured badges, declared abbreviation. `TOP440_TEXT_ABBREVIATED` added. See session entry. |
| T02 | M0 | complete | Resolved font contract, token-based theme inheritance, contrast and colour diagnostics. `TOP330`/`TOP331`/`TOP442` added. See session entry. |
| T03 | M0 | complete | Attachment/bounds/coverage/nesting checks, explicit raster dimensions, output-name preflight. Found and fixed a real endpoint-detaching routing bug. See session entry. |
| T04 | M0 | complete | Capability registry behind CLI+MCP, `TOP252_INTENT_NOT_APPLIED`, hash-bound review records, benchmark counter/shape/acceptance separation, generator consolidation. See session entry. |
| T05 | M1 | complete | ComponentPlan/blocks/attachments/disposition, SceneDocument and Medium in core; renderer re-exports; three-family fixtures and dependency-direction test. Interfaces only. See session entry. |
| T06 | M1 | complete | Font registry with face hashes, fallback chains and content-keyed caching; one resolved set reaches measurement, SVG and PNG; `TOP332_GLYPH_NOT_AVAILABLE`. See session entry. |
| T07 | M1 | complete | Block measurement engine, bounded width negotiation, true silhouettes and ink bounds, attachment derivation, content accounting. Not yet wired into the pipeline — that is T08. See session entry. |
| T08 | M1 | complete | All acceptance criteria met. Carried work closed: `contentLayout` is the single placement computation, plans carry populated blocks, and the renderer derives nothing itself. |
| T09 | M1 | complete | Scene QA on final ink: representation, attribution, clipping, real-backdrop contrast, disposition. Found 10 genuinely defective generated cases nothing had reported. See session entry. |
| T10 | M2 | complete | v1alpha2 envelope, family registry, generated types with a drift test. Structural validation only — it does not compile yet, and discovery says so. See session entry. |
| T11 | M2 | complete | Workspace normalization, entity identity, exact/induced selection, occurrences with required bindings, collapse coverage, v1alpha1 migration with inventory equality. v1alpha2 now compiles. See session entry. |
| T12 | M2 | complete | Presentation plan with per-field dispositions, normalized medium and audience floors, compiled constraints with contradiction detection. Boundary focus now actually works. See session entry. |
| T13 | M2 | complete | Style resolution with authored-token tracking, semantic roles surviving focus/muting, surface-aware text colour. Fixed all 9 invisible-text corpus cases with zero golden changes. See session entry. |
| T14 | M2 | complete | valid/completion/accepted separated, one gate order for all families, lexicographic candidate vector, absent metrics stay absent. Legacy `ok` preserved. See session entry. |
| T15 | M2 | complete | `@topoir/layout` orchestration with declared backend capabilities and constraint admission; `layout-elk` unchanged as an adapter. See session entry. |
| T16 | M3 | implemented_pending_gate | Slices 1–3 land: spine analysis, feedback roles, impossible-order reporting, reading order across siblings, and supporting components anchored under their owner. All three acceptance criteria met and asserted (`packages/sdk/test/progression.test.ts`). **Gate: target-size visual review** — a human audit of the slice-2 render is recorded below with 19 findings; reference parity remains 0/6 `unreviewed`. Mixed local orientation deferred to T18. See session entries. |
| T17 | M3 | not_started | |
| T18 | M3 | in_progress | Slice 1: endpoint ports honoured in the panel families. Slice 2: region arrangement search (rows *and* columns, with stretching), the exit-corridor rule, and the medium threaded into the composition score. Slice 3: routes lose the turns nothing forced, and a region's title reserves its own ink rather than the whole top band (D23). Corpus fully-clean cases 219 to 231 of 240; edge crossings across the corpus down 28%; illegal boundary crossings 26 to 4. See session entries.
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
| M0 trustworthy baseline | complete | T00–T04 complete; all 12 reproduced review defects fixed or explicitly diagnosed; 189 tests pass; benchmark claims match measured evidence. See the M0 gate entry. |
| M1 shared components/scene | complete | One measured placement computation behind both plan and drawing; full scene ownership; two-directional content accounting. See the M1 gate entry. |
| M2 versioned presentation | complete | Envelope, identities, presentation, style, acceptance and layout separation all delivered; registry and fixtures agree exactly. See the M2 gate entry. |
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

### T01 — preserve assets and visible text — 2026-09-20

**Task: T01 — preserve assets and visible text. State: complete.**

Baseline commit `39610a5` (T00). No unrelated worktree changes.

**Behavior implemented.**

1. **Every authored asset role is drawn.** `renderer-svg/src/component.ts` built its asset list by keying a `Map` on the *resolved* asset id and then taking `.slice(0, 5)`. Two defects followed: a sixth schema-permitted role was dropped outright, and two distinct roles that resolve to the same image bytes collapsed into one. The list is now built from the authored references in authored order, with no cap and no deduplication by resolved identity — matching the contract sentence "deduplication of image bytes must not deduplicate authored roles". Measurement gained `MeasuredNode.assetRoles`, one entry per authored reference; an unresolved role keeps its slot instead of closing the gap, and the existing `TOP322_ASSET_NOT_FOUND` still reports it. The `Math.min(5, ...)` strip-width cap in `measure.ts` was raised to match. The schema maximum of six was not reduced.

2. **Badges are measured before layout.** Only the badge strip's 24px height was reserved; its width was never measured, so a schema-valid 48-character badge was drawn about 3.5x wider than its node and ran off both canvas edges. `MeasuredNode.badgeText` is now a real `MeasuredText` produced with the same style the renderer draws at (`BADGE_STYLE`), the node's width accounts for it, and the renderer draws the measured lines rather than re-deriving the string. A badge wider than `BADGE_MAX_WIDTH` (260px) wraps rather than growing the node to ~530px and distorting every layout around it.

3. **Abbreviation is declared, not inferred.** `MeasuredText` gained `source`, `disposition` (`rendered` | `abbreviated`) and `omittedGraphemes`. New `core/src/content.ts` turns every `abbreviated` disposition into `TOP440_TEXT_ABBREVIATED`, naming the owner, the content role, the drawn text and the exact character count not drawn, plus view metrics `abbreviatedTextRuns` and `omittedGraphemes`. This follows `04-components-and-styles.md`: abbreviation is a legal outcome but must be *declared by measurement* rather than inferred later from a missing primitive. The drawing of an over-long label is deliberately unchanged; what changed is that the loss is now reported.

4. **Word splitting cannot rewrite an identifier.** `layoutText` flattened over-wide words into chunks and then rejoined pieces with a space, relying on a chunk happening to be too wide to share a line. Pieces now carry a `continues` flag, so a fragment split out of the middle of a word is never rejoined with an inserted space. Probed at baseline: the old code did not in fact corrupt any identifier tested, so this is hardening against a latent defect, not a fix for an observed one. It is asserted for identifiers, ARNs, URLs and grapheme clusters.

**Files changed:**

- `packages/core/src/ir.ts` — `TextDisposition`, `MeasuredText.source`/`disposition`/`omittedGraphemes`, `MeasuredAssetRole`, `MeasuredNode.badgeText`/`assetRoles`
- `packages/core/src/measure.ts` — asset roles, badge measurement, `Piece`-based splitting, disposition, `BADGE_STYLE`/`BADGE_MAX_WIDTH`/`BADGE_MAX_LINES`
- `packages/core/src/content.ts` (new) — `analyzeContent`
- `packages/core/src/index.ts` — export `content.js`
- `packages/renderer-svg/src/component.ts` — role-keyed asset list, measured badge drawing
- `packages/schema/src/diagnostics.ts` — `TOP440_TEXT_ABBREVIATED`, `TOP4xx` family description
- `packages/sdk/src/index.ts` — run `analyzeContent`, merge its diagnostics and metrics
- `packages/core/test/content.test.ts` (new) — 14 measurement-level assertions
- `packages/sdk/test/review-regression.test.ts` — three probes promoted from `it.fails` to `it`
- `docs/diagnostics.md` — content diagnostics section
- `examples/rendered/showcase/paired-regions.png` — regenerated, reason below

**Probes promoted from `it.fails` to `it`** (the T00 mechanism worked as designed — each one began erroring with "expected test to fail" once fixed):

- `draws one owned image per requested asset role` — 6 requested, 6 drawn
- `keeps a schema-valid wide badge inside the node that owns it`
- `never abbreviates a required label without saying so`

Two of those assertions were rewritten while being promoted, and both became **stricter**, not weaker:

- The badge assertion was `measured.width >= singleLineBadgeWidth`, which wrapping cannot satisfy and which does not actually test containment. It now asserts the measured badge's disposition is `rendered`, that its drawn lines rejoin to exactly the authored badge, and that the drawn glyph run sits inside the canvas. This is the assertion the review asked for: the old badge test "asserts successful compilation and geometry metrics, not actual text containment".
- The label assertion forbade an ellipsis outright, which is stricter than the owning contract. It now asserts what the contract requires: if content was lost, measurement declares it, the diagnostic names the node, and the reported character count is truthful.

**Verification:**

| Command | Outcome |
| --- | --- |
| `pnpm exec vitest run packages/core/test/content.test.ts` | 14 passed |
| `pnpm exec vitest run packages/sdk/test/review-regression.test.ts` | 15 passed |
| `pnpm check` | build + typecheck clean; **120 tests in 17 files passed** (106 before T01) |
| `pnpm benchmark:generalization` | 240 cases, **20 soft failures / 220 passed**, 216/240 aspect, widest 46.0:1, ink 12.8% — byte-for-byte the same cases and counts as the T00 baseline |
| `pnpm benchmark:references` | 6/6 deterministic and clean; parity still 0/6 "NOT MET — human review required" |

**Measured output evidence** (`.tmp/review/t01-*.png`, inspected):

- `t01-six-assets.png` — all six icons drawn; the Kubernetes helm that was previously dropped is present.
- `t01-wide-badge.png` — the 48-character badge wraps to three lines entirely inside its node. Node 277.7 x 91.5 holds a 253.7px badge; `disposition: "rendered"`, and the drawn lines rejoin to the authored badge exactly.
- `t01-long-label.png` — the drawing is unchanged, which is correct, but the result now carries `TOP440_TEXT_ABBREVIATED`: "74 of 112 characters are not drawn", and `labelText.disposition` is `abbreviated`.

**Changed golden: `examples/rendered/showcase/paired-regions.png`.** Inspected and explained, not re-baselined wholesale. All 11 top-level example renders and 8 of 9 showcase renders are byte-identical to the committed goldens. The six showcase files that use `visual.badge` or `visual.replicas` initially differed because the first draft of the badge drawing moved the single-line baseline 3px; that was an unintended fidelity regression and was corrected so a one-line badge keeps exactly its previous strip and baseline. After that correction only `paired-regions` differs, for one specific reason: its `dns` node was 120.47px wide with a badge strip inner width of 96.47px holding 97.77px of "HEALTH ROUTING" text — a 1.3px overflow of the strip. The node is now 121.77px, so the strip exactly contains its own text. Canvas dimensions are unchanged at 1063x1661. The regenerated image was inspected.

**Pre-existing finding, not caused by T01: `examples/rendered/showcase/custom-assets.png` is stale.** It differs from what the compiler produces both before and after this change (same 785x555 dimensions, 41660 vs 41564 bytes), and T01 does not alter its output at all. It was left alone rather than silently re-baselined, because the command and flags that produced the committed file are not recorded anywhere in the repository. There is no automated check that would have caught this, which is the underlying issue.

**Design decisions.** No contract changed, so `DECISIONS.md` is untouched. `BADGE_MAX_WIDTH = 260` is an implementation constant, not a contract: it bounds component growth while keeping the whole badge visible, and the schema's 48-character maximum is unchanged.

**Remaining defects.** Nine of the twelve T00 probes are still failing by design and remain assigned: invisible text and font resolution and theme inheritance (T02); detached routes, dropped group, dropped annotation, PNG raster dimensions and colliding output names (T03); group focus (T04/T12). The 20 soft generalization failures and 0/6 reference parity are unchanged.

**Outstanding gates.** M0 gate still open. No human visual review obtained or claimed.

**Next ready task: T02** (resolve fonts and make theme inheritance compositional). Its dependency T00 is complete, and its three probes — `invisible-text`, `unknown-font`, `theme-dark-base`/`theme-dark-extends` — are in place and failing as intended.

### T02 — resolve fonts and make theme inheritance compositional — 2026-09-20

**Task: T02 — resolve fonts and make theme inheritance compositional. State: complete.**

Baseline commit `b11e68b` (T01). No unrelated worktree changes.

**Behavior implemented.**

1. **Font selection is a resolved contract.** `font.family: Invented Font Family` was accepted, the scene declared that family, measurement quietly used the bundled DejaVu Sans, and the SVG embedded only DejaVu Sans — three different answers. New `core/src/fonts.ts` resolves a requested family against what the compiler can both measure and embed, matching case-insensitively and accepting a CSS-style stack so `"Inter", "DejaVu Sans", sans-serif` resolves to its first supported entry. `resolveTheme` now puts the *resolved* family on the theme, so the scene, the layout metrics and the embedded faces cannot disagree. A substitution is reported as `TOP330_FONT_UNAVAILABLE` (warning), naming what was asked for, what was used and what is available. This is the narrow form; T06 owns the versioned registry with face hashes and glyph coverage.

2. **Theme inheritance is compositional.** The renderer decided three visual treatments by comparing `theme.id` against hardcoded theme names. An extension resolves to the id `dark-engineering+authored`, which matched none of those branches, so `{extends: dark-engineering}` silently lost the asset backplate its base had. The three decisions are now resolved tokens on `theme.language` — `depthFill`, `accentBar`, `assetBackplate` — set per theme and merged like every other token. No `theme.id` comparison remains in the renderer. The tokens are internal; T13 owns the public style grammar, so no new authoring syntax was added.

3. **Colour is normalized and validated.** The schema's colour pattern `^(#[0-9A-Fa-f]{3,8}|[a-zA-Z]+)$` admits strings that are not colours: five- and seven-digit hex values, and any run of letters. New `core/src/color.ts` parses 3/4/6/8-digit hex and a fixed set of colour names, canonicalizes to `#RRGGBB(AA)`, and reports anything else as `TOP331_COLOR_INVALID` (error). An unrecognized value is left untouched rather than replaced by a guess, because substituting one would paint something the author did not choose. Normalization is applied through a paint-specific `stripPaint`, deliberately not the general `strip`: `font.family` is a string that must never be read as a colour, or a family legitimately named "red" would become `#FF0000`. That case is asserted.

4. **Unreadable paint is diagnosed.** New `core/src/visibility.ts` computes the WCAG 2.1 contrast ratio between each text colour and the fill behind it and reports `TOP442_TEXT_NOT_LEGIBLE` (error) below 3:1, naming both colours and the measured ratio. Only paint the view actually uses is examined — a theme entry for a component kind absent from the view says nothing about that drawing, and reporting it would train callers to ignore the diagnostic. The gate is WCAG's large-text bound rather than the 4.5:1 normal-text bound, because diagram labels are drawn at a range of sizes and the compiler should catch paint nobody can read without rejecting deliberately soft secondary text. Every built-in theme passes its own gate; that is asserted, not assumed.

**Files changed:**

- `packages/core/src/fonts.ts` (new) — `resolveFont`, `fontDiagnostic`, `SUPPORTED_FONT_FAMILIES`
- `packages/core/src/color.ts` (new) — `parseColor`, `normalizeColor`, `contrastRatio`, `composite`, thresholds
- `packages/core/src/visibility.ts` (new) — `analyzeVisibility`
- `packages/core/src/theme.ts` — semantic tokens on `language`, resolved font family, `stripPaint`
- `packages/core/src/index.ts` — export the three new modules
- `packages/renderer-svg/src/component.ts` — token-driven depth plate, accent bar and asset backplate
- `packages/schema/src/diagnostics.ts` — `TOP330_FONT_UNAVAILABLE`, `TOP331_COLOR_INVALID`, `TOP442_TEXT_NOT_LEGIBLE`
- `packages/sdk/src/index.ts` — run `analyzeVisibility`, report font substitution, merge metrics
- `packages/core/test/style.test.ts` (new) — 29 assertions
- `packages/sdk/test/review-regression.test.ts` — three probes promoted from `it.fails` to `it`
- `docs/diagnostics.md` — font, colour and legibility rows

**Probes promoted from `it.fails` to `it`:**

- `diagnoses text that cannot be read against its own fill` — now asserts the specific code, error severity, that the message carries both colours and the 1:1 ratio, and that `ok` is false.
- `measures, declares and embeds the same font family` — now asserts the scene's family is actually among the embedded faces *and* that the substitution is reported.
- `gives an empty theme extension the same visible treatment as its base` — **strengthened well past its original form.** It previously compared backplate counts between two different fixture documents. It now builds both documents from one source string so the only difference is how the identical theme is referenced, and asserts the two SVG artifacts are **byte-identical by sha256**. An empty override changes no visible mark at all.

**Verification:**

| Command | Outcome |
| --- | --- |
| `pnpm exec vitest run packages/core/test/style.test.ts` | 29 passed |
| `pnpm exec vitest run packages/sdk/test/review-regression.test.ts` | 15 passed |
| `pnpm check` | build + typecheck clean; **149 tests in 18 files passed** (120 after T01) |
| `pnpm benchmark:generalization` | 240 cases, **20 soft failures / 220 passed**, 216/240 aspect, widest 46.0:1, ink 12.8% — identical cases and counts to the T00 baseline |
| render comparison | **all 11 example renders and all 9 showcase renders byte-identical** to the committed goldens |

That last row is the main evidence for the theme refactor: replacing three theme-name branches with resolved tokens reproduced every existing drawing exactly, byte for byte, while making an empty extension equal to its base. No golden was changed by T02.

**Probe behavior confirmed:**

- `invisible-text` — `ok: false`, one `TOP442_TEXT_NOT_LEGIBLE`: `service` label `#FFFFFF` on `#FFFFFF`, ratio 1:1.
- `unknown-font` — scene font `DejaVu Sans`, embedded `DejaVu Sans`, one `TOP330_FONT_UNAVAILABLE` naming `Invented Font Family`.
- `theme-dark-base` and `theme-dark-extends` — both draw 1 asset backplate, where the base drew 1 and the extension drew 0.

**Design decisions.** No contract changed, so `DECISIONS.md` is untouched. Two implementation choices worth recording, neither of which is contract text:

- `MINIMUM_TEXT_CONTRAST = 3` is WCAG's large-text bound, not the 4.5:1 normal-text bound. Rationale above.
- The recognized colour-name set is the small practical list rather than the full CSS list, so a typo is reported instead of silently painting a colour the author did not choose.

**Remaining defects.** Six of the twelve T00 probes remain, all assigned: detached routes, dropped group, dropped annotation, PNG raster dimensions and colliding output names (T03); group focus (T04/T12). The 20 soft generalization failures and 0/6 reference parity are unchanged. `examples/rendered/showcase/custom-assets.png` is still stale from before T01 and still untouched.

**Outstanding gates.** M0 gate still open. No human visual review obtained or claimed.

**Next ready task: T03** (geometry/artifact integrity and accurate dimensions). Its dependency T00 is complete, and its five probes are in place and failing as intended.

### T03 — geometry/artifact integrity and accurate dimensions — 2026-09-20

**Task: T03 — geometry/artifact integrity and accurate dimensions. State: complete.**

Baseline commit `bf63dcf` (T02). No unrelated worktree changes.

**Behavior implemented.**

1. **Routes must meet what they connect.** `analyzeGeometry` had no attachment contract at all: the review translated every route point 100,000px away and got no attachment diagnostic. `TOP426_EDGE_ENDPOINT_DETACHED` now checks each route's first and last point against the attachment surfaces that are actually legal — the component itself, any of its declared ports, or, in a sequence, the participant's lifeline. The tolerance was not guessed: measuring the example and fixture corpus gave a clean bimodal distribution of exactly 0px (52 endpoints) and exactly 4px out of a port (20 endpoints), never anything between, because ELK declares ports as 8x8 boxes offset outside the node. Sequence is handled as a different attachment surface rather than an exemption, so a sequence message still has to land on the lifeline it claims.

2. **Declared boundaries and notes cannot vanish.** Coverage existed for components and relationships but not for groups or annotations, so geometry with every group or every annotation missing was reported as clean. `TOP415_REGION_DROPPED` and `TOP416_ANNOTATION_DROPPED` close that.

3. **Nothing may be drawn outside the canvas.** `TOP417_GEOMETRY_OUT_OF_BOUNDS` covers components, boundaries, annotations and route points. A mark outside the declared canvas is cropped at export with no trace in the result, which is indistinguishable from never having drawn it.

4. **Regions nest or sit apart.** `TOP418_REGION_OUTSIDE_PARENT` for a child boundary escaping its parent, `TOP419_REGION_OVERLAP` for unrelated boundaries where one contains the other. Ancestry is excluded, because containment is what nesting looks like.

5. **Logical and raster dimensions are separate, explicit fields.** At scale 2 the result reported 360x226 while the PNG header said 720x452. Artifacts and manifest entries now carry `logicalWidth`/`logicalHeight`, `pixelWidth`/`pixelHeight` and `scale`. Raster dimensions are read back from the encoded PNG's IHDR rather than computed, because deriving them from the scene and the requested scale would reintroduce the exact disagreement the fields exist to prevent. `width`/`height` keep their old logical meaning for existing callers, as the task required. `scale` carries the requested zoom rather than a derived one: the rasterizer rounds to whole pixels, so a 372.67px scene at scale 2 encodes as 745 and a derived value reports 1.999.

6. **Output names are checked before anything is written.** `TOP121_OUTPUT_NAME_COLLISION` is a preflight: two view ids that map to one file name stop compilation before any artifact exists, so neither can overwrite the other. Distinct names are unaffected, which is asserted.

**A real routing bug the new checks found, and fixed.**

`nudgeCoincidentSegments` in `layout-elk/src/composition.ts` documents that "only interior segments move, so neither route leaves its endpoints". It did not honor that: it shifted `points[index - 1]`, and at `index === 1` that is `points[0]` — the endpoint anchored to its component. A guard existed but only covered routes of three points or fewer. Generated case 6 produced a connector starting exactly `step` (11px) clear of its source, reading as an arrow floating in space. The loop now starts at index 2, so only genuinely interior segments move.

This is recorded as a fix, not a tolerance change. Widening the attachment tolerance to 11px would have hidden it.

**Files changed:**

- `packages/core/src/quality.ts` — six new checks, `distanceToAttachment`, `withinBounds`, `isRelatedGroup`, six new metrics
- `packages/layout-elk/src/composition.ts` — the nudge no longer moves route endpoints
- `packages/sdk/src/index.ts` — explicit dimension fields, PNG IHDR read-back, output-name preflight
- `packages/schema/src/diagnostics.ts` — `TOP121`, `TOP415`–`TOP419`, `TOP426`
- `packages/core/test/integrity.test.ts` (new) — 13 assertions against hand-built hostile geometry
- `packages/sdk/test/review-regression.test.ts` — five probes promoted, two new artifact assertions, one new routing regression
- `docs/diagnostics.md` — new codes, the collision preflight, and an artifact-dimensions section

**Probes promoted from `it.fails` to `it`:** detached routes, dropped group, dropped annotation, PNG raster dimensions, colliding output names. Three assertions were strengthened while being promoted: the PNG case now also asserts the logical fields are *not* the raster ones, that the legacy fields keep their old meaning, and that the manifest agrees with the artifact; the collision case now asserts the specific code, error severity, and that **no artifacts were produced at all**; two new cases assert that an SVG does not invent raster dimensions and that non-colliding names still compile.

**Verification:**

| Command | Outcome |
| --- | --- |
| `pnpm exec vitest run packages/core/test/integrity.test.ts` | 13 passed |
| `pnpm exec vitest run packages/sdk/test/review-regression.test.ts` | 18 passed |
| `pnpm check` | build + typecheck clean; **165 tests in 19 files passed** (149 after T02) |
| render comparison | **all 11 example and all 9 showcase renders byte-identical** — the endpoint-detaching nudge never fired on a published example |
| `pnpm benchmark:references` | 6/6 deterministic and clean; parity still 0/6 "NOT MET — human review required" |
| `pnpm benchmark:generalization` | 240 cases, **20 soft failures / 220 passed** — same 20 cases as baseline; 216/240 aspect; widest 46.0:1; canvases under 6% ink improved 28 → 27 |

**The routing fix was verified to be load-bearing** by reverting it and rerunning the new regression test, which failed with `seed 6: expected 1 to be +0`. The fix was then restored.

**An honest trade to record.** Within the 20 still-failing generalization cases, `coincidentEdgeSegments` counts went *up*: case-0203 13 → 26, case-0211 5 → 9, case-0181 4 → 7, case-0177 3 → 6, case-0206 1 → 3, case-0043 2 → 3, case-0006 1 → 2. `illegalBoundaryCrossings` fell in two of the same cases, notably case-0203 4 → 0. This is the direct consequence of the routing fix: the nudge pass had been lowering coincidence counts by detaching connectors from their components. Those separations were not real, so the counts they produced were not real either. The set of failing cases, the pass/fail total and the hard-defect count are all unchanged. Legitimately separating those corridors needs rerouting with junction and capacity handling, which is **T18**, not a wider tolerance here.

**Design decisions.** No contract changed, so `DECISIONS.md` is untouched. Implementation constants: `ATTACHMENT_TOLERANCE = 6` is derived from the measured corpus distribution above, not chosen; `TOP419_REGION_OVERLAP` reports only full containment of an unrelated region, leaving edge-touching to existing overlap reporting so it does not become noise.

**Remaining defects.** One of the twelve T00 probes remains: group focus, assigned to T04 for honest classification and T12 for implementation. 0/6 reference parity unchanged. `examples/rendered/showcase/custom-assets.png` is still stale from before T01 and still untouched.

**Outstanding gates.** M0 gate still open pending T04. No human visual review obtained or claimed.

**Next ready task: T04** (honest discovery and benchmark reporting), the last M0 task. Its dependency T00 is complete and its `group-focus` probe is in place and failing as intended.

### T04 — honest discovery and benchmark reporting — 2026-09-20

**Task: T04 — honest discovery and benchmark reporting. State: complete.**

Baseline commit `ae1ad41` (T03). No unrelated worktree changes.

**Behavior implemented.**

1. **One capability registry behind every discovery surface.** MCP design discovery was a hand-maintained literal listing five compositions while the schema accepted seven; it omitted `architecture` — the default for system diagrams — and `architecture-map`, both implemented. New `core/src/capabilities.ts` is the single table, and both the MCP `topoir://docs/design` resource and a new `topoir capabilities` command are generated from it. A test holds the advertised composition list against the schema's own enum **in both directions**, so a composition cannot be added to the schema without appearing in discovery, and cannot be advertised without existing in the schema.

2. **Maturity is stated, and `advisory` is distinguished from `unsupported`.** Every capability declares `implemented`, `experimental`, `advisory` or `unsupported`. The distinction is deliberate: advisory metadata such as `design.audience` is doing its job when it changes nothing, whereas unsupported intent is a gap the caller is entitled to know about. Anything not yet implemented must name its owning task, which a test enforces.

3. **Accepted-but-inert intent is reported.** Focusing a group produced a byte-identical SVG with no diagnostic, so a caller could not tell "applied" from "ignored" without diffing two drawings. `TOP252_INTENT_NOT_APPLIED` names the view and every unapplied boundary. Focusing a *component* is implemented and is deliberately not reported — asserted, so the fix cannot degenerate into warning about all focus.

4. **Reference parity is a decision procedure, not a constant.** The benchmark wrote the literal string `"NOT MET — documented gaps; human review required"` for every case and set `process.exitCode = 1` unconditionally under `--require-parity`. That is honest about the present state but it is not a *mechanism*: recording a genuine human approval could not change it, and a regression could not be caught by it. New `benchmarks/review-records.mts` derives parity from `benchmarks/reference-reviews.json`, where each record binds one human decision to the sha256 of the exact reference image and candidate it was made against. Status is now `approved`, `rejected`, `stale`, `unreviewed` or `unreviewable`, each with a reason. Only `approved` counts. A regenerated candidate invalidates its record automatically, so an approval can never be carried forward onto a picture nobody looked at.

5. **Geometry counters, shape and acceptance are reported separately.** The generalization report now states "free of hard geometry defects", "free of every measured defect" and "within 3x of the requested shape" as three different numbers, followed by an explicit statement that **none of them is presentation acceptance**. The reference report separates `cleanGeometry` from `shapeOnTarget` for the first time, which immediately surfaced that `ref-05-conceptual-sketch` is off-target — information the old single flag hid.

6. **An absent metric is unknown, not zero.** Both benchmarks folded missing counters in as `?? 0`, so an unimplemented or removed check would have read as a clean result. A missing counter is now recorded as unavailable and the report says so in the table and in a callout. Verified by temporarily adding a counter name the compiler does not emit: it printed `unavailable — not reported by the compiler` rather than `0`.

7. **One synthetic generator.** `benchmarks/generalization.mts` carried a private, byte-identical copy of `rng` and `build` alongside `benchmarks/generate-case.mts`. They agreed today, but the corpus the benchmark measured and the corpus the test suite asserted against could have drifted apart without either noticing. 8,188 characters of duplication removed; the benchmark now imports the shared generator, and case-0006 reproduces identically.

**Files changed:**

- `packages/core/src/capabilities.ts` (new) — the registry, `intentDiagnostics`, `schemaCompositions`
- `packages/core/src/index.ts` — export it
- `packages/sdk/src/index.ts` — run `intentDiagnostics`
- `packages/cli/src/index.ts` — `topoir capabilities` plus help and per-command usage
- `packages/mcp/src/index.ts` — design inventory generated from the registry
- `packages/schema/src/diagnostics.ts` — `TOP252_INTENT_NOT_APPLIED`
- `benchmarks/review-records.mts` (new), `benchmarks/reference-reviews.json` (new, **empty**)
- `benchmarks/reference-quality.mts` — real parity, counter/shape separation, unknown-vs-zero
- `benchmarks/generalization.mts` — shared generator, new counters, unknown-vs-zero, three-way reporting
- `packages/core/test/capabilities.test.ts` (new), `packages/sdk/test/review-records.test.ts` (new)
- `packages/cli/test/cli.test.ts`, `packages/mcp/test/mcp.test.ts` — both surfaces asserted against the registry
- `docs/cli.md`, `docs/diagnostics.md`, `docs/visual-benchmark.md`

**The last T00 probe resolved.** `either applies group focus or reports it as not applied` is promoted to `it`. Its shape was corrected while being promoted: the original ended with an unconditional `expect(focusedSvg).not.toBe(unfocusedSvg)`, which demands T12's implementation work from T04 and leaves the honesty gap — the thing T04 actually owns — untested. It is now the genuine disjunction the contract states, with the unapplied branch asserting the specific code, the named view, the named boundary, and that an unfocused document does *not* carry the diagnostic. A second case asserts component focus is not reported.

**No fabricated approval.** `benchmarks/reference-reviews.json` contains zero records, and `packages/sdk/test/review-records.test.ts` asserts that it does, so a fabricated approval cannot be committed without deliberately editing that expectation. The record mechanism itself is verified by unit tests over `parityOf`: a valid record approves, a rejection stays a rejection, a changed candidate or a changed reference goes stale, one case's record cannot approve another, and only `approved` satisfies `parityMet`.

**Verification:**

| Command | Outcome |
| --- | --- |
| `pnpm check` | build + typecheck clean; **189 tests in 21 files passed** (165 after T03) |
| `pnpm benchmark:references` | 6/6 deterministic and clean; **approved 0/6**, all six `unreviewed` with the reason stated; `ref-05` newly shown as `shapeOnTarget: false` |
| `pnpm benchmark:generalization` | 240 cases; hard defects 0/240; every measured defect clean 220/240 (91.7%); within 3x of requested shape 216/240 (90.0%); **all five new T03 counters total 0 across the corpus** |
| render comparison | all 20 example and showcase renders byte-identical |
| unknown-metric probe | a counter the compiler does not emit prints `unavailable`, not `0` |

The five T03 counters reading 0 across 240 generated cases is independent evidence that the new integrity checks do not false-positive on ordinary output.

**Design decisions.** No contract changed, so `DECISIONS.md` is untouched. One judgement worth recording: `topoir capabilities` was added as a new command rather than extending `topoir styles`, because styles returns visual-language metadata for one capability kind and the registry covers four. The roadmap's rule that a promised command must exist before anything relies on it is satisfied — the command, its help text, its documentation and its tests landed together.

**Remaining defects.** All 12 reproduced review defects are now fixed or explicitly diagnosed. Two carry a deliberate partial resolution, recorded rather than hidden: boundary focus is *reported* but not *applied* (T12), and edge selection remains induced-only, with a contract-record test pinning the behavior until T11 adds an exact mode. `examples/rendered/showcase/custom-assets.png` remains stale from before T01 — a pre-existing discrepancy T01–T04 do not affect and did not silently re-baseline.

### M0 gate — trustworthy baseline — 2026-09-20

**Gate: M0. State: complete.**

Exit criterion: "T00–T04 complete, all reproduced failures fixed or explicitly diagnosed, existing supported examples remain usable, and baseline claims accurately describe measured evidence."

| Review defect | Resolution | Evidence |
| --- | --- | --- |
| Six asset roles, five drawn | Fixed | 6 images drawn; role identity is the authored reference, not the resolved asset |
| Valid badge overflows the artifact | Fixed | Measured before layout; wraps inside the node; drawn lines rejoin to the authored badge |
| Labels silently abbreviated | Diagnosed | `TOP440_TEXT_ABBREVIATED` with an exact character count; disposition on the measurement |
| Unreadable paint accepted | Fixed | `TOP442_TEXT_NOT_LEGIBLE`, error severity, `ok: false` |
| Font not a resolved contract | Fixed | `TOP330_FONT_UNAVAILABLE`; scene, measurement and embedded faces name one family |
| Theme extension loses treatment | Fixed | Empty extension is **byte-identical** to its base |
| Accepted intent with no effect | Diagnosed | `TOP252_INTENT_NOT_APPLIED`; `advisory` vs `unsupported` separated in discovery |
| Edge selection is closure-based | Documented | Contract-record test; exact mode is T11 |
| No endpoint attachment check | Fixed | `TOP426_EDGE_ENDPOINT_DETACHED`; found and fixed a real routing bug |
| Dropped group / annotation undetected | Fixed | `TOP415_REGION_DROPPED`, `TOP416_ANNOTATION_DROPPED` |
| PNG logical vs pixel size conflated | Fixed | Separate explicit fields, read from the PNG header |
| Discovery omits implemented choices | Fixed | Generated from one registry, held against the schema enum in both directions |

**Existing examples remain usable:** all 11 example and all 9 showcase renders are byte-identical to the goldens across the whole of M0, with one deliberate, inspected and explained exception (`paired-regions.png`, one node widened 1.3px so its badge strip contains its own text; canvas dimensions unchanged).

**Baseline claims now match measured evidence:** 189 tests from 91; hard geometry defects 0/240; every-measured-defect clean 220/240; shape on target 216/240; reference parity **approved 0/6**, honestly `unreviewed` rather than a hardcoded string.

**Outstanding gate, not satisfied and not claimed:** no human visual review of the six reference cases has been obtained. All six are `unreviewed`. `--require-parity` fails, correctly. Granting parity requires a person to compare the artifacts and add a record; an agent must not add one on their behalf.

**Next ready task: T05** (define internal V2 component/scene interfaces), which opens M1. Its dependencies T01, T02 and T03 are complete.

### T05 — internal V2 component/scene interfaces — 2026-09-20

**Task: T05 — define internal V2 component/scene interfaces. State: complete.**

Baseline commit `9abaf2e` (T04). No unrelated worktree changes.

**Scope note.** T05 is a contract task. It adds interfaces and the tests that prove they are
adequate; it wires nothing into the compiler. `measureView`, `buildScene` and the legacy
`Scene` are untouched and remain what the pipeline uses. T07 implements the measurement
engine behind `ComponentPlan` and T08 migrates the renderer onto it. The capability
registry does not advertise any of this, and no rendered output changes.

**Behavior implemented.**

1. **`ComponentPlan` and the block grammar** (`core/src/components/`). Blocks are `text`, `asset`, `badge`, `rule`, `spacer`, `row`, `column`, `grid`, `table`, `stack` and a restricted `vector`. Every block carries both `bounds` (collision space) and `inkBounds` (actual painted extent), which is the distinction the review found missing — `analyzeGeometry` reasons about layout rectangles while the defects live in the paint. `vector` refers to a registered shape id, never a raw path from a document, so a source cannot make the compiler draw arbitrary geometry.

2. **`ShapedText` carries its own source and its own continuation flags.** `source` is the authored string, kept whatever happens to the visible lines, so content accounting never reconstructs it. Each line has `continuesPrevious`, marking a mid-word split; a consumer rejoining lines must not insert a space there. The T01 fix made that guarantee structural inside `layoutText`; this makes it part of the contract so it survives the T07 rewrite.

3. **`AttachmentSite` replaces "node id plus a coordinate".** A site has a role — `side`, `port`, `row`, `perimeter` or `event` — a point, an outward normal, an owning region, allowed directions and a capacity. Routes reference an attachment id, so "which part of this component does this connector belong to" is answerable after layout instead of inferred from proximity. `Silhouette` is a union covering rect, ellipse, diamond, cylinder, stack, polygon and lifeline, because a stacked sheet's and a cylinder cap's visible outlines differ from their layout rectangle and attaching to the rectangle leaves connectors visibly detached — the class of defect T03 now catches.

4. **`ContentDisposition` is the full four-state form** (`rendered`, `abbreviated`, `representedBy`, `omitted`) with owning scene ids, a required reason for anything not `rendered`, and a representative for `representedBy`. T01 shipped the narrow two-state version inside `MeasuredText`; this is the contract it migrates to.

5. **`SceneDocument` lives in core** (`core/src/scene/`). Every primitive has a stable scene id and an `owner` naming the occurrence, relationship, region, annotation or chrome it exists for, plus a `semanticIndex` giving the inverse. That pair is what makes coverage checkable **in both directions**: nothing required is unrepresented, and nothing drawn is unexplained. `LAYER_ORDER` is fixed rather than per-diagram, because a label that falls behind a component in some documents and in front in others is a bug that only appears sometimes. `SceneTextPrimitive` carries a `backdrop`, so contrast is measured against what is actually painted behind a run rather than against the canvas default — the T02 check currently works from theme tokens and will move onto this at T09.

6. **`Medium`** (`core/src/scene/medium.ts`). Legibility is a property of a drawing *at a size*, and without a declared medium the compiler cannot say a result is unreadable. `fitToMedium` reports the scale, the resulting text size and whether that clears the medium's floor — reported, not applied, because a fit that pushes text under the minimum is not a fit. A test reproduces the review's 37,491x370 ribbon as an illegible fit.

**Files added:**

- `packages/core/src/components/blocks.ts`, `plan.ts`, `index.ts`
- `packages/core/src/scene/document.ts`, `medium.ts`, `refs.ts`, `index.ts`
- `packages/core/test/component-contract.test.ts` — 21 assertions
- `packages/core/test/dependencies.test.ts` — 4 assertions

**Files changed:** `packages/core/src/index.ts` (exports), `packages/renderer-svg/src/index.ts` (compatibility re-exports).

**Acceptance: one plan structure covers three families.** The fixtures construct real values, not mocks:

- **Gateway route table** — a `table` block whose rows are separately attachable via `role: "row"` sites carrying `region`, so a connector meets the row it is drawn against.
- **Process decision** — a `diamond` silhouette whose outgoing sites carry `labelBounds`, so an outcome label belongs to the attachment rather than floating near the component.
- **Interaction participant** — a `lifeline` silhouette with `role: "event"` sites ordered in time, where `inkBounds.height` is more than ten times `layoutBounds.height`. That ratio is precisely the case a single layout rectangle cannot describe, and it is asserted.

A further test asserts all three have identical key sets: no family needs a field the others lack, and three distinct silhouette kinds are in use. That is the criterion "one component plan can represent a gateway table, a process decision and an interaction participant", tested rather than asserted in prose.

**Verification:**

| Command | Outcome |
| --- | --- |
| `pnpm exec vitest run packages/core/test/component-contract.test.ts` | 21 passed |
| `pnpm exec vitest run packages/core/test/dependencies.test.ts` | 4 passed |
| `pnpm check` | build + typecheck clean; **214 tests in 23 files passed** (189 after T04) |
| render comparison | unchanged, as expected for a contract-only task |
| export surface probe | all 10 V2 helpers reachable from the SDK; renderer re-exports present; legacy renderer exports intact |

**No dependency cycle.** The new test checks four properties: the workspace graph is acyclic; no package depends upward through the declared layer table; `@topoir/core` depends on `@topoir/schema` and nothing else; and no file under `core/src` imports from a higher package, which catches an import that bypasses the manifest. The third is the property that makes it correct for `SceneDocument` to live in core — quality analysis and export both need scene types, and neither should have to pull in an SVG package to get them.

**Legacy API remains buildable.** Full build and typecheck pass, the quickstart render is byte-identical, and the renderer still exports `buildScene`, `renderSvg` and `renderPng`. The SDK does not re-export those three, which a probe confirmed is pre-existing — the SDK re-exports core, schema and assets only — and not a regression from this change.

**Design decisions.** No contract changed; `docs/design/04-components-and-styles.md` already specified these shapes and this implements them as written. `core/src/scene/refs.ts` exists so `scene/` and `components/` share types without importing each other, keeping the two contracts independent.

**Remaining defects.** Unchanged from T04. Reference parity remains 0/6 unreviewed.

**Outstanding gates.** M1 gate open. No human visual review obtained or claimed.

**Next ready task: T06** (versioned font and resource resolution). Its dependencies T02 and T05 are complete.

### T06 — versioned font and resource resolution — 2026-09-20

**Task: T06 — versioned font and resource resolution. State: complete.**

Baseline commit `3b3c574` (T05). No unrelated worktree changes.

**The gap T06 closes.** T02 made *family* resolution honest: an unavailable family is
substituted and reported rather than claimed. But a family is not a resource. Measurement
opened font files by module path in `core/src/font-measurer.ts`; the SVG embedded faces
from a separate private list in `renderer-svg/src/fonts.ts`; the PNG rasterizer loaded a
third copy of that list. Three independent resolutions that happened to agree. Nothing
connected them, so nothing would have caught them drifting — and a drawing laid out with
one set of metrics and rasterized with another is wrong in a way that "a PNG was produced"
cannot detect.

**Behavior implemented.**

1. **`ResolvedFace` names one exact file by content hash.** Each face carries its path, the sha256 of its bytes, `unitsPerEm`, ascent, descent, line gap, version and licence. A test asserts the hash matches the bytes on disk, and that DejaVu's legacy metrics are unchanged (2048/1901/-483) — the registry describes the fonts the compiler already used, it does not change them.

2. **One resolved set reaches all three consumers.** `resolveFontSet` produces a `ResolvedFontSet` with a full fallback chain, resolved once before any shaping. The SDK resolves it, hands it to the measurer, passes it to `renderSvg` for the embedded faces and to `renderPng` for the rasterizer's font files. A test parses the `@font-face` rules out of a produced SVG and asserts they equal the chain measurement used, face for face, in order.

3. **The chain can never be empty.** The default pack is always appended, so a request for nothing, for an empty string, or for a stack of entirely unknown families still resolves to something measurable. Asserted for four such requests.

4. **Caching is keyed on resolved content, not on the request.** `fingerprintOf` hashes the face hashes, so two requests resolving to the same bytes share a measurer and two that do not never can. That is what makes a cache hit provably equivalent to a cache miss, which a test asserts both at the measurer level and end to end via two compiles producing identical artifact hashes.

5. **Missing glyphs are reported.** DejaVu Sans has no CJK coverage and no regional indicators, so those characters were drawn as replacement boxes in both exports with nothing in the result to say so. `TOP332_GLYPH_NOT_AVAILABLE` names the owner, the count and the specific code points. Whitespace, zero-width joiners and variation selectors are excluded, because none of them draws a glyph of its own and reporting them would be noise.

**Files changed:**

- `packages/core/src/font-registry.ts` (new) — `ResolvedFace`, `FontPack`, `ResolvedFontSet`, `resolveFontSet`, `selectFace`, `fingerprintOf`, `glyphCoverage`, `glyphDiagnostic`
- `packages/core/src/font-measurer.ts` — rewritten over the registry; `id` now carries the set's fingerprint, so a layout result records which font bytes produced it
- `packages/renderer-svg/src/fonts.ts` — derived from the registry; `embeddedFontCssFor` cached on the content fingerprint
- `packages/renderer-svg/src/svg.ts`, `png.ts` — accept the resolved set
- `packages/sdk/src/index.ts` — resolve once, thread through measurement and both exports, glyph check over all authored text
- `packages/schema/src/diagnostics.ts` — `TOP332_GLYPH_NOT_AVAILABLE`
- `packages/core/test/font-registry.test.ts` (new) — 19 assertions
- `packages/sdk/test/review-regression.test.ts` — 4 new end-to-end assertions
- `packages/core/test/content.test.ts` — scope note plus a covered-script case (below)
- `docs/diagnostics.md`

**A test whose scope needed correcting.** The T01 grapheme-splitting test used flag emoji.
Those are exactly the right input for testing surrogate-pair splitting, but DejaVu has no
glyphs for regional indicators, so the string it asserts is wrapped correctly would render
entirely as tofu. The assertion was true and remains valuable, but on its own it implied
coverage the pack does not have. A comment now states that explicitly, and a companion case
exercises the same splitting on Cyrillic — which the pack does cover — so grapheme-safe
wrapping is asserted on text that genuinely renders.

**Verification:**

| Command | Outcome |
| --- | --- |
| `pnpm exec vitest run packages/core/test/font-registry.test.ts` | 19 passed |
| `pnpm check` | build + typecheck clean; **238 tests in 24 files passed** (214 after T05) |
| render comparison | **all 20 example and showcase renders byte-identical** |
| `pnpm benchmark:generalization` | 240 cases; unchanged: hard 0/240, all-clean 220/240, shape 216/240 |
| glyph probe | `"Payments API"` and `"Café résumé naïve"` clean; `"支払いサービス"` reports 7 missing code points; `"Service 🇩🇪"` reports 2 |

Byte-identical renders are the main evidence: routing every consumer through one registry
reproduced every existing drawing exactly, while making the agreement checkable instead of
coincidental.

**Design decisions.** No contract changed. `docs/design/04-components-and-styles.md` already
specified a `FontRegistry` with versioned faces, licences, glyph coverage, metrics and
binary hashes, and this implements it as written. Two implementation notes: the pack list is
DejaVu only, because adding editorial, monospace or CJK packs is explicitly later-milestone
work and advertising them now would be exactly the dishonesty T04 removed; and
`glyphDiagnostic` is a warning rather than an error, because tofu is a legibility problem
the author may knowingly accept while a pack is pending, and the message says what to do.

**Remaining defects.** Unchanged. Reference parity remains **0/6 unreviewed**.

**Outstanding gates.** M1 gate open. No human visual review obtained or claimed.

**Next ready task: T07** (implement the measured block engine). Its dependencies T05 and T06 are complete.

### T07 — measured block engine — 2026-09-20

**Task: T07 — implement the measured block engine. State: complete.**

Baseline commit `28626ed` (T06). No unrelated worktree changes.

**Scope note.** T07 implements the engine behind the T05 contracts. It is not yet wired
into the compiler: `measureView` and `buildScene` still drive the pipeline, and no rendered
output changes. **T08** is the migration. Keeping them apart means the engine can be tested
against its own contract before every existing golden depends on it.

**Behavior implemented.**

1. **Every block type measured** (`core/src/components/measure-blocks.ts`). `text`, `badge`, `asset`, `rule`, `spacer`, `row`, `column`, `grid`, `table`, `stack` and registered `vector`. Measurement is bottom-up and offers each child only the width that actually remains — a row subtracts its own gaps before dividing, so a container cannot promise children more space than it has.

2. **Shaped text the renderer places without re-deriving anything.** Each line carries its own baseline, advance and ink box, computed from the resolved face's real ascent and descent. A test asserts every baseline equals `index * lineHeight + ascent`, which is the property that lets the renderer stop calculating line positions itself — the root cause of a badge measured at one width and drawn at another.

3. **Ink is separated from layout throughout.** A text block's ink overhangs its line boxes by the descent; a stack's ink exceeds its layout box by `offset * (sheets - 1)` in both axes; a spacer reserves space and paints nothing, so a container's ink is the union of what its children actually paint rather than its bounding box. Each of those is asserted. Reserving only the front sheet of a stack is how stacked components came to overlap their neighbours.

4. **Bounded width negotiation** (`core/src/components/negotiate.ts`). `negotiateWidth` tries the preferred width, then a **capped** list of alternatives, and returns the narrowest that keeps all content. When none is clean it returns the widest tried with `exhausted: true` rather than continuing. That is the contract's rule — "cap alternatives and return the best legal result with diagnostics", not "keep expanding until the diagram happens to fit". A component that silently grew would distort every layout around it; one that silently kept the narrow result would lose content; the caller is told which happened.

5. **True silhouettes.** `silhouettePoint` returns points on the actual outline: a diamond attaches at its corners, not at the midpoints of its bounding box, which are outside the shape entirely; a cylinder attaches on its straight body, clear of the bulging caps; a lifeline attaches along its length. This prevents at the source exactly the detached-connector defect T03 added a checker for.

6. **Attachment derivation.** `sideAttachments` spaces several sites along one side so connectors stay distinguishable — a test asserts no two are coincident, which is what makes three relationships read as three lines rather than one thick one. `rowAttachments` derives one site per table row, positioned at that row's vertical centre, so a gateway connector meets the row it is drawn against. The same machinery serves ER field connections.

7. **Content accounting from measurement.** `contentDispositions` walks the tree and reports `rendered`, `abbreviated` (with an exact omitted-grapheme count and a reason naming the width) or `omitted` (for an asset role that did not resolve). Derived from the measurement, never inferred from a missing primitive, as the contract requires.

**Files added:** `packages/core/src/components/measure-blocks.ts`, `negotiate.ts`, `packages/core/test/block-engine.test.ts` (41 assertions). **Changed:** `packages/core/src/components/index.ts`.

**Two bugs found and fixed during implementation, both by the tests:**

- `hasAbbreviatedText` compared a space-stripped source against lines joined without spaces, so **every wrapped run reported as abbreviated**. Since negotiation widens on exactly that signal, it would have widened every multi-line component to its unwrapped width — silently undoing wrapping across the whole corpus. It now compares grapheme counts with whitespace removed, and a test asserts a wrapped run is *not* abbreviated.
- The grapheme-boundary ellipsis test initially joined `ShapedLine` **objects**, so it asserted `"[object Object]…"` does not contain U+FFFD and passed vacuously. It now joins `line.text`, and additionally asserts the surviving flag emoji are intact. Verified load-bearing by replacing the grapheme segmenter with `[...text]` — the test failed with `expected 1 to be +0` — then restored.

**Verification:**

| Command | Outcome |
| --- | --- |
| `pnpm exec vitest run packages/core/test/block-engine.test.ts` | 41 passed |
| `pnpm check` | build + typecheck clean; **279 tests in 25 files passed** (238 after T06) |
| inverted-probe on the ellipsis test | fails when grapheme segmentation is replaced by code-unit iteration |

**Acceptance criteria, each with the assertion that covers it:**

- *All legacy content can be expressed once* — text, badge, asset strip, route table, stack and rule blocks all measured; the three-family fixtures from T05 remain green.
- *Measured badges contain actual content* — a 48-character badge at 200px wraps and its lines rejoin to exactly the authored badge.
- *Table cells contain actual content* — six cells across three rows, each asserted to be fully inside its own cell rectangle, with rows non-overlapping and columns sized to their widest cell.
- *Multi-asset strips contain actual content* — six roles laid out side by side, each inside the measured strip; two roles sharing identical bytes stay two blocks.
- *Explicit ellipsis produces disposition data* — an over-constrained badge yields `abbreviated` with a positive omitted count and a reason.
- *No renderer reflow is needed* — every line carries its own baseline and advance; asserted.

**Remaining defects.** Unchanged. Reference parity remains **0/6 unreviewed**.

**Outstanding gates.** M1 gate open.

**Next ready task: T08** (migrate renderer and templates to ComponentPlan). Its dependency
T07 is complete. T08 is where existing goldens can change, and the roadmap requires every
changed golden to be inspected and explained rather than re-baselined.

### T08 slice 1 — shared silhouettes and compiled plans — 2026-09-20

**Task: T08 — migrate renderer/templates to ComponentPlan. State: in_progress.**

Baseline commit `1202cfe` (T07). No unrelated worktree changes.

**This is one slice of T08, not the whole task.** The roadmap allows a task to span several
changes; the ledger records what is actually done. Read the "remaining" section below before
relying on any of this.

**What this slice implements.**

1. **The resolved silhouette is recorded once, on the measured component.** Geometry analysis and drawing each decided independently what shape a component is: the renderer called `nodeShape`, and the analyzer assumed a rectangle. That disagreement is not cosmetic — a route meeting a diamond's corner or a cylinder's curved cap is correctly attached but lies outside the bounding box, and one meeting the bounding box is inside it but visibly detached from the drawn outline. `MeasuredNode.shape` now carries what measurement resolved, and `distanceToOutline` in the analyzer uses it, so both consumers see the same component.

2. **A `ComponentPlan` is compiled per placed component** (`core/src/components/compile-plan.ts`, surfaced as `CompiledView.plans`). Each plan carries the true silhouette, the real attachment sites and the content-disposition table, built from the measured, laid-out component — so a caller can ask where a connector may legally meet a component, or what became of a piece of authored content, without re-deriving either from the picture.

3. **Attachment sites are derived, not assumed.** A component with visible route compartments gets one `port` site per compartment, positioned at that compartment's vertical centre. Everything else gets `side` sites spaced by the number of relationships that actually meet it. A test asserts no two sites on a component ever share a point, which is what keeps several relationships reading as several lines.

**Deliberately not done in this slice.** `planForNode` returns an empty `blocks` array. The
legacy renderer still owns block placement, and inventing block positions here that nothing
draws from would create a *second* description of the component — precisely the duplication
the plan exists to remove. Populating `blocks` and having the renderer place them is slice 2.

**Files changed:**

- `packages/core/src/components/compile-plan.ts` (new) — `planForNode`, `silhouetteFor`, `attachmentsFor`, `dispositionsFor`
- `packages/core/src/ir.ts` — `MeasuredNode.shape`
- `packages/core/src/measure.ts` — record the resolved shape
- `packages/core/src/quality.ts` — `distanceToOutline`, shape-aware attachment checking
- `packages/sdk/src/index.ts` — compile plans, expose `CompiledView.plans`
- `packages/sdk/test/component-plan.test.ts` (new) — 12 assertions

**The assertion that matters most.** `every routed endpoint lands on a site its component's
plan declares` walks every route in three examples and checks each end against the sites
that component's own plan declares. If the analyzer accepted a connector the plan had no
site for, the two would be describing different components and the plan would be worse than
useless. This is the acceptance criterion "geometry and drawing share attachments/
silhouettes", tested rather than asserted in prose.

A second test cross-checks the per-component plans against the view-level content metrics:
two independent paths to the same fact about abbreviation, which must agree.

**Verification:**

| Command | Outcome |
| --- | --- |
| `pnpm exec vitest run packages/sdk/test/component-plan.test.ts` | 12 passed |
| `pnpm check` | build + typecheck clean; **291 tests in 26 files passed** (279 after T07) |
| render comparison | **all 20 example and showcase renders byte-identical** |
| `pnpm benchmark:generalization` | 240 cases; unchanged: hard 0/240, all-clean 220/240, shape 216/240 |

No golden changed, because this slice adds a shared description and a stricter shared check
without altering what is drawn.

**Remaining for T08, none of it started:**

- Populate `ComponentPlan.blocks` from the block engine and have the renderer *place what
  the plan measured* rather than computing positions in `nodeComponent`.
- Move title, subtitle and legend onto the block engine. `build-scene.ts` still calls
  `layoutText` directly for all three, which is the "independent wrapping" the acceptance
  criterion forbids. It legitimately happens after layout, because the title's wrap width
  depends on the final canvas width — so this is about using the same measurement system,
  not about moving the work earlier.
- Emit a `SceneDocument` with per-primitive semantic ownership, so every visible mark has a
  traceable owner. The legacy `Scene` remains what `buildScene` returns.
- Groups, annotations and edge labels still have no plans.

Slice 2 is where existing goldens can genuinely change, and the roadmap requires every
changed golden to be inspected and explained rather than re-baselined.

**Remaining defects.** Unchanged. Reference parity remains **0/6 unreviewed**.

**Outstanding gates.** M1 gate open; it needs T08 complete and T09.

**Next ready task: T08 slice 2.**

### T08 slice 2 — scene ownership and chrome on the block engine — 2026-09-20

**Task: T08 — migrate renderer/templates to ComponentPlan. State: complete against its
stated acceptance criteria, with one part of the work item explicitly carried forward.**

Baseline commit `d39f685` (T08 slice 1). No unrelated worktree changes.

**Acceptance criteria, all three met and verified:**

| Criterion | Evidence |
| --- | --- |
| Geometry and drawing share attachments/silhouettes | Slice 1. `MeasuredNode.shape` is resolved once; the analyzer's `distanceToOutline` uses it; a test walks every route in three examples and checks each end against the sites that component's own plan declares |
| Rendering has no theme-name branching | T02 removed the last `theme.id` comparison; `grep` confirms none remain |
| Rendering has no independent wrapping | `layoutText` no longer appears in the renderer except in a comment. Title, subtitle and legend go through `measureBlock` |
| All visible authored content has scene ownership | **Every mark across all 23 scenes in the published corpus has an owner**, asserted |

**Behavior implemented in this slice.**

1. **Ownership on every mark.** `SceneOwner` rides alongside the existing fields — kind, id, and the part of the owner the mark is (`label`, `badge`, `body`, `port:<id>`, `asset:<name>`, `arrow`, `label-background`, …). The SVG serializer enumerates the attributes it emits, so this changes no output byte. Ownership was not guessed at: `unowned()` walks a built scene and reports marks with no owner, and it found three real gaps on the first run — edge-label background rects, cylinder and diamond body paths, and the executive accent bar. All three are now owned, and the corpus-wide check is a test.

2. **`sceneDocument()` projects the legacy scene into the V2 `SceneDocument`.** The legacy `Scene` is untouched — it is what `renderSvg` and `renderPng` consume, and changing it would change every golden. The projection adds stable primitive ids, a layer per mark derived from the group it was emitted into, real ink bounds (stroke-grown for shapes, coordinate-derived for paths) and a semantic index.

3. **Coverage is now checkable in both directions.** `unowned` answers "is anything drawn that nothing explains"; `unrepresented` answers "is anything the document declares missing from the drawing" — the check no geometry counter can perform, because a drawing can be geometrically clean and simply not contain a declared fact. A test asserts every component, relationship, boundary and annotation of `checkout-platform` is indexed.

4. **Chrome measured by the block engine.** The title, subtitle and legend called `layoutText` directly, a second wrapping implementation living in the renderer. They now go through `measureBlock`. The work still happens after layout — the title's wrap width depends on the final canvas width — so this is about using one measurement system, not about moving the work earlier. Equivalence was verified before switching: a probe compared `layoutText` and `measureBlock` line-for-line across six representative chrome strings and found **all line breaks and widths identical**, which is why no golden moved.

**Files changed:**

- `packages/renderer-svg/src/scene.ts` — `SceneOwner`, optional `owner` on every primitive
- `packages/renderer-svg/src/component.ts` — owners on all 17 marks a component can draw
- `packages/renderer-svg/src/build-scene.ts` — owners on boundaries, relationships, labels, annotations, legend and chrome; chrome measured by the block engine
- `packages/renderer-svg/src/document.ts` (new) — `sceneDocument`, `unowned`
- `packages/renderer-svg/src/index.ts` — export it
- `packages/sdk/test/scene-ownership.test.ts` (new) — 8 assertions

**Verification:**

| Command | Outcome |
| --- | --- |
| `pnpm exec vitest run packages/sdk/test/scene-ownership.test.ts` | 8 passed |
| `pnpm check` | build + typecheck clean; **299 tests in 27 files passed** (291 after slice 1) |
| render comparison, after ownership | all 20 byte-identical |
| render comparison, after chrome migration | all 20 byte-identical |
| `pnpm benchmark:generalization` | 240 cases, 20 soft failures — unchanged |
| unowned-mark sweep | 0 unowned marks across 23 scenes |

**No golden changed in either slice of T08**, so the roadmap's "explain every changed golden"
requirement has nothing to discharge. That is the intended outcome: this task adds a shared
description and a stricter shared check without altering what is drawn.

**Carried work, stated plainly.** The work item also says "migrate every current node/group/
label/annotation plus title/legend to ComponentPlan; render resolved primitives only".
`ComponentPlan.blocks` is **still an empty array**, and `nodeComponent` still computes block
positions inline rather than placing what the plan measured. Every *acceptance criterion* is
met — the two consumers now agree on silhouettes and attachments, there is no second
wrapping path, and every mark is owned — but the renderer is not yet driven by plan blocks.

That remaining migration is deliberately not claimed. It is a byte-fidelity-critical rewrite
of `nodeComponent`, and doing it badly would change goldens for no behavioral gain. It is
recorded here as the first item of the next presentation-layer slice, and `planForNode`
carries a comment saying the same thing so it cannot be mistaken for finished.

**Remaining defects.** Unchanged. Reference parity remains **0/6 unreviewed**.

**Outstanding gates.** M1 gate needs T09.

**Next ready task: T09** (final-scene QA and coverage). Its dependencies T08 and T03 are
complete, and it is the task that consumes the ownership and ink bounds built here.

### T09 — final-scene QA and coverage — 2026-09-20

**Task: T09 — final-scene QA and coverage. State: complete.**

Baseline commit `4ccd114` (T08 slice 2). No unrelated worktree changes.

**Behavior implemented** (`core/src/quality/scene.ts`, run from the SDK on every view).
`analyzeGeometry` works on measured boxes *before* the scene adds final text, badges,
decoration, header and legend. `analyzeScene` works on the `SceneDocument`, where every
mark has painted bounds and an owner. Five checks:

1. **`TOP450_ELEMENT_NOT_REPRESENTED`** — a declared element that nothing in the drawing represents. No geometry counter can reveal this: the drawing can be perfectly clean and simply not contain a fact the document declares.
2. **`TOP451_MARK_NOT_ATTRIBUTED`** — a mark no model element explains.
3. **`TOP452_MARK_CLIPPED`** — painted extent outside the canvas. Final ink, not layout rectangles.
4. **`TOP442` / `TOP443`** — contrast against the mark *actually painted behind* the glyphs, following paint order.
5. **`TOP453_CONTENT_OMITTED`** — content disposition surfaced from the document.

**A distinction that is principled, not tuned.** Text at 1:1 against its backdrop is
*invisible*: the content is lost and that is an **error** (`TOP442`). Text at 2.5:1 is
*visible but hard to read*: the content survives and the failure is an accessibility one, so
it is a **warning** (`TOP443`). Conflating them would either let the review's white-on-white
defect pass as a warning, or declare every deliberately soft secondary label a broken
diagram. The threshold split was chosen on that reasoning before looking at which cases it
would make pass.

**Contrast now has exactly one owner.** `analyzeVisibility` (T02) compared node text against
node *fill* from theme tokens; `analyzeScene` compares against the mark really painted
behind the run. Both reported every defect, so each was doubled. Contrast was removed from
`analyzeVisibility`, which keeps colour validation — a property of the theme needing no
drawing. Its unit tests moved to `scene-quality.test.ts` rather than being deleted.

**Two bugs in my own scene projection, found and fixed before they could be mistaken for defects:**

- `pathBounds` paired path coordinates alternately as x,y. `H` and `V` take a *single*
  coordinate, so the scan desynchronised after the first one and reported wildly wrong
  boxes — a cylinder's body path (`C` then `V`) produced a 2075x2147 box for a small
  component and three false clipping reports. Replaced with a real command parser.
- Text ink width was estimated as `characters * fontSize * 0.55`. It is now **measured**.
  An approximation over-reports for wide glyph runs, inventing clipping that is not in the
  drawing, and under-reports for narrow ones, hiding clipping that is.

Both were caught by investigating failures rather than assuming they were real. After
fixing them, false clipping reports across the probed seeds went to **zero**.

**Ten genuinely defective generated cases that nothing had reported.** The corpus number
moved from 220/240 to 210/240. This is not a regression: those ten cases were producing
defective output all along and no check looked at the final drawing.

- **Nine cases: invisible text, ratios 1.13–1.27:1.** The generator authors themes that extend `cloud-architecture` — whose components are drawn as *icons*, with no card behind the label — and override `canvas.background` to a dark colour **without** overriding `node` text tokens. The label stays near-black (`#172033`) and is drawn straight onto a `#0F1420` canvas. This is exactly the class of defect the T02 token-level check structurally could not find: it compared node text against node *fill*, and an icon component has no fill. Only a check that resolves the real backdrop sees it.
- **One case (0165): a clipped edge label.** The label box for `e5` is painted at x 866–952 on a 940px canvas. `analyzeGeometry`'s bounds check covers nodes, groups, annotations and route *points*, but not edge *labels* — a gap in T03 that the scene check closes. Not duplicated into the geometry pass, since the scene check sees the real painted label and duplicating it would double the diagnostic.

**Neither finding was worked around.** The check was not weakened, the generator was not
changed to avoid the theme combination, and the cases were not excluded. The underlying
cascade problem — an authored dark canvas that does not carry to inherited text tokens — is
a **resolved-style-grammar** concern and belongs to **T13**; it is recorded here as a
concrete defect class that task must handle.

**Files changed:** `core/src/quality/scene.ts` (new), `core/src/color.ts`
(`INVISIBLE_TEXT_CONTRAST`), `core/src/visibility.ts` (contrast removed), `core/src/index.ts`,
`renderer-svg/src/document.ts` (measured text ink, real path parser), `sdk/src/index.ts`,
`schema/src/diagnostics.ts` (`TOP443`, `TOP450`–`TOP453`),
`core/test/scene-quality.test.ts` (new, 14), `core/test/style.test.ts`,
`sdk/test/review-regression.test.ts` (+6), `docs/diagnostics.md`.

**Verification:**

| Command | Outcome |
| --- | --- |
| `pnpm exec vitest run packages/core/test/scene-quality.test.ts` | 14 passed |
| `pnpm check` | build + typecheck clean; **319 tests in 28 files passed** (299 after T08) |
| render comparison | all 20 byte-identical |
| `pnpm benchmark:generalization` | 210/240 free of every measured defect; **10 newly-reported real defects**, itemised above |

**Acceptance, per the roadmap's named list.** Each of the five defects has its own test
asserting it cannot pass presentation checks: long badge (contained, 0 clipped marks),
missing role (`TOP322`, `ok: false`), unknown glyph (`TOP332`), missing annotation
(`TOP416` *and* independently `TOP450`, `ok: false`), detached arrow (`TOP426`, `ok: false`).
A sixth test asserts header and legend are evaluated with body content — before T08 they
were measured inside the renderer and reached no quality pass at all.

### M1 gate assessment — 2026-09-20

**Gate: M1. State: NOT met.**

Exit criterion: *"all rendering consumes measured plans; the complete scene has semantic
ownership and independently verified visible-content accounting."*

| Clause | State |
| --- | --- |
| The complete scene has semantic ownership | **Met.** 0 unowned marks across all 23 scenes in the published corpus, asserted |
| Independently verified visible-content accounting | **Met.** Two-directional: `TOP450` for declared facts the drawing omits, `TOP451` for ink nothing explains; per-component plan dispositions cross-checked against view metrics |
| All rendering consumes measured plans | **NOT met.** `ComponentPlan.blocks` is empty and `nodeComponent` still computes block positions inline |

The third clause is the T08 carried work, recorded in that session entry and in a code
comment on `planForNode`. Every T05–T09 *task* acceptance criterion is met and verified, but
the milestone's own exit condition is not, and is not claimed to be.

**Next ready task: the T08 carried work** — populate `ComponentPlan.blocks` and drive
`nodeComponent` from them. It is byte-fidelity-critical, so every changed golden must be
inspected and explained. M2 tasks T10 and T11 depend on T04/T05 and not on this, so they
are also ready if the presentation rewrite is deferred.

**Remaining defects.** The ten generated cases above; the dark-canvas cascade defect class
for T13; `examples/rendered/showcase/custom-assets.png` still stale from before T01.
Reference parity remains **0/6 unreviewed**.

### T08 carried work — one placement computation — 2026-09-20

**Closes the item recorded as outstanding in the T08 slice-2 entry and the M1 assessment.**

Baseline commit `4684360` (T09).

**What was outstanding.** `ComponentPlan.blocks` was empty and `nodeComponent` computed
block positions inline. The plan could say a component *has* a label but not where it is,
so a quality check could not ask whether the label fits inside its card without re-deriving
the whole layout — and any future plan-based renderer would have been a second opinion
about placement.

**What changed.** The placement arithmetic moved out of the renderer into
`core/src/components/content-layout.ts`, in the component's local coordinate space:

- `contentLayout(node, theme, assetCount)` returns the icon box and origin, the asset strip
  geometry, the text origin and baselines, the badge strip and the port panel height.
- `nodeComponent` places marks at those coordinates offset by the component's position. It
  derives nothing itself; an audit shows the only arithmetic left is `x + layout.textX`.
- `contentBlocksFor` turns the same layout into measured blocks, and `planForNode` offsets
  them to the placed bounds. Plans now carry 2–3 populated blocks each; none is empty.

`assetCount` is passed from the SDK as the number of assets **actually drawn**, because an
unresolved role occupies a slot in measurement but draws nothing, and the strip width
decides where the label starts.

**Verification:**

| Command | Outcome |
| --- | --- |
| `pnpm check` | build + typecheck clean; **323 tests in 28 files passed** (319 after T09) |
| render comparison | **all 20 byte-identical** — the extraction changed no output |
| renderer measurement audit | no component content measured in the renderer; the two remaining `measure` calls are scene-QA ink bounds and post-layout chrome through the shared block engine |

Four new assertions check the plan against the drawing rather than assuming they agree:
every component's label block carries the same lines as the drawn label mark; **the offset
between plan blocks and drawn marks is the same single value for every component**, which
would break immediately if any component's content were laid out by different code on each
side; every component has blocks for what it draws; and every block sits inside its
component.

### M1 gate — shared components and complete scene — 2026-09-20

**Gate: M1. State: complete.**

Exit criterion: *"all rendering consumes measured plans; the complete scene has semantic
ownership and independently verified visible-content accounting."*

| Clause | Evidence |
| --- | --- |
| All rendering consumes measured plans | `contentLayout` is the single placement computation; plans are built from it and the renderer places from it. Nothing in the renderer re-derives measurement. Asserted by the constant-offset test |
| The complete scene has semantic ownership | 0 unowned marks across all 23 scenes in the published corpus, asserted corpus-wide |
| Independently verified visible-content accounting | Two-directional: `TOP450` for declared facts the drawing omits, `TOP451` for ink nothing explains, plus per-component dispositions cross-checked against view metrics |

**Precise scope, so the claim is not read wider than it is.** The renderer calls
`contentLayout` directly rather than iterating an assembled `plan.blocks` array. The
*computation* is shared — which is what removes the duplicate-description defect — but the
renderer does not literally read the plan object. Groups, annotations and edge labels
consume measured values from `measureView` and have never been re-measured in the renderer;
they do not have `ComponentPlan`s of their own. Neither of those is a defect today, and
both are noted so a later task is not misled about what exists.

**Tally across M0 and M1:** tests 91 → 323. All 20 example and showcase renders are
byte-identical to the goldens, with one deliberate, inspected and explained exception in
T01 (`paired-regions.png`, one node widened 1.3px so its badge strip contains its own text).

**Outstanding gate, unchanged and not claimed:** reference parity is **0/6, `unreviewed`**.
No human visual review has been obtained. `--require-parity` fails, correctly.

**Next ready task: T10** (v1alpha2 envelope and family registry), which opens M2. Its
dependencies T04 and T05 are complete.

### T10 — v1alpha2 envelope and family registry — 2026-09-20

**Task: T10 — v1alpha2 envelope and family registry. State: complete.**

Baseline commit `dea003f`. No unrelated worktree changes.

**Scope, stated first so the claim is not read wider than it is.** This adds a second
document *language* with full structural validation. It does **not** compile: the compiler
still only builds diagrams from `v1alpha1`. `topoir capabilities` reports
`topoir.dev/v1alpha2` as `experimental` with `plannedIn: T11` for exactly that reason, and
a test asserts it is not reported as implemented.

**Behavior implemented.**

1. **The workspace envelope** (`packages/schema/schema/topoir.v1alpha2.schema.json`). `DiagramWorkspace` with `sources`, `entities`, `models`, `styles`, `views` and `viewSets`. Models carry a `family` discriminant selecting the body schema. Views carry `projection` (include/exclude, `edgePolicy`, collapse, explicit occurrences, connection bindings) and `presentation` (intent, medium, style, composition, constraints, content policy). The family-body vocabulary is reused from v1alpha1 unchanged; only the envelope, identity, projection and presentation layers are new.

2. **The family registry** (`packages/schema/src/families.ts`). `architecture` is `supported`; `process` and `interaction` are `planned` — reserved, with no body schema, and **rejected**. That is the point: a family with no body schema cannot produce a useful diagram, and accepting the document would return an empty result for something an author reasonably expects to work. A test asserts the schema's discriminated-union branches and the registry's accepted list match **in both directions**.

3. **Two checks run before the schema**, because JSON Schema's own messages for them are useless. An unsupported `apiVersion` otherwise reports "must be equal to constant"; an unimplemented family reports "must match exactly one schema in oneOf". `TOP103`, `TOP104` and `TOP105` say what is wrong, what is accepted, and which task will deliver what is missing.

4. **Generated authoring types with a real drift test.** `packages/schema/scripts/generate-workspace-types.mts` emits `src/workspace-types.ts` from the schema; `pnpm --filter @topoir/schema generate` refreshes it; a test regenerates in memory and fails if the file differs. Verified load-bearing by adding a property to the schema without regenerating — the test failed — then reverting. The types are exported namespaced as `v1alpha2` because `Direction`, `NodeVisual`, `DesignTokens` and `GroupLayout` exist in both languages; they are the same shapes today, but they are separate wire contracts and merging them would let a v1alpha1 change silently alter v1alpha2.

5. **Discovery reports both languages and all three families** with their real status, derived from the schema registry rather than restated.

**A real ambiguity the tests surfaced.** `architecture` is both a *family* (the semantic
model) and a *composition* (the layout strategy that arranges one). The capability registry
asserted globally unique ids and failed. The correct invariant is uniqueness **per kind** —
a caller asks for a composition or a family, not for a bare name — so the assertion was
corrected to state that, with a further test asserting the two entries are genuinely
different. This is a corrected invariant, not a relaxed one: the original rule was wrong.

**Files added:** the v1alpha2 schema, `src/families.ts`, `src/workspace.ts`,
`src/workspace-types.ts` (generated), `scripts/generate-workspace-types.mts`,
`test/workspace.test.ts` (25 assertions), `fixtures/workspace/` (3 documents + README).
**Changed:** `src/index.ts`, `src/diagnostics.ts` (`TOP103`–`TOP105`),
`core/src/capabilities.ts`, `core/test/capabilities.test.ts`, `docs/diagnostics.md`.

**Verification:**

| Command | Outcome |
| --- | --- |
| `pnpm exec vitest run packages/schema/test/workspace.test.ts` | 25 passed |
| `pnpm check` | build + typecheck clean; **351 tests in 29 files passed** (323 after M1) |
| drift probe | adding a schema property without regenerating fails the drift test |
| `topoir capabilities` | both languages and all three families listed with real maturity |

**Acceptance:**

- *Supplied target examples validate structurally once their body schemas land* — the architecture example validates with zero diagnostics; process and interaction are rejected with `TOP105` naming T21 and T23, which is the correct state until those bodies exist.
- *Unsupported family/version fails clearly* — `TOP103`/`TOP104`/`TOP105`, each naming what is accepted.
- *Generated types and runtime schema cannot drift* — regeneration test, verified load-bearing.

**Remaining defects.** Unchanged from T09. Reference parity remains **0/6 unreviewed**.

**Next ready task: T11** (identities, projection, collapse and migration), which turns the
validated envelope into something the compiler can build from.

### T11 — identities, projection, collapse and migration — 2026-09-20

**Task: T11 — identities, projection, collapse and migration. State: complete.**

Baseline commit `9d54255` (T10). No unrelated worktree changes.

**v1alpha2 now compiles.** T10 added structural validation; this adds normalization,
projection and an adapter, so a workspace produces a rendered diagram end to end. Verified
by rendering `fixtures/workspace/architecture.topoir.yaml` through the CLI and inspecting
the result: the drawing is correct, and `Checkout API` — a node with **no local label** —
picked up its name from the entity it references, which is entity-label precedence working.

**Behavior implemented.**

1. **Three kinds of identity, separated** (`core/src/workspace/normalize.ts`). An *entity* is a real-world thing, a *model element* is that thing's role in one family, an *occurrence* is one appearance in one view. Label precedence is local label, then the referenced entity's label, then the element id — so an element can borrow its identity's name without restating it, and an element with no label is still identifiable rather than blank. A test asserts a view-local label overrides the display **without changing the entity**.

2. **Reference integrity the schema cannot express**: duplicate ids per namespace, entity and model and view-set references, provenance citing a declared source, and acyclic style inheritance. `TOP253`–`TOP257`.

3. **`edgePolicy: exact`** (`core/src/workspace/project.ts`). The review's finding was that including one relationship between two components silently included every other relationship between them, with no way to opt out. `exact` keeps only what was selected and **never** adds one; `induced` remains the default, so existing behaviour is unchanged and switching is the author's decision. The unselected sibling is recorded as `omitted` with the policy named as the reason.

4. **Occurrences, and bindings that are actually required.** An element appearing twice makes every relationship touching it ambiguous. The projector reports `TOP262_CONNECTION_AMBIGUOUS` and **produces no view**, rather than picking an end. A guess here is a coin flip that silently draws the wrong diagram.

5. **Collapse with complete coverage.** A collapsed boundary's contents become `representedBy` entries pointing at the summary, not omissions. A relationship with both ends inside one summary is represented by it; one crossing the boundary is rewritten to meet the summary. A test asserts **every** model element appears in the coverage report.

6. **Migration** (`core/src/workspace/migrate.ts`). Translates, and nothing more. It invents no entities and no provenance — a test asserts `entities` is absent after migrating a document that declared none. `layout.aspectRatio` is **not** turned into a medium, because a medium needs real dimensions and inventing them would put a size in the document the author never wrote; it is reported as `TOP271` instead. Selection migrates to `induced`, because that is what v1alpha1 does and migrating to `exact` would change which relationships appear.

7. **One compilable shape behind both languages** (`sdk/src/index.ts`). `loadCompilable` returns view ids and a projector; nothing below that line knows which language ran. This replaced an earlier draft that faked a `NormalizedDocument` — which would have broken as soon as anything downstream read a field the fake did not have.

**Files added:** `core/src/workspace/{normalize,project,migrate,index}.ts`,
`core/test/workspace.test.ts` (30 assertions). **Changed:** `core/src/index.ts`,
`sdk/src/index.ts`, `schema/src/diagnostics.ts` (11 codes), the v1alpha2 schema (real
property schemas in union branches, replacing `true` placeholders that generated as
`unknown`), regenerated `workspace-types.ts`, `core/src/capabilities.ts`, `docs/diagnostics.md`.

**Verification:**

| Command | Outcome |
| --- | --- |
| `pnpm exec vitest run packages/core/test/workspace.test.ts` | 30 passed |
| `pnpm check` | build + typecheck clean; **381 tests in 30 files passed** (351 after T10) |
| render comparison | all 20 byte-identical |
| CLI render of a v1alpha2 workspace | correct drawing, inspected |

**The strongest migration assertion.** Every published v1alpha1 document — 20+ examples,
showcases and fixtures — is migrated and its **element inventory compared for equality**
against the source. That cannot pass by spot-checking fields; it fails if migration drops,
renames or invents a single element. A second test round-trips a migrated workspace back
through the v1alpha2 loader and asserts zero errors.

**Discovery updated honestly.** `topoir.dev/v1alpha2` stays `experimental`, now with
`plannedIn: T25`, and its summary says what it does and does not do: it compiles
architecture models, and it has no acceptance corpus of its own and no revision or export
operation that accepts it. Calling it implemented would overstate it.

**Carried work.** The CLI has no `migrate` command; the roadmap explicitly defers that
("SDK migration operation, CLI later"), and `migrateToWorkspace` is exported from the SDK.

**Remaining defects.** Unchanged. Reference parity remains **0/6 unreviewed**.

**Next ready task: T12** (presentation plan, medium and constraints). Its dependencies T10,
T11 and T07 are complete, and it is what makes the `presentation` block executable rather
than merely validated.

### T12 — presentation plan, medium and constraints — 2026-09-20

**Task: T12 — presentation plan, medium and constraints. State: complete.**

Baseline commit `a2e2241` (T11). No unrelated worktree changes.

**Boundary focus works.** This is the last of the twelve review defects to move from
*reported* to *fixed*. T04 could only say "accepted but not applied"; the boundary is now
drawn with the accent stroke at emphasis weight and a bold accent title. Verified by
rendering `fixtures/review/group-focus.topoir.yaml` and inspecting it: the Platform
boundary is visibly emphasised where before the SVG was byte-identical to the unfocused one.

**Behavior implemented** (`core/src/presentation/plan.ts`).

1. **Every accepted field lands in exactly one bucket** — `executable`, `advisory` or `unsupported` — and the compiled plan carries the list with a note explaining each. `intent.question` is advisory *by design* and says so; `composition.candidates` is unsupported, reports `TOP252` naming T19, and is not silently honoured as one candidate.

2. **The medium is always concrete.** An undeclared medium gets an explicit default rather than being left unknown. A fixed-size medium with no dimensions gets its kind's conventional size — an author who writes "slide" has said enough, and rejecting that would be pedantry. A slide normalizes to a fixed pixel canvas for fitting purposes.

3. **The effective text minimum is explicit and cannot be talked down.** It is the larger of what the caller asked for and what the audience demands, so a caller cannot make executive-deck text smaller by naming a number. Audience floors are monotonic from engineering through presentation, which a test asserts rather than trusting the literal values.

4. **Constraints compile, and contradictions name their ids.** Unstated strength is `required`: an author who states a constraint and no strength has stated a requirement. Three contradiction classes are detected — opposed orderings, an ordering fighting a relative placement, and alignment fighting an ordering on the same axis — and each message names **every constraint id involved** and what they disagree about. An author told only "layout failed" has nothing to act on.

5. **Disagreeing *preferred* constraints are not contradictions.** They are a ranking question, and reporting them as errors would make the softer strength useless. Asserted.

**Files added:** `core/src/presentation/plan.ts`, `core/test/presentation.test.ts` (29
assertions). **Changed:** `renderer-svg/src/build-scene.ts` (boundary focus),
`core/src/capabilities.ts`, `core/src/index.ts`, `sdk/src/index.ts`,
`schema/src/diagnostics.ts` (`TOP263`, `TOP264`), `docs/diagnostics.md`, plus two test files
converted below.

**Three T04 tests converted, not deleted.** They asserted boundary focus was *unapplied*;
T12 applied it, so they began failing — which is the mechanism working. Each was rewritten
to assert the new truth, and the replacements are **stronger**: the end-to-end test now
checks that the two SVGs genuinely differ and that the focused boundary's stroke width
exceeds the unfocused weight, rather than merely checking a warning was emitted. The
registry entry for `design.focus` moved from `unsupported` to `implemented` with its
`plannedIn` removed, and a test asserts that, so registry and behaviour cannot drift apart.

**Verification:**

| Command | Outcome |
| --- | --- |
| `pnpm exec vitest run packages/core/test/presentation.test.ts` | 29 passed |
| `pnpm check` | build + typecheck clean; **408 tests in 31 files passed** (381 after T11) |
| render comparison | all 20 byte-identical |
| boundary focus render | inspected; the focused boundary is visibly emphasised |

**Why no golden changed, checked rather than assumed.** Nine published examples use
`design.focus`, and every one of them targets a **component**, never a boundary. So
byte-identical output is the correct outcome for this change, not a coincidence — the code
path that changed is not exercised by any golden. The behaviour is covered by the
`group-focus` fixture instead.

**Carried work.** `compilePresentation` runs and reports, but its compiled constraints are
not yet handed to layout — nothing places components to satisfy an `order` or
`place-relative` constraint. That is **T16** (primary path and supporting regions) and
**T19** (candidate fitting). The plan is produced and validated; acting on it is those
tasks. Recorded here rather than implied by the task being marked complete.

**Remaining defects.** All twelve review defects are now fixed rather than merely reported.
Reference parity remains **0/6 unreviewed**.

**Next ready task: T13** (resolved style grammar and reusable rules). Its dependencies T08,
T10 and T12 are complete, and it owns the dark-canvas cascade defect class T09 recorded.

### T13 — resolved style grammar and reusable rules — 2026-09-20

**Task: T13 — resolved style grammar and reusable rules. State: complete.**

Baseline commit `6f28de5` (T12). No unrelated worktree changes.

**Headline result: all nine invisible-text cases T09 found are fixed, and no golden changed.**
The generalization corpus went from 30 failures to **21** — the 20 pre-existing soft
failures plus the single clipped edge label, which belongs to T18/T19.

**Two real bugs, both of the same shape: two tokens from different groups paired by
position rather than by contract.**

1. **A component with no surface of its own.** An icon-style component has no card behind its label — the label sits on the page. Its colour was taken from the component token group anyway, so a theme that darkened the canvas without restating component text carried a near-black inherited colour onto a dark page. `componentTextColor` now resolves it against the surface the label is actually painted on.

2. **A route compartment painted in the canvas colour, labelled in the component's colour.** Same failure, different pair. Found only by chasing the cases the first fix did not resolve.

**How I got there, including the wrong turn.** The first attempt applied the cascade
**theme-wide**, on the assumption that an icon theme means fill-less components. The corpus
immediately disagreed: failures went **30 → 31**. An icon theme still draws a *replicated*
component as a stack and honours an explicit `visual.shape`, so a theme-wide rule was wrong
in both directions — it stripped the tint from components that did have surfaces. The rule
is per **component**, resolved from the shape that component actually takes. That took it to
24, and the compartment fix to 21.

**A second correction, prompted by a golden diff.** Making compartment text unconditionally
take the canvas colour fixed the dark case but changed `trust-zones`, which uses the light
`technical-clean` pack where the kind-tinted compartment text was perfectly readable. That
tint is a deliberate design choice, and discarding it to fix an unrelated case would have
been me imposing a preference. `readableTextOn` keeps the preferred semantic colour wherever
it is readable and falls back to the surface's own colour only where it is not — which is
the documented precedence, semantic colour first with the accessibility floor enforced.

With that, **both** golden diffs disappeared. That is the correct outcome, not a lucky one:
`paired-regions` uses the built-in light icon pack, whose dark-on-white labels were never
broken, so nothing about it should change. My earlier note calling that a "latent bug" was
wrong — `#172033` versus `#172B4D` is a design nuance, not a defect.

**Also implemented** (`core/src/style/resolve.ts`):

- **Deterministic layering** — family defaults → pack → workspace named style → view tokens. A named style chain is walked to its root before merging, so declaration order cannot change the answer; asserted by resolving the same chain forwards and reversed.
- **Authored-token tracking**, so the cascade can tell an inherited value from a deliberate one. An explicitly authored text colour is never overruled; the scene check reports it if nobody can read it.
- **Semantic roles rather than literal colours.** `semanticTreatment` returns a role, a colour, a *marker* and an opacity. A muted failure keeps its role, its colour and its dashed marker, and only dims — which is what keeps a legend's mapping intact. Each status has a distinct marker, so meaning does not rest on colour alone. Status outranks focus, because a failure is not decoration.

**Files added:** `core/src/style/resolve.ts`, `core/test/style.resolution.test.ts` (29
assertions). **Changed:** `core/src/theme.ts` (`hasOwnSurface`, `componentTextColor`,
`readableTextOn`), `renderer-svg/src/component.ts`, `renderer-svg/src/build-scene.ts`
(authored-kind threading), `core/src/index.ts`.

**Verification:**

| Command | Outcome |
| --- | --- |
| `pnpm exec vitest run packages/core/test/style.resolution.test.ts` | 29 passed |
| `pnpm check` | build + typecheck clean; **437 tests in 32 files passed** (408 after T12) |
| render comparison | **all 20 byte-identical** |
| `pnpm benchmark:generalization` | **21 failures, down from 30**; zero `TOP442` remaining; 239/240 compile clean |

**Acceptance:**

- *Inheritance is deterministic and acyclic* — order-independence asserted; acyclicity enforced at T11 and asserted there.
- *Equivalent empty overrides are equivalent* — asserted for **every** built-in pack, and for an empty workspace style against its pack.
- *Semantic marker/colour mapping survives focus and muting* — asserted, including that muting changes only opacity.
- *Generated style previews pass scene QA* — asserted at the resolution layer for every pack and every kind it styles, **and** for a darkened extension of every pack, not only the two the generator happened to produce.

**Remaining defects.** One generated case (0165) still paints an edge label 12px off the
canvas; that is placement, for T18/T19. The 20 soft geometry failures are unchanged.
Reference parity remains **0/6 unreviewed**.

**Next ready task: T14** (V2 acceptance profiles and candidate quality vector). Its
dependencies T09 and T12 are complete.

### T14 — V2 acceptance profiles and candidate quality vector — 2026-09-20

**Task: T14 — V2 acceptance profiles and candidate quality vector. State: complete.**

Baseline commit `3bb1320` (T13). No unrelated worktree changes.

**Behavior implemented** (`core/src/quality/acceptance.ts`, surfaced as `CompiledView.quality`).

1. **Three questions, answered separately.** `valid` is about the model; `completion` is about whether the work finished; `accepted` is about whether the scene meets the requested bar. `ok` conflated all three, so a caller could not distinguish a diagram that is *correct* from one that is merely *drawable*. The legacy field keeps its previous meaning and is reported alongside.

2. **A timeout can never be `complete`.** Completion is derived from whether the run finished and how many of the requested views were produced, independently of how good the partial result looks.

3. **One gate order for every family**: `semantic` → `visible` → `legibility` → `contrast` → `fit` → `ownership` → `readability`. The review found architecture ranking defect count before score while topology and panels used a weighted score, so one family could trade away a constraint another treated as inviolable. `blockedAt` names the **earliest** failing gate, not the loudest. Readability is an optimisation objective and never blocks — crossings and density are things to minimise, not limits to fail on.

4. **Profiles change the bar, not the drawing.** A test asserts the same document produces **byte-identical artifacts** under `draft` and `publication`, with only `accepted` differing. `draft` requires truth and completeness; `presentation` adds legibility, contrast, fit and ownership; `publication` raises contrast to WCAG AA.

5. **Acceptance cannot be suppressed.** It is computed from violations, so removing diagnostics from a list does not turn a failure into a success.

6. **The candidate vector is lexicographic, not weighted.** Eight terms, each considered only when every earlier one ties, with the candidate id breaking exact ties so the winner is reproducible. A weighted score is exactly what lets a candidate buy its way past a hard rule by scoring well elsewhere; a test asserts a candidate with `readability: 10000` beats one with a single semantic failure, and that a beautiful candidate which drops a relationship loses to a plain one that keeps everything.

7. **Absent metrics stay absent.** A metric the compiler did not report is omitted from the grouped report rather than defaulting to zero. T04 removed that conflation from the benchmarks; this keeps it out of the result contract, where a missing check reading as a clean score is how an unimplemented gate becomes a passing grade. A reported zero is kept; an unreported one is absent, and a test distinguishes them.

**Files added:** `core/src/quality/acceptance.ts`, `core/test/acceptance.test.ts` (24
assertions). **Changed:** `core/src/index.ts`, `sdk/src/index.ts` (`CompileOptions.profile`,
`CompiledView.quality`), `schema/src/diagnostics.ts` (`TOP460`, `TOP461`),
`sdk/test/review-regression.test.ts` (+4), `docs/diagnostics.md`.

**Verification:**

| Command | Outcome |
| --- | --- |
| `pnpm exec vitest run packages/core/test/acceptance.test.ts` | 24 passed |
| `pnpm check` | build + typecheck clean; **465 tests in 33 files passed** (437 after T13) |
| render comparison | all 20 byte-identical |

**Acceptance:**

- *Artifact existence never implies acceptance* — asserted end-to-end on the seed-154 ribbon: the artifact exists, geometry is legal, `valid` is true, `completion` is complete, and `accepted` is **false** with a named blocking gate.
- *Missing metrics are not zero* — asserted in both directions.
- *All families use the same hard-rule ordering* — one `GATE_ORDER` constant, no family parameter.
- *Profile failures produce diagnostic previews* — a rejected result still carries its artifact and its violations, rather than returning nothing.

**Carried work.** `candidateVector` and `rankCandidates` define the contract and are tested
against adversarial pairs, but the compiler still produces **one** candidate, so nothing
ranks yet. Generating a shortlist is **T19**; `composition.candidates` is reported as
unsupported by T12 and this does not change that. The `stabilityCost` term is defined and
always zero until **T29** supplies prior geometry.

**Remaining defects.** Unchanged from T13: one generated case with a clipped edge label
(T18/T19), 20 soft geometry failures. Reference parity remains **0/6 unreviewed**.

**Next ready task: T15** (separate composition from ELK translation), which closes M2.

### T15 — separate composition from ELK translation — 2026-09-20

**Task: T15 — separate composition from ELK translation. State: complete.**

Baseline commit `05edfb3` (T14). No unrelated worktree changes.

**What was wrong.** Planning, placement, routing and refinement lived in one 940-line module
alongside the ELK translation. None could be reasoned about, replaced or tested
independently, and "can this backend honour a required ordering constraint?" had no answer
short of reading it. A caller could hand a backend a constraint it silently ignored, and the
result would look like a layout that simply chose not to obey.

**Behavior implemented.** New `@topoir/layout` package owning the contract:

1. **A backend declares what it supports** — which constraint types it can enforce, and whether it does containment, routing, explicit attachment sites, multiple candidates and stable re-layout. The composition backend declares containment, routing and attachments **true**, and constraints, candidates and stability **false**. That is the honest answer, and saying it out loud is the point of the task.

2. **A required constraint the backend cannot enforce fails, and no layout is attempted.** Returning geometry that ignored it would misreport what was honoured and leave the caller no way to tell. A **preferred** one it cannot enforce is a warning and layout continues — a preference not being met is a legitimate outcome, but the caller is still told rather than left to infer it from the picture. Same for a supplied prior layout or a candidate count the backend cannot act on.

3. **`layout-elk` is untouched** and wrapped as one backend among others. `OrchestratedLayoutEngine` implements the existing `LayoutEngine`, so every current caller keeps working; passing a request is how a caller opts into admission without a breaking change.

4. **The SDK routes through the orchestrator** when no custom engine is supplied, handing it the constraints T12 compiled. A caller's own `LayoutEngine` still bypasses it, which is what makes the hostile-geometry probes in the review fixtures continue to work.

**Files added:** `packages/layout/` (`package.json`, `tsconfig.json`, `README.md`,
`src/backend.ts`, `src/orchestrate.ts`, `src/index.ts`, `test/backend.test.ts` — 16
assertions). **Changed:** `sdk/src/index.ts` and its manifest,
`schema/src/diagnostics.ts` (`TOP470`, `TOP471`), `core/test/dependencies.test.ts` (new
layer tier), `docs/diagnostics.md`.

**Verification:**

| Command | Outcome |
| --- | --- |
| `pnpm exec vitest run packages/layout/test/backend.test.ts` | 16 passed |
| `pnpm check` | build + typecheck clean; **481 tests in 34 files passed** (465 after T14) |
| render comparison | all 20 byte-identical |
| dependency direction test | passes with `@topoir/layout` in its own tier above `layout-elk` |

**Acceptance:**

- *Backend capabilities are explicit* — declared per backend and asserted, including that the composition engine does **not** claim constraints, candidates or stability.
- *Unsupported hard constraints fail* — asserted that no geometry is produced, and separately that a preferred constraint warns and continues.
- *No dependency cycle* — the existing test covers it, with the layer table extended.
- *Current layout remains available through adapter* — `OrchestratedLayoutEngine` satisfies `LayoutEngine`; every render is byte-identical.

**Carried work.** This separates the *contract* from the ELK translation. It does not yet
split `composition.ts` itself into planning, placement, routing and refinement modules — the
940 lines are still one file behind the backend interface. Doing that is only useful once
something varies those stages independently, which is **T16** (request-spine strategy) and
**T18** (portals and routing lanes). Recorded rather than implied by the task being complete.

### M2 gate — versioned semantics and executable presentation — 2026-09-20

**Gate: M2. State: complete.**

Exit criterion: *"V2 contracts can represent and inspect architecture, process and
interaction without forcing all semantics into a topology graph. Examples and registry agree
with implemented maturity."*

| Clause | Evidence |
| --- | --- |
| V2 contracts represent all three families without forcing graph semantics | T05's fixtures build **one** `ComponentPlan` structure for a gateway route table, a process decision and an interaction participant, with three distinct silhouettes, three attachment roles and identical key sets. Asserted, not argued |
| Examples and registry agree with implemented maturity | Verified directly: `architecture` loads; `process` and `interaction` are rejected with `TOP105_FAMILY_NOT_IMPLEMENTED`, exactly matching the registry's `unsupported` with `plannedIn` T21 and T23 |

**An ambiguity worth naming rather than resolving in my own favour.** "Represent and
inspect" could be read as requiring *document body schemas* for process and interaction. It
cannot mean that here: T21 and T23 implement those bodies and are M4 tasks, so no M2 task
delivers them. On the narrower reading — that the component, scene and presentation
contracts accommodate all three families — the criterion is met and tested. On the wider
reading it is not, and would not be until M4. Both readings are recorded so a later agent is
not misled by "M2 complete".

**Tally across M0–M2:** tests 91 → 481, in 34 files. All 20 example and showcase renders are
byte-identical to the goldens, with the single deliberate, inspected exception from T01.
Generalization improved from 30 failures to **21** (T13 fixed all nine invisible-text cases).
All twelve original review defects are fixed rather than reported.

**Outstanding gate, unchanged and not claimed:** reference parity is **0/6, `unreviewed`**.

**Next ready task: T16** (primary path and supporting regions), which opens M3. Its
dependencies T15 and T12 are complete.

### T16 slice 1 — request spine analysis — 2026-09-20

**Task: T16 — primary path and supporting regions. State: in_progress.**

Baseline commit `a8377dd` (T15). No unrelated worktree changes.

**Read the acceptance table below before relying on this. One of the three criteria is
measurably not met, and I am not claiming it.**

**Behavior implemented** (`packages/layout/src/spine.ts`). Layering treated every
relationship as forward progress, so a callback pushed its target a band further along and
the primary flow stopped reading in the order it happens in. `analyzeSpine` separates three
roles — **spine** (advances the path), **branch** (leaves it, such as a write to state) and
**feedback** (runs backwards) — and `orderingExclusions` gives placement the set that must
not influence layer assignment. Feedback relationships are still drawn, routed and counted.

A write to state does not extend the primary path, which is why a three-tier system reads
left to right rather than with the database in the middle of the flow. Components reached
only by branches are classified as supporting.

**Acceptance, measured:**

| Criterion | State | Evidence |
| --- | --- | --- |
| Pockito gateway route order correct, identity has a supporting region | **Met** | Spine reads `web-app → traefik → pockito-api → pockito-core → postgresql`, monotonic left to right. `keycloak` is classified supporting and placed outside the spine's y-band. Route order preserved — the render is byte-identical |
| Impossible monotonic paths are reported | **Met** | `TOP472_MONOTONIC_PATH_IMPOSSIBLE` names the cycle so an author knows which relationship to break, and fires only when the cycle is among the *constrained* components |
| Trust-zone primary flow reads in the requested progression | **NOT met** | Measured: the spine is `customer → edge → lb → frontend → core → f5 → card-core`, but the placed x-order is `customer@52, edge@322, f5@712, card-core@954, frontend@1059, core@1342, lb@1648`. Not monotonic |

**Why the trust-zone criterion fails, and what it needs.** The spine crosses trust-zone
boundaries, and `banded` arranges *within* each group independently — nothing orders the
groups themselves by where the spine enters them. Fixing it means making group placement
respect the spine, which is a substantive layout change rather than a parameter.

**Two bugs in my own analysis, both found by probing rather than by the tests I had written.**
The first tests only covered acyclic fixtures, and both bugs needed a cycle:

- On a cycle, the longest-chain walk returned the repeated component, so the spine contained it **twice**. The index map then took its *last* position, which marked the real request as feedback and the callback as forward progress. A probe showed the result placing `api` last where plain layering placed it second — strictly worse than doing nothing.
- With that fixed, a pure cycle still picked its start alphabetically, producing a spine running **backwards** through the model with the same consequence. Start selection now prefers entry-point kinds and low in-degree. Both cases are now tests.

**The exclusion is correct and currently inert, measured rather than assumed.** Across all
240 generated cases, soft-defect totals with and without spine exclusion are **identical
(129 vs 129), with zero cases differing**. Of 23 published views, two contain feedback
relationships and both use compositions (`sequence`, `comparison`) that do not go through
`banded`. So the mechanism changes nothing today. It is wired because it is correct and free,
not because it has demonstrated a gain — and that distinction is recorded rather than
presented as an improvement.

**Files added:** `packages/layout/src/spine.ts`, `packages/layout/test/spine.test.ts` (17
assertions). **Changed:** `layout-elk/src/banded.ts` and `composition.ts` (optional exclusion
set, empty by default), `layout/src/orchestrate.ts`, `layout/src/backend.ts`,
`sdk/src/index.ts`, `schema/src/diagnostics.ts` (`TOP472`).

**Verification:**

| Command | Outcome |
| --- | --- |
| `pnpm exec vitest run packages/layout/test/spine.test.ts` | 17 passed |
| `pnpm check` | build + typecheck clean; **498 tests in 35 files passed** (481 after T15) |
| render comparison | all 20 byte-identical |
| corpus A/B, spine vs plain | 129 vs 129 soft defects, 0 cases differing |

**Remaining for T16:**

- **Group-level spine ordering** — place boundaries by where the spine enters them, which is what the trust-zone criterion needs.
- **Explicit supporting bands** — supporting components are classified but not placed in a reserved band. Pockito's identity lands outside the spine band emergently, not by design.
- **Branch/feedback decomposition and mixed local orientation** — not started.

**Next ready task: T16 slice 2.** T17 also depends on T15 and T11 and is ready if the
placement work is deferred.

---

## T16 slice 2 — reading order across siblings (2026-09-20)

**State: the trust-zone progression criterion is now met and pinned by a test.** The
criterion I recorded as unmet in slice 1 is met; two further slices of T16 remain.

### What the diagram actually looked like

Rendering the showcase rather than reading coordinates showed a worse problem than
"non-monotonic x". The author's own story is
`customer → edge → lb → frontend → core → f5 → card-core`, and the drawing placed it
`customer@52, edge@322, lb@712, frontend@1373, core@1656, f5@712, card-core@954` — the
numbered path ran left, far right, down and back nearly a thousand pixels. Two distinct
causes, both real:

1. **`panels()` never consulted sibling `order` at all.** Its child list was every boundary
   followed by every component, in source order. The load balancer — step 3 — was drawn to
   the right of steps 4 and 5 because it is not a boundary. `banded()` had a comparator;
   the panel families had none.
2. **The `architecture-map` root shape was hard-coded** to one lead region on the left with
   every other region stacked in a column beside it. That puts the deepest component of the
   largest region at maximum x, so the next step — in the region below — is a long journey
   back, and every connector leaving that component crowds one face of it.

### What landed

- `packages/layout-elk/src/ordering.ts`, new: one comparator for reading order, used by
  both families. A declared `order` ranks a sibling **against other siblings that also
  declare one**; otherwise the sibling the primary path reaches first comes first; otherwise
  declared order, then id. Entry position is the **earliest** member, so a boundary is
  ranked by where it is entered.
- `bestRowSplit`: the architecture-map root wraps regions into the rows that come closest to
  the author's target ratio, keeping reading order within and across rows.
- `banded()` and `panels()` both take `OrderingHints { excludeFromOrdering, spine }`.

Measured after: `52, 322, 52, 713, 997, 1399, 1642` — one backward step, the row wrap, and
it returns to the left margin. Ratio 1.70 → 1.84 against a 2.10 target.

### Three things the evidence said I had got wrong

These are the substance of the slice.

**1. An inferred spine must not reorder siblings.** Wiring the spine through unconditionally
moved the generalization corpus 21 → 20 failures, which looks like a win and is not one. The
detail: `case-0165`'s hard `TOP452_MARK_CLIPPED` error and `case-0084` were fixed, but
`case-0033` and `case-0239` began failing and `case-0006` (2→4) and `case-0177` (6→13, plus a
label overlap) got worse. No corpus case authors a story, so every one of those spines was
*inferred*. On a mesh the longest advancing chain is an artefact of the graph, not a reading
order, and using it to override the barycenter — which is measurably shortening connectors —
is not justified. `SpineAnalysis.source` now records `authored` vs `inferred` and only an
authored story is offered as a reading order, via `readingOrder()`. Feedback exclusion still
applies either way, because a cycle-closing relationship is not forward progress however the
path was found. **The corpus is now byte-identical to baseline (21 failures, same cases).**

**2. Ordering by the path across the reading direction broke a reference diagram.** With the
authored-only gate in place, `pockito-reference` — which also declares a story — went from
**0 edge crossings to 2**. Its cluster is a *layered* container, where the sibling sort is
the band *across* the flow: every sibling there is at the same point along the path, so path
position is meaningless and the barycenter it displaces is the thing minimising crossings.
The rule lifted the API boundary above a sibling component purely because the path entered
it. `ordersAlongReading()` now restricts path ordering to sequences running the same way the
reading does, and excludes layered containers outright. Pockito is back to 0 crossings and
byte-identical, and `packages/sdk/test/progression.test.ts` pins it.

**3. Adding route separation to the panel families was wrong and was reverted.** The
intermediate arrangement produced a `TOP425_EDGE_SEGMENTS_COINCIDENT` between `invoke` and
`partner-call`, and I added the `separateCoincidentRoutes` pass that every other family runs.
Justification by consistency did not survive measurement: across the trust-zone content at
eight aspect targets the pass changed exactly one result and made it **worse** (2 coincident
segments became 3), because `separateOnce` reroutes through a grid search tuned to banded
obstacles. The row change had already removed the real coincidence. Reverted, with the reason
recorded in the code.

### A vacuous test I wrote and then fixed

`spineEntry` "is the earliest member" passed against an implementation that kept the **last**
match, because the fixture happened to list the late member first. Caught by breaking the
code deliberately. The test now asserts both member orderings.

### Verification

| Command | Outcome |
| --- | --- |
| `pnpm check` | build + typecheck clean; **530 tests in 37 files passed** (498 after slice 1) |
| render comparison, 20 examples + pockito png/svg/manifest | only `showcase/trust-zones.png` changed; inspected and regenerated |
| `pnpm benchmark:generalization` | 21 failures — **identical case list to baseline** |
| `pnpm benchmark:references` | deterministic; parity still `unreviewed` 0/6 |
| load-bearing checks | 5 deliberate breaks; 4 caught immediately, 1 exposed the vacuous test above, which was then strengthened and re-verified |

**Files added:** `packages/layout-elk/src/ordering.ts`,
`packages/layout-elk/test/ordering.test.ts` (22), `packages/sdk/test/progression.test.ts` (5).
**Changed:** `layout-elk/src/banded.ts`, `composition.ts`, `index.ts`, `layout/src/spine.ts`
(`source`, `readingOrder`), `layout/src/orchestrate.ts`, `layout/test/spine.test.ts` (+5).

### Honest remaining state of this diagram

The progression reads, but the showcase is not a finished picture. Measured and visible:
the canvas is sparse toward the bottom right, the shape is 1.84 against a 2.10 target, and
`External locations` opens a third row for a single component. Panel layouts can still
produce coincident routes that nothing removes — 2 on this content at a 1.6 target — which
belongs to T18/T19 routing, not here.

### Remaining for T16

- **Explicit supporting bands** — supporting components are classified but not placed in a
  reserved band. Pockito's identity lands outside the spine band emergently, not by design.
- **Branch/feedback decomposition and mixed local orientation** — not started.

**Carried, unchanged:** constraints compiled but not consumed by layout (T19);
`composition.ts` not split into stages (T18); one candidate produced despite candidate
ranking existing (T19) — the architecture-map row split is chosen by aspect alone and is not
part of candidate ranking; `stabilityCost` always 0 (T29); no CLI `migrate` command; groups,
annotations and edge labels have no ComponentPlans;
`examples/rendered/showcase/custom-assets.png` still stale from before T01.

**Outstanding human gate: reference parity 0/6 `unreviewed`.** Only a person may add records
to `benchmarks/reference-reviews.json`. Nothing in this slice changes that, and no visual
approval is claimed for the trust-zone change — it is supported by measurements and by the
rendered comparison above, not by a recorded review.

**Next ready task: T16 slice 3 (supporting bands).** T17 also depends on T15 and T11 and is
ready.

---

## T16 slice 3 — supporting components hang off their owner (2026-09-20)

**State: T16's three acceptance criteria are met.** Trust-zone primary flow reads in the
requested progression (slice 2); Pockito gateway route order stays correct and is pinned;
impossible monotonic paths are reported (`TOP472`, slice 1). Identity having a *supporting
region* is now by construction rather than emergent.

### What changed

`analyzeSpine` gained `anchors`: for each component off the primary path, the component it
hangs off — the source of an incoming branch, preferring one on the path, then the earliest
position, then the id, so it is stable and independent of declaration order. A store written
by both a spine component and a supporting one anchors to the spine component, which is the
one the reader is following.

`alignToAnchors` (in `ordering.ts`, shared by `banded` and `panels`) then slides a supporting
sibling into its anchor's column. Only an unambiguous improvement is made: the anchor must be
a sibling in the same container, already placed in an earlier row, and the target cell must
be free. It can shift a component but never displace one, and never leaves two in a cell.

Unlike the reading order, anchors are offered **whatever the path's provenance** — a write to
a store is a branch off whatever writes to it however the path was found — so this is not
gated on an authored story.

Measured on the showcase: session cache moved under Agent front and context store under Agent
core (both previously below whichever sibling shared their column), and edge crossings went
**10 → 9**. The dashed state connectors are now short vertical drops instead of diagonals
across the boundary.

### A bug the first attempt had

Two stores packed side by side each want the column of the service above them, and considered
once in order the first is blocked by the second, which has not moved yet. A single pass left
the session cache where it started. Alignment now iterates to a fixed point, and a test
asserts both stores land in distinct correct cells rather than only checking one.

### Verification

| Command | Outcome |
| --- | --- |
| `pnpm check` | build + typecheck clean; **544 tests in 37 files passed** (530 after slice 2) |
| render comparison, 20 examples + pockito png/svg/manifest | only `showcase/trust-zones.png` changed; inspected and regenerated |
| `pnpm benchmark:generalization` | 21 failures — **identical case list to baseline** |
| load-bearing check | disabling alignment fails 2 tests, including the end-to-end showcase assertion |

**Changed:** `layout/src/spine.ts` (`anchors`), `layout/src/orchestrate.ts`,
`layout-elk/src/ordering.ts` (`alignToAnchors`), `banded.ts`, `composition.ts`.
**Tests:** `layout/test/spine.test.ts` (+6), `layout-elk/test/ordering.test.ts` (+7),
`sdk/test/progression.test.ts` (+1).

---

## Human visual audit of the trust-zone render (2026-09-20)

A reviewer supplied a written audit of the slice-2 render at `.tmp/audit/`. **That path is
gitignored, so the findings are recorded here to survive.** This is review *evidence*, not a
parity verdict: no record was added to `benchmarks/reference-reviews.json`, reference parity
stays **0/6 `unreviewed`**, and only the reviewer may change that.

Its headline judgement: the output reads as *an automatically laid-out architecture diagram
rather than a deliberately composed technical graphic*, and the fix is a better semantic
intermediate representation rather than more decoration. It named the composition order the
engine should use — **narrative first, semantic groups second, branches third, components
last** — which is the T16 thesis arrived at independently.

It also independently prescribed slice 3: *"Session Cache directly below the component that
owns the session interaction; Context Store directly below the component that owns context
access."* That is now implemented and asserted.

### Findings mapped to tasks

| Severity | Finding | Owner |
| --- | --- | --- |
| High | One accent colour carries two meanings: the `External dependency` flow also connects internal components (`remote-api`, `remote-cluster`) inside the GCP zone | **New** — needs an edge-scope check; the example is mis-authored *and* nothing detects it |
| High | Dependency routing is ambiguous — shared purple trunks and T-junctions, reader must trace wires | T18 (junctions, intentional sharing vs accidental coincidence) |
| High | The balancer's two branches (`/app/*` vs `/api/*`) are not self-evident | T18 (portal reservation), T19 (label placement) |
| High | Arrowheads too weak; long connectors read as bidirectional | T18 |
| Med-High | Boundary semantics underspecified — five boundaries, no boundary legend, no distinction between trust/deployment/logical | **New** — boundary kinds are a schema/design-system gap |
| Med-High | "Four trust zones" not self-evident; five boundary-like regions are drawn | Same as above |
| Med-High | Canvas space used inefficiently — dead band below, wide gap between GCP and FDC | T19 (full-page fitting); partially T17 |
| Med-High | Primary path still changes vertical level more than necessary | T16 residual / T19 candidates |
| Med-High | Secondary routes cross the primary application area | T18 |
| Medium | Too many small floating labels, some detached from their edge | T19 |
| Medium | Typography too small for embedded viewing | T19 (chrome-aware medium fitting); `Medium`/`fitToMedium` exist but no minimum-size policy per role |
| Medium | Agent Core's emphasis reads as a UI selection state | T13 residual / design system |
| Medium | Component forms too uniform — type conveyed only by icon | T07 silhouettes exist but are not differentiated by kind |
| Medium | `CARD_CORE` uses a database icon though the name suggests a service | Example data; unverifiable from the image |
| Medium | One-way arrows on state access may overspecify read/write | T21+ semantics |
| Low-Med | The annotation reads as another component | Renderer / design system |
| Low-Med | Legend sits far from the content | T19 |
| Low-Med | Step badges crowd component icons | T01 residual |
| Low-Med | Stroke hierarchy unstable — too many coexisting edge weights | Design system |

**Two findings have no owning task yet** (edge-scope consistency, boundary semantic kinds).
Both are representation gaps rather than layout bugs, which matches the audit's own
conclusion. They are recorded here and need a contract decision before implementation — per
the working rules, that means updating the owning contract and `DECISIONS.md`, not quietly
adding a feature.

### What the audit confirms is already working

Narrative title and subtitle, numbered request flow, an explicit primary spine, zone
grouping, protocol labels, primary/secondary distinction, replica counts, component icons,
restrained colour, a legend, and annotation capability.

---

**Outstanding human gate: reference parity 0/6 `unreviewed`.** `ref-03-trust-zones` maps to
this exact showcase, so its candidate hash moved with slices 2 and 3. Hashes for a record are
printed by `pnpm benchmark:references` into `.tmp/reference-benchmark/report.json`. No
approval is claimed or implied by the audit above — read against the seven-dimension rubric
it reads closer to a rejection, and a `rejected` record would be more useful than none.

**Next ready task: T17** (correspondence, wrapping, overview/detail; depends on T15, T11).

---

## Reference reproduction exercise: exple1 and exple3 (2026-09-20)

Asked to reproduce two reference screenshots with the tool. Both fixtures are committed as
`examples/reference/ref-01-user-trace-pipeline.topoir.yaml` and
`ref-03-agent-request-path.topoir.yaml`, authored coordinate-free from the references per
`docs/visual-benchmark.md` — structure, names, nesting and flows, no hand-placed geometry.

**Result: neither is a usable reproduction.** exple1 is structurally close and honestly
rejected; exple3 is a visual mess that the tool reports as clean. Four findings, in order of
how much they matter.

### 1. The acceptance gate cannot see the worst output (most serious)

The exple3 reproduction compiles to `accepted: true`, `valid: true`, **zero diagnostics**,
4 edge crossings — and is plainly unreadable: three long trunks leave `card-agent-core`,
wrap around the canvas and re-enter other zones, and the F5 connector appears to terminate
beside the component rather than at it.

Route detour was the obvious suspect and is **not** the cause; measured worst case is 2.03x
with only 2 of 15 edges above 2x. So the defect is real, visible, and *not* captured by any
counter the gate consults. Every quality property in the model can be satisfied by a picture
no reader would accept. This is the compilation-success-versus-presentation-quality gap,
demonstrated rather than asserted, and it means the current `accepted` flag overstates what
has been verified. Nothing in the roadmap currently owns "readability the counters cannot
see".

### 2. `architecture-map` rejects endpoint ports outright

The defining feature of exple3 — one router splitting `/ai-agent/app/*` from
`/ai-agent/api/*` to two different services — cannot be drawn. Binding an edge to a port
fails with `TOP402_COMPOSITION_PORT_UNSUPPORTED`, so the fixture had to drop the bindings and
the two routes become indistinguishable lines. The same feature is central to ref-04
(Pockito), whose three gateway routes are its main structure. This is honest (it errors
rather than silently ignoring the binding) but it blocks two of six references. T18's
attachment slice owns it.

### 3. Cross-boundary continuation is unaligned — the cause of the tangle

Placement is per-container and nothing relates the exit point of one region to the entry
point of the next. In the reference, `card-agent-core` sits at the bottom of the application
box with `f5` directly below it in the zone beneath, so the connector is short and straight.
In the reproduction `f5` is at the far left of FDC while its source is mid-right of GCP, so
`legacy` takes 6 bends and 1.73x detour. The same cause produces the two illegal boundary
crossings in exple1, where consumers inside a nested VM reach a topic in the enclosing zone
by leaving that zone and coming back. This is T16's remaining "mixed local orientation",
deferred to T18.

### 4. Component type is carried by the icon alone

`nodeShape` only returns `cylinder` for a database under an `architectural` or `sketch`
theme; under `technical-clean` every component is a card. The references distinguish
cylinders, stacked sheets and logo marks at a glance. The shapes exist and work — the
fixtures had to ask for them explicitly. This matches the audit's "component styling is too
repetitive" finding.

### Fixed in this session: long identifiers broke mid-word

`RC_LoggingSystem_UserTrace_Encryption` rendered as `RC_LoggingSystem_UserTr` /
`ace_Encryption`. An over-long token now breaks after its own separators (`_ - . / : @ +`)
before falling back to graphemes, which is exactly where the reference breaks the same
strings. `trace-e-navi-api-s23u-3as_` / `yyyy-MM-dd-HH` now matches the reference line for
line.

| Command | Outcome |
| --- | --- |
| `pnpm check` | **550 tests in 37 files passed** (544 before) |
| render comparison | **no golden changed** — no shipped example contained a mid-token break |
| `pnpm benchmark:generalization` | identical case list to baseline |
| load-bearing check | reverting to grapheme-only breaking fails 2 tests |

### What the exercise says about priority

The roadmap order (T17 correspondence next) does not match what the references need. On this
evidence the order should be **T18 attachments/portals** (unblocks two references), then the
unowned readability gap in finding 1, then T17. Recorded here rather than acted on: changing
milestone order is a roadmap decision, and `docs/design/09-roadmap.md` plus `DECISIONS.md`
own it.

**Reference parity remains 0/6 `unreviewed`.** These two reproductions are not candidates for
approval; they are evidence of what is missing.

---

## T18 slice 1 — endpoint ports in the panel families (2026-09-20)

Taken ahead of T17 because it unblocks two of the six references; recorded as a deviation
from roadmap order rather than a silent reordering.

### Landed: a declared port is now honoured, not refused

`routeEdges` already looked a declared port up by id and attached to it. The only reason the
panel families could not honour one is that `panels()` emitted `ports: []` for every
component, so there was nothing to find. It now emits real port geometry via the same
`portsFor` the banded family uses.

`TOP402_COMPOSITION_PORT_UNSUPPORTED` now fires only for `sequence`, which draws lifelines
rather than component faces and genuinely has nowhere to attach; its message names the
families that do support ports instead of only saying what failed.

Verified by distance, not by compilation: the connector start lands **0.0px** from the
declared port. `architecture-map`, `swimlanes` and `comparison` are each asserted.

One existing test asserted the refusal. Its guarantee — *a declared port is never silently
discarded* — is now met the stronger way, by honouring the binding, so the assertion was
moved up rather than relaxed; `sequence` still has its refusal pinned.

### Reverted: region entry alignment made the target diagram worse

The tangle in the exple3 reproduction comes from the path leaving one region mid-right and
arriving at a region below whose own packing put the entry component at the far left. I
implemented an alignment pass: slide a region right so its entry component sits under the
component the path arrives from, then re-flow the row.

It worked geometrically — `f5` landed at exactly the same x as `card-agent-core`, `dx=0` —
and made the diagram **measurably worse**:

| | without alignment | with alignment |
| --- | --- | --- |
| edge crossings | **4** | 9 |
| `legacy` detour | **1.73x** / 6 bends | 5.10x / 5 bends |
| bounds | 1728x924 | 1844x924 |

The first version was worse still: widening a region in place let FDC's boundary swallow the
External Locations region beside it, the router treated the pair as one obstacle and sent a
connector around the whole canvas (5.89x, plus 2 illegal boundary crossings). Re-flowing the
row fixed the overlap but not the detour.

**Why it fails:** aligning the entry point is not enough when the corridor between the two
is occupied. `card-agent-core` exits south correctly — the faces were never wrong — but
`Cluster 1` and the anchored note sit directly beneath it inside the zone, so the router goes
around them. The real dependency is **keeping the corridor between a spine exit and the next
region clear of supporting components**, which is a placement change, not an alignment one.

Reverted rather than shipped. The measurements are recorded here so the next attempt starts
from them instead of rediscovering that alignment alone is insufficient.

### Verification

| Command | Outcome |
| --- | --- |
| `pnpm check` | **553 tests in 37 files passed** (550 before) |
| render comparison | **no golden changed** — no shipped example binds an edge to a port in a panel family |
| `pnpm benchmark:generalization` | identical case list to baseline |
| port attachment | 0.0px from the declared port, in all three panel families |
| load-bearing check | restoring `ports: []` fails 3 tests |

**Changed:** `layout-elk/src/banded.ts` (export `portsFor`), `composition.ts`.
**Tests:** `sdk/test/design.test.ts` — refusal test replaced by 3 attachment assertions plus
a narrowed refusal.

### State of the two reproductions

`ref-03` now draws its route split, and still has the trunk tangle: 4 crossings, `legacy` at
1.73x over 6 bends, and a clear corridor is the blocker. `ref-01` is unchanged — structurally
close, honestly rejected for 2 illegal boundary crossings from the same cause, a nested VM
reaching a topic in its enclosing zone.

Neither is a reproduction yet. **Reference parity remains 0/6 `unreviewed`.**

**Next: clear the exit corridor** — supporting components and anchored notes must not sit
between a spine exit and the region the path continues into. That is the blocker both
reproductions now share, and it subsumes the reverted alignment.


## T18 slice 2 — the shape of the whole map, and what the score can see (2026-09-20)

Three changes that turned out to be one problem. The reproduction of reference `exple3` had
a tangle nothing could remove: the connector from the agent core to the gateway below took
six bends and 1.73x the direct distance, going left, down, right, down and left again.
Slice 1 established that aligning the two endpoints does not help while the space between
them is occupied. This is that space.

### 1. The corridor: a loosely-attached sibling must not sit in the path's way out

A container's column count is chosen for the components the author had in mind. A sibling
that does not fit opens a new row — and when the path continues into a region *below*, that
new row is exactly the band the path has to cross. On this content that sibling is
`Cluster 1`, and the anchored note followed it into the same corridor.

The rule is not "hoist whatever wrapped", because some of those siblings are *saying*
something by being there. A session cache drawn directly below the service that writes to it
is placed, not packed: the alignment is how the reader learns whose state it is, and T16
slice 3 exists to put it there. The first version of this rule hoisted those too and took
the trust-zone showcase from accepted to rejected.

The distinction that holds: whether the component it hangs off is **a sibling in this same
container**. Then "below" is a relationship a reader can see, and it stays. `Cluster 1`
hangs off a service nested inside a sibling *boundary*, so its position only ever said
"below the agent application" — which of the six components in there owns it was never
recoverable from the picture. It buys nothing and costs the corridor, so it moves beside.

### 2. Two region shapes, chosen by measurement instead of by decree

The root arrangement had been rewritten once already: regions were a lead region beside a
stack, and became rows, because a stack puts the deepest component of the biggest region at
maximum x and the next step is a long journey back to the left. But rows have the mirror
defect — two regions in the same band read as parallel, and a path leaving one for the other
crosses the whole band. **Neither is a default.** Both are now enumerated and the caller lays
each out and keeps the one that measures better.

A column arrangement also stretches: every region in a column takes the column's width, so
their edges line up into one channel, and a column holding a single region takes the full
height, so a lead region reads as the margin the composition sits beside. Stretching only
ever adds room, so nothing inside a region can be squeezed by it.

Ranking is by shape, which is cheap; it decides only which candidates are worth a full
layout. Five are laid out in full.

### 3. The score now sees the medium

Those two changes made the trust-zone showcase *worse* in a way no counter could explain: 9
edge crossings down to 2, and **rejected**. A wider arrangement wins on crossings and is
scaled down harder to reach the page; past a point the text falls under the medium's own
minimum and the drawing is one nobody can read. Acceptance has always known this. The
search did not, so it could prefer an arrangement, lose at the gate, and never be told why.

`LayoutRequest` now carries the medium and the base text size, and the composition score
carries a fit term with a genuine cliff in it: below the minimum text size costs 5e5, more
than any number of crossings and less than a dropped element, which is a lie rather than a
legibility cost. Above it, a gentle preference for a drawing that needs less shrinking.

The drawing measured is the geometry, which is smaller than the finished scene — title,
legend and attribution are added later — so the scaling computed is optimistic in absolute
terms. It is still the right comparison: that chrome is the same for every candidate of the
same view, so the term ranks candidates rather than deciding acceptance. This is recorded
because it is an approximation, not because it is a problem.

### Measured outcome

| | before | after |
| --- | --- | --- |
| trust-zone showcase | accepted, **9** crossings, 2100x1140 | accepted, **3** crossings, 2023x993 |
| `ref-03` reproduction | accepted, **4** crossings, `legacy` 1.73x/6 bends | accepted, **1** crossing, `legacy` 1.54x/5 bends |
| `ref-01` reproduction | **rejected**, 4 illegal boundary crossings, 8 crossings | **accepted**, **0** illegal, 3 crossings |
| reference benchmark `ref-03` | 13 visible crossings | 3 crossings, 0 coincident, aspect within 3% |

The `ref-01` result is the clearest: the arrangement search found the column shape on its
own, stacked the Confluent, streaming and FDC zones into one channel beside the producer
column, and the two connectors that had been leaving a nested VM to reach a topic in the
enclosing zone stopped crossing a boundary they had no business crossing.

### Verification

| Command | Outcome |
| --- | --- |
| `pnpm check` | **566 tests in 37 files passed** (553 before) |
| render comparison | **one golden changed**: `showcase/trust-zones.png`, regenerated after inspecting it |
| `pnpm benchmark:generalization` | **identical 21-case failure list**; totals within noise — edge crossings 10525 to 10569 across 239 diagrams (+0.4%), one fewer near-empty canvas, elapsed 237.0s to 242.5s |
| `pnpm benchmark:references` | six candidates deterministic, geometry clean; `ref-03` 13 crossings to 3 |
| load-bearing check | disabling the corridor rule fails 3 tests; dropping the column arrangements fails 3; removing the stretching fails 2; zeroing the fit term fails 1 |

**Changed:** `layout-elk/src/{composition,ordering,banded,index}.ts`, `layout/src/{backend,orchestrate}.ts`, `sdk/src/index.ts`, `benchmarks/reference-cases.json` (recorded gaps for `ref-03` were stale).
**Tests:** `layout-elk/test/ordering.test.ts` (+11), `sdk/test/progression.test.ts` (+1, and one assertion replaced).

### One test assertion was replaced, not relaxed

`progression.test.ts` capped backward steps along the story at one. That cap was a proxy for
"reads like prose rather than a zigzag", written when this content sat in two rows; it
counted wraps instead of checking where they landed, so it called a legitimate third row a
zigzag. It is replaced by the property it stood for: the path meets rows in order, never
returns to one it has left, and the number of distinct rows equals the number of runs. The
picture that broke the cap is better on every axis the cap was standing in for.

### State of the two reproductions

Both compile, both are accepted, and both are now recognisably the reference's composition
rather than a differently-shaped diagram with the same content. Neither is a reproduction.
**Reference parity remains 0/6 `unreviewed`** — only a person may record one.

**Next: weight the primary path in the score.** The remaining `legacy` detour is not a
defect any counter weighs properly: a bend on the spine costs a reader far more than a bend
on a supporting connector, and the score currently charges them the same 8 points. The
column arrangement that would put the FDC zone directly below the GCP zone — which is what
the reference does — is rank 2 by shape and loses by roughly the aspect penalty. Making the
spine's own straightness a term is the honest way to let it win when it deserves to.

## T18 slice 3 — the turns nothing forced, and what a title actually occupies (2026-09-20)

Slice 2 put the regions in the right places. This is about what the connectors then do
between them, and it is the largest measured improvement of the program so far.

### 1. Routes lose the turns nothing forced

The router builds each connector by stepping around obstacles, and the finished polyline
keeps steps that were needed at the moment they were taken and are not needed in the
picture. The agent-request map's primary connector ran down, **right 61px**, down, left
572px, down, left — the short right step is residue, and a reader following the story meets
two turns that mean nothing.

`straightenRoute` replaces a run between two points the route already passes through with an
L between them, when that L removes a turn, does not add length, and touches nothing. Both
orientations are tried, longest span first. Because every candidate is checked against the
same obstacles the router used, a simplification can never put a connector through
something — that is the safety property, and it is asserted directly.

### 2. A title reserves its own ink, not the region's whole top band

This is the one that mattered. A heading obstacle was the region's full width by the title's
height: on a 1699px-wide region labelled "FDC", 1699px of horizontal corridor reserved for
six characters. A connector arriving from above could not descend into the region at all —
it had to travel to the region's edge and come in sideways.

The box is now the title's own ink: from the region's left edge to the same 16px inset past
the end of the measured label. `titleObstacle` lives in `@topoir/core` and is used by both
the router and the quality analysis, so a route that is legal is never then counted as
crossing a title. Recorded as **D23**, because it changes what
`TOP431_GROUP_TITLE_INTERSECTION` means; it can only ever report fewer intersections for the
same geometry, so nothing can newly fail that gate.

### Measured outcome

The corpus moved more than any change so far:

| Across 240 synthetic cases | before | after |
| --- | ---: | ---: |
| free of every measured defect | 219 (91.3%) | **231 (96.3%)** |
| cases needing attention | 21 | **9** |
| edge crossings, total | 10569 | **7634** (−28%) |
| coincident edge segments | 96 | **29** |
| illegal boundary crossings | 26 | **4** |
| label overlaps | 2 | **0** |
| group title intersections | 5 | **1** |
| `layers` family fully clean | 63 / 75 | **74 / 75** |
| elapsed | 242.5s | **171.5s** |

Faster because there is less obstacle to search around. One case regressed into the list
(`case-0172`, 2 illegal boundary crossings) and two kept a coincident segment or two more
than before; twelve left it.

On the two reproductions and the showcase:

| | before slice 3 | after |
| --- | --- | --- |
| `ref-03` primary connector | 1.54x over 4 bends | **1.33x over 1 bend** |
| `ref-03` shape | 2.84 against a 2.2 target | **2.23**, deviation 0.013 |
| `ref-01` worst connector | 5.05x | **1.87x** |
| trust-zone showcase worst | 3.70x over 4 bends | **1.70x over 2 bends** |
| Pockito reference | 0 crossings | **unchanged, byte-identical** |

`ref-03` is now the reference's composition: the client zone is a full-height column on the
left, and the GCP, FDC and external zones are one channel beside it, each directly below the
last. The request leaves the agent core, drops straight down into the zone below and reaches
the gateway — which is what the reference draws and what four earlier attempts could not
produce.

### Verification

| Command | Outcome |
| --- | --- |
| `pnpm check` | **573 tests in 38 files passed** (566 before) |
| render comparison | **two goldens changed**, both inspected before regenerating: `showcase/trust-zones.png` and `showcase/paired-regions.png` (one connector, 2.00x to 1.94x) |
| `pnpm benchmark:generalization` | table above; 9 cases needing attention, down from 21 |
| `pnpm benchmark:references` | all six deterministic and geometrically clean; `ref-01`, `ref-02`, `ref-04`, `ref-05` at 0 crossings |
| load-bearing check | disabling the straightening fails 1 test; widening the title box back to the region fails 1 |

**Changed:** `core/src/quality.ts` (`titleObstacle`), `layout-elk/src/{composition,index}.ts`,
`docs/design/{05-composition-and-routing,DECISIONS}.md`, `docs/diagnostics.md`,
`benchmarks/reference-cases.json`.
**Tests:** `layout-elk/test/straighten.test.ts` (new, 6), `core/test/quality.test.ts` (+1,
and the existing case was made to actually cross the words).

### Tried and not shipped: weighting the primary path in the score

A bend on the story costs a reader more than a bend on a supporting dependency, and the
score charges both 8 points. I implemented a term that adds 120 per bend and 300 per unit of
detour on the connectors the spine analysis marks as `spine`, and measured it.

Ungated it changed one diagram — the trace-pipeline reproduction, which declares no story —
and the change was a wash: a smaller canvas, one connector from 15.05x to below the top six,
another from 2.06x to 5.05x. Gated to an authored story, as reading order already is, it
changed **nothing**: every shipped diagram picked the same candidate with and without it.

The trace explains why: on the agent-request map the winning arrangement already had the
lowest primary-path cost of every candidate (1668 against 1894–2486), so the existing length
and bend terms already track spine straightness closely on this content. Shipping an
unexercised scoring weight is a liability, so it was reverted. Recorded here so the next
attempt starts from the measurement rather than the intuition.

### State of the two reproductions

Both compile, both are accepted, both are geometrically clean, and both are now the
reference's composition rather than a differently-shaped diagram with the same content.
Neither is a reproduction, and no automated result here is evidence of visual parity.
**Reference parity remains 0/6 `unreviewed`** — only a person may record one, in
`benchmarks/reference-reviews.json`, against the hashes printed in
`.tmp/reference-benchmark/report.json`.

**Next:** the remaining differences from `exple3` are within-region: the gateway's database
is drawn beside it rather than below it, the note sits outside the zone it annotates, and
the zone is wider than its contents need. None of those is a routing defect, which is what
T18 owns; they belong with T19's fitting and whitespace work.
