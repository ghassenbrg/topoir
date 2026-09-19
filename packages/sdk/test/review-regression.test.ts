import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { bundledFontTextMeasurer, TopoIRCompiler, type CompiledView } from "../src/index.js";
import type { GeometryView, LayoutEngine } from "@topoir/core";
import { CompositionEngine } from "@topoir/layout-elk";
import type { SceneElement } from "@topoir/renderer-svg";

/**
 * T00 — public regression fixtures for the 2026-09-19 review.
 *
 * Every case here is a defect the review reproduced against the built SDK at
 * `bc64cf2`. The inputs live in `fixtures/review/` so a later agent can rerun
 * them without the private `.tmp/full-review` directory.
 *
 * Assertions state the TARGET behavior, not the baseline behavior. A case that
 * is still broken is declared with `it.fails`, which vitest passes only while
 * the assertion genuinely fails. When the owning task lands the fix, `it.fails`
 * starts erroring with "expected test to fail" — that is deliberate. Promote it
 * to `it` at that point. Never relax the assertion to make the suite quiet.
 *
 * Owning tasks are named per case. T00 itself fixes nothing.
 */

const fixtureDir = fileURLToPath(new URL("../../../fixtures/review/", import.meta.url));

async function fixture(name: string): Promise<string> {
  return readFile(`${fixtureDir}${name}.topoir.yaml`, "utf8");
}

async function compileFixture(name: string, options: Parameters<TopoIRCompiler["compile"]>[1] = {}) {
  const source = await fixture(name);
  const result = await new TopoIRCompiler().compile(source, { source: `${name}.topoir.yaml`, format: "svg", ...options });
  const view = result.views[0];
  if (view === undefined) throw new Error(`fixture ${name} produced no view`);
  return { result, view };
}

/**
 * Compiles a fixture through a hostile layout backend that rewrites the geometry
 * the real engine produced. This is how the review probed analyzer blind spots:
 * a custom `LayoutEngine` is a supported public extension point, so anything it
 * returns must still be checked before the result is called ok.
 */
async function compileWithGeometry(name: string, mutate: (geometry: GeometryView) => GeometryView) {
  const inner = new CompositionEngine();
  const engine: LayoutEngine = {
    id: `${name}-hostile-probe`,
    async layout(measured) {
      const real = await inner.layout(measured);
      if (real.geometry === undefined) return real;
      return { ...real, geometry: mutate(real.geometry) };
    },
  };
  const source = await fixture(name);
  return new TopoIRCompiler().compile(source, { source: `${name}.topoir.yaml`, format: "svg", layoutEngine: engine });
}

function flatten(elements: readonly SceneElement[]): readonly SceneElement[] {
  return elements.flatMap((element) => (element.type === "group" ? [element, ...flatten(element.children)] : [element]));
}

function sceneElements(view: CompiledView): readonly SceneElement[] {
  return flatten(view.scene.children);
}

/** Joined visible text of the whole scene, used to prove content survived to the drawing. */
function visibleText(view: CompiledView): string {
  return sceneElements(view)
    .filter((element): element is Extract<SceneElement, { type: "text" }> => element.type === "text")
    .flatMap((element) => element.lines)
    .join(" ");
}

