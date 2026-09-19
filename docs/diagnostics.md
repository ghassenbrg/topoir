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

`TOP121_OUTPUT_NAME_COLLISION` is a preflight check: when two views map to one output file
name — for example ids differing only by case, which collide on the macOS and Windows
defaults — compilation stops before anything is produced, so neither view can overwrite the
other. Rename a view so the ids differ by more than case and punctuation.

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
| `TOP252_INTENT_NOT_APPLIED` | The view declares intent this build accepts but does not execute, so the drawing does not reflect it. The message names the view and the specific intent. Run `topoir capabilities` to see what each intent's maturity actually is |
| `TOP320_ASSET_DIRECTORY_INVALID` | Configure an existing readable asset directory |
| `TOP320_ASSET_METADATA_INVALID` | Repair the `assets.yaml` mapping, file or alias metadata |
| `TOP321_ASSET_INVALID` | Replace unsupported/unsafe/oversized artwork with passive SVG or a supported raster |
| `TOP322_ASSET_NOT_FOUND` | Discover the correct inventory ID; explicit `visual.asset` is an error, optional technology/icon fallback is a warning |
| `TOP323_ASSET_OVERRIDDEN` | `visual.assets` is the complete ordered asset list for a component, so a separate `visual.asset` is not rendered; fold it into `visual.assets` or remove it |
| `TOP330_FONT_UNAVAILABLE` | The requested `theme.font.family` is not one the compiler can measure and embed, so a supported family was used for measurement, for the scene and for the embedded faces. Use a supported family, or accept the substitution |
| `TOP332_GLYPH_NOT_AVAILABLE` | Text uses characters no resolved font can draw, so they are painted as replacement boxes. The message names the owner and the code points. Use characters the resolved pack covers |
| `TOP331_COLOR_INVALID` | A colour value is not one the compiler recognizes. The schema pattern admits strings that are not colours, such as a five- or seven-digit hex value or an arbitrary word; use a hex value or a supported colour name |
| `TOP402_COMPOSITION_PORT_UNSUPPORTED` | Use topology/layers for explicit endpoint ports; experimental panels/sequence do not yet honor them |
| `TOP412_RELATIONSHIP_DROPPED` | A declared relationship produced no route and is missing from the diagram; a layout backend lost it |
| `TOP413_COMPONENT_DROPPED` | A declared component was not placed and is missing from the diagram |
| `TOP414_EDGE_LABEL_DROPPED` | A relationship was routed but its declared label was not placed, so the connector is drawn unexplained |
| `TOP415_REGION_DROPPED` | A declared boundary was not placed and is missing from the diagram |
| `TOP416_ANNOTATION_DROPPED` | A declared annotation was not placed, so the explanation it carries is missing |
| `TOP417_GEOMETRY_OUT_OF_BOUNDS` | A mark lies outside the declared canvas, so export crops it away with no trace in the result |
| `TOP418_REGION_OUTSIDE_PARENT` | A nested boundary is not contained by its parent |
| `TOP419_REGION_OVERLAP` | Two unrelated boundaries interpenetrate, which reads as a containment the model does not declare |
| `TOP423_ILLEGAL_BOUNDARY_CROSSING` | A connector enters or leaves a boundary more often than its endpoints require; inspect the route or the composition |
| `TOP424_EDGE_CROSSES_OWN_ENDPOINT` | A connector runs back across its own source or target component, so the arrow appears to leave the wrong side; inspect the route |
| `TOP426_EDGE_ENDPOINT_DETACHED` | A route does not meet the component it claims to connect. A connector may attach to the component, to one of its declared ports, or — in a sequence — to the participant's lifeline. The message gives the measured gap |
| `TOP425_EDGE_SEGMENTS_COINCIDENT` | Two connectors are drawn along the same line for a visible stretch, so two relationships read as one; inspect the composition or report a routing defect |
| `TOP430_LABEL_OVERLAP` | Inspect colliding node, heading, annotation or edge label; revise composition or report a refinement defect |
| `TOP431_GROUP_TITLE_INTERSECTION` | A connector crosses a boundary heading; inspect the route/refinement |
| `TOP432_ANNOTATION_OVERLAP` | A note overlaps a node, heading or another annotation |
| `TOP433_ASPECT_OFF_TARGET` | The diagram is more than 3x away from the view's `layout.aspectRatio`, so it is not the shape it was asked for; raise the component count it has room for, or set a target that suits the model |
| `TOP434_CANVAS_SPARSE` | Components cover under 6% of the canvas, so the diagram reads as mostly empty space |

