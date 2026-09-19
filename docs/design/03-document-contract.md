# Document, identity and presentation contract

## Version and wire authority

Target envelope: `apiVersion: topoir.dev/v1alpha2`, `kind: DiagramWorkspace`. Continue accepting `v1alpha1`/`Architecture` through migration. The target examples in this directory are not accepted by today's compiler.

Use JSON Schema 2020-12 as the canonical wire definition and generate TypeScript authoring types from it. Generated files must have a checked regeneration command and a CI drift test. Runtime validation, SDK types, schema discovery and examples must describe the same language. Reject unknown fields except inert namespaced `x-*` metadata. Resolve references only after structural validation.

## Workspace envelope

| Field | Contract |
| --- | --- |
| `metadata` | Required `{name, title?, description?, labels?}`; `name` is portable identity, not a file path |
| `sources` | Optional source descriptors `{id, kind, locator, revision?, contentHash?}`; metadata only, no automatic fetching |
| `entities` | Optional cross-model identities `{id, kind, label, description?, tags?, provenance?}` |
| `models` | Nonempty array `{id, family, familyVersion?, title?, body}`; body selected by family schema |
| `styles` | Optional named presentation definitions `{id, extends?, tokens}`; style inheritance graph must be acyclic |
| `views` | Nonempty array `{id, model, title?, description?, projection?, presentation?}` |
| `viewSets` | Optional ordered collections `{id, views, title?, sharedStyle?}` for coordinated delivery |

Workspace entity, model, source, style, view and view-set IDs each have distinct namespaces. IDs match `[A-Za-z][A-Za-z0-9_.-]*`, maximum 128 characters. IDs are case-sensitive and never derived from mutable labels. All element IDs within one model share one namespace; all occurrence/annotation/region IDs within one view share another. Public cross-model element references use `{model, element}`; local family references are element-ID strings.

Default artifact names are encoded from the case-sensitive view ID without lowercasing. Detect file-system case-folding/encoding collisions before writing and return a diagnostic; never overwrite one requested view with another.

## Model identity and provenance

An entity describes a reusable real-world thing; a model element describes its role in one diagram family. `entity` on an element optionally references a workspace entity. For example, one checkout service can appear as an architecture service, an interaction participant, and a process owner. These are separate model elements linked to one identity; no automatic behavioral inference occurs.

Family element label precedence: local `label`, referenced entity's label, then element ID. A display label override belongs to an occurrence and never changes the model fact. Each content field retains its source pointer after normalization.

Provenance is an array of `{source, pointer?, relation, note?}` where `relation` is `observed`, `inferred`, or `assumed`. `source` must identify a declared source; a user-approved assumption can reference a source descriptor representing that instruction. Unknown facts may be absent with an explicit model annotation; do not invent placeholders such as a zero latency or one replica. Importers report coverage and inference separately.

## Projection and occurrence identity

`projection` supports:

| Field | Meaning |
| --- | --- |
| `include` / `exclude` | Selectors by local `elements` and `tags`; include defaults to all model elements |
| `edgePolicy` | `induced` includes relationships between visible endpoints; `exact` retains only selected relationships |
| `ancestorPolicy` | `retain` by default; `summarize` requires explicit collapse rules |
| `collapse` | Rules `{element, mode: summary, label?}` for family-approved containers/subtrees |
| `occurrences` | Optional `{id, element, role?, label?, detail?, appearance?}`; explicit duplication/detail occurrences |
| `connections` | Required binding overrides when a relationship's endpoint has multiple possible occurrences |

Implicit occurrence IDs equal their model element IDs. Explicit occurrence IDs must not collide with implicit ones; an explicit occurrence with the same ID replaces that element's implicit occurrence. A repeated display uses a new ID and `role: detail` or `role: repeated`. Facts remain tied to the model element, and all occurrences are listed in the coverage report.

Selection order: resolve includes; add explicitly selected relationship endpoints; apply exclusions; retain required ancestry; derive induced relationships only when requested; apply collapse; create occurrences; bind rendered relationships. Excluded endpoints remove dependent optional relationships with an omission record. An excluded required fact is an error. `exact` never adds an unselected relationship merely because its endpoints are visible.

Collapsed internals appear as `representedBy` entries pointing to the summary occurrence. Crossing relationships can aggregate only through family-defined semantics and an explicit rule; retain the underlying relationship IDs and counts. No aggregation invents a relationship between unrelated entities. Multiple endpoint occurrences without an explicit connection binding produce an ambiguity error.

Presentation grouping is independent of real containment. Diagram regions organize visible occurrences; overlays represent cross-cutting sets such as ownership or observability. A security/deployment boundary keeps its model meaning and legal crossing rules. A decorative surround never silently becomes a trust boundary.

## Presentation plan

```ts
interface PresentationDefinition {
  intent?: {
    question?: string;
    audience?: "engineering" | "executive" | "presentation" | "learning";
    takeaway?: string;
    focus?: string[];       // occurrence or presentation-region IDs
    story?: string[];       // ordered model relationships/events
  };
  medium?: MediumDefinition;
  style?: { pack: string; variant?: string; tokens?: DesignTokensV2 };
  composition?: { strategy?: string; candidates?: number };
  regions?: PresentationRegion[];
  constraints?: PresentationConstraint[];
  annotations?: PresentationAnnotation[];
  contentPolicy?: ContentPolicy;
  overrides?: { pins?: PinOverride[] };
}
```

`audience` resolves documented defaults for density, component detail and type hierarchy, recorded in `ResolvedPresentation`; explicit settings win. It does not delete model facts. `focus` applies to groups/regions as well as nodes. `story` preserves authored order, participates in composition and identifies primary relationships. A branch or cycle is legal if the family can represent it; the compiler must not pretend it is a simple path.

