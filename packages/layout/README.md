# @topoir/layout

Layout orchestration: backend capabilities, constraint admission and candidate selection.

Composition, placement, routing and refinement lived in one module alongside the ELK
translation, so none of them could be reasoned about or replaced independently, and
"can this backend honour a required ordering constraint?" had no answer short of reading
940 lines. This package owns the contract; [`@topoir/layout-elk`](../layout-elk) is
unchanged and is wrapped as one backend among others.

A backend declares what it supports. A **required** constraint it cannot enforce is a
failure, and no layout is attempted — returning geometry that ignored the constraint would
misreport what was honoured. A **preferred** one it cannot enforce is a warning, because a
preference not being met is a legitimate outcome that the caller should still be told about
rather than left to infer from the picture.

```ts
import { OrchestratedLayoutEngine, selectBackend } from "@topoir/layout";

const { backend } = selectBackend({ constraints });
const engine = new OrchestratedLayoutEngine(backend, { constraints });
```

Capabilities are stated honestly. The composition backend does containment, routing and
declared attachment sites; it does **not** yet take constraints, produce alternatives or
preserve a prior layout. T16 and T19 add the first two, T29 the third.
