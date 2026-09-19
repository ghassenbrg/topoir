import { createHash } from "node:crypto";
import { AssetRegistry, discoverAssets } from "@topoir/assets";
import {
  analyzeContent,
  analyzeGeometry,
  analyzeScene,
  analyzeVisibility,
  compilePresentation,
  evaluateAcceptance,
  loadWorkspace,
  projectWorkspaceView,
  bundledFontTextMeasurer,
  planForNode,
  fontSetDiagnostic,
  glyphDiagnostic,
  intentDiagnostics,
  loadDocument,
  measureView,
  projectView,
  resolveFontSet,
  resolveTheme,
  type GeometryView,
  type LayoutEngine,
  type ComponentPlan,
  type MeasuredView,
  type QualityProfile,
  type QualityReportV2,
  type NormalizedDocument,
  type TextMeasurer,
  type ViewGraph,
} from "@topoir/core";
import { CompositionEngine } from "@topoir/layout-elk";
import {
  buildScene,
  renderPng,
  renderSvg,
  sceneDocument,
  type PngOptions,
  type Scene,
} from "@topoir/renderer-svg";
import type { Diagnostic, v1alpha2 } from "@topoir/schema";

export const TOPOIR_VERSION = "0.1.0-alpha.0";

export type OutputFormat = "svg" | "png" | "both";

export interface CompileOptions {
  readonly source?: string;
  /**
   * The quality bar the result is judged against. `presentation` by default.
   *
   * A profile changes what *acceptance* means, never what is drawn: the same document
   * produces the same artifact under every profile, and only `quality.accepted` differs.
   */
  readonly profile?: QualityProfile;
  readonly view?: string | readonly string[] | "all";
  readonly format?: OutputFormat;
  readonly png?: PngOptions;
  readonly layoutEngine?: LayoutEngine;
  readonly textMeasurer?: TextMeasurer;
  readonly assets?: AssetRegistry;
  readonly assetDirectory?: string;
}

export interface CompileArtifact {
  readonly viewId: string;
  readonly format: "svg" | "png";
  readonly fileName: string;
  readonly mediaType: "image/svg+xml" | "image/png";
  readonly content: string | Uint8Array;
  readonly sha256: string;
  /**
   * Logical width in user units. Kept for existing callers; it is a synonym for
   * `logicalWidth` and is unchanged by PNG scale. Prefer the explicit fields below.
   */
  readonly width: number;
  /** Logical height in user units. Synonym for `logicalHeight`. */
  readonly height: number;
  /**
   * The drawing's own coordinate space, independent of how it was rasterized.
   *
   * At PNG scale 2 the artifact metadata used to report 360x226 while the PNG header said
   * 720x452, so a caller sizing a page from the result was wrong by the scale factor with
   * nothing to tell it. Logical and raster size are now separate, explicit fields.
   */
  readonly logicalWidth: number;
  readonly logicalHeight: number;
  /**
   * Actual raster dimensions, read back from the encoded PNG rather than computed. Absent
   * for SVG, which has no raster size of its own.
   */
  readonly pixelWidth?: number;
  readonly pixelHeight?: number;
  /** The zoom the raster was produced at. Absent for SVG. */
  readonly scale?: number;
}

export interface CompiledView {
  readonly view: ViewGraph;
  readonly measured: MeasuredView;
  readonly geometry: GeometryView;
  readonly scene: Scene;
  readonly metrics: Readonly<Record<string, number>>;
  /**
   * The V2 quality report (T14): `valid`, `completion` and `accepted` answered separately.
   *
   * An artifact can exist without acceptance, so `artifacts.length > 0` says nothing about
   * whether the diagram is any good. Ask `quality.accepted`.
   */
  readonly quality: QualityReportV2;
  /**
   * One `ComponentPlan` per placed component (T08).
   *
   * The plan is the shared description the drawing and the geometry analysis are meant to
   * work from: it carries the true silhouette, the real attachment sites and the content
   * disposition. It is produced from the measured, laid-out component, so a caller can
   * ask where a connector may legally meet a component, or what happened to a piece of
   * authored content, without re-deriving either from the picture.
   */
  readonly plans: readonly ComponentPlan[];
}

