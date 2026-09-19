import type { Rect, TextMeasurer } from "@topoir/core";
import { bundledFontTextMeasurer } from "@topoir/core";
import type { LayerId, SceneDocument, ScenePrimitive } from "@topoir/core";
import type { Scene, SceneElement, SceneOwner } from "./scene.js";

/**
 * Turns a built `Scene` into a `SceneDocument` with semantic ownership (T08).
 *
 * The legacy scene stays exactly as it is — it is what `renderSvg` and `renderPng`
 * consume, and changing it would change every golden. This reads it and produces the
 * V2 view of the same drawing: a stable id and an owner per mark, plus a semantic index.
 *
 * The index is what makes coverage checkable in both directions. `unrepresented` answers
 * "is anything the document declares missing from the drawing", which no geometry counter
 * can reveal; `unowned` answers the converse, "is anything drawn that nothing explains".
 */

/** Marks with no owner. A non-empty result means the drawing contains unexplained ink. */
export function unowned(scene: Scene): readonly string[] {
  const found: string[] = [];
  walk(scene.children, [], (element, path) => {
    if (element.type === "group") return;
    if (element.owner === undefined) found.push(`${path.join("/")}/${element.type}`);
  });
  return found;
}

export function sceneDocument(scene: Scene, measurer: TextMeasurer = bundledFontTextMeasurer()): SceneDocument {
  const primitives: ScenePrimitive[] = [];
  const semanticIndex: Record<string, string[]> = {};
  let counter = 0;

  walk(scene.children, [], (element, path) => {
    if (element.type === "group") return;
    const owner = element.owner ?? { kind: "chrome" as const, id: "unattributed" };
    const id = `p${counter++}`;
    const layer = layerFor(owner, path);
    const primitive = toPrimitive(element, id, owner, layer, measurer);
    if (primitive === undefined) return;
    primitives.push(primitive);
    semanticIndex[owner.id] = [...(semanticIndex[owner.id] ?? []), id];
  });

  return {
    id: "scene",
    title: scene.title,
    ...(scene.description === undefined ? {} : { description: scene.description }),
    background: scene.background,
    pages: [{ id: "page-1", bounds: { x: 0, y: 0, width: scene.width, height: scene.height }, primitives }],
    semanticIndex,
    readingOrder: primitives.map((primitive) => primitive.id),
    content: [],
    ...(scene.attribution === undefined ? {} : { attribution: scene.attribution }),
  };
}

function walk(
  elements: readonly SceneElement[],
  path: readonly string[],
  visit: (element: SceneElement, path: readonly string[]) => void,
): void {
  for (const element of elements) {
    visit(element, path);
    if (element.type === "group") walk(element.children, [...path, element.id ?? "group"], visit);
  }
}

/** Which layer a mark belongs to, from its owner and the group it was emitted into. */
function layerFor(owner: SceneOwner, path: readonly string[]): LayerId {
  if (path.includes("groups")) return "boundaries";
  if (path.includes("edges")) return "relationships";
  if (path.includes("edge-labels")) return "relationshipLabels";
  if (path.includes("nodes")) return "components";
  if (path.includes("annotations")) return "annotations";
  if (path.includes("legend")) return "chrome";
  if (path.includes("lifelines")) return "underlays";
  return owner.id === "canvas" ? "background" : "chrome";
}

