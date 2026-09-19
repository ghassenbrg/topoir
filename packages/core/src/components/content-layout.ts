import type { MeasuredNode, Point, Rect, Size } from "../ir.js";
import { nodeShape, type TopoIRTheme } from "../theme.js";

/**
 * Where a component's content sits inside it.
 *
 * This arithmetic used to live only in `nodeComponent`, which meant the drawing was the
 * sole description of where anything was: a plan could say a component *has* a label, but
 * not where the label is, and a quality check could not ask whether the label fits inside
 * the card without re-deriving the whole layout.
 *
 * Computed once here, in the component's **local** coordinate space with the origin at its
 * top-left. `planForNode` turns it into measured blocks; the renderer places marks at the
 * same coordinates offset by the component's position. Neither re-derives it.
 */

export interface ComponentContentLayout {
  /** Icon-style components stack content vertically and centre their text. */
  readonly vertical: boolean;
  /** Height reserved for the badge strip, including its padding. Zero when there is none. */
  readonly badgeHeight: number;
  /** Height reserved for visible route compartments. Zero when they are not shown. */
  readonly portPanelHeight: number;
  /** The box one asset is drawn into. */
  readonly iconBox: Size;
  /** Top-left of the first asset, local. */
  readonly iconOrigin: Point;
  /** Width of each asset when several share a strip. */
  readonly assetIconWidth: number;
  /** Left edge of the asset strip, local. */
  readonly stripX: number;
  readonly assetGap: number;
  /** Top of the text block, local. */
  readonly textTop: number;
  /** Text origin x, local. For a vertical component this is the centre. */
  readonly textX: number;
  readonly labelBaseline: number;
  readonly descriptionBaseline?: number;
  /** The badge strip rectangle, local. */
  readonly badgeStrip?: Rect;
  readonly badgeBaseline?: number;
}

/**
 * @param assetCount how many assets will actually be drawn. It changes the strip width and
 * therefore where the text starts, so it cannot be derived from the node alone — an
 * unresolved role occupies a slot in measurement but draws nothing.
 */
export function contentLayout(node: MeasuredNode, theme: TopoIRTheme, assetCount: number): ComponentContentLayout {
  const shape = nodeShape(node, theme);
  const w = node.width;
  const h = node.height;
  const size = theme.node.iconSize;
  const vertical = shape === "icon" || shape === "image";

  const badge = node.badgeText;
  const badgeHeight = badge ? badge.height + 12 : 0;
  const showPorts = node.visual?.portLabels === "inside" && node.ports.length > 0;
  const portPanelHeight = showPorts
    ? 12 + node.ports.reduce((sum, port) => sum + Math.max(28, (port.labelText?.height ?? 0) + 12), 0)
    : 0;

  const iconBoxWidth = node.imageSize?.width ?? (shape === "image" ? w - 32 : size);
  const iconBoxHeight =
    node.imageSize?.height ??
    (shape === "image"
      ? Math.max(size, h - node.labelText.height - (node.descriptionText?.height ?? 0) - 48 - badgeHeight)
      : size);
  const iconX = vertical ? (w - iconBoxWidth) / 2 : theme.spacing.nodePaddingX + (shape === "diamond" ? 14 : 0);
  const iconY = vertical ? 14 : (h - badgeHeight - portPanelHeight - size) / 2 + (shape === "cylinder" ? 6 : 0);

  const assetIconWidth = assetCount > 1 ? size : iconBoxWidth;
  const assetStrip = assetCount * assetIconWidth + Math.max(0, assetCount - 1) * 8;
  const stripX = vertical ? (w - assetStrip) / 2 : iconX;

  const totalTextHeight = node.labelText.height + (node.descriptionText === undefined ? 0 : 6 + node.descriptionText.height);
  const textTop = vertical
    ? iconY + iconBoxHeight + 12
    : (h - badgeHeight - portPanelHeight - totalTextHeight) / 2 + (shape === "cylinder" ? 6 : 0);
  const textX = vertical ? w / 2 : iconX + Math.max(size, assetCount * (size + 8) - 8) + 12;

  const badgeStripHeight = badge ? badge.height + 7 : 0;
  const badgeStripY = badge ? h - badgeStripHeight - 7 : 0;

  return {
    vertical,
    badgeHeight,
    portPanelHeight,
    iconBox: { width: iconBoxWidth, height: iconBoxHeight },
    iconOrigin: { x: iconX, y: iconY },
    assetIconWidth,
    stripX,
    assetGap: 8,
    textTop,
    textX,
    labelBaseline: textTop + theme.font.labelSize,
    ...(node.descriptionText === undefined
      ? {}
      : { descriptionBaseline: textTop + node.labelText.height + 6 + theme.font.descriptionSize }),
    ...(badge === undefined
      ? {}
      : {
          badgeStrip: { x: 12, y: badgeStripY, width: w - 24, height: badgeStripHeight },
          badgeBaseline: badgeStripY + badge.lineHeight + 2,
        }),
  };
}

/** Top-left of the nth asset in the strip, local. */
export function assetOrigin(layout: ComponentContentLayout, index: number): Point {
  return { x: layout.stripX + index * (layout.assetIconWidth + layout.assetGap), y: layout.iconOrigin.y };
}
