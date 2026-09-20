/**
 * Where the primary path enters a sibling, and what that means for reading order (T16).
 *
 * A composition arranges each container's children independently, so nothing ever asked
 * *where the request enters this child*. On a trust-zone map that produced a load balancer
 * drawn to the right of the two components it feeds: the balancer is step 3 of the author's
 * own story and was placed fourth, because the container held one boundary and three
 * components and the boundary came first simply by being a boundary.
 *
 * The rule here is one comparator, used by every family that arranges siblings:
 *
 * 1. A declared `order` ranks a sibling **against other siblings that also declare one**.
 *    That is the author speaking directly and nothing outranks it.
 * 2. Otherwise the sibling the primary path reaches first comes first. A sibling the path
 *    never reaches sorts after every sibling it does.
 * 3. Otherwise a declared order, then the id, so the result is deterministic.
 *
 * With no spine every comparison falls through to rule 3, which is exactly the previous
 * behaviour — so a view with no story and no inferable primary path is laid out unchanged.
 */

/** A sibling being arranged: a component, or a boundary and everything drawn inside it. */
export interface Orderable {
  readonly id: string;
  readonly order?: number | undefined;
  /** Every component drawn inside this sibling. A component's own list is just itself. */
  readonly members: readonly string[];
}

/**
 * How far along the primary path a reader first meets this sibling.
 *
 * The **earliest** member, not the average: a boundary is entered at its entry point, and
 * that is the position the reader arrives at. Averaging would push a boundary containing
 * one early component and several late ones behind boundaries the reader meets after it.
 */
export function spineEntry(item: Orderable, spineIndex: ReadonlyMap<string, number>): number {
  let earliest = Number.POSITIVE_INFINITY;
  for (const member of item.members) {
    const position = spineIndex.get(member);
    if (position !== undefined && position < earliest) earliest = position;
  }
  return earliest;
}

/** Position of each component along the primary path. */
export function spinePositions(spine: readonly string[] = []): ReadonlyMap<string, number> {
  return new Map(spine.map((id, index) => [id, index]));
}

/**
 * Compare two siblings for reading order.
 *
 * Note the asymmetry in rule 1: two *ranked* siblings are compared by rank alone, but a
 * ranked sibling and an unranked one are not — the author ranked one of them against its
 * ranked peers, and said nothing about how it sits relative to a sibling with no rank at
 * all. Reading an absent rank as "last" there is an assumption, and on the trust-zone map
 * it is the wrong one: the balancer and the application boundary are both declared `order:
 * 0`, in two different lists, which is a tie rather than a sequence.
 */
export function compareForReading(
  left: Orderable,
  right: Orderable,
  spineIndex: ReadonlyMap<string, number>,
): number {
  return rankForReading(left, right, spineIndex) || left.id.localeCompare(right.id, "en");
}

/**
 * The reading rules alone, without the id tiebreak.
 *
 * `0` means the rules genuinely do not separate these two, which is what a caller with a
 * better idea — the barycenter sweep, say — needs to know before it moves anything. Folding
 * the id in would make every pair look decided and freeze the sweep out entirely.
 */
export function rankForReading(
  left: Orderable,
  right: Orderable,
  spineIndex: ReadonlyMap<string, number>,
): number {
  if (left.order !== undefined && right.order !== undefined && left.order !== right.order) {
    return left.order - right.order;
  }
  const leftEntry = spineEntry(left, spineIndex);
  const rightEntry = spineEntry(right, spineIndex);
  if (leftEntry !== rightEntry) return leftEntry - rightEntry;
  const leftRank = left.order ?? Number.POSITIVE_INFINITY;
  const rightRank = right.order ?? Number.POSITIVE_INFINITY;
  if (leftRank !== rightRank) return leftRank - rightRank;
  return 0;
}

/** Sorted copy, leaving the caller's array alone. */
export function orderForReading<T extends Orderable>(items: readonly T[], spineIndex: ReadonlyMap<string, number>): T[] {
  return [...items].sort((left, right) => compareForReading(left, right, spineIndex));
}

