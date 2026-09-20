# Composition, constraints, routing and edit stability

## Separate explanations from placement refinements

A macro candidate changes the structure of an explanation. A placement refinement changes spacing, ordering or routes within that structure. Track them separately in metrics and candidate reports. Three seeds of one layout do not count as three explanation variants.

Initial architecture strategies:

| Strategy | Appropriate use | Structural behavior |
| --- | --- | --- |
| `topology` | General dependencies | Compound directed layout with family-compatible constraints |
| `request-spine` | One main path and supporting services | Main progression across regions; state and controls in supporting bands |
| `domain-map` | Ownership or system boundaries | Locally arranged regions; global inter-region routes |
| `pipeline` | Staged transformation | Ordered stages, branch/merge slots, supported wrapping or page breaks |
| `paired-regions` | Repeated deployment/comparison | Correspondence grid with shared row/column measures |
| `overview-detail` | Dense models | Explicit summaries and detail panels with coverage mapping |

Process strategies include flow, swimlanes and staged process. Interaction uses ordered event layout. ER uses table/field-aware layout; trees use rooted/balanced/radial layouts; time uses an axis. Each strategy declares its family/notation support and failure envelope.

## Planning algorithm

1. Analyze graph/event structure, boundary depth, degree, cycles, required story, correspondence, target medium and prior layout.
2. Filter strategies by required features and constraints. Unknown required features fail here.
3. Generate a fixed ordered shortlist from family rules and explicit preferences. Return the rationale and feature matches.
4. Build a `CompositionPlan` with primary/supporting regions, local arrangements, shared tracks, reserved corridors, allowed boundary transitions and page/detail structure.
5. Place bottom-up measured regions, then their outer arrangement. Apply hard order/alignment/pin constraints as actual placement conditions.
6. Plan attachments/portals, route relationships, place labels and annotations, construct the complete scene and evaluate it.
7. Run only bounded repairs for diagnosed defects. Return all candidate quality vectors and the selected candidate's explanation.

The outer agent may submit alternative presentation plans with different detail/family choices. Compiler candidate generation cannot invent source facts or choose unrequested lossy summarization. When the only readable solution requires changing the content policy, return a proposed semantic/presentation patch for the agent/user to consider.

## CompositionPlan contract

Fields: stable `candidateId`, strategy/version, input fingerprint, ordered regions, occurrence-to-region assignments, local arrangement rules, shared tracks, constraint outcomes, primary-route IDs, routing reservations, page plan and deterministic work budget. Placement coordinates are a later output. Every required element must map to an occurrence or explicit summary/detail representation before placement starts.

Request-spine placement first decomposes story relationships into ordered acyclic runs and explicit feedback/branch edges. Lay out the main run monotonically in the requested direction. Put storage below/aside its associated compute and control/identity services in a separate supporting band when permitted. Route feedback around the spine rather than reversing the entire primary progression. Impossible authored order gets a conflict diagnostic.

Paired regions derive shared row heights and track widths from the maximum measured requirements across all counterparts. Missing counterparts reserve an explicit empty comparison cell or use a documented unpaired region. Local arrangement can vary below matched rows. Add a third region, unequal labels and asymmetric branches to acceptance fixtures; identical symmetric examples alone do not validate this strategy.

## Constraint implementation

Implement order/alignment/correspondence as a deterministic constraint graph over region and component dimensions. Use topological ordering for satisfiable precedence, union/offset groups for exact alignment, shared-track sizing for correspondence and deterministic difference-constraint solving for separations. Detect cycles/conflicts before calling the backend. A general nonlinear solver is not required for the first release.

Adapters receive constraints they support. Hard conditions unavailable in ELK must be owned by compiler placement or fail preflight; do not pass opaque options and assume they worked. Post-layout checks validate every condition independently of the solver. Preferred conditions remain in the report even if the selected strategy cannot optimize them.

Containment is checked for groups as well as nodes. Presentation overlays may intersect, but unrelated opaque region panels may not hide each other. Nested headings and padding are measured reservations, not a fixed magic title height.

A heading reserves the box its own text needs, not the region's full width. On a wide region that difference is most of the top band, and reserving all of it forces a connector entering from above to travel to the region's edge and come in sideways. The router and the quality analysis share one definition of the box (`titleObstacle`), so a route that is legal is never then reported as crossing a title. See D23.

