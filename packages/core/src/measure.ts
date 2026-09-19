import type {
  MeasuredAnnotation,
  MeasuredAssetRole,
  MeasuredEdge,
  MeasuredGroup,
  MeasuredNode,
  MeasuredText,
  MeasuredView,
  Size,
  ViewGraph,
} from "./ir.js";
import { assetReferences, nodeShape, type TopoIRTheme } from "./theme.js";
import { bundledFontTextMeasurer } from "./font-measurer.js";

export interface TextStyle {
  readonly fontSize: number;
  readonly fontWeight?: 400 | 500 | 600 | 700;
  readonly lineHeight: number;
}

/**
 * The badge strip's text style. The renderer draws badges at exactly these values, so
 * measurement and drawing cannot disagree about how wide a badge is.
 */
export const BADGE_STYLE: TextStyle = { fontSize: 10, fontWeight: 600, lineHeight: 1.2 };

/**
 * How wide a badge may grow before it wraps. The schema caps a badge at 48 characters,
 * which measures about 530px in the worst case; letting the node grow that wide to hold
 * one strip distorts every layout around it. Wrapping past this width keeps the whole
 * badge visible while bounding the component.
 */
export const BADGE_MAX_WIDTH = 260;

/** Lines a badge may wrap to before `layoutText` declares it abbreviated. */
export const BADGE_MAX_LINES = 3;

export interface TextMeasurer {
  readonly id: string;
  measure(text: string, style: TextStyle): Size;
}

/**
 * A platform-independent metric model used until a caller injects exact bundled-font
 * metrics. It never touches canvas or system fonts, so layout remains byte-stable.
 */
export class DeterministicTextMeasurer implements TextMeasurer {
  public readonly id = "topoir-fixed-metrics-v1";

  public measure(text: string, style: TextStyle): Size {
    let em = 0;
    for (const character of text.normalize("NFC")) em += characterWidth(character);
    const weightFactor = (style.fontWeight ?? 400) >= 600 ? 1.035 : 1;
    return {
      width: round(em * style.fontSize * weightFactor),
      height: round(style.fontSize * style.lineHeight),
    };
  }
}

