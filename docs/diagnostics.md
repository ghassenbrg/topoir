# Diagnostics

Every diagnostic has a stable `code`, severity, message, JSON-pointer `path` when applicable, source identity, optional line/column range, optional repair hint, and structured details.

| Family | Area | Examples |
|---|---|---|
| TOP1xx | Parse and structural schema | syntax, required/unknown property, type mismatch |
| TOP2xx | Semantic model | duplicate ID, group cycle, unknown endpoint/port/flow/view reference |
| TOP3xx | Visual assets | unknown theme, template, font, or icon |
| TOP4xx | Geometry and content quality | layout failure, overlap, empty/diagonal route, node intersection, boundary/label warning, abbreviated content |
| TOP5xx | Artifact output | scene/SVG/PNG/export failure |
| TOP9xx | Unexpected failure | uncaught CLI/runtime error |

`TOPOIR_DIAGNOSTIC_CODES` exported from `@topoir/schema` is the complete machine-readable list, and a test holds it to what the source can actually emit. Match on `code`; do not parse message wording.

Errors block a successful result. Warnings allow an artifact but identify a quality condition that may need semantic remodeling or an engine issue. `--warnings-as-errors` is appropriate for checked-in diagrams.

CLI usage — a bad flag or a missing argument — reports `TOP120_CLI_USAGE` and exits 2, with that command's usage text. It is not a `TOP9xx` internal failure. Every command also accepts `--help`.

Human output:

```text
architecture.topoir.yaml:42:11: error TOP231_EDGE_TARGET_NOT_FOUND Edge "auth-flow" references unknown target node "keycloak".
```

Machine output:

```bash
topoir validate architecture.topoir.yaml --json
```

Do not parse message wording. Match `code`, then use `path` and `range` to edit the source.

## Design and asset diagnostics

| Code | Repair |
| --- | --- |
| `TOP251_DESIGN_REFERENCE_NOT_FOUND` | Correct the focus node or story edge ID |
| `TOP320_ASSET_DIRECTORY_INVALID` | Configure an existing readable asset directory |
| `TOP320_ASSET_METADATA_INVALID` | Repair the `assets.yaml` mapping, file or alias metadata |
| `TOP321_ASSET_INVALID` | Replace unsupported/unsafe/oversized artwork with passive SVG or a supported raster |
| `TOP322_ASSET_NOT_FOUND` | Discover the correct inventory ID; explicit `visual.asset` is an error, optional technology/icon fallback is a warning |
| `TOP323_ASSET_OVERRIDDEN` | `visual.assets` is the complete ordered asset list for a component, so a separate `visual.asset` is not rendered; fold it into `visual.assets` or remove it |
| `TOP402_COMPOSITION_PORT_UNSUPPORTED` | Use topology/layers for explicit endpoint ports; experimental panels/sequence do not yet honor them |
| `TOP412_RELATIONSHIP_DROPPED` | A declared relationship produced no route and is missing from the diagram; a layout backend lost it |
| `TOP413_COMPONENT_DROPPED` | A declared component was not placed and is missing from the diagram |
| `TOP414_EDGE_LABEL_DROPPED` | A relationship was routed but its declared label was not placed, so the connector is drawn unexplained |
| `TOP423_ILLEGAL_BOUNDARY_CROSSING` | A connector enters or leaves a boundary more often than its endpoints require; inspect the route or the composition |
| `TOP424_EDGE_CROSSES_OWN_ENDPOINT` | A connector runs back across its own source or target component, so the arrow appears to leave the wrong side; inspect the route |
| `TOP425_EDGE_SEGMENTS_COINCIDENT` | Two connectors are drawn along the same line for a visible stretch, so two relationships read as one; inspect the composition or report a routing defect |
| `TOP430_LABEL_OVERLAP` | Inspect colliding node, heading, annotation or edge label; revise composition or report a refinement defect |
| `TOP431_GROUP_TITLE_INTERSECTION` | A connector crosses a boundary heading; inspect the route/refinement |
| `TOP432_ANNOTATION_OVERLAP` | A note overlaps a node, heading or another annotation |
| `TOP433_ASPECT_OFF_TARGET` | The diagram is more than 3x away from the view's `layout.aspectRatio`, so it is not the shape it was asked for; raise the component count it has room for, or set a target that suits the model |
| `TOP434_CANVAS_SPARSE` | Components cover under 6% of the canvas, so the diagram reads as mostly empty space |

## Content diagnostics

Content accounting runs on the measured view, before layout. It reports authored text that
did not fit the component that owns it.

| Code | Repair |
| --- | --- |
| `TOP440_TEXT_ABBREVIATED` | Authored text did not fit and was shortened with an ellipsis. The message names the owner, the content role, the drawn text and how many characters are not drawn. Shorten the text, give the component more text width, or accept the abbreviation deliberately |

Abbreviation is a legal outcome, but never a silent one: measurement declares it, so a
caller can tell full content from shortened content without comparing pictures. Every
measured text run carries `source`, a `disposition` of `rendered` or `abbreviated`, and
`omittedGraphemes` when abbreviated. The view metrics `abbreviatedTextRuns` and
`omittedGraphemes` total it for the view.

An absence of these diagnostics is necessary but not sufficient for the [visual acceptance benchmark](visual-benchmark.md).
