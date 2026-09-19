import { assetReferences, nodeShape, type MeasuredNode, type GeometryNode, type Point, type TopoIRTheme } from "@topoir/core";
import type { AssetRegistry } from "@topoir/assets";
import type { SceneElement, SceneGroup, SceneRect } from "./scene.js";
import { iconScene } from "./icons.js";

export function nodeComponent(node: MeasuredNode, geometry: GeometryNode, offset: Point, theme: TopoIRTheme, assets: AssetRegistry, focus: boolean, step?: number): SceneGroup {
  const shape = nodeShape(node, theme);
  const basePaint = theme.node.byKind[node.kind] ?? theme.node.default;
  const status = node.visual?.status;
  const accent = status === "failure" ? "#E54864" : status === "warning" ? "#D99B21" : status === "success" ? "#21A675" : focus || node.visual?.emphasis === "primary" ? theme.edge.palette[0]! : basePaint.stroke;
  const x = geometry.x + offset.x, y = geometry.y + offset.y, w = geometry.width, h = geometry.height;
  // Drawn from the measured badge, so the strip the node was sized for is the strip drawn.
  const badge = node.badgeText;
  const badgeHeight = badge ? badge.height + 12 : 0;
  const showPorts = node.visual?.portLabels === "inside" && node.ports.length > 0;
  const portPanelHeight = showPorts ? 12 + node.ports.reduce((sum, port) => sum + Math.max(28, (port.labelText?.height ?? 0) + 12), 0) : 0;
  const vertical = shape === "icon" || shape === "image";
  const fill = basePaint.fill;
  const base: SceneRect = { type: "rect", x, y, width: w, height: h, rx: shape === "pill" ? h / 2 : theme.node.radius, fill, stroke: accent, strokeWidth: focus ? 2.6 : 1.4 };
  const children: SceneElement[] = [];
  const depth = shape === "stack" ? 7 : theme.language?.depth ?? 0;
  // Resolved tokens, not theme names: `{extends: X}` resolves to the id `X+authored`, so
  // a name comparison silently dropped treatment that the base theme had.
  if (depth > 0 && !vertical) children.push({ ...base, x: x + depth, y: y + depth, width: w - depth, height: h - depth, fill: theme.language?.depthFill ?? fill, strokeWidth: 1 });
  if (shape === "cylinder") {
    children.push({ type: "path", d: `M${x} ${y + 12}C${x} ${y - 4} ${x + w} ${y - 4} ${x + w} ${y + 12}V${y + h - 12}C${x + w} ${y + h + 4} ${x} ${y + h + 4} ${x} ${y + h - 12}Z`, fill, stroke: accent, strokeWidth: focus ? 2.6 : 1.5 });
    children.push({ type: "path", d: `M${x} ${y + 12}C${x} ${y + 28} ${x + w} ${y + 28} ${x + w} ${y + 12}`, fill: "none", stroke: accent, strokeWidth: 1.2 });
  } else if (shape === "diamond") {
    children.push({ type: "path", d: `M${x + w / 2} ${y}L${x + w} ${y + h / 2}L${x + w / 2} ${y + h}L${x} ${y + h / 2}Z`, fill, stroke: accent, strokeWidth: 1.5 });
  } else if (!vertical) {
    children.push({ ...base, ...(shape === "stack" ? { width: w - 7, height: h - 7 } : {}) });
    if (theme.language?.component === "sketch") children.push({ type: "path", d: `M${x + 3} ${y + h - 4}L${x + 1} ${y + 2}L${x + w - 5} ${y - 1}`, fill: "none", stroke: accent, strokeWidth: 0.65 });
    if (theme.language?.accentBar === true || focus) children.push({ type: "rect", x, y: y + 12, width: 4, height: h - 24, rx: 2, fill: accent });
  } else if (focus) {
    children.push({ ...base, fill: "none", strokeWidth: 2, rx: 12 });
  }
  const size = theme.node.iconSize;
  // One drawn block per authored role. This used to key a Map on the *resolved* asset id
  // and then `.slice(0, 5)`, so a sixth schema-permitted role was dropped outright and two
  // roles sharing image bytes collapsed into one. Deduplicating image bytes must not
  // deduplicate authored roles, so the requested reference is the identity here.
  const roles = node.assetRoles?.map((role) => role.reference) ?? assetReferences(node);
  const resolvedAssets = roles
    .map((reference) => assets.resolve(reference, accent))
    .filter((value): value is NonNullable<typeof value> => value !== undefined);
  const asset = resolvedAssets[0] ?? assets.resolve(node.kind, accent);
  const iconBoxWidth = node.imageSize?.width ?? (shape === "image" ? w - 32 : size);
  const iconBoxHeight = node.imageSize?.height ?? (shape === "image" ? Math.max(size, h - node.labelText.height - (node.descriptionText?.height ?? 0) - 48 - badgeHeight) : size);
  const iconX = vertical ? x + (w - iconBoxWidth) / 2 : x + theme.spacing.nodePaddingX + (shape === "diamond" ? 14 : 0);
  const iconY = vertical ? y + 14 : y + (h - badgeHeight - portPanelHeight - size) / 2 + (shape === "cylinder" ? 6 : 0);
  const displayedAssets = resolvedAssets.length ? resolvedAssets : asset ? [asset] : [];
  const assetIconWidth = displayedAssets.length > 1 ? size : iconBoxWidth;
  const assetStrip = displayedAssets.length * assetIconWidth + Math.max(0, displayedAssets.length - 1) * 8;
  const stripX = vertical ? x + (w - assetStrip) / 2 : iconX;
  if (displayedAssets.length) {
    for (const [index, resolved] of displayedAssets.entries()) {
      const assetX = stripX + index * (assetIconWidth + 8);
      const backplate = theme.language?.assetBackplate;
      if (resolved.collection === "devicon" && backplate !== undefined) children.push({ type: "rect", x: assetX - 4, y: iconY - 4, width: assetIconWidth + 8, height: iconBoxHeight + 8, rx: 6, fill: backplate });
      children.push({ type: "image", x: assetX, y: iconY, width: assetIconWidth, height: iconBoxHeight, href: resolved.dataUri, title: resolved.name });
    }
  } else children.push(iconScene(node.kind, iconX, iconY, size, accent));
  const totalTextHeight = node.labelText.height + (node.descriptionText === undefined ? 0 : 6 + node.descriptionText.height);
  const textTop = vertical ? iconY + iconBoxHeight + 12 : y + (h - badgeHeight - portPanelHeight - totalTextHeight) / 2 + (shape === "cylinder" ? 6 : 0);
  const textX = vertical ? x + w / 2 : iconX + Math.max(size, displayedAssets.length * (size + 8) - 8) + 12;
  children.push({ type: "text", x: textX, y: textTop + theme.font.labelSize, lines: node.labelText.lines, lineHeight: node.labelText.lineHeight, fill: basePaint.text, fontSize: theme.font.labelSize, fontWeight: focus ? 700 : 600, ...(vertical ? { anchor: "middle" } : {}) });
  if (node.descriptionText) children.push({ type: "text", x: textX, y: textTop + node.labelText.height + 6 + theme.font.descriptionSize, lines: node.descriptionText.lines, lineHeight: node.descriptionText.lineHeight, fill: theme.canvas.muted, fontSize: theme.font.descriptionSize, ...(vertical ? { anchor: "middle" } : {}) });
  if (showPorts) {
    // Drawn from the same measured slots that layout pinned the ports to.
    for (const port of node.ports) {
      const slot = port.slot;
      if (slot === undefined) continue;
      children.push({ type: "rect", x: x + slot.x, y: y + slot.y, width: slot.width, height: slot.height, rx: 7, fill: theme.canvas.background, stroke: accent, strokeWidth: 1 });
      children.push({ type: "text", x: x + slot.x + slot.width / 2, y: y + slot.y + slot.height / 2 + theme.font.descriptionSize * 0.36, lines: port.labelText?.lines ?? [port.label], lineHeight: port.labelText?.lineHeight ?? theme.font.descriptionSize * 1.2, fill: basePaint.text, fontSize: theme.font.descriptionSize, fontWeight: 600, anchor: "middle" });
    }
  }
  if (badge) {
    // A one-line badge keeps exactly the strip and baseline it has always had; only a
    // wrapped badge grows the strip, so existing output is unchanged.
    const stripHeight = badge.height + 7;
    const stripY = y + h - stripHeight - 7;
    children.push({ type: "rect", x: x + 12, y: stripY, width: w - 24, height: stripHeight, rx: 4, fill: theme.canvas.background });
    children.push({ type: "text", x: x + w / 2, y: stripY + badge.lineHeight + 2, lines: badge.lines, lineHeight: badge.lineHeight, fontSize: 10, fontWeight: 600, fill: accent, anchor: "middle" });
  }
  if (step !== undefined) {
    children.push({ type: "circle", cx: x + 12, cy: y + 12, radius: 12, fill: accent });
    children.push({ type: "text", x: x + 12, y: y + 16, lines: [String(step)], lineHeight: 12, fontSize: 11, fontWeight: 700, fill: "#FFFFFF", anchor: "middle" });
  }
  return { type: "group", id: `node-${node.id}`, className: `topoir-node topoir-node-${node.kind} topoir-shape-${shape}`, opacity: node.visual?.emphasis === "muted" ? 0.55 : 1, children };
}
