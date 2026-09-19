import type {
  GeometryView,
  MeasuredEdge,
  MeasuredView,
  Point,
  TopoIRTheme,
} from "@topoir/core";
import { AssetRegistry, artworkLicenses } from "@topoir/assets";
import { assetReferences, bundledFontTextMeasurer, measureBlock, measureContext } from "@topoir/core";
import type { MeasuredText, TextStyle } from "@topoir/core";
import { nodeComponent } from "./component.js";
import type { Scene, SceneElement, SceneGroup, ScenePath } from "./scene.js";

const MARGIN = 32;
const TITLE_HEIGHT = 50;

export function buildScene(
  view: MeasuredView,
  geometry: GeometryView,
  theme: TopoIRTheme,
  assets = new AssetRegistry(),
): Scene {
  const flowColors = new Map(
    view.flows.map((flow, index) => [flow.id, flow.color ?? theme.edge.palette[index % theme.edge.palette.length] ?? theme.edge.stroke]),
  );
  const width = Math.max(360, geometry.bounds.width + MARGIN * 2);
  const textMeasurer = bundledFontTextMeasurer();
  /**
   * Page chrome is measured with the same block engine as everything else (T08).
   *
   * The title, subtitle and legend used to call `layoutText` here, which is a second
   * wrapping implementation living in the renderer — the acceptance criterion for this
   * task forbids exactly that. The work still happens after layout, because the title's
   * wrap width depends on the final canvas width; what changed is that it is no longer a
   * separate code path that could drift from how component text is measured.
   */
  const blockContext = measureContext({ measurer: textMeasurer });
  const chrome = (id: string, text: string, style: TextStyle, maxWidth: number, maxLines: number): MeasuredText => {
    const block = measureBlock({ type: "text", id, text, style, maxLines }, { ...blockContext, availableWidth: maxWidth });
    if (block.type !== "text") throw new Error("chrome block must be text");
    return {
      lines: block.text.lines.map((line) => line.text),
      lineHeight: block.text.lineHeight,
      width: Math.min(maxWidth, block.bounds.width),
      height: block.bounds.height,
      source: block.text.source,
      disposition: block.text.lines.map((line) => line.text.replace(/…$/u, "")).join("").length < block.text.source.replace(/\s+/gu, "").length ? "abbreviated" : "rendered",
    };
  };
  const titleSize = theme.language?.header === "editorial" ? 28 : 20;
  const title = chrome("chrome:title", view.title, { fontSize: titleSize, fontWeight: 700, lineHeight: 1.25 }, width - MARGIN * 2, 4);
  const subtitleSource = view.design?.takeaway ?? view.description;
  const subtitle = subtitleSource ? chrome("chrome:subtitle", subtitleSource, { fontSize: 13, lineHeight: 1.4 }, width - MARGIN * 2, 4) : undefined;
  const legendItems = view.showLegend ? view.flows.map((flow) => ({ flow, text: chrome(`chrome:legend:${flow.id}`, flow.label, { fontSize: 11, fontWeight: 500, lineHeight: 1.25 }, Math.max(100, width - MARGIN * 2 - 48), 2) })) : [];
  let legendRows = legendItems.length ? 1 : 0, legendCursor = 0;
  for (const item of legendItems) { const itemWidth = item.text.width + 64; if (legendCursor > 0 && legendCursor + itemWidth > width - MARGIN * 2) { legendRows++; legendCursor = 0; } legendCursor += itemWidth; }
  const legendHeight = legendRows ? legendRows * 40 + 14 : 0;
  const headerHeight = Math.max(TITLE_HEIGHT, title.height + (subtitle ? subtitle.height + 12 : 0) + (theme.language?.header === "editorial" ? 40 : 24));
  const offset = { x: MARGIN, y: MARGIN + headerHeight };
  const height = geometry.bounds.height + MARGIN * 2 + headerHeight + legendHeight;
  const groupById = new Map(view.groups.map((group) => [group.id, group]));
  const nodeById = new Map(view.nodes.map((node) => [node.id, node]));
  const edgeById = new Map(view.edges.map((edge) => [edge.id, edge]));
  const annotationById = new Map(view.annotations.map((annotation) => [annotation.id, annotation]));

  const groups: SceneElement[] = [...geometry.groups]
    .sort((left, right) => depth(left.id, groupById) - depth(right.id, groupById) || left.id.localeCompare(right.id, "en"))
    .flatMap((groupGeometry) => {
      const group = groupById.get(groupGeometry.id);
      if (group === undefined) return [];
      // A per-boundary override wins over the theme's paint for that kind, so sibling
      // regions of the same kind can be told apart — colour-coded zones are how the
      // reference diagrams separate one environment from another.
      const base = theme.group.byKind[group.kind] ?? theme.group.default;
      const override = group.visual;
      const paint = override
        ? {
            fill: override.fill ?? base.fill,
            stroke: override.stroke ?? base.stroke,
            text: override.text ?? base.text,
          }
        : base;
      const dash = group.kind === "external-zone" || group.kind === "security-boundary" || theme.language?.boundaries === "outline" ? "7 5" : undefined;
      // Boundary focus (T12). Until now `design.focus` on a group was accepted and did
      // nothing, which T04 could only report. A focused boundary is drawn with the accent
      // stroke at emphasis weight, matching how a focused component reads.
      const focused = view.design?.focus?.includes(group.id) ?? false;
      const boundaryStroke = focused ? (theme.edge.palette[0] ?? paint.stroke) : paint.stroke;
      return [
        {
          type: "group",
          id: `group-${safeId(group.id)}`,
          className: `topoir-group topoir-group-${group.kind}`,
          owner: { kind: "region", id: group.id },
          children: [
            {
              type: "rect",
              owner: { kind: "region", id: group.id, part: "boundary" },
              x: groupGeometry.x + offset.x,
              y: groupGeometry.y + offset.y,
              width: groupGeometry.width,
              height: groupGeometry.height,
              rx: theme.group.radius,
              fill: theme.language?.boundaries === "outline" ? "none" : paint.fill,
              stroke: boundaryStroke,
              strokeWidth: theme.language?.boundaries === "rail" ? 0 : focused ? 2.6 : 1.5,
              ...(dash === undefined ? {} : { dash }),
            },
            {
              type: "text",
              owner: { kind: "region", id: group.id, part: "title" },
              x: groupGeometry.x + offset.x + 16,
              y: groupGeometry.y + offset.y + 26,
              lines: group.labelText.lines,
              lineHeight: group.labelText.lineHeight,
              fill: focused ? boundaryStroke : paint.text,
              fontSize: theme.font.groupTitleSize,
              fontWeight: focused ? 700 : 600,
            },
          ],
        } satisfies SceneGroup,
      ];
    });

  const edgePaths: SceneElement[] = geometry.edges.flatMap((edgeGeometry) => {
    const edge = edgeById.get(edgeGeometry.id);
    if (edge === undefined || edgeGeometry.points.length < 2) return [];
    const color = edgeColor(edge, flowColors, theme);
    const style = edge.flow === undefined ? edge.style : (view.flows.find((flow) => flow.id === edge.flow)?.style ?? edge.style);
    const primary = edge.emphasis === "primary" || view.design?.story?.includes(edge.id);
    const path: ScenePath = {
      type: "path",
      owner: { kind: "relationship", id: edge.id },
      id: `edge-${safeId(edge.id)}`,
      className: `topoir-edge topoir-edge-${edge.kind}`,
      d: roundedOrthogonalPath(edgeGeometry.points.map((point) => ({ x: point.x + offset.x, y: point.y + offset.y })), theme.language?.connectorRadius ?? 8),
      fill: "none",
      stroke: color,
      strokeWidth: primary ? theme.edge.width * 1.9 : edge.emphasis === "secondary" || edge.emphasis === "muted" ? theme.edge.width * 0.75 : theme.edge.width,
      ...(style === "dashed" ? { dash: "8 6" } : style === "dotted" ? { dash: "2 5" } : {}),
      lineCap: "round",
      lineJoin: "round",
    };
    const points = edgeGeometry.points.map((point) => ({ x: point.x + offset.x, y: point.y + offset.y }));
    const arrows: SceneElement[] = [];
    const owner = { kind: "relationship", id: edge.id, part: "arrow" } as const;
    if (edge.direction === "forward" || edge.direction === "both") arrows.push({ ...arrowHead(points[points.length - 2]!, points[points.length - 1]!, color, path.strokeWidth ?? 1.8), owner });
    if (edge.direction === "back" || edge.direction === "both") arrows.push({ ...arrowHead(points[1]!, points[0]!, color, path.strokeWidth ?? 1.8), owner });
    return [path, ...arrows];
  });

  const edgeLabels: SceneElement[] = geometry.edges.flatMap((edgeGeometry) => {
    const edge = edgeById.get(edgeGeometry.id);
    const label = edgeGeometry.label;
    if (edge === undefined || label === undefined || edge.labelText === undefined) return [];
    return [
      {
        type: "group",
        id: `edge-label-${safeId(edge.id)}`,
        className: "topoir-edge-label",
        owner: { kind: "relationship", id: edge.id, part: "label" },
        children: [
          {
            type: "rect",
            owner: { kind: "relationship", id: edge.id, part: "label-background" },
            x: label.x + offset.x,
            y: label.y + offset.y,
            width: label.width,
            height: label.height,
            rx: 6,
            fill: theme.edge.labelBackground,
            stroke: edgeColor(edge, flowColors, theme),
            strokeWidth: 1,
          },
          {
            type: "text",
            owner: { kind: "relationship", id: edge.id, part: "label" },
            x: label.x + offset.x + label.width / 2,
            y: label.y + offset.y + 4 + theme.font.edgeLabelSize,
            lines: edge.labelText.lines,
            lineHeight: edge.labelText.lineHeight,
            fill: theme.edge.labelText,
            fontSize: theme.font.edgeLabelSize,
            fontWeight: 500,
            anchor: "middle",
          },
        ],
      } satisfies SceneGroup,
    ];
  });

  const nodes: SceneElement[] = geometry.nodes.flatMap((nodeGeometry) => {
    const node = nodeById.get(nodeGeometry.id);
    if (node === undefined) return [];
    const storyEdges = (view.design?.story ?? []).map((id) => edgeById.get(id)).filter((edge) => edge !== undefined);
    const storyNodes = [...new Set(storyEdges.flatMap((edge) => [edge.from, edge.to]))];
    const step = storyNodes.indexOf(node.id);
    return [nodeComponent(node, nodeGeometry, offset, theme, assets, view.design?.focus?.includes(node.id) ?? false, step < 0 ? undefined : step + 1)];
  });

  const annotations: SceneElement[] = geometry.annotations.flatMap((annotationGeometry) => {
    const annotation = annotationById.get(annotationGeometry.id);
    if (annotation === undefined) return [];
    const paint = theme.annotation[annotation.kind];
    return [
      {
        type: "group",
        id: `annotation-${safeId(annotation.id)}`,
        className: `topoir-annotation topoir-annotation-${annotation.kind}`,
        owner: { kind: "annotation", id: annotation.id },
        children: [
          {
            type: "rect",
            owner: { kind: "annotation", id: annotation.id, part: "body" },
            x: annotationGeometry.x + offset.x,
            y: annotationGeometry.y + offset.y,
            width: annotationGeometry.width,
            height: annotationGeometry.height,
            rx: 8,
            fill: paint.fill,
            stroke: paint.stroke,
            strokeWidth: 1.25,
            ...(annotation.kind === "callout" ? { dash: "5 4" } : {}),
          },
          {
            type: "text",
            owner: { kind: "annotation", id: annotation.id, part: "text" },
            x: annotationGeometry.x + offset.x + 14,
            y: annotationGeometry.y + offset.y + 12 + theme.font.descriptionSize,
            lines: annotation.textLayout.lines,
            lineHeight: annotation.textLayout.lineHeight,
            fill: paint.text,
            fontSize: theme.font.descriptionSize,
            fontWeight: annotation.kind === "warning" ? 600 : 400,
          },
        ],
      } satisfies SceneGroup,
    ];
  });

  const legend: SceneElement[] = [];
  if (legendItems.length > 0) {
    let cursor = MARGIN;
    let row = 0;
    for (const { flow, text } of legendItems) {
      if (cursor > MARGIN && cursor + text.width + 64 > width - MARGIN) { row++; cursor = MARGIN; }
      const baseline = height - legendHeight + 25 + row * 40;
      const color = flowColors.get(flow.id) ?? theme.edge.stroke;
      legend.push({
        type: "path",
        owner: { kind: "chrome", id: `legend:${flow.id}`, part: "swatch" },
        d: `M${number(cursor)} ${number(baseline - 4)}H${number(cursor + 28)}`,
        fill: "none",
        stroke: color,
        strokeWidth: theme.edge.width,
        ...(flow.style === "dashed" ? { dash: "8 6" } : flow.style === "dotted" ? { dash: "2 5" } : {}),
        lineCap: "round",
      });
      legend.push({
        type: "text",
        owner: { kind: "chrome", id: `legend:${flow.id}`, part: "label" },
        x: cursor + 36,
        y: baseline,
        lines: text.lines,
        lineHeight: text.lineHeight,
        fill: theme.canvas.muted,
        fontSize: 11,
        fontWeight: 500,
      });
      cursor += 64 + text.width;
    }
  }

  return {
    width,
    height,
    title: view.title,
    ...(view.description === undefined ? {} : { description: view.description }),
    background: theme.canvas.background,
    fontFamily: theme.font.family,
    attribution: [...new Set(view.nodes.flatMap((node) => {
      const resolved = assetReferences(node).map((reference) => assets.resolve(reference)).filter((asset) => asset !== undefined);
      const displayed = resolved.length ? resolved : [assets.resolve(node.kind)].filter((asset) => asset !== undefined);
      return displayed.length ? displayed.map((asset) => artworkLicenses[asset.collection] ?? `${asset.id}: ${asset.license}; source: ${asset.source}`) : ["TopoIR generic artwork: MIT"];
    }))].join("\n\n"),
    children: [
      { type: "rect", owner: { kind: "chrome", id: "canvas" }, x: 0, y: 0, width, height, fill: theme.canvas.background },
      {
        type: "text",
        owner: { kind: "chrome", id: "title" },
        x: MARGIN,
        y: MARGIN + titleSize,
        lines: title.lines,
        lineHeight: title.lineHeight,
        fill: theme.canvas.foreground,
        fontSize: titleSize,
        fontWeight: 700,
      },
      ...(subtitle === undefined ? [] : [{ type: "text" as const, owner: { kind: "chrome" as const, id: "subtitle" }, x: MARGIN, y: MARGIN + title.height + 23, lines: subtitle.lines, lineHeight: subtitle.lineHeight, fill: theme.canvas.muted, fontSize: 13 }]),
      ...(theme.language?.header === "rule" || theme.language?.header === "editorial" ? [{ type: "path" as const, owner: { kind: "chrome" as const, id: "header-rule" }, d: `M${MARGIN} ${offset.y - 14}H${width - MARGIN}`, stroke: theme.group.default.stroke, strokeWidth: 1 }] : []),
      { type: "group", id: "groups", children: groups },
      ...(view.design?.composition === "sequence" ? [{ type: "group" as const, id: "lifelines", children: geometry.nodes.map((node) => ({ type: "path" as const, owner: { kind: "occurrence" as const, id: node.id, part: "lifeline" }, d: `M${node.x + node.width / 2 + offset.x} ${node.y + node.height + offset.y}V${geometry.bounds.height + offset.y - 16}`, stroke: theme.group.default.stroke, strokeWidth: 1.2, dash: "5 6" })) }] : []),
      { type: "group", id: "edges", children: edgePaths },
      { type: "group", id: "nodes", children: nodes },
      { type: "group", id: "edge-labels", children: edgeLabels },
      { type: "group", id: "annotations", children: annotations },
      { type: "group", id: "legend", children: legend },
    ],
  };
}

