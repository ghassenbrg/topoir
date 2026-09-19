import type { Diagnostic } from "@topoir/schema";
import { contrastRatio, INVISIBLE_TEXT_CONTRAST, MINIMUM_TEXT_CONTRAST } from "../color.js";
import type { Rect } from "../ir.js";
import { LAYER_ORDER, type SceneDocument, type ScenePrimitive, type SceneTextPrimitive } from "../scene/document.js";

/**
 * Quality checks on the scene the reader actually receives (T09).
 *
 * `analyzeGeometry` runs on measured boxes and routes *before* the scene adds final text,
 * badges, decoration, header and legend. The review's summary of the consequence: "its ink
 * coverage is summed node rectangle area divided by geometry canvas area… it does not
 * measure the actual visible ink or final export readability."
 *
 * This pass runs on the `SceneDocument`, where every mark has painted bounds and an owner.
 * That is what makes it possible to say a required fact has no visible representative, or
 * that a glyph run is painted outside the canvas, or that text is unreadable against what
 * is actually behind it rather than against a theme token.
 *
 * Family-specific exemptions are explicit and named, never implicit: a sequence diagram's
 * messages legitimately cross its lifelines, and treating that as an occlusion defect would
 * train callers to ignore the check.
 */

export interface SceneQualityReport {
  readonly diagnostics: readonly Diagnostic[];
  readonly metrics: Readonly<Record<string, number>>;
}

export interface SceneQualityOptions {
  /**
   * Model element ids the document declares. A required id with no primitive representing
   * it is a coverage failure that no geometry counter can reveal.
   */
  readonly required?: readonly string[];
  /** The composition, so family-specific exemptions can be applied by name. */
  readonly composition?: string;
  /** The canvas background, used when a text run has nothing else painted behind it. */
  readonly background?: string;
}

export function analyzeScene(document: SceneDocument, options: SceneQualityOptions = {}): SceneQualityReport {
  const diagnostics: Diagnostic[] = [];
  let clipped = 0;
  let unreadable = 0;
  let lowContrast = 0;
  let unrepresentedCount = 0;
  let unownedCount = 0;

  const page = document.pages[0];
  if (page === undefined) {
    return { diagnostics, metrics: { clippedMarks: 0, illegibleRuns: 0, lowContrastRuns: 0, unrepresentedElements: 0, unownedMarks: 0, sceneInkCoverage: 0 } };
  }

  // 1. Nothing the document declares may be missing from the drawing.
  for (const id of options.required ?? []) {
    if ((document.semanticIndex[id] ?? []).length > 0) continue;
    unrepresentedCount += 1;
    diagnostics.push({
      code: "TOP450_ELEMENT_NOT_REPRESENTED",
      severity: "error",
      message:
        `${JSON.stringify(id)} is declared by the document but nothing in the drawing represents it. ` +
        `A geometrically clean diagram that omits a required fact is still the wrong diagram.`,
    });
  }

  // 2. Nothing may be drawn that no model element explains.
  for (const primitive of page.primitives) {
    if (primitive.owner.id !== "unattributed") continue;
    unownedCount += 1;
    diagnostics.push({
      code: "TOP451_MARK_NOT_ATTRIBUTED",
      severity: "warning",
      message: `Scene primitive ${JSON.stringify(primitive.id)} has no owning model element, so nothing explains why it is drawn.`,
    });
  }

  // 3. Painted bounds, not layout rectangles, must lie inside the canvas.
  for (const primitive of page.primitives) {
    if (withinCanvas(primitive.inkBounds, page.bounds)) continue;
    clipped += 1;
    diagnostics.push({
      code: "TOP452_MARK_CLIPPED",
      severity: "error",
      message:
        `${describe(primitive)} is painted outside the ${Math.round(page.bounds.width)}x${Math.round(page.bounds.height)} canvas, ` +
        `so part of it is cropped from the artifact. Its painted extent is ` +
        `${Math.round(primitive.inkBounds.x)},${Math.round(primitive.inkBounds.y)} ` +
        `${Math.round(primitive.inkBounds.width)}x${Math.round(primitive.inkBounds.height)}.`,
    });
  }

  // 4. Text must be readable against what is actually painted behind it.
  const texts = page.primitives.filter((primitive): primitive is SceneTextPrimitive => primitive.type === "text");
  for (const text of texts) {
    const behind = text.backdrop ?? backdropOf(text, page.primitives, options.background ?? document.background);
    const ratio = contrastRatio(text.fill, behind);
    if (ratio === undefined || ratio >= MINIMUM_TEXT_CONTRAST) continue;
    if (ratio < INVISIBLE_TEXT_CONTRAST) {
      // The content is lost: a reader cannot tell the text is there at all.
      unreadable += 1;
      diagnostics.push({
        code: "TOP442_TEXT_NOT_LEGIBLE",
        severity: "error",
        message:
          `${describe(text)} is drawn in ${text.fill} on ${behind}, a contrast ratio of ${ratio}:1. ` +
          `At that ratio the text cannot be distinguished from its background at all.`,
      });
      continue;
    }
    lowContrast += 1;
    diagnostics.push({
      code: "TOP443_TEXT_LOW_CONTRAST",
      severity: "warning",
      message:
        `${describe(text)} is drawn in ${text.fill} on ${behind}, a contrast ratio of ${ratio}:1. ` +
        `WCAG asks for at least ${MINIMUM_TEXT_CONTRAST}:1 for large text and 4.5:1 for body text, ` +
        `so this is readable but not comfortably.`,
    });
  }

  // 5. Content disposition the document carries is reported as-is.
  for (const entry of document.content) {
    if (entry.kind === "rendered") continue;
    diagnostics.push({
      code: entry.kind === "omitted" ? "TOP453_CONTENT_OMITTED" : "TOP440_TEXT_ABBREVIATED",
      severity: entry.kind === "omitted" ? "error" : "warning",
      message:
        `Content ${JSON.stringify(entry.contentId)} is ${entry.kind}` +
        `${entry.reason === undefined ? "" : `: ${entry.reason}`}.`,
    });
  }

  return {
    diagnostics,
    metrics: {
      clippedMarks: clipped,
      illegibleRuns: unreadable,
      lowContrastRuns: lowContrast,
      unrepresentedElements: unrepresentedCount,
      unownedMarks: unownedCount,
      sceneInkCoverage: sceneInkCoverage(page.primitives, page.bounds),
    },
  };
}

