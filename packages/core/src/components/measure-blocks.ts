import type { Rect, Size } from "../ir.js";
import { resolveFontSet, selectFace, type ResolvedFontSet } from "../font-registry.js";
import type { TextMeasurer, TextStyle } from "../measure.js";
import { bundledFontTextMeasurer } from "../font-measurer.js";
import type {
  Alignment,
  AssetBlock,
  BadgeBlock,
  ColumnBlock,
  GridBlock,
  MeasuredBlock,
  RowBlock,
  RuleBlock,
  ShapedLine,
  ShapedText,
  SpacerBlock,
  StackBlock,
  TableBlock,
  TableCell,
  TableColumn,
  TableRow,
  TextBlock,
  VectorBlock,
} from "./blocks.js";

/**
 * The measured block engine (T07).
 *
 * Blocks are described declaratively and measured once. The renderer places what was
 * measured; it never re-wraps, re-derives a width or re-decides how many lines fit. That
 * is the property the review found missing — a badge measured at one width and drawn at
 * another, an asset strip sized for five and drawn with five while six were requested.
 *
 * Measurement is bottom-up: a block's size comes from its children, bounded by the width
 * its parent offers. Nothing here places a component on a canvas; that is layout's job.
 */

/** A block before measurement. Sizes and bounds are what measurement computes. */
export type BlockSpec =
  | { readonly type: "text"; readonly id: string; readonly contentId?: string; readonly text: string; readonly style: TextStyle; readonly maxLines?: number; readonly minWidth?: number }
  | { readonly type: "badge"; readonly id: string; readonly contentId?: string; readonly text: string; readonly style: TextStyle; readonly maxLines?: number }
  | { readonly type: "asset"; readonly id: string; readonly contentId?: string; readonly role: string; readonly intrinsic?: Size; readonly target: Size; readonly fit?: "contain" | "cover" | "fill"; readonly href?: string; readonly resolvedHash?: string }
  | { readonly type: "rule"; readonly id: string; readonly orientation: "horizontal" | "vertical"; readonly thickness?: number; readonly length?: number }
  | { readonly type: "spacer"; readonly id: string; readonly size: Size }
  | { readonly type: "row"; readonly id: string; readonly gap?: number; readonly align?: Alignment; readonly children: readonly BlockSpec[] }
  | { readonly type: "column"; readonly id: string; readonly gap?: number; readonly align?: Alignment; readonly children: readonly BlockSpec[] }
  | { readonly type: "grid"; readonly id: string; readonly columns: number; readonly gap?: number; readonly children: readonly BlockSpec[] }
  | { readonly type: "table"; readonly id: string; readonly columns: readonly { readonly id: string; readonly align?: Alignment }[]; readonly rows: readonly { readonly id: string; readonly group?: string; readonly cells: readonly { readonly columnId: string; readonly content: BlockSpec }[] }[]; readonly rowPadding?: number; readonly cellPadding?: number }
  | { readonly type: "stack"; readonly id: string; readonly depth?: number; readonly offset?: number; readonly children: readonly BlockSpec[] }
  | { readonly type: "vector"; readonly id: string; readonly shapeId: string; readonly size: Size; readonly parameters?: Readonly<Record<string, number>> };

export interface MeasureContext {
  readonly measurer: TextMeasurer;
  readonly fonts: ResolvedFontSet;
  /** Width the parent offers. A block may be narrower; it may not exceed this. */
  readonly availableWidth: number;
}

export function measureContext(options: Partial<MeasureContext> = {}): MeasureContext {
  const fonts = options.fonts ?? resolveFontSet(undefined);
  return {
    fonts,
    measurer: options.measurer ?? bundledFontTextMeasurer(fonts),
    availableWidth: options.availableWidth ?? Number.POSITIVE_INFINITY,
  };
}

const ZERO: Rect = { x: 0, y: 0, width: 0, height: 0 };

