# Routing engine decision

Status: decided 2026-09-19. The compiler routes connectors with its own orthogonal
visibility-grid A*. libavoid was evaluated and rejected.

## How the question arose

The [generalization harness](../benchmarks/generalization.mts) compiles a deterministic
corpus of synthetic architectures and reports how often output is clean. It showed that
after placement bugs were fixed, **every remaining defect was a routing defect** — zero
component overlaps, zero containment errors, zero dropped entities, but hundreds of
coincident connectors and illegal boundary crossings. That narrowed the engine question
from "which layout engine" to "which router".

## Method

Both routers were given **identical placements** from the banded composition, so the
measurement isolates routing. libavoid was configured properly before judging: connection
pins rather than free border points, per-port direction flags, nudging and shared-path
penalties enabled, and routes clipped to the component border the way a renderer would.
Two of its early losses were misconfiguration on our side, not the library.

## Result

| 40 cases, identical placements | ours before | libavoid | ours after |
| --- | ---: | ---: | ---: |
| Fully clean | 20.0% | 25.0% | **30.0%** |
| Component intersections | 86 | **0** | 78 |
| Heading intersections | 61 | **0** | 43 |
| Coincident connectors | 325 | 578 | **171** |
| Illegal boundary crossings | 100 | 420 | 112 |
| Edge crossings | 2459 | **673** | 2948 |
| Mean time per diagram | 26 ms | 618 ms | 82 ms |

## Decision: do not adopt libavoid

1. **It cannot express nested boundaries.** `libavoid-js@0.5.0-beta.5` does not bind
   `ClusterRef`, although it exposes `clusterCrossingPenalty`. Architecture diagrams are
   made of nested regions. Without clusters it scored 420 illegal boundary crossings
   against our 112 on the same placements — it made our worst defect class four times
   worse.
2. **Licence.** libavoid is LGPL-2.1-or-later and TopoIR is MIT. Shipping it would
   require an optional peer dependency, so most consumers would not receive it.
3. **Cost.** 7.6× slower per diagram after our own improvements.

## What the evaluation changed

libavoid demonstrated that a genuine obstacle-avoiding router reaches *zero* component and
heading intersections where a fixed candidate enumerator cannot. That is what motivated
the real fix.

`obstacleRoute` in `packages/layout-elk/src/routing.ts` was already an orthogonal
visibility-grid A* with bend penalties — the same algorithm family libavoid uses — but it
was only invoked as a last resort, when every cheap candidate had already failed. It is
now a peer candidate scored under the same cost function, extended with corridor occupancy
so two connectors do not collapse onto one line.

Promoting it surfaced two defects. The search returned nothing for 10% of connectors
because an endpoint can sit inside a neighbour's inflated obstacle in a dense scene,
making it unreachable; enclosing obstacles are now dropped. Dropping them then allowed a
route to run back across its own component, so endpoint silhouettes are explicitly
protected in both the composition router and `refineRoutes`.

## Reproducing

libavoid is no longer a dependency. To re-evaluate it, add `libavoid-js` as a dev
dependency and route one placement through both paths; the configuration that made the
comparison fair is described under **Method** above. Re-open this decision if a binding
appears that exposes `ClusterRef`, or if the corpus shows routing defects our own router
cannot reach.
