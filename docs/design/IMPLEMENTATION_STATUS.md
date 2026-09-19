# Implementation status

Last updated: 2026-09-19. This file is the live execution ledger for the design program.

**Program state: in progress. M0 complete. Next task: T05. Current milestone: M1 (T05–T09).**

The full review previously verified `bc64cf2`: 91 tests in 15 files passed; 240/240 synthetic cases compiled without hard geometry defects; 220/240 passed the selected defect counters; six reference candidates were deterministic with no approved parity recorded. These are historical baseline observations, not evidence that the tasks below are implemented. The design-writing task added documents/examples only.

Allowed task states: `not_started`, `in_progress`, `implemented_pending_gate`, `complete`, `blocked`. A task waiting on human visual review can use `implemented_pending_gate`; record the specific gate and continue independent ready work. Keep exact commands, outcomes and artifact evidence in session entries.

| Task | Milestone | State | Evidence / blocker |
| --- | --- | --- | --- |
| T00 | M0 | complete | Baseline at `dfad55c` recorded; 12 review defects reproduced as public fixtures + `it.fails` assertions. See session entry. |
| T01 | M0 | complete | Six asset roles, measured badges, declared abbreviation. `TOP440_TEXT_ABBREVIATED` added. See session entry. |
| T02 | M0 | complete | Resolved font contract, token-based theme inheritance, contrast and colour diagnostics. `TOP330`/`TOP331`/`TOP442` added. See session entry. |
| T03 | M0 | complete | Attachment/bounds/coverage/nesting checks, explicit raster dimensions, output-name preflight. Found and fixed a real endpoint-detaching routing bug. See session entry. |
| T04 | M0 | complete | Capability registry behind CLI+MCP, `TOP252_INTENT_NOT_APPLIED`, hash-bound review records, benchmark counter/shape/acceptance separation, generator consolidation. See session entry. |
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
