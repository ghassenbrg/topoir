import type { Rect, Size } from "../ir.js";

/**
 * The block grammar every visible part of a diagram is measured with.
 *
 * Today measurement and rendering each do their own dimension arithmetic, which is how a
 * badge came to be measured at one width and drawn at another. A block is measured once;
 * the renderer places what was measured and never re-wraps.
 *
 * These are the T05 interfaces. T07 implements the measurement engine behind them and T08
 * migrates the renderer onto it. Nothing here is wired into the compiler yet, and the
 * capability registry does not advertise it.
 */

/** Horizontal placement of a block inside the space its parent gives it. */
export type Alignment = "start" | "center" | "end" | "stretch";

export interface BlockSizing {
  /** Smallest size the block can legally take without losing required content. */
  readonly min: Size;
  /** The size it takes when nothing is constraining it. */
  readonly preferred: Size;
  /** The largest it may grow to during width negotiation, when bounded. */
  readonly max?: Size;
}

export interface BlockBase {
  readonly id: string;
  /** The authored content this block came from, for content accounting. */
  readonly contentId?: string;
  readonly sizing: BlockSizing;
  /** Position and size within the owning component's local coordinate space. */
  readonly bounds: Rect;
  /** Actual painted extent, including strokes and overhang. Never smaller than needed. */
  readonly inkBounds: Rect;
}

/**
 * A run of text that has already been shaped.
 *
 * `source` is the authored string, kept whatever happens to the visible lines, so content
 * accounting never has to reconstruct it. `disposition` states what became of it — the
 * rule from the components contract is that abbreviation is declared by measurement, never
 * inferred later from a missing primitive.
 */
export interface ShapedText {
  readonly source: string;
  readonly lines: readonly ShapedLine[];
  readonly fontFamily: string;
  /** Content hash of the resolved face, so layout and both exports can be proven equal. */
  readonly fontHash?: string;
  readonly fontSize: number;
  readonly fontWeight: number;
  readonly lineHeight: number;
  readonly ascent: number;
  readonly descent: number;
  readonly direction: "ltr" | "rtl";
  readonly language?: string;
}

export interface ShapedLine {
  readonly text: string;
  /** Baseline origin in the owning block's local space. */
  readonly x: number;
  readonly baseline: number;
  readonly advance: number;
  readonly inkBounds: Rect;
  /**
   * True when this line continues the previous one mid-word. A consumer joining lines back
   * together must not insert a space here, or an identifier, URL or ARN is silently
   * rewritten into something the author never wrote.
   */
  readonly continuesPrevious: boolean;
}

export interface TextBlock extends BlockBase {
  readonly type: "text";
  readonly text: ShapedText;
}

/**
 * A resolved image placed in a component.
 *
 * `role` is the authored reference, and it is the block's identity. Two roles that resolve
 * to the same image bytes are two blocks: deduplicating image bytes must never deduplicate
 * authored roles.
 */
export interface AssetBlock extends BlockBase {
  readonly type: "asset";
  readonly role: string;
  readonly resolvedHash?: string;
  readonly intrinsic: Size;
  readonly fit: "contain" | "cover" | "fill";
  /** Absent when the role did not resolve; the slot is kept so the loss stays visible. */
  readonly href?: string;
}

export interface BadgeBlock extends BlockBase {
  readonly type: "badge";
  readonly text: ShapedText;
}

export interface RuleBlock extends BlockBase {
  readonly type: "rule";
  readonly orientation: "horizontal" | "vertical";
  readonly thickness: number;
}

export interface SpacerBlock extends BlockBase {
  readonly type: "spacer";
}

export interface RowBlock extends BlockBase {
  readonly type: "row";
  readonly gap: number;
  readonly align: Alignment;
  readonly children: readonly MeasuredBlock[];
}

export interface ColumnBlock extends BlockBase {
  readonly type: "column";
  readonly gap: number;
  readonly align: Alignment;
  readonly children: readonly MeasuredBlock[];
}

export interface GridBlock extends BlockBase {
  readonly type: "grid";
  readonly columns: number;
  readonly gap: number;
  readonly children: readonly MeasuredBlock[];
}

/**
 * A table of named cells.
 *
 * This is the block a gateway route compartment and an ER attribute list share. A cell is
 * addressable, so a route endpoint or a field connection can attach to one row rather than
 * to the component as a whole.
 */
export interface TableBlock extends BlockBase {
  readonly type: "table";
  readonly columns: readonly TableColumn[];
  readonly rows: readonly TableRow[];
}

export interface TableColumn {
  readonly id: string;
  readonly align: Alignment;
  readonly width: number;
}

export interface TableRow {
  readonly id: string;
  readonly bounds: Rect;
  readonly cells: readonly TableCell[];
  /** Groups rows under a heading, for compartments such as "keys" or "methods". */
  readonly group?: string;
}

export interface TableCell {
  readonly columnId: string;
  readonly bounds: Rect;
  readonly content: MeasuredBlock;
}

/** Overlapping sheets, for a replicated component. */
export interface StackBlock extends BlockBase {
  readonly type: "stack";
  readonly depth: number;
  readonly offset: number;
  readonly children: readonly MeasuredBlock[];
}

/**
 * A registered deterministic shape, referenced by id.
 *
 * Never arbitrary executable code and never a raw path from a document: a diagram source
 * must not be able to make the compiler draw anything it likes, and a pack must not be
 * able to smuggle behavior in through geometry.
 */
export interface VectorBlock extends BlockBase {
  readonly type: "vector";
  readonly shapeId: string;
  readonly parameters?: Readonly<Record<string, number>>;
}

export type MeasuredBlock =
  | TextBlock
  | AssetBlock
  | BadgeBlock
  | RuleBlock
  | SpacerBlock
  | RowBlock
  | ColumnBlock
  | GridBlock
  | TableBlock
  | StackBlock
  | VectorBlock;

/** Depth-first walk over a block and everything inside it. */
export function walkBlocks(block: MeasuredBlock): readonly MeasuredBlock[] {
  switch (block.type) {
    case "row":
    case "column":
    case "grid":
    case "stack":
      return [block, ...block.children.flatMap(walkBlocks)];
    case "table":
      return [block, ...block.rows.flatMap((row) => row.cells.flatMap((cell) => walkBlocks(cell.content)))];
    default:
      return [block];
  }
}