export function measureView(
  view: ViewGraph,
  theme: TopoIRTheme,
  textMeasurer: TextMeasurer = bundledFontTextMeasurer(),
  assetSize?: (reference: string) => Size | undefined,
): MeasuredView {
  const labelStyle: TextStyle = {
    fontSize: theme.font.labelSize,
    fontWeight: 600,
    lineHeight: theme.font.lineHeight,
  };
  const descriptionStyle: TextStyle = {
    fontSize: theme.font.descriptionSize,
    fontWeight: 400,
    lineHeight: theme.font.lineHeight,
  };

  // A component carrying many relationships needs room for them to attach separately.
  // Without this, a hub's connectors are spread across a card only tall enough for its
  // label, land a pixel or two apart, and are drawn as one thick line.
  const connectorSpacing = 12;
  const incident = new Map<string, number>();
  for (const edge of view.edges) {
    incident.set(edge.from, (incident.get(edge.from) ?? 0) + 1);
    incident.set(edge.to, (incident.get(edge.to) ?? 0) + 1);
  }

  const nodes: MeasuredNode[] = view.nodes.map((node) => {
    const labelText = layoutText(node.label, theme.node.maxTextWidth, labelStyle, textMeasurer);
    const descriptionText =
      node.description === undefined
        ? undefined
        : layoutText(node.description, theme.node.maxTextWidth, descriptionStyle, textMeasurer, 3);
    const textWidth = Math.max(labelText.width, descriptionText?.width ?? 0);
    const textHeight = labelText.height + (descriptionText === undefined ? 0 : 6 + descriptionText.height);
    const iconSpace = theme.node.iconSize + 12;
    const shape = nodeShape(node, theme);
    const references = assetReferences(node);
    // One role per authored reference, kept in authored order. A role that did not resolve
    // keeps its slot so the count of requested roles stays visible to everything downstream;
    // the SDK reports it as TOP322_ASSET_NOT_FOUND.
    const assetRoles: MeasuredAssetRole[] = references.map((reference) => {
      const size = assetSize?.(reference);
      return size === undefined ? { reference } : { reference, size };
    });
    const assetSizes = assetRoles.map((role) => role.size).filter((value): value is Size => value !== undefined);
    const intrinsic = shape === "image" ? assetSizes[0] : undefined;
    const imageScale = intrinsic ? Math.min(240 / intrinsic.width, 140 / intrinsic.height) : 1;
    const imageSize = intrinsic ? { width: round(intrinsic.width * imageScale), height: round(intrinsic.height * imageScale) } : undefined;
    const vertical = shape === "icon" || shape === "image";
    // The badge is measured like any other content. Previously only its 24px strip height
    // was reserved and its width was ignored, so a schema-valid 48-character badge was
    // drawn 3.5x wider than the node and ran off the canvas without a diagnostic.
    const badgeSource = node.visual?.badge ?? (node.visual?.replicas === undefined ? undefined : `${node.visual.replicas} replicas`);
    const badgeText =
      badgeSource === undefined
        ? undefined
        : layoutText(badgeSource, BADGE_MAX_WIDTH, BADGE_STYLE, textMeasurer, BADGE_MAX_LINES);
    const badgeHeight = badgeText === undefined ? 0 : round(badgeText.height + 12);
    const showPorts = node.visual?.portLabels === "inside" && node.ports.length > 0;
    const portRows = showPorts ? node.ports.map((port) => layoutText(port.label, 210, { fontSize: theme.font.descriptionSize, fontWeight: 600, lineHeight: 1.2 }, textMeasurer, 1)) : [];
    const portPanelHeight = portRows.length ? 12 + portRows.reduce((sum, row) => sum + Math.max(28, row.height + 12), 0) : 0;
    const portPanelWidth = Math.max(0, ...portRows.map((row) => row.width + 36));
    // Every requested role occupies a slot, including ones that share image bytes with
    // another role. The previous `Math.min(5, ...)` cap silently disagreed with the
    // schema's maximum of six.
    const assetStripWidth = assetRoles.length > 1 ? assetRoles.length * (theme.node.iconSize + 8) : 0;
    const shapePadding = shape === "cylinder" || shape === "diamond" ? 28 : shape === "stack" ? 8 : 0;
    const badgeWidth = badgeText === undefined ? 0 : round(badgeText.width + 24);
    const width = round(Math.max(theme.node.minWidth, badgeWidth, (imageSize?.width ?? 0) + 32, portPanelWidth + theme.spacing.nodePaddingX * 2, assetStripWidth + theme.spacing.nodePaddingX * 2, textWidth + (vertical ? 0 : Math.max(iconSpace, assetStripWidth)) + theme.spacing.nodePaddingX * 2 + shapePadding));
    // Half the relationships can be expected on each of the two facing sides.
    const connectorHeight = Math.min(360, Math.ceil((incident.get(node.id) ?? 0) / 2) * connectorSpacing);
    const height = round(Math.max(theme.node.minHeight, connectorHeight, textHeight + theme.spacing.nodePaddingY * 2 + (vertical ? (imageSize?.height ?? theme.node.iconSize) + 12 : 0) + shapePadding + badgeHeight + portPanelHeight));
    // One measured compartment stack: layout pins each port to its slot and the renderer
    // draws the same rectangle, so a visible route table always matches where routes attach.
    let slotY = height - badgeHeight - portPanelHeight + 8;
    const slots = portRows.map((row) => {
      const slotHeight = Math.max(28, row.height + 12);
      const slot = { x: 14, y: round(slotY), width: round(width - 28), height: round(slotHeight) };
      slotY += slotHeight;
      return slot;
    });
    return {
      ...node,
      width,
      height,
      labelText,
      ...(imageSize ? { imageSize } : {}),
      ...(assetSizes.length ? { assetSizes } : {}),
      ...(assetRoles.length ? { assetRoles } : {}),
      ...(badgeText === undefined ? {} : { badgeText }),
      ...(descriptionText === undefined ? {} : { descriptionText }),
      ports: node.ports.map((port, index) => ({
        ...port,
        owner: node.id,
        ...(portRows[index] ? { labelText: portRows[index] } : {}),
        ...(slots[index] ? { slot: slots[index] } : {}),
      })),
    };
  });

  const groupStyle: TextStyle = {
    fontSize: theme.font.groupTitleSize,
    fontWeight: 600,
    lineHeight: theme.font.lineHeight,
  };
  const groups: MeasuredGroup[] = view.groups.map((group) => ({
    ...group,
    titleHeight: theme.spacing.groupTitleHeight,
    padding: {
      top: theme.spacing.groupTitleHeight + theme.spacing.groupPadding,
      right: theme.spacing.groupPadding,
      bottom: theme.spacing.groupPadding,
      left: theme.spacing.groupPadding,
    },
    labelText: layoutText(group.label, 280, groupStyle, textMeasurer, 2),
  }));

  const edgeStyle: TextStyle = {
    fontSize: theme.font.edgeLabelSize,
    fontWeight: 500,
    lineHeight: theme.font.lineHeight,
  };
  const edges: MeasuredEdge[] = view.edges.map((edge) => {
    const text = edge.label ?? edge.protocol;
    return {
      ...edge,
      ...(text === undefined ? {} : { labelText: layoutText(text, 180, edgeStyle, textMeasurer, 2) }),
    };
  });

  const annotationStyle: TextStyle = {
    fontSize: theme.font.descriptionSize,
    fontWeight: 400,
    lineHeight: theme.font.lineHeight,
  };
  const annotations: MeasuredAnnotation[] = view.annotations.map((annotation) => {
    const textLayout = layoutText(annotation.text, 220, { ...annotationStyle, fontWeight: annotation.kind === "warning" ? 600 : 400 }, textMeasurer, 8);
    return {
      ...annotation,
      textLayout,
      width: round(Math.max(120, textLayout.width + 28)),
      height: round(textLayout.height + 24),
    };
  });

  return { ...view, groups, nodes, edges, annotations };
}

