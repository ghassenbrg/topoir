import { describe, expect, it } from "vitest";
import { analyzeScene, type SceneDocument, type ScenePrimitive } from "../src/index.js";

/**
 * T09 — quality on the scene the reader actually receives.
 *
 * `analyzeGeometry` runs on measured boxes before the scene adds final text, badges,
 * decoration, header and legend. The review's point: its coverage measure "does not
 * measure the actual visible ink or final export readability". These exercise the checks
 * that only the finished scene can support, against hand-built hostile documents — the
 * only way to produce failures a correct renderer never emits.
 */

const CANVAS = { x: 0, y: 0, width: 400, height: 200 };

function text(id: string, owner: ScenePrimitive["owner"], fill: string, bounds = { x: 20, y: 20, width: 100, height: 16 }): ScenePrimitive {
  return {
    id,
    owner,
    layer: "components",
    type: "text",
    inkBounds: bounds,
    fill,
    text: {
      source: "Label",
      lines: [{ text: "Label", x: bounds.x, baseline: bounds.y + 12, advance: bounds.width, inkBounds: bounds, continuesPrevious: false }],
      fontFamily: "DejaVu Sans",
      fontSize: 13,
      fontWeight: 600,
      lineHeight: 17,
      ascent: 11,
      descent: 3,
      direction: "ltr",
    },
  };
}

function rect(id: string, owner: ScenePrimitive["owner"], fill: string, bounds: ScenePrimitive["inkBounds"]): ScenePrimitive {
  return { id, owner, layer: "components", type: "rect", bounds, inkBounds: bounds, fill };
}

function document(primitives: readonly ScenePrimitive[], overrides: Partial<SceneDocument> = {}): SceneDocument {
  const semanticIndex: Record<string, string[]> = {};
  for (const primitive of primitives) {
    semanticIndex[primitive.owner.id] = [...(semanticIndex[primitive.owner.id] ?? []), primitive.id];
  }
  return {
    id: "scene",
    title: "test",
    background: "#FFFFFF",
    pages: [{ id: "page-1", bounds: CANVAS, primitives }],
    semanticIndex,
    readingOrder: primitives.map((primitive) => primitive.id),
    content: [],
    ...overrides,
  };
}

describe("required content must be visible", () => {
  it("reports a declared element that nothing in the drawing represents", () => {
    // The check no geometry counter can perform: the drawing is clean and a declared fact
    // is simply not in it.
    const scene = document([text("t1", { kind: "occurrence", id: "api" }, "#000000")]);
    const report = analyzeScene(scene, { required: ["api", "database"] });
    const reported = report.diagnostics.filter((diagnostic) => diagnostic.code === "TOP450_ELEMENT_NOT_REPRESENTED");
    expect(reported).toHaveLength(1);
    expect(reported[0]?.severity).toBe("error");
    expect(reported[0]?.message).toContain("database");
    expect(report.metrics.unrepresentedElements).toBe(1);
  });

  it("says nothing when every required element is drawn", () => {
    const scene = document([
      text("t1", { kind: "occurrence", id: "api" }, "#000000"),
      text("t2", { kind: "occurrence", id: "database" }, "#000000"),
    ]);
    expect(analyzeScene(scene, { required: ["api", "database"] }).diagnostics).toEqual([]);
  });

  it("reports a mark no model element explains", () => {
    const scene = document([text("t1", { kind: "chrome", id: "unattributed" }, "#000000")]);
    const report = analyzeScene(scene);
    expect(report.diagnostics.map((diagnostic) => diagnostic.code)).toContain("TOP451_MARK_NOT_ATTRIBUTED");
    expect(report.metrics.unownedMarks).toBe(1);
  });
});

describe("painted bounds must be inside the canvas", () => {
  it("reports a glyph run painted past the canvas edge", () => {
    // This is the long-badge defect in its final form: measurement may be fine, and the
    // drawing still runs off the page.
    const scene = document([text("t1", { kind: "occurrence", id: "a" }, "#000000", { x: 300, y: 20, width: 400, height: 16 })]);
    const report = analyzeScene(scene);
    const reported = report.diagnostics.filter((diagnostic) => diagnostic.code === "TOP452_MARK_CLIPPED");
    expect(reported).toHaveLength(1);
    expect(reported[0]?.severity).toBe("error");
    expect(reported[0]?.message).toContain("cropped");
    expect(report.metrics.clippedMarks).toBe(1);
  });

  it("reports a mark placed above or left of the origin", () => {
    const scene = document([rect("r1", { kind: "occurrence", id: "a" }, "#FFFFFF", { x: -40, y: 10, width: 60, height: 20 })]);
    expect(analyzeScene(scene).metrics.clippedMarks).toBe(1);
  });

  it("accepts a mark flush against the canvas edge", () => {
    const scene = document([rect("r1", { kind: "occurrence", id: "a" }, "#FFFFFF", { x: 0, y: 0, width: 400, height: 200 })]);
    expect(analyzeScene(scene).metrics.clippedMarks).toBe(0);
  });
});

