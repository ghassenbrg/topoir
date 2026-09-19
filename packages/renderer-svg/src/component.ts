import { assetOrigin, assetReferences, componentTextColor, contentLayout, nodeShape, readableTextOn, type MeasuredNode, type GeometryNode, type Point, type TopoIRTheme } from "@topoir/core";
import type { AssetRegistry } from "@topoir/assets";
import type { SceneElement, SceneGroup, SceneRect } from "./scene.js";
import { iconScene } from "./icons.js";

export function nodeComponent(node: MeasuredNode, geometry: GeometryNode, offset: Point, theme: TopoIRTheme, assets: AssetRegistry, focus: boolean, step?: number, authoredTextKinds: ReadonlySet<string> = new Set()): SceneGroup {
  // Every mark this component draws is owned by the occurrence it represents, so a
  // diagnostic can name the component a defect belongs to and coverage can be checked
  // against the model rather than against a count of rectangles.
  const own = (part: string) => ({ kind: "occurrence", id: node.id, part }) as const;
  const shape = nodeShape(node, theme);
  const basePaint = theme.node.byKind[node.kind] ?? theme.node.default;
  const status = node.visual?.status;
  const accent = status === "failure" ? "#E54864" : status === "warning" ? "#D99B21" : status === "success" ? "#21A675" : focus || node.visual?.emphasis === "primary" ? theme.edge.palette[0]! : basePaint.stroke;
  const x = geometry.x + offset.x, y = geometry.y + offset.y, w = geometry.width, h = geometry.height;
  // Drawn from the measured badge, so the strip the node was sized for is the strip drawn.
  const badge = node.badgeText;
  const showPorts = node.visual?.portLabels === "inside" && node.ports.length > 0;
  const vertical = shape === "icon" || shape === "image";
  const fill = basePaint.fill;
  const base: SceneRect = { type: "rect", owner: own("body"), x, y, width: w, height: h, rx: shape === "pill" ? h / 2 : theme.node.radius, fill, stroke: accent, strokeWidth: focus ? 2.6 : 1.4 };
  const children: SceneElement[] = [];
  const depth = shape === "stack" ? 7 : theme.language?.depth ?? 0;
  // Resolved tokens, not theme names: `{extends: X}` resolves to the id `X+authored`, so
  // a name comparison silently dropped treatment that the base theme had.
  if (depth > 0 && !vertical) children.push({ ...base, x: x + depth, y: y + depth, width: w - depth, height: h - depth, fill: theme.language?.depthFill ?? fill, strokeWidth: 1 });
  if (shape === "cylinder") {
    children.push({ type: "path", owner: own("body"), d: `M${x} ${y + 12}C${x} ${y - 4} ${x + w} ${y - 4} ${x + w} ${y + 12}V${y + h - 12}C${x + w} ${y + h + 4} ${x} ${y + h + 4} ${x} ${y + h - 12}Z`, fill, stroke: accent, strokeWidth: focus ? 2.6 : 1.5 });
    children.push({ type: "path", owner: own("body"), d: `M${x} ${y + 12}C${x} ${y + 28} ${x + w} ${y + 28} ${x + w} ${y + 12}`, fill: "none", stroke: accent, strokeWidth: 1.2 });
  } else if (shape === "diamond") {
    children.push({ type: "path", owner: own("body"), d: `M${x + w / 2} ${y}L${x + w} ${y + h / 2}L${x + w / 2} ${y + h}L${x} ${y + h / 2}Z`, fill, stroke: accent, strokeWidth: 1.5 });
  } else if (!vertical) {
    children.push({ ...base, ...(shape === "stack" ? { width: w - 7, height: h - 7 } : {}) });
    if (theme.language?.component === "sketch") children.push({ type: "path", owner: own("sketch-edge"), d: `M${x + 3} ${y + h - 4}L${x + 1} ${y + 2}L${x + w - 5} ${y - 1}`, fill: "none", stroke: accent, strokeWidth: 0.65 });
    if (theme.language?.accentBar === true || focus) children.push({ type: "rect", owner: own("accent"), x, y: y + 12, width: 4, height: h - 24, rx: 2, fill: accent });
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
  const displayedAssets = resolvedAssets.length ? resolvedAssets : asset ? [asset] : [];
  // Placement comes from the shared layout, in the component's local space. The renderer
  // offsets it; it does not re-derive it. That is what keeps the plan's description of a
  // component and the marks actually drawn from being two different things.
  const layout = contentLayout(node, theme, displayedAssets.length);
  const iconX = x + layout.iconOrigin.x;
  const iconY = y + layout.iconOrigin.y;
  const { width: iconBoxWidth, height: iconBoxHeight } = layout.iconBox;
  const assetIconWidth = layout.assetIconWidth;
  if (displayedAssets.length) {
    for (const [index, resolved] of displayedAssets.entries()) {
      const origin = assetOrigin(layout, index);
      const assetX = x + origin.x;
      const backplate = theme.language?.assetBackplate;
      if (resolved.collection === "devicon" && backplate !== undefined) children.push({ type: "rect", owner: own("asset-backplate"), x: assetX - 4, y: iconY - 4, width: assetIconWidth + 8, height: iconBoxHeight + 8, rx: 6, fill: backplate });
      children.push({ type: "image", owner: own(`asset:${resolved.name}`), x: assetX, y: iconY, width: assetIconWidth, height: iconBoxHeight, href: resolved.dataUri, title: resolved.name });
    }
  } else children.push({ ...iconScene(node.kind, iconX, iconY, size, accent), owner: own("icon") });
  const textX = x + layout.textX;
  children.push({ type: "text", owner: own("label"), x: textX, y: y + layout.labelBaseline, lines: node.labelText.lines, lineHeight: node.labelText.lineHeight, fill: componentTextColor(node, theme, authoredTextKinds), fontSize: theme.font.labelSize, fontWeight: focus ? 700 : 600, ...(vertical ? { anchor: "middle" } : {}) });
  if (node.descriptionText && layout.descriptionBaseline !== undefined) children.push({ type: "text", owner: own("description"), x: textX, y: y + layout.descriptionBaseline, lines: node.descriptionText.lines, lineHeight: node.descriptionText.lineHeight, fill: theme.canvas.muted, fontSize: theme.font.descriptionSize, ...(vertical ? { anchor: "middle" } : {}) });
  if (showPorts) {
    // Drawn from the same measured slots that layout pinned the ports to.
    for (const port of node.ports) {
      const slot = port.slot;
      if (slot === undefined) continue;
      // The compartment is filled with the canvas colour, so its label must be readable
      // against that. The component's own tint is kept where it works — it is a real
      // design choice — and gives way to the canvas's text colour where it does not.
      // Pairing the two tokens by position alone produced dark labels on a dark
      // compartment whenever a theme darkened the canvas without restating component text.
      children.push({ type: "rect", owner: own(`port:${port.id}`), x: x + slot.x, y: y + slot.y, width: slot.width, height: slot.height, rx: 7, fill: theme.canvas.background, stroke: accent, strokeWidth: 1 });
      children.push({ type: "text", owner: own(`port:${port.id}`), x: x + slot.x + slot.width / 2, y: y + slot.y + slot.height / 2 + theme.font.descriptionSize * 0.36, lines: port.labelText?.lines ?? [port.label], lineHeight: port.labelText?.lineHeight ?? theme.font.descriptionSize * 1.2, fill: readableTextOn(theme.canvas.background, basePaint.text, theme.canvas.foreground), fontSize: theme.font.descriptionSize, fontWeight: 600, anchor: "middle" });
    }
  }
  if (badge && layout.badgeStrip !== undefined && layout.badgeBaseline !== undefined) {
    // A one-line badge keeps exactly the strip and baseline it has always had; only a
    // wrapped badge grows the strip, so existing output is unchanged.
    const strip = layout.badgeStrip;
    children.push({ type: "rect", owner: own("badge"), x: x + strip.x, y: y + strip.y, width: strip.width, height: strip.height, rx: 4, fill: theme.canvas.background });
    children.push({ type: "text", owner: own("badge"), x: x + w / 2, y: y + layout.badgeBaseline, lines: badge.lines, lineHeight: badge.lineHeight, fontSize: 10, fontWeight: 600, fill: accent, anchor: "middle" });
  }
  if (step !== undefined) {
    children.push({ type: "circle", owner: own("step"), cx: x + 12, cy: y + 12, radius: 12, fill: accent });
    children.push({ type: "text", owner: own("step"), x: x + 12, y: y + 16, lines: [String(step)], lineHeight: 12, fontSize: 11, fontWeight: 700, fill: "#FFFFFF", anchor: "middle" });
  }
  return { type: "group", owner: { kind: "occurrence", id: node.id }, id: `node-${node.id}`, className: `topoir-node topoir-node-${node.kind} topoir-shape-${shape}`, opacity: node.visual?.emphasis === "muted" ? 0.55 : 1, children };
}