## Content and legibility diagnostics

Content accounting runs on the measured view, before layout. It reports authored text that
did not fit the component that owns it. Legibility runs on the resolved theme, over the
paint the view actually uses — a theme entry for a component kind that does not appear in
the view says nothing about that drawing and is not reported.

| Code | Repair |
| --- | --- |
| `TOP440_TEXT_ABBREVIATED` | Authored text did not fit and was shortened with an ellipsis. The message names the owner, the content role, the drawn text and how many characters are not drawn. Shorten the text, give the component more text width, or accept the abbreviation deliberately |
| `TOP442_TEXT_NOT_LEGIBLE` | Text cannot be distinguished from its backdrop at all, so the content is lost. Measured against the mark actually painted behind the glyphs, not against a theme token |
| `TOP443_TEXT_LOW_CONTRAST` | Text is visible but below the WCAG bar. A warning, not an error: the content survives and the failure is an accessibility one |
| `TOP450_ELEMENT_NOT_REPRESENTED` | The document declares an element that nothing in the drawing represents. A geometrically clean diagram that omits a required fact is still the wrong diagram |
| `TOP451_MARK_NOT_ATTRIBUTED` | A scene mark has no owning model element, so nothing explains why it is drawn |
| `TOP452_MARK_CLIPPED` | A mark's *painted* extent lies outside the canvas, so part of it is cropped from the artifact. Checked on final ink, not layout rectangles |
| `TOP453_CONTENT_OMITTED` | Authored content is absent from the drawing entirely, with the reason given |

`TOP442` and `TOP443` are deliberately separate. Text at 1:1 against its own fill is
*invisible* — the reader cannot know it is there, the content is lost, and that is an error.
Text at 2.5:1 is *visible but hard to read* — the content survives and the failure is an
accessibility one, so it is a warning. Conflating them would either let the white-on-white
defect pass as a warning or declare every deliberately soft secondary label a broken diagram.

Contrast is measured against the mark **actually painted behind** a glyph run, following
paint order — the card a label sits on, not the canvas default and not the theme token
nominally paired with it. A label on a dark card is correctly judged readable; a label on an
icon-shaped component with no card behind it is correctly judged against the canvas.

Abbreviation is a legal outcome, but never a silent one: measurement declares it, so a
caller can tell full content from shortened content without comparing pictures. Every
measured text run carries `source`, a `disposition` of `rendered` or `abbreviated`, and
`omittedGraphemes` when abbreviated. The view metrics `abbreviatedTextRuns` and
`omittedGraphemes` total it for the view.

An absence of these diagnostics is necessary but not sufficient for the [visual acceptance benchmark](visual-benchmark.md).

## Artifact dimensions

Each artifact reports its logical size and, for a raster format, its actual pixel size:

| Field | Meaning |
| --- | --- |
| `logicalWidth` / `logicalHeight` | The drawing's own coordinate space, unaffected by render scale |
| `pixelWidth` / `pixelHeight` | Raster dimensions read back from the encoded PNG header. Absent for SVG |
| `scale` | The zoom the raster was produced at. Absent for SVG |
| `width` / `height` | Synonyms for the logical size, kept for existing callers |

At PNG scale 2 the result used to report the logical size while the PNG header said twice
that, so a caller sizing a page from the result was wrong by the scale factor with nothing
to tell it. The raster fields are read from the encoded bytes rather than computed, so they
describe what the caller actually received.