export interface ArtifactManifest {
  readonly manifestVersion: 1;
  readonly compiler: { readonly name: "topoir"; readonly version: string };
  readonly input: { readonly source: string; readonly sha256: string };
  readonly document: { readonly name: string; readonly apiVersion: string };
  readonly layout: { readonly engine: string };
  readonly artifacts: readonly {
    readonly viewId: string;
    readonly format: "svg" | "png";
    readonly fileName: string;
    readonly mediaType: string;
    readonly sha256: string;
    /** Logical size, kept for existing consumers. Synonym for `logicalWidth`/`logicalHeight`. */
    readonly width: number;
    readonly height: number;
    readonly logicalWidth: number;
    readonly logicalHeight: number;
    /** Raster size read back from the PNG header. Absent for SVG. */
    readonly pixelWidth?: number;
    readonly pixelHeight?: number;
    readonly scale?: number;
  }[];
}

export interface CompileResult {
  readonly ok: boolean;
  readonly diagnostics: readonly Diagnostic[];
  readonly document?: NormalizedDocument;
  readonly views: readonly CompiledView[];
  readonly artifacts: readonly CompileArtifact[];
  readonly manifest?: ArtifactManifest;
}

export interface ValidationReport {
  readonly ok: boolean;
  readonly diagnostics: readonly Diagnostic[];
  readonly document?: NormalizedDocument;
}

export class TopoIRCompiler {
  public validate(sourceText: string, source = "<input>"): ValidationReport {
    const result = loadDocument(sourceText, { source });
    return {
      ok: result.document !== undefined && !hasErrors(result.diagnostics),
      diagnostics: result.diagnostics,
      ...(result.document === undefined ? {} : { document: result.document }),
    };
  }

