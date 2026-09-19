# The supplied screenshots are the acceptance benchmark

The six images in `.tmp/screenshots/` define TopoIR's product quality bar. They are not optional mood-board material. A simpler graph with a nice theme is not evidence that the engine can reproduce their sophistication. No current benchmark case is approved as reference-equivalent.

## Run and review

```sh
pnpm build
pnpm benchmark:references
```

This compiles the six mapped candidates twice, writes SVG/PNG, records source/reference/artifact hashes, diagnostics and quality metrics, and builds `.tmp/reference-benchmark/report.md` with each reference followed by its generated candidate. Reference screenshots remain private, ignored inputs; a public checkout can run the generated fixtures but cannot receive reference approval without the originals. The default exit status checks successful compilation and determinism, **not visual parity**. `--require-parity` fails unless every case is approved by a live review record.

## Recording a review

Parity is decided by `benchmarks/reference-reviews.json`, not by a constant in the harness. Each record binds one human decision to the sha256 of the exact reference image and generated candidate it was made against:

```json
{
  "case": "ref-01-event-flow",
  "verdict": "approved",
  "reviewer": "Name of the person who looked",
  "date": "2026-09-20",
  "referenceSha256": "…",
  "candidateSha256": "…",
  "notes": "Why."
}
```

Both hashes are printed in `.tmp/reference-benchmark/report.json`. The resulting status is one of:

| Status | Meaning |
| --- | --- |
| `approved` | A record approves exactly these two artifacts |
| `rejected` | A record rejects exactly these two artifacts |
| `stale` | A record exists, but the reference or the candidate has changed since. Re-review is required |
| `unreviewed` | No record exists for this case |
| `unreviewable` | The private reference image is not in this checkout, so no review is possible here |

Only `approved` counts as parity. A regenerated candidate invalidates its record automatically, so an approval can never be carried forward onto a picture nobody looked at.

**Only the person who did the comparison may add a record.** The compiler never writes to this file, and an agent must never add one on a human's behalf — a fabricated approval defeats the entire benchmark. At present the file contains no records, and a test asserts that, so the current honest status of all six cases is `unreviewed`.

The durable mapping is [`benchmarks/reference-cases.json`](../benchmarks/reference-cases.json). Its explicit `coverage` and `gaps` prevent partial capability examples from being mistaken for full reconstructions. Five cases are currently partial; Pockito reconstructs the semantic graph but not its complete visual composition. These are baseline measurements, not six completed reproductions.

## What counts as success

For each reference, first build a coordinate-free fixture with equivalent structural difficulty: entities, relationship density, nesting, repetition, different boundary sizes, labels, assets and explanatory material. Domain names may be anonymized, but deleting difficult relationships or replacing a full region with a three-node row does not qualify. The compiler—not hand-edited output, pasted screenshots or manual SVG—must produce the candidate.

Review reference and candidate side by side at native resolution and fit-to-page. Judge these dimensions separately on a 0–4 rubric (0 absent, 1 severely deficient, 2 functional but clearly weaker, 3 comparable, 4 stronger):

| Dimension | Required evidence |
| --- | --- |
| Semantic completeness | Every important entity, relation and boundary remains understandable; no invented connection |
| Composition and grouping | Intentional regional placement, alignment, balanced density, distinguishable nested boundaries |
| Flow and routing | Traceable primary path, readable fan-in/out, no misleading crossings or arrow directions |
| Typography and labels | No clipping or overlap; readable at intended viewing size; clear title/label hierarchy |
| Assets and component grammar | Appropriate logos/primitives, preserved aspect ratio, mixed silhouettes and internal structure where needed |
| Story and emphasis | Viewer can identify the main message and the secondary details without reading every label |
| Finish | Consistent spacing, restrained color, legible callouts, deliberate whitespace and presentation-ready exports |

Acceptance requires **all seven dimensions ≥3 on every full-complexity case**, with no hard geometry errors, label/annotation overlaps, title intersections, unapproved boundary crossings, missing required assets, or unexplained semantic omissions. Do not average a weak case away. A maintainer must record the review and the user should confirm the overall visual bar. An agent's visual critique is useful evidence, not automatic approval. The expected viewing size must be recorded so tiny text is not hidden behind a huge canvas.

Pixel equality to the references is not the objective: improve their legibility where possible and avoid copying their defects. Pixel/SVG goldens measure regression within TopoIR; semantic geometry metrics measure correctness; this rubric measures comparative visual quality. None substitutes for the others.

## Next fixtures, in dependency order

1. **ref-04 Pockito:** preserve three client routes, internal gateway compartments, workload stacks, data branch and quiet identity paths. It is the smallest useful full reconstruction and tests mixed local orientation.
2. **ref-03 trust zones:** four unequal regions, dominant request spine, databases beneath compute, external branches and anchored note.
3. **ref-06 regional cloud:** replace the simplified pair with nested VPCs, shared global services, transit and the full replication-row density; use reviewed provider assets or explicitly label generic substitutions.
4. **ref-02 clusters:** three unequal repeated clusters, shared state, external domains and local image-backed clients; perturb one label/replica count to test stable alignment.
5. **ref-01 events:** asymmetric regions, payload/file components, multiple publish/consume paths, nested runtime and anchored explanatory material.
6. **ref-05 conceptual:** true deterministic sketch components and an observability surround, while retaining a measurable route graph. This is not satisfied by changing a card's border/color.

The focused alpha can ship for evaluation before parity, but must say so. “Reference-level presentation quality achieved” is reserved for this gate, not completion of the package list.