## Routing contract

`RoutePlan` contains relationship ID(s), source/target attachment IDs, ordered boundary transitions, allowed portals, intentional junctions, style/flow identity, lane preference and label requirements. `RoutedRelationship` contains owned segments, curves or polylines, junction IDs, endpoint attachment evidence, labels and all underlying semantic relationship IDs.

Compute the boundary ancestry transition sequence using the lowest common ancestor of endpoint occurrences. Each required transition gets a portal interval away from headings and occupied ink. Allocate portals for a bundle before routing each connector, reserving clearance and lane separation. Boundary outlines are passable only at allowed transitions; unrelated regions are obstacles. Exact endpoint sites and their outward normals define legal departure/arrival.

Route primary relationships first, then secondary relationships in stable priority/ID order. Cost considers obstacle violations as forbidden, then unexpected boundary crossings, hidden/coincident segments, primary crossings, length and bends. Local obstacle search uses a spatial index and deterministic tie-breaking. When no route exists, expand a reserved corridor or re-place an affected region within the work budget. Return a blocked-route diagnostic if required clearance remains impossible.

Declare intentional shared buses/junctions in semantics or an approved aggregation rule. All represented relationships remain individually addressable in the coverage map. Separate lines with different semantics/colors unless the family explicitly defines multiplexed notation. A shared trunk is not counted as accidental coincidence; unrelated routes occupying the same visible segment are.

Support orthogonal, straight and curved connector grammars. The family selects allowed forms; orthogonality is not a universal future invariant. Intersection QA operates on line segments or adaptively flattened curves with a documented maximum visual error, initially 0.25 output logical pixels after fitting. Arrowheads attach to the actual surface/port, and corners must not trim away a short required segment.

## Labels, notes and whole-page fit

Relationship labels use owned route segments, not a straight-line midpoint between endpoints. Generate finite placement candidates on sufficiently long segments, respecting direction, label size and nearby marks. Labels may have leaders if the style permits, but must remain unambiguously linked to their relationship. Reject labels covering unrelated connectors, arrows, headings or required component text.

Annotations use typed anchors and reserved space. Reflowing one note triggers only bounded affected-region layout. Include title, takeaway, legend and page footer in fitting. Apply the effective-text-size test after fitting; do not count raster upscaling as improved readability.

Wrapping is a strategy-level capability available to the banded family as well as ELK candidates. It must preserve order, make continuations explicit and respect group/fragment boundaries. Seed 154 from the review is a required regression: a 42-node chain cannot be accepted as a presentation ribbon. A small three-node flow should remain simple rather than being wrapped to chase an arbitrary aspect ratio.

## Candidate selection

Evaluate the complete scene before selection. The quality contract defines the same selection order for all families. A primary-path preference can justify additional secondary crossings among otherwise valid candidates, but cannot justify missing content, invalid attachments or required-constraint failure.

Expose candidate IDs, macro strategy, quality vector, satisfied/unsatisfied constraints, rejected alternatives and repair attempts. A deterministic selected result may still be unaccepted; return the best diagnostic preview with a reason. Stop on the fixed work budget, not on the first candidate with zero graph overlaps.

## Revision stability

Prior state includes compilation fingerprint, family/strategy versions, occurrence placements, region hierarchy, port/junction identity and route topology. Diff normalized content, then invalidate affected components/regions. Preserve unchanged region positions, ordering and attachment sides as preferred constraints unless explicit pins require them.

Measure unchanged-occurrence displacement in component-size units, count unchanged-route topology changes, and report movement reasons. Compare coordinates in body space after removing whole-page translation. A label/style-only edit must not reorder unaffected regions. A new node should primarily affect its region and adjacent routing corridors. A changed medium may require global relayout and should report that reason.

Deterministic selection includes prior-state hash. Stable revision mode is an explicit input; fresh layout remains available for intentional recomposition. Never preserve stale positions at the cost of invalid containment or hidden content.

## Bounded routing experiment

If local routing still fails promoted-family fixtures after portal and corridor planning, compare current routing with a dedicated router such as libavoid on the same measured placements and constraints. Record correctness, visible defects, crossings, latency, memory, build/distribution impact and version/license details. Adopt only if it improves the failing envelope without weakening the contracts. The decision is scheduled at T18; it is not permission to replace the entire layout stack preemptively.