  public async compile(sourceText: string, options: CompileOptions = {}): Promise<CompileResult> {
    const source = options.source ?? "<input>";
    // A document says which language it is written in. Both loaders produce the same
    // compilable shape, so nothing below this line knows which one ran.
    const loaded = loadCompilable(sourceText, source, options.view);
    if (loaded.viewIds.length === 0 || hasErrors(loaded.diagnostics)) {
      return {
        ok: false,
        diagnostics: loaded.diagnostics,
        ...(loaded.document === undefined ? {} : { document: loaded.document }),
        views: [],
        artifacts: [],
      };
    }

    const layoutEngine = options.layoutEngine ?? new CompositionEngine();
    const diagnostics: Diagnostic[] = [...loaded.diagnostics];
    let assets = options.assets ?? new AssetRegistry();
    if (options.assetDirectory !== undefined) {
      try {
        const inventory = await discoverAssets(options.assetDirectory, assets);
        assets = inventory.registry;
        diagnostics.push(...inventory.diagnostics);
      } catch (error) {
        diagnostics.push({ code: "TOP320_ASSET_DIRECTORY_INVALID", severity: "error", message: String(error) });
      }
      if (hasErrors(diagnostics)) return { ok: false, diagnostics, views: [], artifacts: [] };
    }
    const compiledViews: CompiledView[] = [];
    const artifacts: CompileArtifact[] = [];
    const format = options.format ?? "svg";

    const viewIds = loaded.viewIds;

    // Output names are checked before anything is written. Two view ids that differ only
    // by case produce one file name, so on a case-insensitive filesystem — the macOS and
    // Windows default — the second view silently overwrites the first.
    const byFileName = new Map<string, string[]>();
    for (const viewId of viewIds) {
      const name = safeFileName(viewId);
      byFileName.set(name, [...(byFileName.get(name) ?? []), viewId]);
    }
    for (const [name, owners] of byFileName) {
      if (owners.length < 2) continue;
      diagnostics.push({
        code: "TOP121_OUTPUT_NAME_COLLISION",
        severity: "error",
        message:
          `Views ${owners.map((owner) => JSON.stringify(owner)).join(" and ")} both write to ${JSON.stringify(name)}, ` +
          `so one would overwrite the other. Rename a view so the ids differ by more than case and punctuation.`,
      });
    }
    if (hasErrors(diagnostics)) {
      return { ok: false, diagnostics, ...(loaded.document === undefined ? {} : { document: loaded.document }), views: [], artifacts: [] };
    }

    for (const viewId of viewIds) {
      const view = loaded.project(viewId);
      let theme;
      try {
        theme = resolveTheme(view.theme);
      } catch (error) {
        diagnostics.push({
          code: "TOP310_THEME_NOT_FOUND",
          severity: "error",
          message: error instanceof Error ? error.message : "Unknown theme.",
        });
        continue;
      }
      // Fonts are resolved once, into one set, which measurement, the embedded SVG faces
      // and the PNG rasterizer all consume. Three independent resolutions that happened to
      // agree is not the same as one that provably does.
      const requestedFamily = typeof view.theme === "object" && view.theme !== null ? view.theme.font?.family : undefined;
      const fontSet = resolveFontSet(requestedFamily);
      const substitution = fontSetDiagnostic(fontSet);
      if (substitution !== undefined) diagnostics.push(substitution);
      // Paint the view actually uses has to be readable and has to be real colour.
      const visibility = analyzeVisibility(view, theme);
      diagnostics.push(...visibility.diagnostics);
      // Intent this build accepts but does not execute is reported, so a caller can tell
      // "applied" from "ignored" without diffing two drawings.
      diagnostics.push(...intentDiagnostics(view));
      // The presentation block is compiled here even for v1alpha1 documents, because its
      // reference checks and audience defaults apply to both languages.
      const presentation = compilePresentation(loaded.presentationFor?.(viewId), {
        elementIds: new Set([...view.nodes.map((node) => node.id), ...view.edges.map((edge) => edge.id)]),
        groupIds: new Set(view.groups.map((group) => group.id)),
        viewId,
      });
      diagnostics.push(...presentation.diagnostics);

      const measurer = options.textMeasurer ?? bundledFontTextMeasurer(fontSet);
      const measured = measureView(view, theme, measurer, (reference) => assets.resolve(reference));
      // A character no resolved face can draw is rendered as a replacement box in both
      // exports. Without this the caller sees a clean compile and a drawing full of tofu.
      for (const [owner, text] of authoredText(view)) {
        const missing = glyphDiagnostic(fontSet, owner, text);
        if (missing !== undefined) diagnostics.push(missing);
      }
      for (const node of measured.nodes) {
        const explicit = node.visual?.assets ?? [];
        if (explicit.length > 0 && node.visual?.asset !== undefined) diagnostics.push({ code: "TOP323_ASSET_OVERRIDDEN", severity: "warning", message: `Node ${node.id} sets both visual.asset and visual.assets; visual.assets is the complete list, so ${JSON.stringify(node.visual.asset)} is not rendered. Add it to visual.assets or remove it.` });
        const required = explicit.length > 0 ? explicit : [node.visual?.asset].filter((reference): reference is string => reference !== undefined);
        const optional = explicit.length > 0 ? [] : [node.icon, node.technology].filter((reference): reference is string => reference !== undefined && !required.includes(reference));
        for (const reference of required) if (!assets.resolve(reference)) diagnostics.push({ code: "TOP322_ASSET_NOT_FOUND", severity: "error", message: `Asset ${JSON.stringify(reference)} on ${node.id} was not found; add it to the configured inventory.` });
        for (const reference of optional) if (!assets.resolve(reference)) diagnostics.push({ code: "TOP322_ASSET_NOT_FOUND", severity: "warning", message: `Asset ${JSON.stringify(reference)} on ${node.id} was not found; using the semantic kind fallback.` });
      }
      const layout = await layoutEngine.layout(measured);
      diagnostics.push(...layout.diagnostics);
      if (layout.geometry === undefined) continue;

      const quality = analyzeGeometry(measured, layout.geometry);
      diagnostics.push(...quality.diagnostics);
      // Content accounting is independent of geometry: text can be abbreviated by
      // measurement long before layout runs, and that loss has to be reported rather than
      // left for an author to notice in the picture.
      const content = analyzeContent(measured);
      diagnostics.push(...content.diagnostics);
      const scene = buildScene(measured, layout.geometry, theme, assets);
      // Quality on the scene the reader actually receives, not on the measured boxes that
      // preceded it. This is where a clipped glyph run, an unreadable label on its real
      // backdrop, or a declared fact with no visible representative is caught.
      const sceneQuality = analyzeScene(sceneDocument(scene), {
        required: [
          ...view.nodes.map((node) => node.id),
          ...view.edges.map((edge) => edge.id),
          ...view.groups.map((group) => group.id),
          ...view.annotations.map((annotation) => annotation.id),
        ],
        ...(view.design?.composition === undefined ? {} : { composition: view.design.composition }),
        background: theme.canvas.background,
      });
      diagnostics.push(...sceneQuality.diagnostics);
      // Plans are compiled from the placed components, so their silhouettes and
      // attachment sites describe the drawing that was actually produced.
      const incident = new Map<string, number>();
      for (const edge of measured.edges) {
        incident.set(edge.from, (incident.get(edge.from) ?? 0) + 1);
        incident.set(edge.to, (incident.get(edge.to) ?? 0) + 1);
      }
      const geometryById = new Map(layout.geometry.nodes.map((node) => [node.id, node]));
      const plans = measured.nodes.flatMap((node) => {
        const placed = geometryById.get(node.id);
        if (placed === undefined) return [];
        // Only the rectangle: a plan's bounds are geometry, not a copy of the whole
        // geometry node, or the plan quietly carries a second copy of its ports.
        const bounds = { x: placed.x, y: placed.y, width: placed.width, height: placed.height };
        // The count of assets actually drawn, which is what the renderer lays out against:
        // an unresolved role occupies a slot in measurement but draws nothing, and the
        // strip width decides where the label starts.
        const drawn = (node.assetRoles ?? []).filter((role) => assets.resolve(role.reference) !== undefined).length;
        const fallback = drawn === 0 && assets.resolve(node.kind) !== undefined ? 1 : drawn;
        return [planForNode(node, { theme, bounds }, incident.get(node.id) ?? 2, fallback)];
      });
      const viewMetrics = { ...layout.metrics, ...quality.metrics, ...content.metrics, ...visibility.metrics, ...sceneQuality.metrics, minimumTextSize: presentation.plan.minimumTextSize };
      // Acceptance is computed from the violations, not from their absence in a list the
      // caller controls, so suppressing diagnostics cannot turn a failure into a success.
      const acceptance = evaluateAcceptance({
        ...(options.profile === undefined ? {} : { profile: options.profile }),
        diagnostics: [...quality.diagnostics, ...content.diagnostics, ...visibility.diagnostics, ...sceneQuality.diagnostics, ...presentation.diagnostics],
        metrics: viewMetrics,
        medium: presentation.plan.medium,
        drawing: { width: scene.width, height: scene.height },
        baseTextSize: theme.font.labelSize,
        requestedViews: viewIds.length,
        producedViews: viewIds.length,
      });
      const compiled: CompiledView = {
        view,
        measured,
        geometry: layout.geometry,
        scene,
        quality: acceptance,
        plans,
        metrics: viewMetrics,
      };
      compiledViews.push(compiled);

      if (format === "svg" || format === "both") {
        const svg = renderSvg(scene, fontSet);
        artifacts.push(createArtifact(view.id, "svg", svg, scene));
      }
      if (format === "png" || format === "both") {
        const svg = renderSvg(scene, fontSet);
        const png = renderPng(svg, { ...options.png, fonts: fontSet });
        artifacts.push(createArtifact(view.id, "png", png, scene, options.png?.scale ?? 1));
      }
    }

    const manifest: ArtifactManifest = {
      manifestVersion: 1,
      compiler: { name: "topoir", version: TOPOIR_VERSION },
      input: { source, sha256: sha256(sourceText) },
      document: { name: loaded.name, apiVersion: loaded.apiVersion },
      layout: { engine: layoutEngine.id },
      artifacts: artifacts.map(({ content: _content, ...artifact }) => artifact),
    };
    return {
      ok: !hasErrors(diagnostics) && compiledViews.length === viewIds.length,
      diagnostics,
      ...(loaded.document === undefined ? {} : { document: loaded.document }),
      views: compiledViews,
      artifacts,
      manifest,
    };
  }
}