/** Measures a block tree. All bounds are local, with the block's own origin at (0, 0). */
export function measureBlock(spec: BlockSpec, context: MeasureContext): MeasuredBlock {
  switch (spec.type) {
    case "text":
      return measureTextBlock(spec, context);
    case "badge":
      return measureBadgeBlock(spec, context);
    case "asset":
      return measureAssetBlock(spec);
    case "rule":
      return measureRuleBlock(spec, context);
    case "spacer":
      return measureSpacerBlock(spec);
    case "row":
      return measureRowBlock(spec, context);
    case "column":
      return measureColumnBlock(spec, context);
    case "grid":
      return measureGridBlock(spec, context);
    case "table":
      return measureTableBlock(spec, context);
    case "stack":
      return measureStackBlock(spec, context);
    case "vector":
      return measureVectorBlock(spec);
  }
}

/* ------------------------------------------------------------------ leaves */

function shape(text: string, style: TextStyle, maxWidth: number, maxLines: number, context: MeasureContext): ShapedText {
  const face = selectFace(context.fonts, style.fontWeight ?? 400);
  const lineHeight = round(style.fontSize * style.lineHeight);
  const unitScale = face === undefined ? 1 : style.fontSize / face.unitsPerEm;
  const ascent = face === undefined ? style.fontSize * 0.8 : round(face.ascent * unitScale);
  const descent = face === undefined ? style.fontSize * 0.2 : round(Math.abs(face.descent) * unitScale);

  const pieces = splitIntoPieces(text, style, maxWidth, context.measurer);
  const raw: { text: string; continuesPrevious: boolean }[] = [];
  let current = "";
  let currentContinues = false;
  for (const piece of pieces) {
    if (piece.hardBreak) {
      raw.push({ text: current, continuesPrevious: currentContinues });
      current = "";
      currentContinues = false;
      continue;
    }
    const separator = piece.continues ? "" : current === "" ? "" : " ";
    const candidate = `${current}${separator}${piece.text}`;
    if (current !== "" && context.measurer.measure(candidate, style).width > maxWidth) {
      raw.push({ text: current, continuesPrevious: currentContinues });
      current = piece.text;
      currentContinues = piece.continues;
    } else {
      current = candidate;
    }
  }
  if (current !== "") raw.push({ text: current, continuesPrevious: currentContinues });

  const visible = raw.slice(0, maxLines);
  const truncated = raw.length > maxLines && visible.length > 0;
  const lines: ShapedLine[] = visible.map((line, index) => {
    const content = truncated && index === visible.length - 1 ? ellipsize(line.text, maxWidth, style, context.measurer) : line.text;
    const advance = context.measurer.measure(content, style).width;
    return {
      text: content,
      x: 0,
      baseline: round(index * lineHeight + ascent),
      advance: round(advance),
      inkBounds: { x: 0, y: round(index * lineHeight), width: round(advance), height: round(ascent + descent) },
      continuesPrevious: line.continuesPrevious,
    };
  });

  return {
    source: text,
    lines,
    fontFamily: context.fonts.family,
    ...(face?.sha256 === undefined ? {} : { fontHash: face.sha256 }),
    fontSize: style.fontSize,
    fontWeight: style.fontWeight ?? 400,
    lineHeight,
    ascent,
    descent,
    direction: "ltr",
  };
}

interface Piece {
  readonly text: string;
  /** Split out of the middle of a word, so rejoining must not insert a space. */
  readonly continues: boolean;
  readonly hardBreak?: boolean;
}

function splitIntoPieces(text: string, style: TextStyle, maxWidth: number, measurer: TextMeasurer): readonly Piece[] {
  const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
  const pieces: Piece[] = [];
  const sourceLines = text.split(/\r?\n/u);
  for (const [index, sourceLine] of sourceLines.entries()) {
    if (index > 0) pieces.push({ text: "", continues: false, hardBreak: true });
    for (const word of sourceLine.trim().split(/\s+/u).filter(Boolean)) {
      if (measurer.measure(word, style).width <= maxWidth) {
        pieces.push({ text: word, continues: false });
        continue;
      }
      let chunk = "";
      let emitted = 0;
      for (const { segment } of segmenter.segment(word)) {
        if (chunk !== "" && measurer.measure(chunk + segment, style).width > maxWidth) {
          pieces.push({ text: chunk, continues: emitted > 0 });
          emitted += 1;
          chunk = "";
        }
        chunk += segment;
      }
      if (chunk !== "") pieces.push({ text: chunk, continues: emitted > 0 });
    }
  }
  return pieces;
}

