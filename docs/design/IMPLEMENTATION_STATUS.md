# Implementation status

Last updated: 2026-09-19. This file is the live execution ledger for the design program.

**Program state: in progress. M0 complete. T09 done; M1 gate NOT met — see the M1 assessment. Next task: T08 carried work (renderer draws from plan blocks), then T10.**

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
| T08 | M1 | complete | All three acceptance criteria met and verified. `ComponentPlan.blocks` is still empty and the renderer computes block positions inline — recorded as carried work, see session entry. |
| T09 | M1 | complete | Scene QA on final ink: representation, attribution, clipping, real-backdrop contrast, disposition. Found 10 genuinely defective generated cases nothing had reported. See session entry. |
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
| M0 trustworthy baseline | complete | T00–T04 complete; all 12 reproduced review defects fixed or explicitly diagnosed; 189 tests pass; benchmark claims match measured evidence. See the M0 gate entry. |
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