function selectViewIds(
  document: NormalizedDocument,
  selection: CompileOptions["view"],
): readonly string[] {
  const available = new Set(document.views.map((view) => view.id));
  const requested =
    selection === "all"
      ? document.views.map((view) => view.id)
      : typeof selection === "string"
        ? [selection]
        : selection ?? [document.views.find((view) => view.id === "overview")?.id ?? document.views[0]?.id ?? "overview"];
  for (const id of requested) {
    if (!available.has(id)) {
      throw new Error(`Unknown view ${JSON.stringify(id)}. Available views: ${[...available].join(", ")}.`);
    }
  }
  return [...new Set(requested)];
}

function createArtifact(
  viewId: string,
  format: "svg" | "png",
  content: string | Uint8Array,
  scene: Scene,
  requestedScale?: number,
): CompileArtifact {
  const bytes = typeof content === "string" ? Buffer.from(content, "utf8") : content;
  const raster = format === "png" ? pngDimensions(bytes) : undefined;
  return {
    viewId,
    format,
    fileName: `${safeFileName(viewId)}.${format}`,
    mediaType: format === "svg" ? "image/svg+xml" : "image/png",
    content,
    sha256: sha256(bytes),
    width: scene.width,
    height: scene.height,
    logicalWidth: scene.width,
    logicalHeight: scene.height,
    ...(raster === undefined
      ? {}
      : {
          pixelWidth: raster.width,
          pixelHeight: raster.height,
          // The zoom that was asked for, not one derived from the encoded size: the
          // rasterizer rounds to whole pixels, so 372.67 at scale 2 encodes as 745 and a
          // derived value would report 1.999.
          scale: requestedScale ?? 1,
        }),
  };
}

