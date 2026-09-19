# Agent API, revisions, exports and workbench

## One application API

SDK, CLI, MCP and workbench must call the same operations and return equivalent diagnostics and acceptance decisions. Avoid separate logic for the “agent version” of rendering. Full source documents remain supported even when optional resource/revision handles are used.

Target SDK operations:

```ts
interface TopoIRApplication {
  discover(filter?: CapabilityFilter): CapabilityInventory;
  getExample(id: string): ExamplePackage;
  validate(source: SourceInput, options?: ValidationOptions): ValidationReportV2;
  compile(source: SourceInput, options?: CompileOptionsV2): Promise<CompileResultV2>;
  inspect(source: SourceInput, options: InspectOptions): Promise<InspectionResult>;
  compare(source: SourceInput, plans: PresentationVariant[], options?: CompileOptionsV2): Promise<ComparisonResult>;
  revise(source: SourceInput, transaction: RevisionTransaction): RevisionResult;
  explain(result: CompileResultV2, query: QualityQuery): QualityExplanation;
  export(result: CompileResultV2, options: ExportOptions): Promise<ExportResult>;
}
```

`SourceInput` is inline source plus optional portable source name, or an explicit content-addressed document resource supplied by the host. Source can be YAML/JSON. Resource lookup is not an arbitrary file read or network fetch. `CompileOptionsV2` includes selected view IDs, quality profile, deterministic mode/work budget, prior geometry reference, output target, explicit assets/fonts, and host cancellation/limits.

`CompileResultV2` contains valid/completion/acceptance status, diagnostics, per-view selected candidate, optional candidate summaries, scene/quality/coverage, artifact descriptors, compilation fingerprint and canonical manifest. Inspection has stage-selective output: model, projection, resolved-presentation, components, composition, geometry, scene, quality or manifest. Stop at the requested stage unless quality dependencies require more. Default inspection summaries omit binary assets and full glyph arrays.

## Discovery and examples

Registry response fields: compiler/schema versions, family IDs/versions/maturity, features, constraints, compatible strategies/styles, quality profiles, export capabilities, resource limits and relevant example IDs. Filter by family, task keywords or capability. Summary mode is compact; callers fetch full family schemas on demand.

An example package contains complete source, preview reference, family/style/strategy, question answered, complexity, required capabilities, explanation of design choices and known limitations. Include good small examples and realistic dense examples. Store examples as versioned source, not only screenshots; validate all advertised examples against the current compiler.

Asset discovery adds semantic roles and style suitability where curated metadata exists. Preserve source, license, intrinsic dimensions and generic/provider-native distinction. Do not send all asset image bodies by default.

## CLI evolution

Preserve existing commands/flags and introduce additive commands after their underlying APIs ship:

| Command | Behavior |
| --- | --- |
| `topoir capabilities [--family id] --json` | Capability registry and maturity |
| `topoir examples [query] --json` / `topoir example <id>` | Discover/fetch complete examples |
| `topoir validate <file|->` | Version and family validation |
| `topoir migrate <file> --to v1alpha2 --output <file>` | Explicit migration, inventory comparison and warnings |
| `topoir render <file> --profile presentation --mode balanced` | Compile and export with acceptance status |
| `topoir compare <file> --plans <file> --output <directory>` | Compile up to three authored presentation variants |
| `topoir inspect <file> --stage quality --json` | Stage-selective structured inspection |
| `topoir revise <file> --patch <file> --expected-revision <hash> --output <file>` | Atomic validated revision to explicit destination |
| `topoir preview <file>` | Start an explicit local review session |

JSON diagnostics go to stdout only when requested; ordinary logs go to stderr. Exit 0 means the requested command/profile succeeded, 1 document/quality failure, 2 usage, 3 resource/cancellation failure, 4 internal failure for V2 commands. Retain documented legacy exit behavior on legacy paths until a versioned CLI transition. Artifacts written after a failed profile require explicit `--diagnostic-output`; never leave a successful-looking final file from a failed render.

Writing output is atomic: validate destinations and collisions, write temporary files beside targets, then rename. Multi-file export includes a manifest completion marker and cleans its own incomplete temporary files after failure. Never delete unrelated output files. Existing overwrite behavior must be documented and preserved or versioned, not silently broadened.

## MCP surface

Retain `validate_document`, `render_document`, `inspect_document`, and `search_icons`; add optional V2 fields without breaking existing calls. Add `discover_capabilities`, `get_example`, `compare_presentations`, `apply_revision`, and `explain_quality` as their corresponding milestones complete. Export can initially be an operation of `render_document` rather than another tool.