/**
 * What the caller knows about reading order, handed to a layout family.
 *
 * `@topoir/layout` owns spine analysis; this package owns placement. Passing the analysed
 * path rather than the analysis keeps the dependency pointing one way.
 */
export interface OrderingHints {
  /**
   * Relationship ids that must not influence layer assignment. A feedback relationship — a
   * callback, an ack, a retry — is still drawn and routed, but treating it as forward
   * progress pushes its target a band further along.
   */
  readonly excludeFromOrdering?: ReadonlySet<string>;
  /** Components on the primary path, in the order a reader meets them. */
  readonly spine?: readonly string[];
  /**
   * For each component off the primary path, the component it hangs off.
   *
   * Unlike `spine`, this does not depend on a reading order being declared: a write to a
   * store is a branch off whatever writes to it however the path was found, so an inferred
   * analysis is as good as an authored one here.
   */
  readonly anchors?: ReadonlyMap<string, string>;
}

export const NO_HINTS: OrderingHints = {};

/**
 * Whether a container's sibling sequence runs *along* the reading direction.
 *
 * This is the limit on everything above, and it was learned the hard way. A position on the
 * primary path says how far along the path a sibling is, so it can only order a sequence
 * that runs the same way. Applied across the reading direction — to the band a component
 * sits in, perpendicular to the flow — it is meaningless: every sibling in a layer is at
 * the same point along the path, and the barycenter that the position displaces is the
 * thing actually minimising crossings. Doing it anyway took the Pockito reference diagram
 * from 0 edge crossings to 2, by lifting a boundary above a sibling component purely
 * because the path happened to enter it.
 *
 * A layered container is therefore excluded outright: its along-axis order is the layer
 * assignment, which the relationships already decide, and its sibling sort is the band.
 */
export function ordersAlongReading(mode: string, horizontal: boolean): boolean {
  if (mode === "row" || mode === "grid" || mode === "pack") return horizontal;
  if (mode === "column") return !horizontal;
  return false;
}

/**
 * Grid cells, with supporting siblings moved under the sibling they hang off.
 *
 * Only a move that is unambiguously an improvement is made: the anchor has to be a sibling
 * in this same container, already placed in an earlier row, and the target cell has to be
 * free. Anything else keeps its packed cell, so this can shift a component but never
 * displace one or leave two in the same place.
 */
export function alignToAnchors<T extends Orderable>(
  ordered: readonly T[],
  columns: number,
  anchors: ReadonlyMap<string, string>,
  isLeaf: (item: T) => boolean,
): { row: number; column: number }[] {
  const cell = ordered.map((_, index) => ({ row: Math.floor(index / columns), column: index % columns }));
  // An item stands for every component drawn inside it, so a store anchored to a service
  // inside a sibling boundary still finds that boundary.
  const ownerItem = new Map<string, number>();
  for (const [index, item] of ordered.entries()) for (const member of item.members) ownerItem.set(member, index);

  const taken = new Set(cell.map((slot) => `${slot.row}:${slot.column}`));
  // Repeated to a fixed point, because one move frees the cell another wanted. Two stores
  // packed side by side each want the column of the service above them, and whichever is
  // considered first is blocked by the one that has not moved yet.
  for (let pass = 0; pass < ordered.length; pass += 1) {
    let moved = false;
    for (const [index, item] of ordered.entries()) {
      // A boundary is not slid around; only a leaf component hangs off another.
      if (!isLeaf(item)) continue;
      const anchor = anchors.get(item.id);
      if (anchor === undefined) continue;
      const anchorIndex = ownerItem.get(anchor);
      if (anchorIndex === undefined || anchorIndex === index) continue;
      const target = cell[anchorIndex]!;
      const here = cell[index]!;
      // Under it, not beside it: same column, a later row. Moving within a row would
      // reorder the reading sequence, which is not this rule's business.
      if (target.row >= here.row || target.column === here.column) continue;
      const key = `${here.row}:${target.column}`;
      if (taken.has(key)) continue;
      taken.delete(`${here.row}:${here.column}`);
      taken.add(key);
      cell[index] = { row: here.row, column: target.column };
      moved = true;
    }
    if (!moved) break;
  }
  return cell;
}