/**
 * Raster dimensions read back from the encoded PNG's IHDR chunk.
 *
 * Read rather than computed on purpose: the point of the field is to describe the bytes
 * the caller actually received, so deriving it from the scene and the requested scale
 * would reintroduce exactly the disagreement it exists to prevent.
 */
function pngDimensions(bytes: Uint8Array): { width: number; height: number } | undefined {
  const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(signature)) return undefined;
  if (buffer.subarray(12, 16).toString("ascii") !== "IHDR") return undefined;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

/** Every authored string a view will draw, with the owner to name in a diagnostic. */
function authoredText(view: ViewGraph): readonly (readonly [string, string])[] {
  const entries: (readonly [string, string])[] = [];
  for (const node of view.nodes) {
    entries.push([`node ${node.id}`, node.label]);
    if (node.description !== undefined) entries.push([`node ${node.id}`, node.description]);
    if (node.visual?.badge !== undefined) entries.push([`the badge of node ${node.id}`, node.visual.badge]);
    for (const port of node.ports) entries.push([`port ${node.id}.${port.id}`, port.label]);
  }
  for (const group of view.groups) entries.push([`group ${group.id}`, group.label]);
  for (const edge of view.edges) {
    if (edge.label !== undefined) entries.push([`relationship ${edge.id}`, edge.label]);
  }
  for (const annotation of view.annotations) entries.push([`annotation ${annotation.id}`, annotation.text]);
  return entries;
}

