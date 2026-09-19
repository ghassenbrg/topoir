# Diagram family catalog and extension contract

## Family package

Every family owns a versioned JSON Schema body, semantic validator, projection rules, lowering to diagram intent, component templates, notation/marker rules, compatible strategies, quality rules, examples and test corpus. It declares maturity per feature; a family can be supported while an advanced feature remains experimental only if discovery makes that explicit.

The common kernel supplies identities, provenance, annotations, appearance, source maps, constraints, scenes and exports. Family payloads retain structure until the appropriate layout stage: an interaction fragment is an event tree; a schedule is intervals on an axis; an ER entity is a table with fields. Avoid a universal node/edge schema that forces those meanings into labels.

## Release tiers

| Tier | Families | Promotion intent |
| --- | --- | --- |
| A | Architecture, process, interaction | First supported multi-family release |
| B | ER, class, state, hierarchy | Data/software structure and hierarchical explanation |
| C | Comparison/diff, timeline, lineage, conceptual | Coordinated views, change/time and explanatory variety |
| D | Specialist extensions | Proposed individually against real use cases and independent acceptance |

Use family IDs `architecture`, `process`, `interaction`, `er`, `class`, `state`, `hierarchy`, `comparison`, `timeline`, `lineage`, `conceptual`. Legacy `sequence` is a composition alias during migration; new temporal models use `interaction`.

## Architecture

Body initially preserves current arrays: `groups`, `nodes`, `edges`, `flows`, `annotations`. Nodes can reference workspace entities. Add explicit `instances`/deployment relationships in a versioned family extension; do not confuse “three replicas shown compactly” with three separately identified instances. Real containment remains a tree within one containment dimension; cross-cutting dimensions are explicit overlays/relations.

Required promoted features: nested boundaries, explicit ports and compartments, multi-edges/self-loops, intentional junctions/buses, primary/supporting paths, repeated-region correspondence, group/occurrence focus, exact/induced projection, collapse/detail coverage, style/asset discovery and target-medium fit.

Acceptance: all six architecture references with equivalent semantic inventories, plus unequal labels/three regions, cross-boundary fan-out, cycles, disconnected components and long pipelines. Preserve arrow/protocol/flow meaning; provider-native logos remain a pack choice, not a prerequisite to correct semantic representation. Experimental illustrated components must be labeled as such until their grammar gate passes.

## Process — first new vertical slice

Body:

```ts
interface ProcessBody {
  lanes?: { id: string; label: string; entity?: string }[];
  steps: {
    id: string;
    kind: "start" | "end" | "task" | "decision" | "fork" | "join";
    label?: string;
    entity?: string;
    lane?: string;
    subprocess?: string;
  }[];
  transitions: {
    id: string;
    from: string;
    to: string;
    label?: string;
    outcome?: string;
    kind?: "normal" | "exception";
  }[];
  annotations?: SemanticAnnotation[];
}
```

`subprocess` refers to another process model and is a collapsed invocation, not implicit recursion expansion. References must resolve and recursive invocation is displayed as an invocation, never expanded indefinitely.

Validation: start has no incoming normal transition; end has no outgoing normal transition; decisions have at least two outgoing outcomes with distinct nonempty labels/outcomes; fork has at least two outgoing normal branches; join has at least two incoming normal branches. Tasks may have exception transitions. Loops are legal. Disconnected or unreachable steps warn unless marked as required-reachable by a view constraint. A lane owns responsibility, not infrastructure containment.

Notation: start/end symbols, readable task shapes, decision outcomes at outgoing branches, distinguishable exception path, fork/join bars or a documented alternative. This is a process language, not a claim of complete BPMN support. Event gateways, compensation and full BPMN import are separate feature proposals.

Strategies: single flow, swimlane process, staged pipeline. Case set: onboarding, approval with rejection, checkout with exceptions, parallel fulfillment, bounded retry and handoff across lanes. Acceptance asks readers to identify both the successful path and at least one exception.

## Interaction — second new vertical slice

Body: `participants`, ordered `events`, optional `annotations`. Participants are `{id, label?, entity?, kind?: actor|service|store|external}`. Every event has an ID in the model namespace.

Event union:

| Type | Fields | Meaning |
| --- | --- | --- |
| `message` | `from`, `to`, `label`, `mode: sync|async|return`, `replyTo?` | One ordered interaction; return binds to a known message |
| `activate` / `deactivate` | `participant` | Explicit activation boundary |
| `note` | `text`, `participants` | Event-positioned explanation |
| `fragment` | `operator: alt|opt|loop|par`, `label?`, `branches` | Structured nested event regions |
| `create` / `destroy` | `participant`, `label?` | Lifecycle event, advanced feature after basic promotion |

Branches are `{id, label?, events}`. `alt` requires at least two labeled branches; `opt` and `loop` require one branch and a condition/iteration explanation; `par` requires at least two branches. Ordering is explicit within each branch; parallel branches have a partial order, not an invented total order. IDs are unique across nested events/branches/participants.

Validate participant existence, return-call identity and direction, activation balance along executable branch paths, fragment structure, lifecycle consistency when supported and recursion/depth limits. A self-message requires a visible loop. Do not synthesize return edges or activation durations from a topology graph.

Layout: measure participant headers and messages before determining participant spacing; reserve fragment captions and activation bars; vertical tracks follow event partial order. Notes attach to events/lifelines. Grouped participants do not imply event containment. Unsupported explicit ports fail with a family-specific diagnostic rather than being dropped.