function toPrimitive(element: SceneElement, id: string, owner: SceneOwner, layer: LayerId, measurer: TextMeasurer): ScenePrimitive | undefined {
  const base = { id, owner: { kind: owner.kind, id: owner.id }, layer } as const;
  switch (element.type) {
    case "rect": {
      const bounds: Rect = { x: element.x, y: element.y, width: element.width, height: element.height };
      return { ...base, type: "rect", bounds, inkBounds: grow(bounds, element.strokeWidth ?? 0), ...(element.rx === undefined ? {} : { radius: element.rx }), fill: element.fill, ...(element.stroke === undefined ? {} : { stroke: element.stroke }), ...(element.strokeWidth === undefined ? {} : { strokeWidth: element.strokeWidth }), ...(element.dash === undefined ? {} : { dash: element.dash }), ...(element.opacity === undefined ? {} : { opacity: element.opacity }) };
    }
    case "circle": {
      const bounds: Rect = { x: element.cx - element.radius, y: element.cy - element.radius, width: element.radius * 2, height: element.radius * 2 };
      return { ...base, type: "ellipse", bounds, inkBounds: grow(bounds, element.strokeWidth ?? 0), fill: element.fill, ...(element.stroke === undefined ? {} : { stroke: element.stroke }) };
    }
    case "path":
      return { ...base, type: "path", d: element.d, inkBounds: pathBounds(element.d, element.strokeWidth ?? 0), ...(element.fill === undefined ? {} : { fill: element.fill }), ...(element.stroke === undefined ? {} : { stroke: element.stroke }), ...(element.strokeWidth === undefined ? {} : { strokeWidth: element.strokeWidth }), ...(element.dash === undefined ? {} : { dash: element.dash }) };
    case "text": {
      // Measured, not estimated. A character-count approximation over-reports width for
      // wide glyph runs, which would make the clipping check invent defects that are not
      // in the drawing — and under-reports for narrow ones, hiding real clipping.
      const style = {
        fontSize: element.fontSize,
        lineHeight: element.lineHeight / element.fontSize,
        ...(element.fontWeight === undefined ? {} : { fontWeight: element.fontWeight as 400 | 500 | 600 | 700 }),
      };
      const advances = element.lines.map((line) => measurer.measure(line, style).width);
      const width = Math.max(1, ...advances);
      const height = element.lines.length * element.lineHeight;
      const x = element.anchor === "middle" ? element.x - width / 2 : element.anchor === "end" ? element.x - width : element.x;
      return {
        ...base,
        type: "text",
        inkBounds: { x, y: element.y - element.fontSize, width, height },
        fill: element.fill,
        text: {
          source: element.lines.join(" "),
          lines: element.lines.map((line, index) => ({ text: line, x, baseline: element.y + index * element.lineHeight, advance: advances[index] ?? width, inkBounds: { x, y: element.y - element.fontSize + index * element.lineHeight, width: advances[index] ?? width, height: element.lineHeight }, continuesPrevious: false })),
          fontFamily: "",
          fontSize: element.fontSize,
          fontWeight: element.fontWeight ?? 400,
          lineHeight: element.lineHeight,
          ascent: element.fontSize * 0.8,
          descent: element.fontSize * 0.2,
          direction: "ltr",
        },
      };
    }
    case "image": {
      const bounds: Rect = { x: element.x, y: element.y, width: element.width, height: element.height };
      return { ...base, type: "image", bounds, inkBounds: bounds, href: element.href, role: owner.part ?? element.title, title: element.title };
    }
    default:
      return undefined;
  }
}

function grow(rect: Rect, stroke: number): Rect {
  const half = stroke / 2;
  return { x: rect.x - half, y: rect.y - half, width: rect.width + stroke, height: rect.height + stroke };
}

/**
 * Bounding box of a path's coordinates, grown by half the stroke.
 *
 * Commands are parsed rather than the numbers being paired off alternately. `H` and `V`
 * each take a single coordinate, so a naive alternating scan desynchronises after the
 * first one and reports wildly wrong boxes — which made the clipping check invent defects
 * on cylinder components, whose body path uses `C` then `V`.
 *
 * Control points of a curve are included. That over-reports slightly for a curve that
 * bulges less than its hull, which is the safe direction: it can make a borderline mark
 * look clipped, never hide one that genuinely is.
 */
function pathBounds(d: string, stroke: number): Rect {
  const xs: number[] = [];
  const ys: number[] = [];
  let cursor = { x: 0, y: 0 };
  const tokens = d.match(/[A-Za-z]|-?\d+(?:\.\d+)?/gu) ?? [];
  let index = 0;
  let command = "";
  const take = (): number => Number(tokens[index++] ?? 0);
  const point = (x: number, y: number): void => {
    xs.push(x);
    ys.push(y);
    cursor = { x, y };
  };
  while (index < tokens.length) {
    const token = tokens[index];
    if (token !== undefined && /[A-Za-z]/u.test(token)) {
      command = token;
      index += 1;
    }
    switch (command.toUpperCase()) {
      case "M":
      case "L":
      case "T": {
        const x = take();
        point(x, take());
        break;
      }
      case "H":
        point(take(), cursor.y);
        break;
      case "V":
        point(cursor.x, take());
        break;
      case "C": {
        for (let control = 0; control < 2; control += 1) {
          const cx = take();
          xs.push(cx);
          ys.push(take());
        }
        const x = take();
        point(x, take());
        break;
      }
      case "Q":
      case "S": {
        const cx = take();
        xs.push(cx);
        ys.push(take());
        const x = take();
        point(x, take());
        break;
      }
      case "Z":
        break;
      default:
        // Unknown command: stop rather than misread the rest of the path.
        index = tokens.length;
    }
  }
  if (xs.length === 0 || ys.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  return grow({ x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) }, stroke);
}