/** A cheap check before parsing, so the right loader reports the right diagnostics. */
function isWorkspaceSource(text: string): boolean {
  return /^\s*(?:#[^\n]*\n\s*)*apiVersion:\s*["']?topoir\.dev\/v1alpha2/mu.test(text) || /"apiVersion"\s*:\s*"topoir\.dev\/v1alpha2"/u.test(text);
}

/**
 * What the compile loop needs, whichever language the source is written in.
 *
 * Both loaders produce this. Nothing downstream of it knows or cares which language the
 * document was written in, which is what keeps v1alpha1 support from decaying as v1alpha2
 * grows.
 */
interface CompilableSource {
  readonly apiVersion: string;
  readonly name: string;
  readonly viewIds: readonly string[];
  readonly project: (viewId: string) => ViewGraph;
  /** The declared presentation block, when the language has one. */
  readonly presentationFor?: (viewId: string) => v1alpha2.Presentation | undefined;
  readonly document?: NormalizedDocument;
  readonly diagnostics: readonly Diagnostic[];
}

function loadCompilable(sourceText: string, source: string, selection: CompileOptions["view"]): CompilableSource {
  if (isWorkspaceSource(sourceText)) {
    const loaded = loadWorkspace(sourceText, { source });
    const workspace = loaded.workspace;
    if (workspace === undefined) {
      return { apiVersion: "topoir.dev/v1alpha2", name: "", viewIds: [], project: () => { throw new Error("no workspace"); }, diagnostics: loaded.diagnostics };
    }
    const diagnostics: Diagnostic[] = [...loaded.diagnostics];
    const projected = new Map<string, ViewGraph>();
    const declared = workspace.views.map((view) => view.id);
    const wanted = selection === undefined ? [declared[0]].filter((id): id is string => id !== undefined) : selection === "all" ? declared : [...(typeof selection === "string" ? [selection] : selection)];
    for (const id of wanted) {
      if (!declared.includes(id)) {
        diagnostics.push({ code: "TOP260_VIEW_NOT_FOUND", severity: "error", message: `Unknown view ${JSON.stringify(id)}. Available views: ${declared.join(", ")}.` });
        continue;
      }
      const result = projectWorkspaceView(workspace, id);
      diagnostics.push(...result.diagnostics);
      if (result.view !== undefined) projected.set(id, result.view);
    }
    return {
      apiVersion: workspace.apiVersion,
      name: workspace.metadata.name,
      viewIds: [...projected.keys()],
      presentationFor: (id) => workspace.views.find((view) => view.id === id)?.presentation,
      project: (id) => {
        const view = projected.get(id);
        if (view === undefined) throw new Error(`View ${JSON.stringify(id)} was not projected.`);
        return view;
      },
      diagnostics,
    };
  }
  const loaded = loadDocument(sourceText, { source });
  if (loaded.document === undefined) {
    return { apiVersion: "topoir.dev/v1alpha1", name: "", viewIds: [], project: () => { throw new Error("no document"); }, diagnostics: loaded.diagnostics };
  }
  const document = loaded.document;
  let viewIds: readonly string[] = [];
  const diagnostics: Diagnostic[] = [...loaded.diagnostics];
  try {
    viewIds = selectViewIds(document, selection);
  } catch (error) {
    diagnostics.push({ code: "TOP260_VIEW_NOT_FOUND", severity: "error", message: error instanceof Error ? error.message : "Unknown view." });
  }
  return {
    apiVersion: document.apiVersion,
    name: document.metadata.name,
    viewIds,
    project: (id) => projectView(document, id),
    document,
    diagnostics,
  };
}

function hasErrors(diagnostics: readonly Diagnostic[]): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === "error");
}

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function safeFileName(value: string): string {
  return value.toLowerCase().replaceAll(/[^a-z0-9._-]+/g, "-").replaceAll(/^-+|-+$/g, "") || "diagram";
}

export * from "@topoir/core";
export * from "@topoir/schema";
export * from "@topoir/assets";