/**
 * Share of the canvas covered by marks that actually paint something.
 *
 * Distinct from `analyzeGeometry`'s `inkCoverage`, which sums node rectangles. This counts
 * the painted extent of every primitive except the background fill, so decoration, labels
 * and chrome contribute and an empty-looking diagram cannot read as dense because its few
 * cards happen to be large.
 */
function sceneInkCoverage(primitives: readonly ScenePrimitive[], canvas: Rect): number {
  const area = Math.max(1, canvas.width * canvas.height);
  const painted = primitives
    .filter((primitive) => primitive.owner.id !== "canvas")
    .reduce((sum, primitive) => sum + Math.max(0, primitive.inkBounds.width) * Math.max(0, primitive.inkBounds.height), 0);
  return Math.round(Math.min(1, painted / area) * 10000) / 10000;
}

/**
 * The fill immediately behind a text run.
 *
 * Contrast is meaningless against the canvas default when a label sits on a card: the card
 * is what the reader sees behind the glyphs. The last filled mark painted before this run
 * that contains its centre is the one that wins, which follows paint order.
 */
function backdropOf(text: SceneTextPrimitive, primitives: readonly ScenePrimitive[], fallback: string): string {
  const centre = {
    x: text.inkBounds.x + text.inkBounds.width / 2,
    y: text.inkBounds.y + text.inkBounds.height / 2,
  };
  let behind = fallback;
  for (const primitive of primitives) {
    if (primitive.id === text.id) break;
    if (primitive.type !== "rect" && primitive.type !== "ellipse") continue;
    const fill = primitive.fill;
    if (fill === undefined || fill === "none") continue;
    const bounds = primitive.bounds;
    if (centre.x < bounds.x || centre.x > bounds.x + bounds.width) continue;
    if (centre.y < bounds.y || centre.y > bounds.y + bounds.height) continue;
    behind = fill;
  }
  return behind;
}

function withinCanvas(rect: Rect, canvas: Rect): boolean {
  const slack = 1;
  return (
    rect.x >= canvas.x - slack &&
    rect.y >= canvas.y - slack &&
    rect.x + rect.width <= canvas.x + canvas.width + slack &&
    rect.y + rect.height <= canvas.y + canvas.height + slack
  );
}

function describe(primitive: ScenePrimitive): string {
  const owner = primitive.owner;
  const what = primitive.type === "text" ? "Text" : primitive.type === "image" ? "The image" : "A mark";
  return `${what} of ${owner.kind} ${JSON.stringify(owner.id)}`;
}

/** Paint order rank, for callers checking that layers were assembled correctly. */
export function layerRank(primitive: ScenePrimitive): number {
  return LAYER_ORDER.indexOf(primitive.layer);
}