Render returns a compact acceptance/quality summary, a native PNG preview, and resource descriptors for source, SVG, full scene, quality and manifest. Compare returns candidate IDs, at most three preview images, selection rationale and tradeoffs. Use a contact sheet only when it remains readable; allow individual preview/crop retrieval. Resource descriptors carry content hash, media type and byte size.

Resource URIs are content-addressed and scoped to the host's explicit store. Hosts declare retention and maximum size. An expired resource returns a stable error and requests the original source/inputs again; it must not fall back to an unrelated latest document. Read-only tools do not write to user directories. Source material and prompt text are data, never tool execution instructions.

## Revision transactions

Transactions are `{expectedRevision, operations, intent?}`. Revision identity is a hash of the exact source bytes and format; canonical document hash is recorded separately. Reject stale revisions before applying any operation. No partial mutation: resolve all references, apply to an isolated draft, validate the resulting document and return either the complete revision or diagnostics.

Operations: `add-element`, `remove-element`, `rename-element`, `set-field`, `set-presentation`, `add-constraint`, `remove-constraint`, and `set-pin`. Targets use model/element or view IDs. `set-field.path` is a schema-validated pointer relative to its target. `rename-element` rewrites all known references atomically. Removing referenced elements requires explicit dependent operations; never silently cascade deletion. New operations must be registered and validated, not dispatched as arbitrary JavaScript.

Return new source, revision hash, semantic/presentation change summary, invalidated views/regions, migration/provenance changes and diagnostics. Preserve YAML comments/format through source-aware edits where practical; if a requested operation requires regeneration, report that and return a new source document rather than overwriting hidden source state. Stateless revision does not mutate files; CLI/workbench persistence is explicit.

Undo stores inverse operations or prior source snapshots. Prior geometry is a separate explicit compile input derived from the previous successful view; it is not hidden inside the semantic source. A revision may validate successfully but render poorly, so UI history retains source and acceptance state independently.

## Agent workflow and stopping rules

1. State the reader question, medium and required facts; mark assumptions.
2. Discover the family and retrieve one or two useful examples.
3. Create a typed model and presentation plan; validate before layout.
4. Render balanced mode and inspect target-size preview plus quality.
5. Repair a specific problem with a semantic/presentation change or compare distinct plans.
6. Stop when the requested profile and explanation are satisfactory, or after the explicit revision budget. Return the best honest result and remaining issues.

The suggested agent revision budget is three, configurable by the caller. Compiler internal refinements are not agent turns. Do not keep cycling styles or random seeds without a diagnosed improvement. Do not remove required facts merely to reduce crossings. Semantic changes need source support; equivalent presentation repairs can be applied under the user's diagram-creation request.

## Workbench behavior

Build a local web application backed by the SDK service. Initial screens: document/view navigator, target-size preview, source/semantic inspector, quality panel, variants panel, history and export. Implementation framework is a routine T31 choice, recorded with a bundle/accessibility rationale; core contracts do not depend on it.

Scene IDs drive hit-testing. Selecting a mark selects its occurrence/relationship and highlights corresponding source and diagnostics. A reader can identify a tangled path, expand a collapsed group, choose a variant, alter a supported style/medium, or request a presentation constraint. Dragging creates an explicit pin/relative constraint with conflict feedback; it does not rewrite domain semantics.

Edits are transactional. Show stale-revision conflicts without silently merging. Undo/redo restore source and compile state. Diagnostic overlays are view-only and excluded from normal exports. Accepted artifacts and diagnostic previews are visually labeled. Keyboard navigation and a structured text outline expose the same semantic selection and reading order.

The local server binds to loopback, uses a per-session origin/token boundary for writes, and only serves configured workspace/output resources. Avoid unrestricted filesystem endpoints. Remote collaboration/authentication are not part of the first workbench milestone.

## Exports and manifests

V2 artifact descriptors contain view/page IDs, format/media type, logical width/height, raster pixel width/height when applicable, physical page dimensions when applicable, resource/byte hash, acceptance status, and lossy-conversion notes. Legacy width/height fields keep their documented logical meaning until the API transition.

Manifest V2 records raw/canonical input hashes, compilation fingerprint, compiler/schema/family/strategy versions, style/font/asset hashes, medium, quality profile/result digest, prior-layout hash, complete artifact descriptors and content accounting digest. Human review references bind to hashes without changing the canonical image.

Delivery order: SVG/PNG → PDF and static interactive HTML → selected editable external formats. PDF preserves physical dimensions and fonts; HTML supports source-linked drill-down, text alternative and keyboard access without a required service. Editable exports map stable identities, preserve text where supported, and emit a loss report for unsupported notation/styles. Never claim a flattened image is a fully editable diagram.