function edgeColor(edge: MeasuredEdge, flowColors: ReadonlyMap<string, string>, theme: TopoIRTheme): string {
  if (edge.status === "failure") return "#E54864";
  if (edge.status === "success") return "#21A675";
  if (edge.status === "warning") return "#D99B21";
  if (edge.emphasis === "muted" || edge.emphasis === "secondary") return theme.canvas.muted;
  return (edge.flow === undefined ? undefined : flowColors.get(edge.flow)) ?? theme.edge.byKind[edge.kind] ?? theme.edge.stroke;
}

function arrowHead(from: Point, tip: Point, color: string, strokeWidth: number): ScenePath {
  const length = Math.hypot(tip.x - from.x, tip.y - from.y) || 1;
  const dx = (tip.x - from.x) / length, dy = (tip.y - from.y) / length;
  const size = Math.min(length, 7 + strokeWidth * 1.5), half = 3 + strokeWidth * 0.6;
  const bx = tip.x - dx * size, by = tip.y - dy * size;
  return { type: "path", className: "topoir-arrowhead", d: `M${number(tip.x)} ${number(tip.y)}L${number(bx - dy * half)} ${number(by + dx * half)}L${number(bx + dy * half)} ${number(by - dx *half)}Z`, fill: color };
}

function depth(id: string, groups: ReadonlyMap<string, { readonly parent?: string }>): number {
  let result = 0;
  let parent = groups.get(id)?.parent;
  while (parent !== undefined) {
    result += 1;
    parent = groups.get(parent)?.parent;
  }
  return result;
}

