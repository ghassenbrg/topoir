# Product contract

## Purpose

Help an agent turn scoped source material and a reader's question into a high-quality, inspectable diagram or coordinated set of diagrams. The tool owns rendering mechanics and supplies design knowledge; the agent owns factual interpretation, family choice, and explanation.

The primary user is an agent working for a person. The person may review, correct, and export the result through a small visual workbench. Local SDK, CLI, and MCP usage must remain complete without a hosted account or embedded model API.

## Reader jobs

| Reader question | Appropriate representation | Required evidence |
| --- | --- | --- |
| What runs where? | Deployment architecture | Components, instance/host relationships, boundaries |
| How does a request succeed or fail? | Interaction or process | Ordered events or decisions, alternatives, explicit unknowns |
| What depends on what? | Dependency or lineage | Directed relationships and their meaning |
| What changes in the proposal? | Comparison/diff | Corresponding identities and actual changed properties |
| How is the data structured? | ER or class | Attributes, keys, cardinality or type relationships |
| What can happen next? | State diagram | States, transitions, guards/actions |
| What is the hierarchy? | Tree, organization or mind map | Root, ownership/branch relationships |
| When does work happen? | Timeline/schedule | Time intervals, milestones, dependencies |
| What is the central idea? | Conceptual explanation | Semantic primitives, analogy boundaries, supporting details |

A static deployment model does not imply message order, latency, retry policy, or business outcomes. Missing facts remain unknown. Agents may propose assumptions, but must label them and retain their provenance. A valid schema cannot certify source truth.

## End-to-end experience

1. Scope source material and state the reader question, audience, medium, and required facts.
2. Discover supported families and relevant examples. Select the simplest family that answers the question faithfully.
3. Build a semantic model with stable identities and provenance. Reuse known entities across views.
4. Express a presentation plan: primary path, supporting regions, emphasis, detail level, medium and constraints.
5. Compile one or up to three meaningfully different plans into target-size previews and quality reports.
6. Repair missing facts, visible defects, or unclear composition. Preserve unaffected layout when revising.
7. Deliver the selected artifacts, source document, quality report, provenance, and reproducibility manifest.

If one page cannot preserve required detail at a readable size, return an explicit split/overview/detail recommendation. Do not hide entities, abbreviate critical labels, or shrink text below the declared minimum to obtain a passing image.

## Premium visual requirements

- Clear reading order and an identifiable primary explanation.
- Component structures appropriate to their meaning: a database, table, participant, decision, or time interval must not depend on an icon alone to communicate its role.
- Consistent typography, spacing, stroke treatment, color semantics, and boundary grammar within a view set.
- Controlled variation across different tasks, with stable visual identity across related views.
- Labels visibly owned by their components, connectors, compartments or time intervals.
- Deliberate whitespace, balanced regions, and readable crossings at realistic density.
- Correct presentation at the actual export/display size, including title, legend and annotations.
- Accessible text alternatives and critical distinctions encoded through more than color.

Provide styles such as technical, editorial, infrastructure, blueprint, and illustrative as resolved visual grammars. Each style must have supported families, validated light/dark variants, font/asset requirements, and suitable density ranges. A decorative line added to a card does not establish a complete illustrative style.

## Product surfaces

**Compiler and automation:** stable document contract, SDK, noninteractive CLI, MCP, offline asset/style/example discovery, inspectable stages, repeatable exports and integration tests.

**Visual workbench:** target-size preview, zoom and navigation, source-linked selection, defect overlays, variant comparison, semantic/presentation edits, undo/redo and export. A local service hosts the compiler; the browser consumes a scene/interaction contract, avoiding an early requirement to port Node/native dependencies into a browser runtime.

**Integrations:** deterministic importers for suitable source formats, optional editor/IDE integration, static HTML sharing, and selected editable exports. Importers report source coverage and unsupported constructs. External formats do not receive a blanket lossless round-trip guarantee.

## Scope and expansion

The first target release has architecture, process, and interaction as promoted families. Architecture retains deployment, topology, flow, and domain/comparison arrangements. Process and interaction provide deliberately different semantics that test the platform architecture.

Subsequent family milestones add ER/class, state, trees/mind maps, diff/comparison, timeline, and richer conceptual diagrams. Specialist scientific plots, geographical maps, CAD, and arbitrary mathematical notation require separate family proposals and evidence of demand. Do not call a generic box rendering complete support for those domains.

Publishing, hosting, multiplayer collaboration, a billing system, and a proprietary model service are separate product decisions. Core functionality must not depend on them. User-authorized generated imagery can be a versioned input asset, but the diagram's labels and relationships remain structured.

## Success measures

Measure compiler and agent performance separately. Compiler evaluation starts from correct documents; agent evaluation starts from imperfect briefs/source material. Track semantic preservation, visible defects, target-size reading tasks, preference between valid variants, repairs to acceptance, latency, memory, output size and edit displacement.

Initial target: at least 90% of held-out briefs within each promoted family should produce a usable result without manual geometry editing within three agent revisions. This is a proposed product gate requiring pilot calibration, not current measured performance. The quality contract gives exact deterministic gates and the human review protocol.

The first-class fallback is an honest partial/failed result with a useful preview, explicit unmet requirements and targeted repair options. A beautiful but incorrect explanation is never an acceptable fallback.