/**
 * A piece of a source line to place. `continues` marks a fragment that was split out of
 * the middle of a single word: it must never be rejoined to its predecessor with a space,
 * because that would silently rewrite an identifier, a URL or an ARN into something the
 * author never wrote. Tracking it here keeps that guarantee structural instead of relying
 * on a chunk happening to be too wide to share a line.
 */
interface Piece {
  readonly text: string;
  readonly continues: boolean;
}

export function layoutText(
  text: string,
  maxWidth: number,
  style: TextStyle,
  measurer: TextMeasurer,
  maxLines = 2,
): MeasuredText {
  const sourceLines = text.split(/\r?\n/u);
  const lines: string[] = [];
  for (const sourceLine of sourceLines) {
    const words = sourceLine.trim().split(/\s+/u).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let current = "";
    const pieces = words.flatMap((word): Piece[] => {
      if (measurer.measure(word, style).width <= maxWidth) return [{ text: word, continues: false }];
      const chunks: Piece[] = [];
      let chunk = "";
      for (const { segment } of new Intl.Segmenter("en", { granularity: "grapheme" }).segment(word)) {
        if (chunk && measurer.measure(chunk + segment, style).width > maxWidth) {
          chunks.push({ text: chunk, continues: chunks.length > 0 });
          chunk = "";
        }
        chunk += segment;
      }
      if (chunk) chunks.push({ text: chunk, continues: chunks.length > 0 });
      return chunks;
    });
    for (const piece of pieces) {
      const separator = piece.continues ? "" : " ";
      const candidate = current === "" ? piece.text : `${current}${separator}${piece.text}`;
      if (current !== "" && measurer.measure(candidate, style).width > maxWidth) {
        lines.push(current);
        current = piece.text;
      } else {
        current = candidate;
      }
    }
    if (current !== "") lines.push(current);
  }

  let visible = lines.slice(0, maxLines);
  let abbreviated = false;
  if (lines.length > maxLines && visible.length > 0) {
    const last = visible[visible.length - 1] ?? "";
    visible = [...visible.slice(0, -1), ellipsize(last, maxWidth, style, measurer)];
    abbreviated = true;
  }
  const sizes = visible.map((line) => measurer.measure(line, style));
  const lineHeight = round(style.fontSize * style.lineHeight);
  const omitted = abbreviated ? omittedGraphemeCount(text, visible) : 0;
  return {
    lines: visible,
    width: round(Math.min(maxWidth, Math.max(0, ...sizes.map((size) => size.width)))),
    height: round(visible.length * lineHeight),
    lineHeight,
    source: text,
    disposition: abbreviated ? "abbreviated" : "rendered",
    ...(abbreviated ? { omittedGraphemes: omitted } : {}),
  };
}

/**
 * Graphemes of the authored text that no visible line carries. Counting graphemes rather
 * than UTF-16 units keeps the number meaningful for scripts where one visible character
 * is several code units.
 */
function omittedGraphemeCount(source: string, visible: readonly string[]): number {
  const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
  const count = (value: string): number => [...segmenter.segment(value.replace(/\s+/gu, ""))].length;
  const drawn = visible.map((line) => line.replace(/…$/u, "")).join("");
  return Math.max(0, count(source) - count(drawn));
}

function ellipsize(text: string, maxWidth: number, style: TextStyle, measurer: TextMeasurer): string {
  let candidate = `${text}…`;
  while (candidate.length > 1 && measurer.measure(candidate, style).width > maxWidth) {
    candidate = `${candidate.slice(0, -2).trimEnd()}…`;
  }
  return candidate;
}

function characterWidth(character: string): number {
  if (/\s/u.test(character)) return 0.28;
  if (/[ilI1|!.,'`:;]/u.test(character)) return 0.27;
  if (/[mwMW@#%&]/u.test(character)) return 0.86;
  if (/[A-Z0-9]/u.test(character)) return 0.62;
  if (/[-+_=~<>()[\]{}\\/]/u.test(character)) return 0.48;
  const point = character.codePointAt(0) ?? 0;
  if (point > 0x2e7f) return 1;
  return 0.53;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
