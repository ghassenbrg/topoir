# Measured components, scene and visual grammar

## Single content contract

`ComponentPlan` replaces independent dimension arithmetic in measurement and rendering. It is compiled from a semantic occurrence plus resolved appearance. Every visible part, including headers, labels, badges, legends and annotation text, uses the same block-measurement system.

```ts
interface ComponentPlan {
  id: string;
  occurrenceId: string;
  semanticRef: ElementRef;
  template: { id: string; version: string };
  size: { min: Size; preferred: Size; max?: Size };
  layoutBounds: Rect;
  inkBounds: Rect;
  silhouette: Silhouette;
  blocks: MeasuredBlock[];
  attachments: AttachmentSite[];
  content: ContentDisposition[];
  accessibility: { label: string; description?: string; readingOrder: string[] };
}
```

All coordinates inside a plan are local. Placement applies one transform to the entire plan. Layout bounds reserve collision space; ink bounds include actual strokes, marks and decoration. The silhouette is the visible attachment surface, not always the rectangle. Stacked sheets, cylinder curves and diamond corners must not use rectangle-edge endpoints that appear detached.

## Block grammar

Unmeasured blocks are `text`, `asset`, `badge`, `rule`, `row`, `column`, `grid`, `table`, `stack`, `spacer`, and restricted `vector`. Row/column/grid specify gaps, alignment and min/max policies. Tables define columns, row groups and named cells; they support ER attributes and gateway routes. Restricted vector blocks refer to registered deterministic shapes, not arbitrary executable code.

Measured text contains original content, visible lines, shaped glyph runs, advances/ink bounds, baseline, ascent/descent, font face/hash, font size, language/direction and overflow status. Renderer placement consumes these values without rewrapping. Asset blocks retain intrinsic aspect, target rectangle, fit mode, resolved hash and role. A repeated asset role is distinct from another role using the same image; deduplication of image bytes must not deduplicate authored roles.

Measurement uses a bounded width negotiation: preferred width, family/template width alternatives, and an optional expanded width before wrapping or error. Reflow changes a plan's dimensions and invalidates affected composition candidates. Do not keep expanding until a diagram happens to fit: cap alternatives and return the best legal result with diagnostics.

`ContentDisposition` maps each authored content ID to `rendered`, `abbreviated`, `representedBy`, or `omitted`, with owning scene IDs and reason. Required content cannot be omitted. Abbreviation is never inferred from a missing primitive; it must be declared by measurement. All six allowed legacy asset roles must render or fail explicitly.

## Attachment sites

An attachment is `{id, role, point, normal, region?, allowedDirections, capacity, labelBounds?}`. Its point is on the silhouette or an explicit internal compartment/lifeline site. It can describe a fixed point, side interval, row endpoint, perimeter interval or event position. Route endpoints reference attachment IDs instead of merely node IDs and arbitrary coordinates.

Dynamic side attachments allocate lanes during routing and are written back into the resolved component plan. Capacity reflects available visible separation. A plan can grow or select another site when lanes do not fit; it cannot silently stack unrelated routes on one mark. Gateway compartments and ER field connections share the same machinery.

## Font resolution

Introduce a `FontRegistry` holding versioned regular/bold/italic faces, licenses, glyph coverage, metrics and binary hashes. Resolve the entire fallback chain before shaping. Measurement, SVG and PNG must use that exact chain. Unknown requested families fail resolution; documented explicit fallback mode may warn and use a named fallback, recorded in the result.

Initially preserve DejaVu for legacy outputs and add font-pack contracts. Add editorial/monospace and CJK/RTL coverage as tested packs in later milestones. Missing glyphs produce source-linked diagnostics, never undetected tofu. Shape normalization and grapheme handling must preserve identifiers; do not introduce spaces into unbroken URLs/identifiers when wrapping chunks. Ellipsis must operate on grapheme boundaries.

SVG may use text for runs whose shaping is reproducible across supported renderers; shaped complex runs may require glyph outlines for exact presentation. If paths are used, retain the original text in accessibility/semantic metadata and document the editability tradeoff. Font subsetting must be deterministic and licensed; it is an optimization after matching measurement and rendering.

## Style resolution

Resolve in this order: family defaults → style pack/variant → workspace named style → view tokens → semantic selector rules → occurrence overrides → status/focus rules. Status/focus are named token roles, not hardcoded colors. Expose the final resolved tokens in inspection. Cycles, unknown variants and unsupported combinations fail before measurement.

Token groups: typography, spacing/density, canvas, component grammar, boundaries, connectors/markers, semantic palette, focus/status, illustration/depth and accessibility. Use intent such as `assetBackplate`, `leadingAccent`, and `stackOffset` rather than testing `theme.id` inside rendering. Empty inheritance must be behaviorally equivalent to its base.

Color inputs normalize through a real color parser into a canonical representation; reject invalid named colors and malformed hex values. Contrast is measured after alpha compositing against actual backgrounds. Ensure legends preserve semantic color/style mappings even when a relationship is muted. A node or flow's status should also use a marker/text/style distinction.

A visual grammar can change component silhouette, content layout, heading structure, connector treatment and illustration. A style pack has a preview matrix across supported families and density ranges. Illustrative components use seeded vector construction or explicit assets with measured bounds; generated raster artwork remains an input asset. Avoid random perturbations of text or attachment geometry.

## Scene document

Move shared scene types into core. A `SceneDocument` contains pages, layers, primitives, a semantic index, reading order and content-disposition table. Each primitive has a stable scene ID and owner: occurrence, relationship, region, annotation or page chrome. Maintain geometry-to-source provenance through all transforms.

Required primitives: groups/transforms, rectangles, circles/ellipses, paths, shaped text, images, clips and reusable symbols. Text metadata is retained even when glyphs are outlined. Link actions are explicitly typed and disabled unless supported by the exporter/host; never execute source-provided scripts.

Layer order: background → true boundaries → overlays behind content → relationships → components → relationship labels → annotations → page chrome/legend → interaction overlays (viewer only). Exceptions such as crossing bridges are explicit scene operations. QA must use final paint/stroke bounds, not only layout rectangles.

SVG remains canonical, self-contained by default, with optional shared-asset package export. PNG is rasterized from the selected scene's SVG once, with resolved fonts and system-font discovery disabled. Report logical scene dimensions and actual raster dimensions separately. Manifest hashes include the exporter settings and resolved resources.

## Required verification

Test empty and long content, 1–6 distinct asset roles, duplicate image bytes in distinct roles, 48-character badges, multi-line headings, tall/wide assets, diamonds/cylinders/stacks, compartment attachments, dark-style inheritance, missing font/glyphs, color visibility, grapheme wrapping, and whole-scene bounds. Assertions must inspect measured/drawn content, not just `result.ok`. Render representative PNGs and inspect them after geometry-affecting changes.