describe("review regression: content preservation", () => {
  it("accepts all six schema-permitted asset roles", async () => {
    const { result } = await compileFixture("six-assets");
    expect(result.ok).toBe(true);
  });

  // Owning task: T01. Baseline: six distinct roles produced five images, ok=true, no diagnostics.
  it.fails("draws one owned image per requested asset role", async () => {
    const { result, view } = await compileFixture("six-assets");
    const images = sceneElements(view).filter((element) => element.type === "image");
    const requested = view.view.nodes[0]?.visual?.assets ?? [];
    expect(requested).toHaveLength(6);
    // Either six drawn images, or a diagnostic naming the unresolved role. Never silent loss.
    if (images.length < requested.length) {
      expect(result.diagnostics.map((diagnostic) => diagnostic.code)).not.toHaveLength(0);
    }
    expect(images).toHaveLength(requested.length);
  });

  // Owning task: T01. Baseline: 48-char badge measured 529.45px inside a 148px node.
  it.fails("keeps a schema-valid wide badge inside the node that owns it", async () => {
    const { result, view } = await compileFixture("wide-badge");
    const node = view.view.nodes[0];
    const measured = view.measured.nodes[0];
    if (node === undefined || measured === undefined) throw new Error("node missing");
    const badge = node.visual?.badge;
    if (badge === undefined) throw new Error("fixture lost its badge");
    const badgeWidth = bundledFontTextMeasurer().measure(badge, { fontSize: 10, fontWeight: 600, lineHeight: 1.2 }).width;
    // Either the node was measured wide enough for its own badge, or an actionable
    // overflow diagnostic was emitted. Compiling clean with a 3.5x overrun is the defect.
    if (badgeWidth > measured.width) {
      expect(result.diagnostics.map((diagnostic) => diagnostic.code)).not.toHaveLength(0);
    }
    expect(measured.width).toBeGreaterThanOrEqual(badgeWidth);
  });

  // Owning task: T01. Baseline: label collapsed to two ellipsised lines, droppedLabels=0, no diagnostic.
  it.fails("never abbreviates a required label without saying so", async () => {
    const { result, view } = await compileFixture("long-label");
    const sourceLabel = view.view.nodes[0]?.label;
    if (sourceLabel === undefined) throw new Error("node label missing");
    const drawn = visibleText(view);
    // Either the whole label reached the drawing, or the result reports the abbreviation.
    if (!drawn.includes(sourceLabel)) {
      expect(result.diagnostics.map((diagnostic) => diagnostic.code)).not.toHaveLength(0);
    }
    expect(drawn).not.toMatch(/…|\.\.\./u);
  });
});

