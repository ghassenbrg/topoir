import { nodeShape, type MeasuredNode, type GeometryNode, type Point, type TopoIRTheme } from "@topoir/core";
import type { AssetRegistry } from "@topoir/assets";
import type { SceneElement, SceneGroup, SceneRect } from "./scene.js";
import { iconScene } from "./icons.js";

export function nodeComponent(node: MeasuredNode, geometry: GeometryNode, offset: Point, theme: TopoIRTheme, assets: AssetRegistry, focus: boolean, step?: number): SceneGroup {
  const shape = nodeShape(node, theme);
  const basePaint = theme.node.byKind[node.kind] ?? theme.node.default;
  const status = node.visual?.status;
  const accent = status === "failure" ? "#E54864" : status === "warning" ? "#D99B21" : status === "success" ? "#21A675" : focus || node.visual?.emphasis === "primary" ? theme.edge.palette[0]! : basePaint.stroke;
  const x = geometry.x + offset.x, y = geometry.y + offset.y, w = geometry.width, h = geometry.height;
  const badge = node.visual?.badge ?? (node.visual?.replicas === undefined ? undefined : `${node.visual.replicas} replicas`);
  const badgeHeight = badge ? 24 : 0;
  const vertical = shape === "icon" || shape === "image";
  const fill = basePaint.fill;
  const base: SceneRect = { type: "rect", x, y, width: w, height: h, rx: shape === "pill" ? h / 2 : theme.node.radius, fill, stroke: accent, strokeWidth: focus ? 2.6 : 1.4 };
  const children: SceneElement[] = [];
  const depth = shape === "stack" ? 7 : theme.language?.depth ?? 0;
  if (depth > 0 && !vertical) children.push({ ...base, x: x + depth, y: y + depth, width: w - depth, height: h - depth, fill: theme.id === "whiteboard" ? "#D3E6DF" : theme.id === "executive" ? "#DDDCD5" : fill, strokeWidth: 1 });
  if (shape === "cylinder") {
    children.push({ type: "path", d: `M${x} ${y + 12}C${x} ${y - 4} ${x + w} ${y - 4} ${x + w} ${y + 12}V${y + h - 12}C${x + w} ${y + h + 4} ${x} ${y + h + 4} ${x} ${y + h - 12}Z`, fill, stroke: accent, strokeWidth: focus ? 2.6 : 1.5 });
    children.push({ type: "path", d: `M${x} ${y + 12}C${x} ${y + 28} ${x + w} ${y + 28} ${x + w} ${y + 12}`, fill: "none", stroke: accent, strokeWidth: 1.2 });
  } else if (shape === "diamond") {
    children.push({ type: "path", d: `M${x + w / 2} ${y}L${x + w} ${y + h / 2}L${x + w / 2} ${y + h}L${x} ${y + h / 2}Z`, fill, stroke: accent, strokeWidth: 1.5 });
  } else if (!vertical) {
    children.push({ ...base, ...(shape === "stack" ? { width: w - 7, height: h - 7 } : {}) });
    if (theme.language?.component === "sketch") children.push({ type: "path", d: `M${x + 3} ${y + h - 4}L${x + 1} ${y + 2}L${x + w - 5} ${y - 1}`, fill: "none", stroke: accent, strokeWidth: 0.65 });
    if (theme.id === "executive" || focus) children.push({ type: "rect", x, y: y + 12, width: 4, height: h - 24, rx: 2, fill: accent });
  } else if (focus) {
    children.push({ ...base, fill: "none", strokeWidth: 2, rx: 12 });
  }
  const size = theme.node.iconSize;
  const asset = assets.resolve(node.visual?.asset ?? node.icon ?? node.technology ?? node.kind, accent) ?? assets.resolve(node.kind, accent);
  const iconBoxWidth = node.imageSize?.width ?? (shape === "image" ? w - 32 : size);
  const iconBoxHeight = node.imageSize?.height ?? (shape === "image" ? Math.max(size, h - node.labelText.height - (node.descriptionText?.height ?? 0) - 48 - badgeHeight) : size);
  const iconX = vertical ? x + (w - iconBoxWidth) / 2 : x + theme.spacing.nodePaddingX + (shape === "diamond" ? 14 : 0);
  const iconY = vertical ? y + 14 : y + (h - badgeHeight - size) / 2 + (shape === "cylinder" ? 6 : 0);
  if (asset?.collection === "devicon" && (theme.id === "dark-engineering" || theme.id === "blueprint")) children.push({ type: "rect", x: iconX - 4, y: iconY - 4, width: iconBoxWidth + 8, height: iconBoxHeight + 8, rx: 6, fill: "#F8FAFC" });
  if (asset) children.push({ type: "image", x: iconX, y: iconY, width: iconBoxWidth, height: iconBoxHeight, href: asset.dataUri, title: asset.name });
  else children.push(iconScene(node.kind, iconX, iconY, size, accent));
  const totalTextHeight = node.labelText.height + (node.descriptionText === undefined ? 0 : 6 + node.descriptionText.height);
  const textTop = vertical ? iconY + iconBoxHeight + 12 : y + (h - badgeHeight - totalTextHeight) / 2 + (shape === "cylinder" ? 6 : 0);
  const textX = vertical ? x + w / 2 : iconX + size + 12;
  children.push({ type: "text", x: textX, y: textTop + theme.font.labelSize, lines: node.labelText.lines, lineHeight: node.labelText.lineHeight, fill: basePaint.text, fontSize: theme.font.labelSize, fontWeight: focus ? 700 : 600, ...(vertical ? { anchor: "middle" } : {}) });
  if (node.descriptionText) children.push({ type: "text", x: textX, y: textTop + node.labelText.height + 6 + theme.font.descriptionSize, lines: node.descriptionText.lines, lineHeight: node.descriptionText.lineHeight, fill: theme.canvas.muted, fontSize: theme.font.descriptionSize, ...(vertical ? { anchor: "middle" } : {}) });
  if (badge) {
    children.push({ type: "rect", x: x + 12, y: y + h - 26, width: w - 24, height: 19, rx: 4, fill: theme.canvas.background });
    children.push({ type: "text", x: x + w / 2, y: y + h - 12, lines: [badge], lineHeight: 12, fontSize: 10, fontWeight: 600, fill: accent, anchor: "middle" });
  }
  if (step !== undefined) {
    children.push({ type: "circle", cx: x + 12, cy: y + 12, radius: 12, fill: accent });
    children.push({ type: "text", x: x + 12, y: y + 16, lines: [String(step)], lineHeight: 12, fontSize: 11, fontWeight: 700, fill: "#FFFFFF", anchor: "middle" });
  }
  return { type: "group", id: `node-${node.id}`, className: `topoir-node topoir-node-${node.kind} topoir-shape-${shape}`, opacity: node.visual?.emphasis === "muted" ? 0.55 : 1, children };
}
