import { createHash } from "node:crypto";
import { AssetRegistry, discoverAssets } from "@topoir/assets";
import {
  analyzeGeometry,
  loadDocument,
  measureView,
  projectView,
  resolveTheme,
  type GeometryView,
  type LayoutEngine,
  type MeasuredView,
  type NormalizedDocument,
  type TextMeasurer,
  type ViewGraph,
} from "@topoir/core";
import { CompositionEngine } from "@topoir/layout-elk";
import {
  buildScene,
  renderPng,
  renderSvg,
  type PngOptions,
  type Scene,
} from "@topoir/renderer-svg";
import type { Diagnostic } from "@topoir/schema";

export const TOPOIR_VERSION = "0.1.0-alpha.0";

export type OutputFormat = "svg" | "png" | "both";

export interface CompileOptions {
  readonly source?: string;
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
  readonly width: number;
  readonly height: number;
}

export interface CompiledView {
  readonly view: ViewGraph;
  readonly measured: MeasuredView;
  readonly geometry: GeometryView;
  readonly scene: Scene;
  readonly metrics: Readonly<Record<string, number>>;
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
    readonly width: number;
    readonly height: number;
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
    const loaded = loadDocument(sourceText, { source });
    if (loaded.document === undefined) {
      return { ok: false, diagnostics: loaded.diagnostics, views: [], artifacts: [] };
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

    let viewIds: readonly string[];
    try {
      viewIds = selectViewIds(loaded.document, options.view);
    } catch (error) {
      return {
        ok: false,
        diagnostics: [
          ...diagnostics,
          {
            code: "TOP260_VIEW_NOT_FOUND",
            severity: "error",
            message: error instanceof Error ? error.message : "Unknown view.",
          },
        ],
        document: loaded.document,
        views: [],
        artifacts: [],
      };
    }

    for (const viewId of viewIds) {
      const view = projectView(loaded.document, viewId);
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
      const measured = measureView(view, theme, options.textMeasurer, (reference) => assets.resolve(reference));
      for (const node of measured.nodes) {
        const reference = node.visual?.asset ?? node.icon ?? node.technology;
        if (reference && !assets.resolve(reference)) diagnostics.push({ code: "TOP322_ASSET_NOT_FOUND", severity: node.visual?.asset ? "error" : "warning", message: `Asset ${JSON.stringify(reference)} on ${node.id} was not found; ${node.visual?.asset ? "add it to the configured inventory" : "using the semantic kind fallback"}.` });
      }
      const layout = await layoutEngine.layout(measured);
      diagnostics.push(...layout.diagnostics);
      if (layout.geometry === undefined) continue;

      const quality = analyzeGeometry(measured, layout.geometry);
      diagnostics.push(...quality.diagnostics);
      const scene = buildScene(measured, layout.geometry, theme, assets);
      const compiled: CompiledView = {
        view,
        measured,
        geometry: layout.geometry,
        scene,
        metrics: { ...layout.metrics, ...quality.metrics },
      };
      compiledViews.push(compiled);

      if (format === "svg" || format === "both") {
        const svg = renderSvg(scene);
        artifacts.push(createArtifact(view.id, "svg", svg, scene));
      }
      if (format === "png" || format === "both") {
        const svg = renderSvg(scene);
        const png = renderPng(svg, options.png);
        artifacts.push(createArtifact(view.id, "png", png, scene));
      }
    }

    const manifest: ArtifactManifest = {
      manifestVersion: 1,
      compiler: { name: "topoir", version: TOPOIR_VERSION },
      input: { source, sha256: sha256(sourceText) },
      document: { name: loaded.document.metadata.name, apiVersion: loaded.document.apiVersion },
      layout: { engine: layoutEngine.id },
      artifacts: artifacts.map(({ content: _content, ...artifact }) => artifact),
    };
    return {
      ok: !hasErrors(diagnostics) && compiledViews.length === viewIds.length,
      diagnostics,
      document: loaded.document,
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
): CompileArtifact {
  const bytes = typeof content === "string" ? Buffer.from(content, "utf8") : content;
  return {
    viewId,
    format,
    fileName: `${safeFileName(viewId)}.${format}`,
    mediaType: format === "svg" ? "image/svg+xml" : "image/png",
    content,
    sha256: sha256(bytes),
    width: scene.width,
    height: scene.height,
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