function ellipsize(text: string, maxWidth: number, style: TextStyle, measurer: TextMeasurer): string {
  const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
  let graphemes = [...segmenter.segment(text)].map((entry) => entry.segment);
  // Trim on grapheme boundaries, never code units: cutting a surrogate pair in half emits
  // a replacement character where the author wrote a real one.
  while (graphemes.length > 0 && measurer.measure(`${graphemes.join("")}…`, style).width > maxWidth) {
    graphemes = graphemes.slice(0, -1);
    while (graphemes.length > 0 && /\s/u.test(graphemes[graphemes.length - 1] ?? "")) graphemes = graphemes.slice(0, -1);
  }
  return `${graphemes.join("")}…`;
}

/** Visible extent of a shaped run: the widest line, and the full stack of line boxes. */
export function shapedSize(text: ShapedText): Size {
  return {
    width: round(Math.max(0, ...text.lines.map((line) => line.advance))),
    height: round(text.lines.length * text.lineHeight),
  };
}

/** Painted extent of a shaped run, which overhangs the line boxes by the descent. */
function shapedInk(text: ShapedText): Rect {
  if (text.lines.length === 0) return ZERO;
  const width = Math.max(0, ...text.lines.map((line) => line.inkBounds.width));
  const last = text.lines[text.lines.length - 1];
  return {
    x: 0,
    y: 0,
    width: round(width),
    height: round((last?.inkBounds.y ?? 0) + (last?.inkBounds.height ?? 0)),
  };
}

function measureTextBlock(
  spec: Extract<BlockSpec, { type: "text" }>,
  context: MeasureContext,
): TextBlock {
  const width = Math.min(context.availableWidth, unconstrainedWidth(spec.text, spec.style, context));
  const text = shape(spec.text, spec.style, width, spec.maxLines ?? 2, context);
  const size = shapedSize(text);
  return {
    type: "text",
    id: spec.id,
    ...(spec.contentId === undefined ? {} : { contentId: spec.contentId }),
    sizing: {
      min: { width: spec.minWidth ?? Math.min(size.width, 40), height: size.height },
      preferred: size,
    },
    bounds: { x: 0, y: 0, ...size },
    inkBounds: shapedInk(text),
    text,
  };
}

/** Width a run would take with no wrapping, so a block never asks for more than it needs. */
function unconstrainedWidth(text: string, style: TextStyle, context: MeasureContext): number {
  return Math.max(0, ...text.split(/\r?\n/u).map((line) => context.measurer.measure(line.trim(), style).width));
}

function measureBadgeBlock(spec: Extract<BlockSpec, { type: "badge" }>, context: MeasureContext): BadgeBlock {
  const width = Math.min(context.availableWidth, unconstrainedWidth(spec.text, spec.style, context));
  const text = shape(spec.text, spec.style, width, spec.maxLines ?? 3, context);
  const size = shapedSize(text);
  return {
    type: "badge",
    id: spec.id,
    ...(spec.contentId === undefined ? {} : { contentId: spec.contentId }),
    sizing: { min: size, preferred: size },
    bounds: { x: 0, y: 0, ...size },
    inkBounds: shapedInk(text),
    text,
  };
}

function measureAssetBlock(spec: Extract<BlockSpec, { type: "asset" }>): AssetBlock {
  const intrinsic = spec.intrinsic ?? spec.target;
  const fit = spec.fit ?? "contain";
  const size =
    fit === "fill"
      ? spec.target
      : scaleToFit(intrinsic, spec.target, fit);
  return {
    type: "asset",
    id: spec.id,
    ...(spec.contentId === undefined ? {} : { contentId: spec.contentId }),
    sizing: { min: size, preferred: size },
    bounds: { x: 0, y: 0, ...size },
    inkBounds: { x: 0, y: 0, ...size },
    role: spec.role,
    ...(spec.resolvedHash === undefined ? {} : { resolvedHash: spec.resolvedHash }),
    intrinsic,
    fit,
    ...(spec.href === undefined ? {} : { href: spec.href }),
  };
}

