# Review regression fixtures

Public reproductions of the defects confirmed in [the 2026-09-19 review](../../docs/full-review-2026-09-19.md).

The review kept its probe inputs under an ignored `.tmp/full-review` directory, which does
not exist in a fresh checkout. These fixtures replace that dependency: every input here is a
plain `topoir.dev/v1alpha1` document, so a defect can be reproduced with the ordinary
compiler and the ordinary CLI.

The assertions live in [`packages/sdk/test/review-regression.test.ts`](../../packages/sdk/test/review-regression.test.ts).

## How the assertions are written

Assertions state the **target** behavior. A case that is still broken is declared with
vitest's `it.fails`, which passes only while the assertion genuinely fails. When the owning
task lands its fix, `it.fails` starts erroring with "expected test to fail". That is
deliberate: promote the case to `it` at that point. Never relax an assertion to quiet the
suite, and never make a probe pass by removing the content it is meant to protect.

Two cases use a plain `it` because they record current contracted behavior rather than a
defect: induced edge selection, and the seed-154 ribbon shape that M0 is not required to fix.

## Inputs

| Fixture | Reproduces | Owning task |
| --- | --- | --- |
| `six-assets` | Six schema-permitted asset roles; only five images are drawn, with no diagnostic | T01 |
| `wide-badge` | A schema-valid 48-character badge measuring 529px inside a 148px node | T01 |
| `long-label` | A required label silently abbreviated to two ellipsised lines | T01 |
| `invisible-text` | White text on a white fill accepted with no contrast diagnostic | T02 |
| `unknown-font` | An unavailable family declared in the scene while DejaVu Sans is embedded | T02 |
| `theme-dark-base` / `theme-dark-extends` | `{extends: X}` losing visible treatment that plain `X` keeps | T02 |
| `annotated-regions` | Carrier for hostile-geometry probes: detached routes, dropped group, dropped annotation | T03 |
| `colliding-view-ids` | Two view ids that map to one output file on a case-insensitive filesystem | T03 |
| `group-focus` | Accepted `design.focus` producing a byte-identical drawing with no diagnostic | T04, T12 |
| `shared-endpoints` | Induced edge selection pulling in a second edge between the same endpoints | T04, T11 |
| `ribbon-seed-154` | Generalization seed 154 laid out at a 46:1 aspect ratio | T17 |

`annotated-regions` is compiled through a custom `LayoutEngine` that rewrites the geometry
the real engine produced. A custom layout backend is a supported public extension point, so
whatever it returns must still be verified before the compiler calls a result `ok`.

## Reproducing by hand

```bash
pnpm exec vitest run packages/sdk/test/review-regression.test.ts
```

To see one input on its own:

```bash
pnpm topoir render fixtures/review/wide-badge.topoir.yaml --output .tmp/review/wide-badge.svg
```
