import type { Point, Rect } from "@topoir/core";

/** Orthogonal visibility-grid A*. Bend penalties prefer simple readable routes. */
export function obstacleRoute(start: Point, end: Point, obstacles: readonly Rect[]): readonly Point[] | undefined {
  const xs = [...new Set([start.x, end.x, ...obstacles.flatMap((r) => [r.x - 8, r.x + r.width + 8])])].sort((a, b) => a - b);
  const ys = [...new Set([start.y, end.y, ...obstacles.flatMap((r) => [r.y - 8, r.y + r.height + 8])])].sort((a, b) => a - b);
  const width = xs.length;
  const total = width * ys.length;
  if (total > 100000) return undefined;
  const sx = xs.indexOf(start.x), sy = ys.indexOf(start.y), tx = xs.indexOf(end.x), ty = ys.indexOf(end.y);
  const destination = ty * width + tx;
  const first = (sy * width + sx) * 2;
  const costs = new Map<number, number>([[first, 0]]), parents = new Map<number, number>();
  const heap = new MinHeap();
  heap.push({ state: first, cost: 0, score: distance(start, end) });
  let iterations = 0;
  while (heap.size && iterations++ < total * 4) {
    const current = heap.pop()!;
    if (current.cost !== costs.get(current.state)) continue;
    const cell = Math.floor(current.state / 2), direction = current.state % 2;
    if (cell === destination) {
      const points: Point[] = [];
      let state: number | undefined = current.state;
      while (state !== undefined) { const at = Math.floor(state / 2); points.push({ x: xs[at % width]!, y: ys[Math.floor(at / width)]! }); state = parents.get(state); }
      points.reverse();
      return points.filter((p, i) => i === 0 || i === points.length - 1 || !((points[i - 1]!.x === p.x && points[i + 1]!.x === p.x) || (points[i - 1]!.y === p.y && points[i + 1]!.y === p.y)));
    }
    const x = cell % width, y = Math.floor(cell / width);
    const a = { x: xs[x]!, y: ys[y]! };
    for (const [nx, ny, nd] of [[x - 1, y, 0], [x + 1, y, 0], [x, y - 1, 1], [x, y + 1, 1]] as const) {
      if (nx < 0 || nx >= width || ny < 0 || ny >= ys.length) continue;
      const b = { x: xs[nx]!, y: ys[ny]! };
      if (obstacles.some((r) => segmentHitsRect(a, b, r))) continue;
      const next = (ny * width + nx) * 2 + nd;
      const cost = current.cost + distance(a, b) + (nd !== direction ? 18 : 0);
      if (cost < (costs.get(next) ?? Infinity)) { costs.set(next, cost); parents.set(next, current.state); heap.push({ state: next, cost, score: cost + distance(b, end) }); }
    }
  }
  return undefined;
}

export function segmentHitsRect(a: Point, b: Point, r: Rect): boolean {
  return a.x === b.x ? a.x > r.x && a.x < r.x + r.width && Math.max(a.y, b.y) > r.y && Math.min(a.y, b.y) < r.y + r.height : a.y > r.y && a.y < r.y + r.height && Math.max(a.x, b.x) > r.x && Math.min(a.x, b.x) < r.x + r.width;
}
function distance(a: Point, b: Point): number { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }
interface Entry { state: number; cost: number; score: number }
class MinHeap {
  private readonly items: Entry[] = [];
  get size(): number { return this.items.length; }
  push(item: Entry): void {
    let index = this.items.length;
    this.items.push(item);
    while (index > 0) { const parent = Math.floor((index - 1) / 2); if (this.items[parent]!.score <= item.score) break; this.items[index] = this.items[parent]!; index = parent; }
    this.items[index] = item;
  }
  pop(): Entry | undefined {
    const first = this.items[0], last = this.items.pop();
    if (!this.items.length || !last) return first;
    let index = 0;
    while (index * 2 + 1 < this.items.length) { let child = index * 2 + 1; if (child + 1 < this.items.length && this.items[child + 1]!.score < this.items[child]!.score) child++; if (this.items[child]!.score >= last.score) break; this.items[index] = this.items[child]!; index = child; }
    this.items[index] = last;
    return first;
  }
}