function scaleToFit(intrinsic: Size, target: Size, fit: "contain" | "cover"): Size {
  const byWidth = target.width / Math.max(1, intrinsic.width);
  const byHeight = target.height / Math.max(1, intrinsic.height);
  const scale = fit === "contain" ? Math.min(byWidth, byHeight) : Math.max(byWidth, byHeight);
  return { width: round(intrinsic.width * scale), height: round(intrinsic.height * scale) };
}

function measureRuleBlock(spec: Extract<BlockSpec, { type: "rule" }>, context: MeasureContext): RuleBlock {
  const thickness = spec.thickness ?? 1;
  const length = spec.length ?? (Number.isFinite(context.availableWidth) ? context.availableWidth : 100);
  const size: Size =
    spec.orientation === "horizontal" ? { width: length, height: thickness } : { width: thickness, height: length };
  return {
    type: "rule",
    id: spec.id,
    sizing: { min: spec.orientation === "horizontal" ? { width: 0, height: thickness } : { width: thickness, height: 0 }, preferred: size },
    bounds: { x: 0, y: 0, ...size },
    inkBounds: { x: 0, y: 0, ...size },
    orientation: spec.orientation,
    thickness,
  };
}

function measureSpacerBlock(spec: Extract<BlockSpec, { type: "spacer" }>): SpacerBlock {
  return {
    type: "spacer",
    id: spec.id,
    sizing: { min: { width: 0, height: 0 }, preferred: spec.size },
    bounds: { x: 0, y: 0, ...spec.size },
    // A spacer paints nothing, so its ink is empty however much space it reserves.
    inkBounds: ZERO,
  };
}

function measureVectorBlock(spec: Extract<BlockSpec, { type: "vector" }>): VectorBlock {
  return {
    type: "vector",
    id: spec.id,
    sizing: { min: spec.size, preferred: spec.size },
    bounds: { x: 0, y: 0, ...spec.size },
    inkBounds: { x: 0, y: 0, ...spec.size },
    shapeId: spec.shapeId,
    ...(spec.parameters === undefined ? {} : { parameters: spec.parameters }),
  };
}

/* ------------------------------------------------------------- containers */

function offsetBlock(block: MeasuredBlock, dx: number, dy: number): MeasuredBlock {
  const move = (rect: Rect): Rect => ({ ...rect, x: round(rect.x + dx), y: round(rect.y + dy) });
  const base = { ...block, bounds: move(block.bounds), inkBounds: move(block.inkBounds) };
  switch (block.type) {
    case "row":
    case "column":
    case "grid":
    case "stack":
      return { ...base, children: block.children.map((child) => offsetBlock(child, dx, dy)) } as MeasuredBlock;
    case "table":
      return {
        ...base,
        rows: block.rows.map((row) => ({
          ...row,
          bounds: move(row.bounds),
          cells: row.cells.map((cell) => ({ ...cell, bounds: move(cell.bounds), content: offsetBlock(cell.content, dx, dy) })),
        })),
      } as MeasuredBlock;
    default:
      return base as MeasuredBlock;
  }
}

/** Union of every child's ink, so a container's ink is what it actually paints. */
function unionInk(children: readonly MeasuredBlock[], fallback: Rect): Rect {
  const painted = children.map((child) => child.inkBounds).filter((rect) => rect.width > 0 && rect.height > 0);
  if (painted.length === 0) return fallback;
  const left = Math.min(...painted.map((rect) => rect.x));
  const top = Math.min(...painted.map((rect) => rect.y));
  const right = Math.max(...painted.map((rect) => rect.x + rect.width));
  const bottom = Math.max(...painted.map((rect) => rect.y + rect.height));
  return { x: round(left), y: round(top), width: round(right - left), height: round(bottom - top) };
}

function alignOffset(align: Alignment, available: number, own: number): number {
  if (align === "center") return round((available - own) / 2);
  if (align === "end") return round(available - own);
  return 0;
}

