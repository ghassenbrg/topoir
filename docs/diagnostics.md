# Diagnostics

Every diagnostic has a stable `code`, severity, message, JSON-pointer `path` when applicable, source identity, optional line/column range, optional repair hint, and structured details.

| Family | Area | Examples |
|---|---|---|
| TOP1xx | Parse and structural schema | syntax, required/unknown property, type mismatch |
| TOP2xx | Semantic model | duplicate ID, group cycle, unknown endpoint/port/flow/view reference |
| TOP3xx | Visual assets | unknown theme, template, font, or icon |
| TOP4xx | Geometry quality | layout failure, overlap, empty/diagonal route, node intersection, boundary/label warning |
| TOP5xx | Artifact output | scene/SVG/PNG/export failure |
| TOP9xx | Unexpected failure | uncaught CLI/runtime error |

Errors block a successful result. Warnings allow an artifact but identify a quality condition that may need semantic remodeling or an engine issue. `--warnings-as-errors` is appropriate for checked-in diagrams.

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
| `TOP402_COMPOSITION_PORT_UNSUPPORTED` | Use topology/layers for explicit endpoint ports; experimental panels/sequence do not yet honor them |
| `TOP430_LABEL_OVERLAP` | Inspect colliding node, heading, annotation or edge label; revise composition or report a refinement defect |
| `TOP431_GROUP_TITLE_INTERSECTION` | A connector crosses a boundary heading; inspect the route/refinement |
| `TOP432_ANNOTATION_OVERLAP` | A note overlaps a node, heading or another annotation |

An absence of these diagnostics is necessary but not sufficient for the [visual acceptance benchmark](visual-benchmark.md).
