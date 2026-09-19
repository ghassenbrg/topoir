import type { Rect } from "@topoir/core";
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

export function sceneDocument(scene: Scene): SceneDocument {
  const primitives: ScenePrimitive[] = [];
  const semanticIndex: Record<string, string[]> = {};
  let counter = 0;

  walk(scene.children, [], (element, path) => {
    if (element.type === "group") return;
    const owner = element.owner ?? { kind: "chrome" as const, id: "unattributed" };
    const id = `p${counter++}`;
    const layer = layerFor(owner, path);
    const primitive = toPrimitive(element, id, owner, layer);
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

function toPrimitive(element: SceneElement, id: string, owner: SceneOwner, layer: LayerId): ScenePrimitive | undefined {
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
      const width = Math.max(1, ...element.lines.map((line) => line.length * element.fontSize * 0.55));
      const height = element.lines.length * element.lineHeight;
      const x = element.anchor === "middle" ? element.x - width / 2 : element.anchor === "end" ? element.x - width : element.x;
      return {
        ...base,
        type: "text",
        inkBounds: { x, y: element.y - element.fontSize, width, height },
        fill: element.fill,
        text: {
          source: element.lines.join(" "),
          lines: element.lines.map((line, index) => ({ text: line, x, baseline: element.y + index * element.lineHeight, advance: width, inkBounds: { x, y: element.y - element.fontSize + index * element.lineHeight, width, height: element.lineHeight }, continuesPrevious: false })),
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

/** Bounding box of the coordinates in a path, grown by half the stroke. */
function pathBounds(d: string, stroke: number): Rect {
  const numbers = [...d.matchAll(/-?\d+(?:\.\d+)?/gu)].map((match) => Number(match[0]));
  const xs = numbers.filter((_value, index) => index % 2 === 0);
  const ys = numbers.filter((_value, index) => index % 2 === 1);
  if (xs.length === 0 || ys.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  return grow({ x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) }, stroke);
}
