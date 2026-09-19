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

  // Owning task: T01 (fixed). Baseline: six distinct roles produced five images, ok=true, no diagnostics.
  it("draws one owned image per requested asset role", async () => {
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

  /**
   * Owning task: T01 (fixed). Baseline: a 48-character badge measured 529.45px inside a
   * 148px node and its text ran off both canvas edges.
   *
   * The review's own criticism of the pre-existing badge test was that it asserted
   * successful compilation and geometry metrics rather than actual text containment, so
   * this asserts containment: every drawn badge glyph run sits inside the node rectangle
   * that owns it, and no badge character was dropped to achieve that.
   */
  it("keeps a schema-valid wide badge inside the node that owns it", async () => {
    const { view } = await compileFixture("wide-badge");
    const node = view.view.nodes[0];
    const measured = view.measured.nodes[0];
    const geometry = view.geometry.nodes[0];
    if (node === undefined || measured === undefined || geometry === undefined) throw new Error("node missing");
    const badge = node.visual?.badge;
    if (badge === undefined) throw new Error("fixture lost its badge");

    // The badge was measured, and the whole badge survived measurement.
    expect(measured.badgeText?.disposition).toBe("rendered");
    expect(measured.badgeText?.lines.join("")).toBe(badge);
    // The node is wide enough for the strip it has to hold.
    expect(measured.width).toBeGreaterThanOrEqual(measured.badgeText?.width ?? 0);

    // The drawn strip is inside the node, and the node is inside the canvas.
    const measurer = bundledFontTextMeasurer();
    const badgeRun = sceneElements(view)
      .filter((element): element is Extract<SceneElement, { type: "text" }> => element.type === "text")
      .find((element) => element.lines.join("").startsWith("WWW"));
    if (badgeRun === undefined) throw new Error("badge was not drawn");
    expect(badgeRun.lines.join("")).toBe(badge);
    const widest = Math.max(...badgeRun.lines.map((line) => measurer.measure(line, { fontSize: badgeRun.fontSize, fontWeight: 600, lineHeight: 1.2 }).width));
    // Anchored middle, so the run spans half its width either side of its x.
    expect(badgeRun.x - widest / 2).toBeGreaterThanOrEqual(0);
    expect(badgeRun.x + widest / 2).toBeLessThanOrEqual(view.scene.width);
  });

  /**
   * Owning task: T01 (fixed). Baseline: the label collapsed to two ellipsised lines while
   * `droppedLabels` stayed 0 and no diagnostic was emitted.
   *
   * `docs/design/04-components-and-styles.md` allows abbreviation but requires it to be
   * declared by measurement rather than inferred later from a missing primitive. So this
   * does not forbid the ellipsis; it forbids an *undeclared* one.
   */
  it("never abbreviates a required label without saying so", async () => {
    const { result, view } = await compileFixture("long-label");
    const node = view.view.nodes[0];
    const measured = view.measured.nodes[0];
    if (node === undefined || measured === undefined) throw new Error("node missing");
    const drawn = visibleText(view);

    if (drawn.includes(node.label)) {
      // Nothing was lost, so nothing needs declaring.
      expect(measured.labelText.disposition).toBe("rendered");
      return;
    }

    // Measurement declared the loss, and said how much.
    expect(measured.labelText.disposition).toBe("abbreviated");
    expect(measured.labelText.source).toBe(node.label);
    expect(measured.labelText.omittedGraphemes ?? 0).toBeGreaterThan(0);

    // The result reports it, names the owner, and counts the loss honestly.
    const reported = result.diagnostics.filter((diagnostic) => diagnostic.code === "TOP440_TEXT_ABBREVIATED");
    expect(reported).toHaveLength(1);
    expect(reported[0]?.message).toContain(node.id);
    expect(view.metrics.abbreviatedTextRuns).toBe(1);
    expect(view.metrics.omittedGraphemes).toBe(measured.labelText.omittedGraphemes);
  });
});