function measureRowBlock(spec: Extract<BlockSpec, { type: "row" }>, context: MeasureContext): RowBlock {
  const gap = spec.gap ?? 0;
  const align = spec.align ?? "start";
  // Each child is offered what remains after the gaps, so a row cannot promise its
  // children more space than it has.
  const budget = Number.isFinite(context.availableWidth)
    ? Math.max(0, (context.availableWidth - gap * Math.max(0, spec.children.length - 1)) / Math.max(1, spec.children.length))
    : Number.POSITIVE_INFINITY;
  const measured = spec.children.map((child) => measureBlock(child, { ...context, availableWidth: budget }));
  const height = Math.max(0, ...measured.map((child) => child.bounds.height));
  let x = 0;
  const placed = measured.map((child) => {
    const dy = alignOffset(align === "stretch" ? "start" : align, height, child.bounds.height);
    const positioned = offsetBlock(child, x, dy);
    x += child.bounds.width + gap;
    return positioned;
  });
  const width = Math.max(0, x - (measured.length > 0 ? gap : 0));
  const size: Size = { width: round(width), height: round(height) };
  return {
    type: "row",
    id: spec.id,
    sizing: {
      min: { width: round(Math.max(0, ...measured.map((child) => child.sizing.min.width))), height: size.height },
      preferred: size,
    },
    bounds: { x: 0, y: 0, ...size },
    inkBounds: unionInk(placed, { x: 0, y: 0, ...size }),
    gap,
    align,
    children: placed,
  };
}

function measureColumnBlock(spec: Extract<BlockSpec, { type: "column" }>, context: MeasureContext): ColumnBlock {
  const gap = spec.gap ?? 0;
  const align = spec.align ?? "start";
  const measured = spec.children.map((child) => measureBlock(child, context));
  const width = Math.max(0, ...measured.map((child) => child.bounds.width));
  let y = 0;
  const placed = measured.map((child) => {
    const dx = alignOffset(align === "stretch" ? "start" : align, width, child.bounds.width);
    const positioned = offsetBlock(child, dx, y);
    y += child.bounds.height + gap;
    return positioned;
  });
  const height = Math.max(0, y - (measured.length > 0 ? gap : 0));
  const size: Size = { width: round(width), height: round(height) };
  return {
    type: "column",
    id: spec.id,
    sizing: {
      min: { width: round(Math.max(0, ...measured.map((child) => child.sizing.min.width))), height: size.height },
      preferred: size,
    },
    bounds: { x: 0, y: 0, ...size },
    inkBounds: unionInk(placed, { x: 0, y: 0, ...size }),
    gap,
    align,
    children: placed,
  };
}

function measureGridBlock(spec: Extract<BlockSpec, { type: "grid" }>, context: MeasureContext): GridBlock {
  const gap = spec.gap ?? 0;
  const columns = Math.max(1, spec.columns);
  const budget = Number.isFinite(context.availableWidth)
    ? Math.max(0, (context.availableWidth - gap * (columns - 1)) / columns)
    : Number.POSITIVE_INFINITY;
  const measured = spec.children.map((child) => measureBlock(child, { ...context, availableWidth: budget }));
  const columnWidths = Array.from({ length: columns }, (_unused, column) =>
    Math.max(0, ...measured.filter((_child, index) => index % columns === column).map((child) => child.bounds.width)),
  );
  const rowCount = Math.ceil(measured.length / columns);
  const rowHeights = Array.from({ length: rowCount }, (_unused, row) =>
    Math.max(0, ...measured.slice(row * columns, row * columns + columns).map((child) => child.bounds.height)),
  );
  const placed = measured.map((child, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const dx = columnWidths.slice(0, column).reduce((sum, value) => sum + value + gap, 0);
    const dy = rowHeights.slice(0, row).reduce((sum, value) => sum + value + gap, 0);
    return offsetBlock(child, dx, dy);
  });
  const size: Size = {
    width: round(columnWidths.reduce((sum, value) => sum + value, 0) + gap * (columns - 1)),
    height: round(rowHeights.reduce((sum, value) => sum + value, 0) + gap * Math.max(0, rowCount - 1)),
  };
  return {
    type: "grid",
    id: spec.id,
    sizing: { min: size, preferred: size },
    bounds: { x: 0, y: 0, ...size },
    inkBounds: unionInk(placed, { x: 0, y: 0, ...size }),
    columns,
    gap,
    children: placed,
  };
}