describe("review regression: paint and font resolution", () => {
  // Owning task: T02. Baseline: white text on white fill compiled clean.
  it.fails("diagnoses text that cannot be read against its own fill", async () => {
    const { result } = await compileFixture("invisible-text");
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).not.toHaveLength(0);
  });

  // Owning task: T02. Baseline: scene claimed "Invented Font Family", SVG embedded DejaVu Sans.
  it.fails("measures, declares and embeds the same font family", async () => {
    const { result, view } = await compileFixture("unknown-font");
    const svg = result.artifacts.find((artifact) => artifact.format === "svg");
    if (svg === undefined) throw new Error("no svg artifact");
    const embedded = new Set([...String(svg.content).matchAll(/@font-face\{font-family:'([^']+)'/gu)].map((match) => match[1]));
    // Either the requested family really resolved, or the request was rejected with a
    // diagnostic. Claiming an unavailable family in the scene while drawing another is the defect.
    if (!embedded.has(view.scene.fontFamily)) {
      expect(result.diagnostics.map((diagnostic) => diagnostic.code)).not.toHaveLength(0);
    }
    expect([...embedded]).toContain(view.scene.fontFamily);
  });

  // Owning task: T02. Baseline: the named theme drew one asset backplate, `{extends: same}` drew none.
  it.fails("gives an empty theme extension the same visible treatment as its base", async () => {
    const base = await compileFixture("theme-dark-base");
    const extended = await compileFixture("theme-dark-extends");
    const backplates = (view: CompiledView): number =>
      sceneElements(view).filter((element) => element.type === "rect" && element.fill === "#F8FAFC").length;
    expect(backplates(extended.view)).toBe(backplates(base.view));
  });
});

describe("review regression: intent and selection honesty", () => {
  // Owning tasks: T04 (classify honestly now), T12 (implement focus).
  it.fails("either applies group focus or reports it as not applied", async () => {
    const source = await fixture("group-focus");
    const compiler = new TopoIRCompiler();
    const focused = await compiler.compile(source, { source: "group-focus.topoir.yaml", format: "svg" });
    const unfocused = await compiler.compile(source.replace(/\n {6}focus:\n {8}- platform\n/u, "\n"), {
      source: "group-focus-unfocused.topoir.yaml",
      format: "svg",
    });
    const focusedSvg = focused.artifacts[0]?.sha256;
    const unfocusedSvg = unfocused.artifacts[0]?.sha256;
    expect(focusedSvg).toBeDefined();
    expect(unfocusedSvg).toBeDefined();
    // Accepting `focus` and producing a byte-identical drawing, with no diagnostic
    // saying the intent was advisory, is the defect.
    if (focusedSvg === unfocusedSvg) {
      expect(focused.diagnostics.map((diagnostic) => diagnostic.code)).not.toHaveLength(0);
    }
    expect(focusedSvg).not.toBe(unfocusedSvg);
  });

  // Owning tasks: T04 (document), T11 (exact selection mode).
  // This documents CURRENT induced-closure behavior. It is a contract record, not a defect
  // assertion: T11 must keep induced mode working while adding an exact mode.
  it("records that edge selection is induced, not exact", async () => {
    const { view } = await compileFixture("shared-endpoints");
    const edgeIds = view.view.edges.map((edge) => edge.id).sort();
    expect(edgeIds).toEqual(["api-reads", "api-writes"]);
  });
});

describe("review regression: artifact integrity", () => {
  // Owning task: T03. Baseline: metadata said 360x226 while PNG IHDR said 720x452.
  it.fails("reports raster dimensions that match the PNG header", async () => {
    const source = await fixture("long-label");
    const result = await new TopoIRCompiler().compile(source, {
      source: "long-label.topoir.yaml",
      format: "png",
      png: { scale: 2 },
    });
    const png = result.artifacts.find((artifact) => artifact.format === "png");
    if (png === undefined) throw new Error("no png artifact");
    const bytes = Buffer.from(png.content as Uint8Array);
    expect([png.width, png.height]).toEqual([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]);
  });

  // Owning task: T03. A hostile backend returning detached routes must be rejected.
  // Baseline: only an incidental TOP423 boundary warning fired, and `ok` stayed true.
  it.fails("rejects routes translated away from the nodes they connect", async () => {
    const detached = await compileWithGeometry("annotated-regions", (geometry) => ({
      ...geometry,
      edges: geometry.edges.map((edge) => ({
        ...edge,
        points: edge.points.map((point) => ({ x: point.x + 100_000, y: point.y + 100_000 })),
      })),
    }));
    const view = detached.views[0];
    if (view === undefined) throw new Error("detached probe produced no view");
    // Sanity: the probe really did move every route far off its nodes and off the canvas.
    expect(view.geometry.edges.every((edge) => edge.points.every((point) => point.x >= 100_000))).toBe(true);
    expect(view.geometry.bounds.width).toBeLessThan(100_000);
    // Detached, out-of-bounds connectors are a hard geometry failure, not a clean report.
    expect(detached.ok).toBe(false);
  });

  // Owning task: T03. Dropping a declared group from the geometry must be a coverage failure.
  it.fails("rejects geometry that drops a declared group", async () => {
    const dropped = await compileWithGeometry("annotated-regions", (geometry) => ({ ...geometry, groups: [] }));
    const view = dropped.views[0];
    if (view === undefined) throw new Error("dropped-group probe produced no view");
    expect(view.view.groups.length).toBeGreaterThan(0);
    expect(view.geometry.groups).toHaveLength(0);
    expect(dropped.ok).toBe(false);
  });

  // Owning task: T03. Dropping a declared annotation from the geometry must be a coverage failure.
  it.fails("rejects geometry that drops a declared annotation", async () => {
    const dropped = await compileWithGeometry("annotated-regions", (geometry) => ({ ...geometry, annotations: [] }));
    const view = dropped.views[0];
    if (view === undefined) throw new Error("dropped-annotation probe produced no view");
    expect(view.view.annotations.length).toBeGreaterThan(0);
    expect(view.geometry.annotations).toHaveLength(0);
    expect(dropped.ok).toBe(false);
  });

  // Owning task: T03. Two view ids differing only by case collide on a case-insensitive target.
  it.fails("reports view ids whose output file names collide", async () => {
    const { result } = await compileFixture("colliding-view-ids", { view: "all" });
    const names = result.artifacts.map((artifact) => artifact.fileName);
    const folded = new Set(names.map((name) => name.toLowerCase()));
    // Two distinct views must not share an output file name on a case-insensitive filesystem.
    expect(folded.size).toBe(names.length);
  });
});

describe("review regression: macro composition", () => {
  /**
   * Contract record, not a defect assertion. Generalization seed 154 is the widest
   * case in the corpus. M0 is explicitly not required to solve macro composition,
   * so this test pins the current shape and the diagnostic that reports it. T17
   * owns wrapping / overview-detail; when it lands, this expectation changes with
   * inspected visual evidence, never by relaxing the bound alone.
   */
  it("still lays generalization seed 154 out as an unreadable ribbon", async () => {
    const { result, view } = await compileFixture("ribbon-seed-154");
    const { width, height } = view.geometry.bounds;
    expect(width / height).toBeGreaterThan(20);
    // The shape is at least reported rather than silently accepted as on-target.
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain("TOP433_ASPECT_OFF_TARGET");
  });
});
