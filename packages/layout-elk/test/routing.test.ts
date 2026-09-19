import { describe, expect, it } from "vitest";
import type { Point, Rect } from "@topoir/core";
import { obstacleRoute, segmentHitsRect } from "../src/routing.js";

/**
 * The router had no unit coverage at all. Every routing property was asserted only as an
 * aggregate count over a whole compiled corpus, so a corpus run could say
 * "coincidentEdgeSegments=12" with nothing to pin the behaviour that produced it.
 */

const segments = (points: readonly Point[]): [Point, Point][] =>
  points.slice(1).map((point, index) => [points[index]!, point]);

const orthogonal = (points: readonly Point[]): boolean =>
  segments(points).every(([a, b]) => a.x === b.x || a.y === b.y);

describe("segmentHitsRect", () => {
  const box: Rect = { x: 100, y: 100, width: 100, height: 100 };

  it("reports a segment driven through the interior", () => {
    expect(segmentHitsRect({ x: 50, y: 150 }, { x: 250, y: 150 }, box)).toBe(true);
  });

  it("ignores a segment that only grazes an edge", () => {
    expect(segmentHitsRect({ x: 50, y: 100 }, { x: 250, y: 100 }, box)).toBe(false);
  });

  it("ignores a segment that clears the box entirely", () => {
    expect(segmentHitsRect({ x: 50, y: 400 }, { x: 250, y: 400 }, box)).toBe(false);
  });
});

describe("obstacleRoute", () => {
  it("produces an orthogonal polyline that starts and ends where it was asked to", () => {
    const from = { x: 0, y: 0 };
    const to = { x: 400, y: 300 };
    const route = obstacleRoute(from, to, []);
    expect(route).not.toBeUndefined();
    expect(route![0]).toEqual(from);
    expect(route![route!.length - 1]).toEqual(to);
    expect(orthogonal(route!)).toBe(true);
  });

  it("goes around an obstacle standing between the endpoints rather than through it", () => {
    const wall: Rect = { x: 150, y: -100, width: 100, height: 300 };
    const route = obstacleRoute({ x: 0, y: 0 }, { x: 400, y: 0 }, [wall]);
    expect(route).not.toBeUndefined();
    expect(orthogonal(route!)).toBe(true);
    for (const [a, b] of segments(route!)) {
      expect(segmentHitsRect(a, b, wall)).toBe(false);
    }
  });

  it("is deterministic for the same inputs", () => {
    const obstacles: Rect[] = [
      { x: 120, y: 40, width: 80, height: 120 },
      { x: 260, y: -40, width: 60, height: 140 },
    ];
    const first = obstacleRoute({ x: 0, y: 0 }, { x: 420, y: 120 }, obstacles);
    const second = obstacleRoute({ x: 0, y: 0 }, { x: 420, y: 120 }, obstacles);
    expect(first).toEqual(second);
  });

  it("still returns a route when an endpoint sits inside an obstacle", () => {
    // A dense scene can leave an endpoint inside a neighbour's inflated obstacle. If an
    // enclosing obstacle is not dropped the search finds nothing and the relationship is
    // lost, which no geometry metric would have reported at the time.
    const swallowing: Rect = { x: -20, y: -20, width: 120, height: 120 };
    const route = obstacleRoute({ x: 0, y: 0 }, { x: 400, y: 0 }, [swallowing]);
    expect(route).not.toBeUndefined();
    expect(route!.length).toBeGreaterThanOrEqual(2);
  });
});
