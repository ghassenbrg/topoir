import type {
  Scene,
  SceneCircle,
  SceneElement,
  SceneGroup,
  ScenePath,
  SceneRect,
  SceneText,
} from "./scene.js";
import { embeddedFontCss, embeddedFontCssFor } from "./fonts.js";
import type { ResolvedFontSet } from "@topoir/core";

/**
 * `fonts` is the resolved set measurement used. Passing it makes the embedded faces
 * provably the same resources layout was computed against; omitting it keeps the previous
 * behavior of embedding the default chain.
 */
export function renderSvg(scene: Scene, fonts?: ResolvedFontSet): string {
  const markerColors = [...collectMarkerColors(scene.children)].sort((left, right) => left.localeCompare(right, "en"));
  const defs = markerColors
    .map((color) => `<marker id="${markerId(color)}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9Z" fill="${escapeAttribute(color)}"/></marker>`)
    .join("");
  const body = (scene.attribution ? `<metadata id="topoir-artwork-licenses">${escapeText(scene.attribution)}</metadata>` : "") + scene.children.map(renderElement).join("");
  const fontCss = fonts === undefined ? embeddedFontCss() : embeddedFontCssFor(fonts);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${number(scene.width)}" height="${number(scene.height)}" viewBox="0 0 ${number(scene.width)} ${number(scene.height)}" role="img" aria-labelledby="topoir-title topoir-description" data-topoir-renderer="svg-v1" font-family="${escapeAttribute(scene.fontFamily)}"><title id="topoir-title">${escapeText(scene.title)}</title><desc id="topoir-description">${escapeText(scene.description ?? `Architecture diagram: ${scene.title}`)}</desc><defs><style>${fontCss}</style>${defs}</defs>${body}</svg>\n`;
}

function renderElement(element: SceneElement): string {
  switch (element.type) {
    case "group":
      return renderGroup(element);
    case "rect":
      return renderRect(element);
    case "circle":
      return renderCircle(element);
    case "path":
      return renderPath(element);
    case "text":
      return renderText(element);
    case "image":
      if (!/^data:image\/(svg\+xml|png);base64,[A-Za-z0-9+/=]+$/.test(element.href)) throw new Error("Scene images must be embedded SVG or PNG data.");
      return `<image x="${number(element.x)}" y="${number(element.y)}" width="${number(element.width)}" height="${number(element.height)}" href="${escapeAttribute(element.href)}" preserveAspectRatio="xMidYMid meet"><title>${escapeText(element.title)}</title></image>`;
  }
}

function renderGroup(group: SceneGroup): string {
  const attributes = [attribute("id", group.id), attribute("class", group.className), attribute("transform", group.transform), attribute("opacity", group.opacity === undefined ? undefined : number(group.opacity))].filter(Boolean).join(" ");
  return `<g${attributes === "" ? "" : ` ${attributes}`}>${group.children.map(renderElement).join("")}</g>`;
}

function renderRect(rect: SceneRect): string {
  return `<rect${attributes([
    ["id", rect.id],
    ["class", rect.className],
    ["x", number(rect.x)],
    ["y", number(rect.y)],
    ["width", number(rect.width)],
    ["height", number(rect.height)],
    ["rx", rect.rx === undefined ? undefined : number(rect.rx)],
    ["fill", rect.fill],
    ["stroke", rect.stroke],
    ["stroke-width", rect.strokeWidth === undefined ? undefined : number(rect.strokeWidth)],
    ["stroke-dasharray", rect.dash],
    ["opacity", rect.opacity === undefined ? undefined : number(rect.opacity)],
  ])}/>`;
}

function renderCircle(circle: SceneCircle): string {
  return `<circle${attributes([
    ["cx", number(circle.cx)],
    ["cy", number(circle.cy)],
    ["r", number(circle.radius)],
    ["fill", circle.fill],
    ["stroke", circle.stroke],
    ["stroke-width", circle.strokeWidth === undefined ? undefined : number(circle.strokeWidth)],
  ])}/>`;
}

function renderPath(path: ScenePath): string {
  return `<path${attributes([
    ["id", path.id],
    ["class", path.className],
    ["d", path.d],
    ["fill", path.fill],
    ["stroke", path.stroke],
    ["stroke-width", path.strokeWidth === undefined ? undefined : number(path.strokeWidth)],
    ["stroke-dasharray", path.dash],
    ["stroke-linecap", path.lineCap],
    ["stroke-linejoin", path.lineJoin],
    ["marker-start", path.markerStart === undefined ? undefined : `url(#${markerId(path.markerStart)})`],
    ["marker-end", path.markerEnd === undefined ? undefined : `url(#${markerId(path.markerEnd)})`],
  ])}/>`;
}

function renderText(text: SceneText): string {
  const base = attributes([
    ["id", text.id],
    ["class", text.className],
    ["x", number(text.x)],
    ["y", number(text.y)],
    ["fill", text.fill],
    ["font-size", number(text.fontSize)],
    ["font-weight", text.fontWeight === undefined ? undefined : String(text.fontWeight)],
    ["text-anchor", text.anchor],
  ]);
  const lines = text.lines
    .map((line, index) => `<tspan x="${number(text.x)}" dy="${index === 0 ? "0" : number(text.lineHeight)}">${escapeText(line)}</tspan>`)
    .join("");
  return `<text${base}>${lines}</text>`;
}

function collectMarkerColors(elements: readonly SceneElement[]): Set<string> {
  const result = new Set<string>();
  for (const element of elements) {
    if (element.type === "group") {
      for (const color of collectMarkerColors(element.children)) result.add(color);
    } else if (element.type === "path") {
      if (element.markerStart !== undefined) result.add(element.markerStart);
      if (element.markerEnd !== undefined) result.add(element.markerEnd);
    }
  }
  return result;
}

function attributes(values: ReadonlyArray<readonly [string, string | undefined]>): string {
  const rendered = values
    .filter((entry): entry is readonly [string, string] => entry[1] !== undefined)
    .map(([name, value]) => `${name}="${escapeAttribute(value)}"`)
    .join(" ");
  return rendered === "" ? "" : ` ${rendered}`;
}

function attribute(name: string, value: string | undefined): string {
  return value === undefined ? "" : `${name}="${escapeAttribute(value)}"`;
}

function markerId(color: string): string {
  return `arrow-${color.replaceAll(/[^A-Za-z0-9]/g, "").toLowerCase()}`;
}

function number(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function escapeAttribute(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

function escapeText(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