Cases: authentication, cache hit/miss, async queue, retry loop, concurrent reads, nested alternatives, self-call, long labels and uneven participant widths. Promotion includes alt/opt/loop/par, activations, replies and notes; lifecycle creation/destruction can remain separately experimental.

## ER and class

ER body: `entities[{id,label?,attributes:[{id,name,type?,key?:primary|foreign|unique,nullable?}]}]`, `relationships[{id,from:{entity,attribute?},to:{entity,attribute?},cardinality:{from,to},identifying?,label?}]`. Cardinality values are `zero-one`, `one`, `zero-many`, `one-many`. Validate attribute references and cardinalities. Route to named rows when fields are specified and draw correct end markers.

Class body: `types` with attribute/method compartments and `relationships` of association, dependency, inheritance, realization, aggregation or composition. Preserve direction, multiplicity and compartment visibility. Implement selected UML class notation, with unsupported features declared; do not silently approximate semantic markers with generic arrows.

Shared component foundation is measured tables/compartments. Case set includes long field names, composite keys, cycles, crowded row attachments, inheritance and different visible detail per view. Code/schema importers must report unsupported types and inferred relationships.

## State

Body: `states[{id,kind:initial|final|atomic|compound|parallel,label?,parent?,regions?}]`, `transitions[{id,from,to,event?,guard?,action?}]`. Parallel states explicitly declare regions; containment and initial state scope are validated. Entry/exit actions are structured fields, not inferred from labels. Prevent impossible structural relationships and dangling references; allow cycles and unreachable warnings.

Layout preserves nested regions, initial/final notation, feedback paths and transition label ownership. Cases: order lifecycle, connection lifecycle, nested payment state, independent parallel regions, long guards and self-transitions.

## Hierarchy

Body: `items[{id,label?,entity?,parent?,relationLabel?}]`, with declared `kind: tree|organization|mind-map` and one or more roots. A standard tree/organization hierarchy rejects multiple parents and cycles; cross-links are a separate optional relationship array. Mind-map branch labels/styles are structured presentation properties, not domain type changes.

Strategies: vertical organization, balanced horizontal tree, radial mind map, forest packing. Collapse preserves subtree counts and source identities. Cases include uneven depth, one huge branch, multilingual labels, multiple roots and cross-links. Organization does not imply managerial facts absent from source.

## Comparison and diff

Body references two or more model snapshots by `{model, revision?}` and `matches[{id,elements:ElementRef[]}]`; changes are computed by explicit comparison rules. A supplied revision refers to an immutable input snapshot included with the compile request. Matching prefers stable entity IDs, then explicit user/importer mappings. Label-based fuzzy matching is an agent proposal, never a silent identity merge.

Diff categories: added, removed, changed, moved and unchanged, with property-level evidence. Compare occurrences can show matched rows, side-by-side panels or change overlays. Preserve omitted/unchanged context policies in coverage. Cases include renamed labels with stable identity, missing counterpart, moved boundary, relationship direction change and three-way comparison.

## Timeline and schedule

Body: `axis{kind:instant|relative,unit?,timezone?}`, `lanes`, `intervals[{id,lane?,start,end,label?}]`, `milestones[{id,at,label?}]`, `dependencies`. Use ISO timestamps with explicit offsets for instants; normalize to UTC while preserving display timezone. Relative values require a declared unit. Reject negative intervals and inconsistent domains; no implied working-day/calendar rules.

The temporal axis determines positions. Overlap tracks preserve duration, and dependency lines do not change time. Add calendar and critical-path computation only as separately validated features. Cases include overlapping intervals, tiny/long durations, milestones, DST display, dependencies and pagination at permitted breakpoints.

## Lineage

Body: datasets, transformations, fields and typed derivation relationships, with optional execution runs distinct from logical lineage. Expose dataset- and column-level projections using explicit aggregation. Field mappings and transformations must survive collapse/detail views. Strategies combine table-aware routing with pipelines; do not equate every dependency with data lineage.

## Conceptual

Provide a bounded set of semantic primitives: containment/set membership, ordered stages, cycles, feedback, taxonomy, comparison matrix and explanatory surround. Each has typed payload and a compatible composition grammar. A scene built from arbitrary shapes is an authoring escape hatch, not claimed conceptual understanding.

Illustrative roles include device clusters, queue/worker illustrations, storage stacks and observability surrounds. Reusable assets and seeded vectors participate in the measured component contract. An illustration may be decorative or explanatory; it must declare which so content QA does not treat a removed semantic symbol as harmless decoration.

## Importers and extension safety

Initial importers: explicit architecture extraction from Kubernetes/Compose; schema extraction for ER; trace/event import for interaction. Later Terraform, OpenAPI and AsyncAPI adapters require independent mapping contracts. Importers operate on user-scoped supplied files, not uncontrolled repository/network scans.

Output a target model plus source pointers, coverage inventory, unsupported constructs, inferred facts and deterministic input hashes. Re-import reconciles stable IDs and reports deletions/conflicts without overwriting authored presentation intent. Imported credentials or unrelated source text must not enter diagram metadata.

Start with bundled first-party family implementations. Declarative style/asset/template packs are data-only and versioned. External executable family adapters remain operator-installed code with explicit host capabilities and version checks; a document cannot install or execute them. Public extension ABI stabilization follows at least three working first-party families.