describe("text must be readable against what is behind it", () => {
  it("errors when text cannot be distinguished from its backdrop at all", () => {
    // The review's white-on-white defect, checked against the mark actually painted behind
    // the glyphs rather than a theme token.
    const scene = document([
      rect("card", { kind: "occurrence", id: "a" }, "#FFFFFF", { x: 10, y: 10, width: 200, height: 40 }),
      text("t1", { kind: "occurrence", id: "a" }, "#FFFFFF", { x: 20, y: 20, width: 100, height: 16 }),
    ]);
    const report = analyzeScene(scene);
    const reported = report.diagnostics.filter((diagnostic) => diagnostic.code === "TOP442_TEXT_NOT_LEGIBLE");
    expect(reported).toHaveLength(1);
    expect(reported[0]?.severity).toBe("error");
    expect(reported[0]?.message).toContain("1:1");
    expect(report.metrics.illegibleRuns).toBe(1);
  });

  it("warns, rather than errors, when text is visible but hard to read", () => {
    // A different failure: the content survives and the reader can see it. Treating this
    // as an error would declare every deliberately soft secondary label a broken diagram.
    const scene = document([
      rect("card", { kind: "occurrence", id: "a" }, "#FFFFFF", { x: 10, y: 10, width: 200, height: 40 }),
      text("t1", { kind: "occurrence", id: "a" }, "#94A3B8", { x: 20, y: 20, width: 100, height: 16 }),
    ]);
    const report = analyzeScene(scene);
    expect(report.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["TOP443_TEXT_LOW_CONTRAST"]);
    expect(report.diagnostics[0]?.severity).toBe("warning");
    expect(report.metrics.illegibleRuns).toBe(0);
    expect(report.metrics.lowContrastRuns).toBe(1);
  });

  it("measures against the card a label sits on, not the canvas default", () => {
    // White text on a dark card is perfectly readable; measuring it against the white page
    // would report a defect that is not there.
    const scene = document([
      rect("card", { kind: "occurrence", id: "a" }, "#17243A", { x: 10, y: 10, width: 200, height: 40 }),
      text("t1", { kind: "occurrence", id: "a" }, "#FFFFFF", { x: 20, y: 20, width: 100, height: 16 }),
    ]);
    expect(analyzeScene(scene).diagnostics).toEqual([]);
  });

  it("follows paint order when several fills sit under a run", () => {
    const scene = document([
      rect("page", { kind: "chrome", id: "canvas" }, "#FFFFFF", CANVAS),
      rect("card", { kind: "occurrence", id: "a" }, "#17243A", { x: 10, y: 10, width: 200, height: 40 }),
      text("t1", { kind: "occurrence", id: "a" }, "#FFFFFF", { x: 20, y: 20, width: 100, height: 16 }),
    ]);
    // The card is painted after the page, so the card wins.
    expect(analyzeScene(scene).diagnostics).toEqual([]);
  });

  it("accepts readable text", () => {
    const scene = document([
      rect("card", { kind: "occurrence", id: "a" }, "#EFF6FF", { x: 10, y: 10, width: 200, height: 40 }),
      text("t1", { kind: "occurrence", id: "a" }, "#172033", { x: 20, y: 20, width: 100, height: 16 }),
    ]);
    expect(analyzeScene(scene).diagnostics).toEqual([]);
  });
});

describe("content disposition is surfaced", () => {
  it("errors on omitted content and warns on abbreviated content", () => {
    const scene = document([text("t1", { kind: "occurrence", id: "a" }, "#000000")], {
      content: [
        { contentId: "a:label", kind: "abbreviated", sceneIds: ["t1"], reason: "did not fit", omittedGraphemes: 12 },
        { contentId: "a:asset:logo", kind: "omitted", sceneIds: [], reason: "asset role did not resolve" },
        { contentId: "a:badge", kind: "rendered", sceneIds: ["t1"] },
      ],
    });
    const report = analyzeScene(scene);
    const byCode = new Map(report.diagnostics.map((diagnostic) => [diagnostic.code, diagnostic]));
    expect(byCode.get("TOP440_TEXT_ABBREVIATED")?.severity).toBe("warning");
    expect(byCode.get("TOP453_CONTENT_OMITTED")?.severity).toBe("error");
    // Rendered content produces nothing.
    expect(report.diagnostics).toHaveLength(2);
  });
});

describe("scene ink coverage", () => {
  it("counts painted extent rather than node rectangles", () => {
    const scene = document([
      rect("page", { kind: "chrome", id: "canvas" }, "#FFFFFF", CANVAS),
      rect("card", { kind: "occurrence", id: "a" }, "#EFF6FF", { x: 0, y: 0, width: 200, height: 100 }),
    ]);
    // The background fill is excluded; half the canvas is covered by the card.
    expect(analyzeScene(scene).metrics.sceneInkCoverage).toBeCloseTo(0.25, 2);
  });

  it("is zero for an empty page", () => {
    expect(analyzeScene(document([])).metrics.sceneInkCoverage).toBe(0);
  });
});