function roundedOrthogonalPath(points: readonly Point[], radius = 8): string {
  const first = points[0];
  if (first === undefined) return "";
  let result = `M${number(first.x)} ${number(first.y)}`;
  for (let index = 1; index < points.length; index += 1) {
    const current = points[index];
    if (current === undefined) continue;
    const next = points[index + 1];
    if (next === undefined) {
      result += `L${number(current.x)} ${number(current.y)}`;
      continue;
    }
    const previous = points[index - 1] ?? first;
    const incoming = Math.min(radius, distance(previous, current) / 2, distance(current, next) / 2);
    const before = moveToward(current, previous, incoming);
    const after = moveToward(current, next, incoming);
    result += `L${number(before.x)} ${number(before.y)}Q${number(current.x)} ${number(current.y)} ${number(after.x)} ${number(after.y)}`;
  }
  return result;
}

function distance(left: Point, right: Point): number {
  return Math.abs(left.x - right.x) + Math.abs(left.y - right.y);
}

function moveToward(from: Point, to: Point, amount: number): Point {
  const distanceToTarget = distance(from, to);
  if (distanceToTarget === 0) return from;
  return {
    x: from.x + ((to.x - from.x) / distanceToTarget) * amount,
    y: from.y + ((to.y - from.y) / distanceToTarget) * amount,
  };
}

function safeId(value: string): string {
  return value.replaceAll(/[^A-Za-z0-9_.-]/g, "-");
}

function number(value: number): string {
  return String(Math.round(value * 100) / 100);
}