function measureStackBlock(spec: Extract<BlockSpec, { type: "stack" }>, context: MeasureContext): StackBlock {
  const depth = spec.depth ?? 1;
  const offset = spec.offset ?? 6;
  const measured = spec.children.map((child) => measureBlock(child, context));
  const width = Math.max(0, ...measured.map((child) => child.bounds.width));
  const height = Math.max(0, ...measured.map((child) => child.bounds.height));
  const size: Size = { width: round(width), height: round(height) };
  // Sheets are drawn behind and offset, so the painted extent is larger than the layout
  // box in both axes. Reserving only the front sheet is how stacked components came to
  // overlap their neighbours.
  const spread = round(offset * Math.max(0, depth - 1));
  return {
    type: "stack",
    id: spec.id,
    sizing: { min: size, preferred: size },
    bounds: { x: 0, y: 0, ...size },
    inkBounds: { x: 0, y: 0, width: round(size.width + spread), height: round(size.height + spread) },
    depth,
    offset,
    children: measured,
  };
}

function measureTableBlock(spec: Extract<BlockSpec, { type: "table" }>, context: MeasureContext): TableBlock {
  const rowPadding = spec.rowPadding ?? 6;
  const cellPadding = spec.cellPadding ?? 8;
  const columnCount = Math.max(1, spec.columns.length);
  const budget = Number.isFinite(context.availableWidth)
    ? Math.max(0, context.availableWidth / columnCount - cellPadding * 2)
    : Number.POSITIVE_INFINITY;

  // Measure every cell first: a column is as wide as its widest cell.
  const measuredCells = spec.rows.map((row) =>
    spec.columns.map((column) => {
      const cell = row.cells.find((entry) => entry.columnId === column.id);
      return cell === undefined ? undefined : measureBlock(cell.content, { ...context, availableWidth: budget });
    }),
  );
  const columnWidths = spec.columns.map((_column, index) =>
    round(Math.max(0, ...measuredCells.map((row) => row[index]?.bounds.width ?? 0)) + cellPadding * 2),
  );
  const columns: TableColumn[] = spec.columns.map((column, index) => ({
    id: column.id,
    align: column.align ?? "start",
    width: columnWidths[index] ?? 0,
  }));

  let y = 0;
  const rows: TableRow[] = spec.rows.map((row, rowIndex) => {
    const heights = measuredCells[rowIndex]?.map((cell) => cell?.bounds.height ?? 0) ?? [];
    const rowHeight = round(Math.max(0, ...heights) + rowPadding * 2);
    let x = 0;
    const cells: TableCell[] = columns.map((column, columnIndex) => {
      const content = measuredCells[rowIndex]?.[columnIndex];
      const cellBounds: Rect = { x: round(x), y: round(y), width: column.width, height: rowHeight };
      const inner = content === undefined ? undefined : offsetBlock(content, x + cellPadding, y + rowPadding);
      x += column.width;
      return {
        columnId: column.id,
        bounds: cellBounds,
        content:
          inner ??
          ({
            type: "spacer",
            id: `${row.id}-${column.id}-empty`,
            sizing: { min: { width: 0, height: 0 }, preferred: { width: 0, height: 0 } },
            bounds: { x: cellBounds.x, y: cellBounds.y, width: 0, height: 0 },
            inkBounds: ZERO,
          } satisfies SpacerBlock),
      };
    });
    const bounds: Rect = { x: 0, y: round(y), width: round(x), height: rowHeight };
    y += rowHeight;
    return { id: row.id, bounds, cells, ...(row.group === undefined ? {} : { group: row.group }) };
  });

  const size: Size = {
    width: round(columnWidths.reduce((sum, value) => sum + value, 0)),
    height: round(y),
  };
  return {
    type: "table",
    id: spec.id,
    sizing: { min: size, preferred: size },
    bounds: { x: 0, y: 0, ...size },
    inkBounds: { x: 0, y: 0, ...size },
    columns,
    rows,
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