`composition.candidates` requests 1–6 macro candidates within the selected execution mode's maximum. Omission uses that mode's maximum. An explicit request above the mode budget is a preflight error with a suggested compatible mode; never silently advertise more candidates than were allowed. A smaller eligible strategy set may yield fewer candidates, with the reason recorded.

`regions` are `{id, role, members, arrangement?, parent?}`. Roles include `primary`, `supporting`, `comparison`, `detail`, `legend` and `overlay`. Members are occurrence IDs or child region IDs. Ordinary layout regions form an acyclic ownership tree with one layout owner per occurrence; overlays may overlap and do not own placement. Repeated comparison structure is expressed through correspondence constraints, not copied coordinates.

## Medium and units

Core geometry uses logical pixels. `medium` has `kind: auto | document | slide | poster | interactive`, `width?`, `height?`, `padding?`, `minTextSize?`, `fit: contain | paginate`, and optional `displayWidth` for auto/interactive views. Fixed-size media require width and height. `document` may declare `page` dimensions in points instead; normalize points to logical pixels at 96/72 and retain original physical units for PDF export. Do not accept both point and pixel dimensions simultaneously.

Named presets expand into explicit values. Initial presets: slide 1600×900, padding 48, minimum text 16 logical pixels; document page A4 portrait at 96 logical pixels/inch, padding 48, minimum text 12; interactive default display width 1440, minimum text 12. These are product defaults, not accessibility certification.

The full scene includes title, subtitle, legend and footnotes within the medium. Let available body width/height be the medium minus measured chrome and padding. The final fit scale is the smaller body-width/content-width and body-height/content-height ratio; do not upscale above 1 unless explicitly requested. Effective type size is measured type size multiplied by that fit scale. A failure below the declared minimum is reported; PNG raster scale does not change effective reading size.

For `auto`, derive canvas bounds from all visible content. Presentation acceptance still evaluates at `displayWidth`; if omitted, resolve the interactive default and record it. `paginate` requires a family-supported split strategy and returns page IDs and continuation references; otherwise return `MEDIUM_UNSUPPORTED_SPLIT`. Never split a temporal fragment or required comparison row arbitrarily.

## Constraint vocabulary

All constraints have stable `id`, `type`, and `strength: required | preferred`. A preferred constraint may have `priority: 1..5`, default 3. Constraints reference visible occurrence/region IDs unless the row states otherwise.

| Type | Payload | Satisfaction |
| --- | --- | --- |
| `order` | `items`, `axis: x|y` | Nonoverlapping projected intervals in authored order |
| `align` | `items`, `axis`, `anchor: start|center|end` | Chosen coordinates agree within 0.5 logical px |
| `near` | `items`, `maxDistance` | Pairwise boundary distance within threshold |
| `separate` | `items`, `minDistance` | Pairwise visible bounds retain separation |
| `correspond` | `rows: string[][]`, `axis: x|y` | Row counterparts share orthogonal alignment and allocated row size |
| `primary-path` | `relationships`, `direction` | Family-specific main-path progression; feedback links reported explicitly |
| `place-relative` | `subject`, `reference`, `side`, `gap` | Subject is on requested side with required clearance |
| `reserve-corridor` | `between: [region,region]`, `minWidth` | Available routing corridor retained between regions |
| `keep-together` | `items` | Same page and composition region |

Each implementation must advertise which constraints it can guarantee. Unsupported required constraints fail preflight. Unsupported preferred constraints warn, appear unsatisfied in the report, and may be excluded from candidate objectives with that explanation. Contradictions produce a conflict set of constraint IDs; an approximate conflict set is labeled approximate. Never relax a required constraint to return a cleaner picture.

`overrides.pins` holds `{occurrence, x, y, strength}` in the selected view's body coordinate system, with optional previous-layout compatibility hash. Pins are explicitly presentation state, never domain facts. They participate in conflict reporting and the compilation hash.

## Content and annotations

`contentPolicy` defines `required` model element/field references, `detail: full | standard | summary`, and text overflow defaults. Required labels default to `wrap`; allowed policies are `wrap`, `expand`, `error`, and explicitly requested `ellipsis`. Truncation emits a diagnostic and a visible-content record even when permitted. An annotation or detail view may preserve full content, but its existence does not authorize silently abbreviating a required label.

Each required reference is `{element, field?}` within the view's model; `field` is a schema-valid pointer relative to the element, with a single property name such as `label` accepted as shorthand for `/label`. An element-level requirement retains its family-defined essential meaning and connections selected by the view. It does not automatically require every optional descriptive field. The family declares the essential-field set in capability metadata.

Presentation annotations are `{id, kind, text, anchor?, placement?, appearance?}`. Anchors are typed: occurrence, relationship segment, compartment, event, interval, or region. `placement` is a preference such as `below` or `aside`, never a hidden coordinate. Family-specific explanatory content may also exist in the semantic body, and projection must retain its provenance.

## Migration from v1alpha1

Map metadata and model into one `architecture` model; create views pointing to it. Preserve all local IDs. Map include/exclude selectors and legacy induced-edge behavior explicitly. Move theme and design into presentation, and map visual properties into occurrence appearance without changing the underlying facts. Ports and ordered asset roles retain their original meaning.

Legacy `sequence` views may be lowered into an interaction model only through an explicit migration option: create participants and one message event per existing edge in declared step/order, with no invented activations, returns or fragments. Otherwise use the compatibility architecture composition. Comparison panels remain manually authored comparisons until correspondence/diff data is supplied.

Migration returns the new document, old-to-new source-pointer map, semantic inventory comparison and warnings. It never writes over input by default. Ship migrate/validate examples before making new documents the default in discovery. API version, compiler version, family-pack version and manifest version are independent.