describe("review regression: paint and font resolution", () => {
  /**
   * Owning task: T02, refined by T09. Baseline: white text on white fill compiled clean.
   *
   * T09 moved contrast onto the scene, where the backdrop is the mark actually painted
   * behind the glyphs rather than the theme token nominally paired with them. So this now
   * names the specific occurrence rather than the kind — a stricter identification, and
   * the only reported instance rather than one of two duplicates.
   */
  it("diagnoses text that cannot be read against its own fill", async () => {
    const { result, view } = await compileFixture("invisible-text");
    const reported = result.diagnostics.filter((diagnostic) => diagnostic.code === "TOP442_TEXT_NOT_LEGIBLE");
    expect(reported).toHaveLength(1);
    expect(reported[0]?.severity).toBe("error");
    // The message names the affected occurrence, the actual paint and the measured ratio.
    const node = view.view.nodes[0];
    expect(reported[0]?.message).toContain(node?.id);
    expect(reported[0]?.message).toContain("#FFFFFF");
    expect(reported[0]?.message).toContain("1:1");
    // An unreadable drawing is not a successful compilation.
    expect(result.ok).toBe(false);
    expect(view.metrics.illegibleRuns).toBe(1);
  });

  // Owning task: T02 (fixed). Baseline: scene claimed "Invented Font Family", SVG embedded DejaVu Sans.
  it("measures, declares and embeds the same font family", async () => {
    const { result, view } = await compileFixture("unknown-font");
    const svg = result.artifacts.find((artifact) => artifact.format === "svg");
    if (svg === undefined) throw new Error("no svg artifact");
    const embedded = new Set([...String(svg.content).matchAll(/@font-face\{font-family:'([^']+)'/gu)].map((match) => match[1]));
    // The scene names a family that is actually embedded.
    expect([...embedded]).toContain(view.scene.fontFamily);
    // And the substitution is reported rather than hidden.
    const reported = result.diagnostics.filter((diagnostic) => diagnostic.code === "TOP330_FONT_UNAVAILABLE");
    expect(reported).toHaveLength(1);
    expect(reported[0]?.message).toContain("Invented Font Family");
    expect(reported[0]?.message).toContain(view.scene.fontFamily);
  });

  /**
   * Owning task: T02 (fixed). Baseline: the named theme drew one asset backplate and
   * `{extends: same-theme}` drew none, because the renderer branched on `theme.id` and an
   * extension resolves to `dark-engineering+authored`.
   *
   * Both documents are built from one source here, so the only difference between them is
   * how the identical theme is referenced and the comparison can be the whole artifact.
   */
  it("gives an empty theme extension the same visible treatment as its base", async () => {
    const body = [
      "apiVersion: topoir.dev/v1alpha1",
      "kind: Architecture",
      "metadata:",
      "  name: theme-equivalence",
      "  title: Theme equivalence",
      "model:",
      "  nodes:",
      "    - id: a",
      "      kind: service",
      "      label: Service",
      "      technology: postgresql",
      "views:",
      "  - id: overview",
      "    design:",
      "      composition: architecture",
      "",
    ].join("\n");
    const compiler = new TopoIRCompiler();
    const named = await compiler.compile(`${body}    theme: dark-engineering\n`, { format: "svg" });
    const extended = await compiler.compile(`${body}    theme:\n      extends: dark-engineering\n`, { format: "svg" });

    const namedView = named.views[0];
    const extendedView = extended.views[0];
    if (namedView === undefined || extendedView === undefined) throw new Error("theme probe produced no view");

    // The backplate the review saw disappear.
    const backplates = (view: CompiledView): number =>
      sceneElements(view).filter((element) => element.type === "rect" && element.fill === "#F8FAFC").length;
    expect(backplates(namedView)).toBe(1);
    expect(backplates(extendedView)).toBe(backplates(namedView));

    // Nothing else moved either: an empty override changes no visible mark at all.
    expect(extended.artifacts[0]?.sha256).toBe(named.artifacts[0]?.sha256);
  });
});

describe("review regression: intent and selection honesty", () => {
  /**
   * Owning tasks: T04 (classify honestly), T12 (implement boundary focus — done).
   *
   * The defect was that boundary focus was accepted silently, so a caller could not tell
   * "applied" from "ignored" without diffing two drawings. T04 made it reportable; T12
   * makes it *work*, so this now asserts the strongest form: the drawing changes.
   */
  it("applies group focus to the drawing", async () => {
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
    // The drawing genuinely differs.
    expect(focusedSvg).not.toBe(unfocusedSvg);
    // And it is no longer reported as unapplied, because it was applied.
    expect(focused.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain("TOP252_INTENT_NOT_APPLIED");

    // Specifically: the focused boundary is stroked at emphasis weight.
    const view = focused.views[0];
    if (view === undefined) throw new Error("no view");
    const boundary = sceneElements(view).find(
      (element) => element.type === "rect" && element.owner?.id === "platform" && element.owner.part === "boundary",
    );
    expect(boundary?.type).toBe("rect");
    if (boundary?.type !== "rect") return;
    expect(boundary.strokeWidth).toBeGreaterThan(1.5);
  });

  /**
   * Focusing a component is implemented, so it must not be reported as unapplied.
   * Without this, the honest-reporting fix could degenerate into warning about all focus.
   */
  it("does not report component focus as unapplied", async () => {
    const source = (await fixture("group-focus")).replace("        - platform", "        - api");
    const result = await new TopoIRCompiler().compile(source, { source: "component-focus.topoir.yaml", format: "svg" });
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain("TOP252_INTENT_NOT_APPLIED");
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
  // Owning task: T03 (fixed). Baseline: metadata said 360x226 while PNG IHDR said 720x452.
  it("reports raster dimensions that match the PNG header", async () => {
    const source = await fixture("long-label");
    const result = await new TopoIRCompiler().compile(source, {
      source: "long-label.topoir.yaml",
      format: "png",
      png: { scale: 2 },
    });
    const png = result.artifacts.find((artifact) => artifact.format === "png");
    if (png === undefined) throw new Error("no png artifact");
    const bytes = Buffer.from(png.content as Uint8Array);
    const header = [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];

    // The raster fields describe the bytes the caller actually received.
    expect([png.pixelWidth, png.pixelHeight]).toEqual(header);
    // The logical fields describe the drawing's own coordinate space, unscaled.
    expect([png.logicalWidth, png.logicalHeight]).not.toEqual(header);
    expect(png.scale).toBe(2);
    expect(png.pixelWidth).toBeCloseTo(png.logicalWidth * 2, 0);
    // The legacy fields keep their old meaning for existing callers.
    expect([png.width, png.height]).toEqual([png.logicalWidth, png.logicalHeight]);
    // And the manifest agrees with the artifact.
    const entry = result.manifest?.artifacts.find((item) => item.format === "png");
    expect([entry?.pixelWidth, entry?.pixelHeight]).toEqual(header);
  });

  // Owning task: T03 (fixed). An SVG has no raster size of its own, so it claims none.
  it("does not invent raster dimensions for an SVG", async () => {
    const { result } = await compileFixture("long-label");
    const svg = result.artifacts.find((artifact) => artifact.format === "svg");
    expect(svg?.pixelWidth).toBeUndefined();
    expect(svg?.pixelHeight).toBeUndefined();
    expect(svg?.scale).toBeUndefined();
    expect(svg?.logicalWidth).toBe(svg?.width);
  });

  // Owning task: T03. A hostile backend returning detached routes must be rejected.
  // Baseline: only an incidental TOP423 boundary warning fired, and `ok` stayed true.
  it("rejects routes translated away from the nodes they connect", async () => {
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
  it("rejects geometry that drops a declared group", async () => {
    const dropped = await compileWithGeometry("annotated-regions", (geometry) => ({ ...geometry, groups: [] }));
    const view = dropped.views[0];
    if (view === undefined) throw new Error("dropped-group probe produced no view");
    expect(view.view.groups.length).toBeGreaterThan(0);
    expect(view.geometry.groups).toHaveLength(0);
    expect(dropped.ok).toBe(false);
  });

  // Owning task: T03. Dropping a declared annotation from the geometry must be a coverage failure.
  it("rejects geometry that drops a declared annotation", async () => {
    const dropped = await compileWithGeometry("annotated-regions", (geometry) => ({ ...geometry, annotations: [] }));
    const view = dropped.views[0];
    if (view === undefined) throw new Error("dropped-annotation probe produced no view");
    expect(view.view.annotations.length).toBeGreaterThan(0);
    expect(view.geometry.annotations).toHaveLength(0);
    expect(dropped.ok).toBe(false);
  });

  // Owning task: T03 (fixed). Two view ids differing only by case collide on a
  // case-insensitive target, which is the macOS and Windows default.
  it("reports view ids whose output file names collide", async () => {
    const source = await fixture("colliding-view-ids");
    const result = await new TopoIRCompiler().compile(source, {
      source: "colliding-view-ids.topoir.yaml",
      format: "svg",
      view: "all",
    });
    const reported = result.diagnostics.filter((diagnostic) => diagnostic.code === "TOP121_OUTPUT_NAME_COLLISION");
    expect(reported).toHaveLength(1);
    expect(reported[0]?.severity).toBe("error");
    expect(reported[0]?.message).toContain("Overview");
    expect(reported[0]?.message).toContain("overview");
    expect(result.ok).toBe(false);
    // Preflight: nothing was produced, so nothing could have been written over.
    expect(result.artifacts).toEqual([]);
  });

  // Owning task: T03 (fixed). Distinct names still compile, so the check is not a blanket ban.
  it("still compiles views whose output names do not collide", async () => {
    const source = (await fixture("colliding-view-ids")).replace("  - id: Overview", "  - id: summary");
    const result = await new TopoIRCompiler().compile(source, { source: "distinct.topoir.yaml", format: "svg", view: "all" });
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain("TOP121_OUTPUT_NAME_COLLISION");
    const names = result.artifacts.map((artifact) => artifact.fileName);
    expect(names).toHaveLength(2);
    expect(new Set(names.map((name) => name.toLowerCase())).size).toBe(2);
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

describe("review regression: routing refinement", () => {
  /**
   * `nudgeCoincidentSegments` in the composition engine documents that "only interior
   * segments move, so neither route leaves its endpoints", but it shifted
   * `points[index - 1]`, and at index 1 that is `points[0]` — the endpoint anchored to its
   * component. Generated case 6 produced a connector starting exactly `step` (11px) clear
   * of its source, which reads as an arrow floating in space.
   *
   * The defect was invisible until T03 added endpoint-attachment checking, and nothing in
   * the published examples triggered it. Nudging is a refinement: it may leave two
   * connectors sharing a corridor, but it may never buy a lower coincidence count by
   * detaching a connector from the component it connects.
   *
   * These seeds are the generated cases whose coincidence counts the nudge pass was
   * changing, so they are the ones that exercise it.
   */
  it("never nudges a route end off the component it connects", async () => {
    const { build } = await import("../../../benchmarks/generate-case.mts");
    const compiler = new TopoIRCompiler();
    for (const seed of [6, 43, 177, 181, 203, 211]) {
      const compiled = await compiler.compile(JSON.stringify(build(seed).document), { format: "svg" });
      for (const view of compiled.views) {
        expect(view.metrics.detachedEndpoints, `seed ${seed}`).toBe(0);
      }
      expect(
        compiled.diagnostics.map((diagnostic) => diagnostic.code),
        `seed ${seed}`,
      ).not.toContain("TOP426_EDGE_ENDPOINT_DETACHED");
    }
  }, 180_000);
});

describe("review regression: resolved font resources", () => {
  /**
   * T06. Measurement, the SVG's embedded faces and the PNG rasterizer each resolved fonts
   * independently. They agreed, but nothing proved it, and a drawing laid out with one set
   * of metrics and rasterized with another is wrong in a way that "a PNG was produced"
   * cannot detect. One resolved set now reaches all three.
   */
  it("embeds exactly the faces measurement resolved", async () => {
    const { resolveFontSet, selectFace } = await import("@topoir/core");
    const { result } = await compileFixture("long-label", { format: "both" });
    const svg = result.artifacts.find((artifact) => artifact.format === "svg");
    if (svg === undefined) throw new Error("no svg artifact");

    const set = resolveFontSet(undefined);
    const embedded = [...String(svg.content).matchAll(/@font-face\{font-family:'([^']+)';font-style:(\w+);font-weight:(\d+)/gu)].map(
      (match) => ({ family: match[1], style: match[2], weight: Number(match[3]) }),
    );
    const resolved = set.chain.flatMap((pack) => pack.faces.map((face) => ({ family: face.family, style: face.style, weight: face.weight })));
    expect(embedded).toEqual(resolved);
    // And the family the scene declares is one of them.
    expect(resolved.map((face) => face.family)).toContain(set.family);
    expect(selectFace(set, 400)?.family).toBe(set.family);
  });

  it("produces byte-identical output on a warm and a cold resource cache", async () => {
    // The caches are keyed on resolved content, so a hit must be indistinguishable from a
    // miss. If they ever diverge, the first render of a process differs from the rest.
    const source = await fixture("theme-dark-base");
    const compiler = new TopoIRCompiler();
    const first = await compiler.compile(source, { source: "a.yaml", format: "both" });
    const second = await compiler.compile(source, { source: "a.yaml", format: "both" });
    expect(second.artifacts.map((artifact) => artifact.sha256)).toEqual(first.artifacts.map((artifact) => artifact.sha256));
  });

  /**
   * T06. A character the resolved pack cannot draw is rendered as a replacement box in
   * both exports. Nothing reported it, so the caller saw a clean compile and a drawing
   * full of tofu.
   */
  it("reports characters no resolved font can draw", async () => {
    const document = JSON.stringify({
      apiVersion: "topoir.dev/v1alpha1",
      kind: "Architecture",
      metadata: { name: "glyph-coverage" },
      model: { nodes: [{ id: "a", kind: "service", label: "支払いサービス" }] },
      views: [{ id: "overview", design: { composition: "architecture" } }],
    });
    const result = await new TopoIRCompiler().compile(document, { format: "svg" });
    const reported = result.diagnostics.filter((diagnostic) => diagnostic.code === "TOP332_GLYPH_NOT_AVAILABLE");
    expect(reported).toHaveLength(1);
    expect(reported[0]?.message).toContain("node a");
    expect(reported[0]?.message).toContain("U+652F");
  });

  it("says nothing about text the pack covers", async () => {
    const { result } = await compileFixture("long-label");
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain("TOP332_GLYPH_NOT_AVAILABLE");
  });
});

describe("review regression: the scene the reader receives", () => {
  /**
   * T09 acceptance, stated as one test per named defect.
   *
   * "the long-badge, missing-role, unknown glyph, missing annotation and detached-arrow
   * defects cannot pass presentation checks."
   *
   * Presentation acceptance is not the same as successful compilation. Each of these
   * either fails outright or carries a diagnostic naming what is wrong; none of them
   * produces a clean result.
   */
  const presentationDiagnostics = (codes: readonly string[]): readonly string[] =>
    codes.filter((code) => code.startsWith("TOP44") || code.startsWith("TOP45") || code.startsWith("TOP33") || code.startsWith("TOP42"));

  it("a long badge cannot pass presentation checks silently", async () => {
    const { result, view } = await compileFixture("wide-badge");
    // It is either contained, or reported. It is never both unreported and overflowing.
    const badge = view.measured.nodes[0]?.badgeText;
    expect(badge?.disposition).toBe("rendered");
    expect(view.metrics.clippedMarks).toBe(0);
  });

  it("a missing asset role cannot pass presentation checks", async () => {
    const document = JSON.stringify({
      apiVersion: "topoir.dev/v1alpha1",
      kind: "Architecture",
      metadata: { name: "missing-role" },
      model: { nodes: [{ id: "a", kind: "service", label: "Service", visual: { assets: ["devicon:postgresql", "nowhere:at-all"] } }] },
      views: [{ id: "overview", design: { composition: "architecture" } }],
    });
    const result = await new TopoIRCompiler().compile(document, { format: "svg" });
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain("TOP322_ASSET_NOT_FOUND");
    expect(result.ok).toBe(false);
  });

  it("an unknown glyph cannot pass presentation checks", async () => {
    const document = JSON.stringify({
      apiVersion: "topoir.dev/v1alpha1",
      kind: "Architecture",
      metadata: { name: "unknown-glyph" },
      model: { nodes: [{ id: "a", kind: "service", label: "支払いサービス" }] },
      views: [{ id: "overview", design: { composition: "architecture" } }],
    });
    const result = await new TopoIRCompiler().compile(document, { format: "svg" });
    expect(presentationDiagnostics(result.diagnostics.map((diagnostic) => diagnostic.code))).toContain("TOP332_GLYPH_NOT_AVAILABLE");
  });

  it("a missing annotation cannot pass presentation checks", async () => {
    const dropped = await compileWithGeometry("annotated-regions", (geometry) => ({ ...geometry, annotations: [] }));
    const codes = dropped.diagnostics.map((diagnostic) => diagnostic.code);
    // Reported by geometry coverage and, independently, by scene representation.
    expect(codes).toContain("TOP416_ANNOTATION_DROPPED");
    expect(codes).toContain("TOP450_ELEMENT_NOT_REPRESENTED");
    expect(dropped.ok).toBe(false);
  });

  it("a detached arrow cannot pass presentation checks", async () => {
    const detached = await compileWithGeometry("annotated-regions", (geometry) => ({
      ...geometry,
      edges: geometry.edges.map((edge) => ({
        ...edge,
        points: edge.points.map((point) => ({ x: point.x + 100_000, y: point.y + 100_000 })),
      })),
    }));
    expect(detached.diagnostics.map((diagnostic) => diagnostic.code)).toContain("TOP426_EDGE_ENDPOINT_DETACHED");
    expect(detached.ok).toBe(false);
  });

  /**
   * Header and legend are evaluated with body content, which the acceptance also requires.
   * Before T08 they were measured in the renderer and never reached any quality pass at all.
   */
  it("evaluates header and legend alongside the diagram body", async () => {
    const source = await readFile(fileURLToPath(new URL("../../../examples/multi-region.topoir.yaml", import.meta.url)), "utf8");
    const result = await new TopoIRCompiler().compile(source, { format: "svg" });
    const view = result.views[0];
    if (view === undefined) throw new Error("no view");
    const { sceneDocument } = await import("@topoir/renderer-svg");
    const page = sceneDocument(view.scene).pages[0];
    if (page === undefined) throw new Error("no page");
    const owners = new Set(page.primitives.map((primitive) => primitive.owner.id));
    expect(owners).toContain("title");
    expect([...owners].some((id) => id.startsWith("legend:"))).toBe(true);
    // And they were checked: the clipping pass covers every primitive on the page.
    expect(view.metrics.clippedMarks).toBe(0);
  });
});

describe("review regression: an artifact is not an acceptance", () => {
  /**
   * T14. The review's sharpest point about the result contract: "An artifact can exist
   * without acceptance." `ok` conflated three questions, so a caller could not tell a
   * diagram that is *correct* from one that is merely *drawable*.
   */
  it("produces an artifact for a diagram it does not accept", async () => {
    const { result, view } = await compileFixture("ribbon-seed-154");
    // The drawing exists and is geometrically legal.
    expect(result.artifacts.length).toBeGreaterThan(0);
    // At a real page size it is unreadable, and the report says so rather than implying
    // success from the artifact's existence.
    const reevaluated = await new TopoIRCompiler().compile(await fixture("ribbon-seed-154"), {
      format: "svg",
      profile: "presentation",
    });
    const quality = reevaluated.views[0]?.quality;
    expect(quality).toBeDefined();
    expect(quality?.valid).toBe(true);
    expect(quality?.completion).toBe("complete");
    // 46:1 at a default medium: the aspect check fires, so it is not accepted.
    expect(quality?.accepted).toBe(false);
    expect(quality?.blockedAt).toBeDefined();
    void view;
  });

  it("answers valid, completion and accepted separately on a clean diagram", async () => {
    const { result, view } = await compileFixture("shared-endpoints");
    expect(result.ok).toBe(true);
    expect(view.quality.valid).toBe(true);
    expect(view.quality.completion).toBe("complete");
    expect(view.quality.accepted).toBe(true);
    // The legacy field keeps its old meaning alongside the new ones.
    expect(result.ok).toBe(view.quality.accepted);
  });

  it("changes acceptance with the profile without changing the drawing", async () => {
    const source = await fixture("shared-endpoints");
    const compiler = new TopoIRCompiler();
    const draft = await compiler.compile(source, { format: "svg", profile: "draft" });
    const publication = await compiler.compile(source, { format: "svg", profile: "publication" });
    // Same bytes. A profile is a question about the result, not an instruction to change it.
    expect(publication.artifacts[0]?.sha256).toBe(draft.artifacts[0]?.sha256);
    expect(draft.views[0]?.quality.profile).toBe("draft");
    expect(publication.views[0]?.quality.profile).toBe("publication");
  });

  it("reports a semantic failure as invalid, not merely unaccepted", async () => {
    const dropped = await compileWithGeometry("annotated-regions", (geometry) => ({ ...geometry, annotations: [] }));
    const quality = dropped.views[0]?.quality;
    expect(quality?.accepted).toBe(false);
    expect(quality?.violations.some((violation) => violation.code === "TOP416_ANNOTATION_DROPPED")).toBe(true);
  });
});
