import { describe, expect, it } from "vitest";
import type { Point, Rect } from "@topoir/core";
import { straightenRoute } from "../src/composition.js";

/**
 * Taking the excursions out of a route that nothing forced it into (T18).
 *
 * The router builds a connector by stepping around obstacles, and the finished polyline
 * carries steps that were needed at the moment they were taken and are not needed in the
 * picture. Those steps cost the reader a turn that means nothing.
 */

const bends = (points: readonly Point[]) => Math.max(0, points.length - 2);
const length = (points: readonly Point[]) =>
  points.slice(1).reduce((sum, point, index) => sum + Math.abs(point.x - points[index]!.x) + Math.abs(point.y - points[index]!.y), 0);
const orthogonal = (points: readonly Point[]) =>
  points.slice(1).every((point, index) => point.x === points[index]!.x || point.y === points[index]!.y);

describe("routes lose the turns nothing forced", () => {
  it("collapses a lateral jog into one straight run", () => {
    /**
     * The exact shape the agent-request map produced: down, **right 61px**, down, left,
     * down, left. The short right step is residue — nothing is in the way of dropping
     * straight down — and it costs two turns in the diagram's primary connector.
     */
    const route: Point[] = [
      { x: 729, y: 308 }, { x: 729, y: 463 }, { x: 790, y: 463 },
      { x: 790, y: 514 }, { x: 218, y: 514 }, { x: 218, y: 557 }, { x: 200, y: 557 },
    ];
    const simplified = straightenRoute(route, []);
    expect(bends(simplified)).toBeLessThan(bends(route));
    expect(length(simplified)).toBeLessThanOrEqual(length(route));
  });

  it("keeps the endpoints exactly where they were", () => {
    const route: Point[] = [
      { x: 0, y: 0 }, { x: 0, y: 40 }, { x: 30, y: 40 }, { x: 30, y: 80 }, { x: 100, y: 80 },
    ];
    const simplified = straightenRoute(route, []);
    expect(simplified[0]).toEqual(route[0]);
    expect(simplified[simplified.length - 1]).toEqual(route[route.length - 1]);
  });

  it("stays orthogonal", () => {
    // A connector that started as right angles must not come back as a diagonal.
    const route: Point[] = [
      { x: 0, y: 0 }, { x: 0, y: 40 }, { x: 30, y: 40 }, { x: 30, y: 80 }, { x: 100, y: 80 },
    ];
    expect(orthogonal(straightenRoute(route, []))).toBe(true);
  });

  it("will not simplify through an obstacle", () => {
    /**
     * The jog is there for a reason: a component sits in the straight path. This is the
     * whole safety property — a simplification can never put a connector through something,
     * because every replacement is checked against the same obstacles the router used.
     */
    const route: Point[] = [
      { x: 0, y: 0 }, { x: 0, y: 40 }, { x: 30, y: 40 }, { x: 30, y: 80 }, { x: 100, y: 80 },
    ];
    const blocking: Rect[] = [
      { x: -5, y: 50, width: 10, height: 20 }, // dropping straight down at x=0
      { x: 20, y: -5, width: 20, height: 10 }, // running across at y=0
      { x: 50, y: 30, width: 20, height: 20 }, // running across at y=40
    ];
    expect(straightenRoute(route, blocking)).toEqual(route);
  });

  it("leaves a route with nothing to remove alone", () => {
    const route: Point[] = [{ x: 0, y: 0 }, { x: 0, y: 40 }, { x: 100, y: 40 }];
    expect(straightenRoute(route, [])).toEqual(route);
  });

  it("never lengthens a route to remove a turn", () => {
    /**
     * A bend is a cost, but so is distance, and trading a short detour for a long way round
     * is not a simplification. Both have to improve, or nothing happens.
     */
    const route: Point[] = [
      { x: 0, y: 0 }, { x: 0, y: 10 }, { x: 200, y: 10 }, { x: 200, y: 200 },
    ];
    const simplified = straightenRoute(route, []);
    expect(length(simplified)).toBeLessThanOrEqual(length(route) + 0.5);
  });
});
