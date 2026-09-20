import { describe, expect, it } from "vitest";
import { loadDocument, measureView, projectView, resolveTheme, type MeasuredView } from "@topoir/core";
import { bestRowSplit, CompositionEngine } from "../src/composition.js";
import { compareForReading, orderForReading, ordersAlongReading, rankForReading, spineEntry, spinePositions } from "../src/ordering.js";

/**
 * T16 slice 2 — reading order across siblings.
 *
 * Each container was arranged independently, so nothing asked where the primary path
 * enters a child. On the trust-zone showcase that placed the load balancer — step 3 of the
 * author's own story — to the right of the two components it feeds, because the container
 * held one boundary and three components and the boundary came first by being a boundary.
 */

const spine = spinePositions(["client", "gateway", "service", "sink"]);
const item = (id: string, members: readonly string[], order?: number) => ({ id, members, order });

describe("where the path enters a sibling", () => {
  it("is the earliest member, whatever order the members are listed in", () => {
    /**
     * A boundary is entered at its entry point. Averaging would push a boundary holding
     * one early component and several late ones behind boundaries met after it.
     *
     * Both orderings are asserted on purpose. The first version of this test listed the
     * late member first, so an implementation that simply kept the *last* match it saw
     * produced the same number and the test passed against it.
     */
    expect(spineEntry(item("zone", ["sink", "gateway"]), spine)).toBe(1);
    expect(spineEntry(item("zone", ["gateway", "sink"]), spine)).toBe(1);
    expect(spineEntry(item("zone", ["client", "service", "sink"]), spine)).toBe(0);
  });

  it("is absent for a sibling the path never reaches", () => {
    expect(spineEntry(item("aside", ["logs"]), spine)).toBe(Number.POSITIVE_INFINITY);
  });

  it("ignores members that are not on the path", () => {
    expect(spineEntry(item("zone", ["logs", "service", "metrics"]), spine)).toBe(2);
    expect(spineEntry(item("zone", ["service", "logs"]), spine)).toBe(2);
  });
});

describe("reading order", () => {
  it("puts the sibling the path reaches first, first", () => {
    expect(compareForReading(item("b", ["service"]), item("a", ["gateway"]), spine)).toBeGreaterThan(0);
  });

  it("puts a sibling the path never reaches after every sibling it does", () => {
    expect(compareForReading(item("aside", ["logs"]), item("late", ["sink"]), spine)).toBeGreaterThan(0);
  });

  it("lets a declared order outrank the path when both siblings declare one", () => {
    // The author ranked these two against each other. Nothing inferred outranks that.
    const first = item("late-in-path", ["sink"], 0);
    const second = item("early-in-path", ["client"], 1);
    expect(compareForReading(first, second, spine)).toBeLessThan(0);
  });

  it("does not read an absent order as last", () => {
    /**
     * The trust-zone case exactly: a boundary and a component are both declared `order: 0`
     * in two different lists, which is a tie rather than a sequence — so the path breaks
     * it. Treating the unranked side as last is what put step 3 fourth.
     */
    const boundary = item("application", ["service"], 0);
    const balancer = item("lb", ["gateway"], 0);
    expect(compareForReading(balancer, boundary, spine)).toBeLessThan(0);
  });

  it("falls back to a declared order, then the id, when the path says nothing", () => {
    const none = spinePositions([]);
    expect(orderForReading([item("c", ["c"]), item("a", ["a"]), item("b", ["b"], 0)], none).map((entry) => entry.id))
      .toEqual(["b", "a", "c"]);
  });

  it("is unchanged from declared-order-then-id when there is no path", () => {
    // A view with no story and no inferable primary path must lay out exactly as before.
    const none = spinePositions([]);
    const items = [item("z", ["z"], 2), item("m", ["m"]), item("a", ["a"], 1), item("k", ["k"])];
    const legacy = [...items].sort((left, right) => {
      const l = left.order ?? Number.POSITIVE_INFINITY;
      const r = right.order ?? Number.POSITIVE_INFINITY;
      return l !== r ? l - r : left.id.localeCompare(right.id, "en");
    });
    expect(orderForReading(items, none).map((entry) => entry.id)).toEqual(legacy.map((entry) => entry.id));
  });

  it("separates nothing the rules cannot decide, so a barycenter sweep is free to move it", () => {
    // `rankForReading` returning 0 is what tells the sweep these two are its to order.
    // Folding the id tiebreak in here would make every pair look decided.
    const none = spinePositions([]);
    expect(rankForReading(item("a", ["a"]), item("b", ["b"]), none)).toBe(0);
    expect(compareForReading(item("a", ["a"]), item("b", ["b"]), none)).toBeLessThan(0);
  });

  it("is deterministic for siblings the rules cannot separate", () => {
    const none = spinePositions([]);
    expect(orderForReading([item("b", ["b"]), item("a", ["a"])], none).map((entry) => entry.id)).toEqual(["a", "b"]);
  });
});

describe("regions wrap into the shape that was asked for", () => {
  const box = (width: number, height: number) => ({ width, height });

  it("chooses the split closest to the target ratio", () => {
    // Four regions: one row of all four is 5.6:1 and one per row is 1.0:1. Against a 2.1
    // target the answer is neither.
    const rows = bestRowSplit([box(540, 154), box(1227, 547), box(705, 154), box(227, 154)], 120, 64, 2.1);
    const width = Math.max(...rows.map((row) => row.reduce((sum, b) => sum + b.width, 0) + (row.length - 1) * 120));
    const height = rows.reduce((sum, row) => sum + Math.max(...row.map((b) => b.height)), 0) + (rows.length - 1) * 64;
    expect(Math.abs(Math.log(width / height / 2.1))).toBeLessThan(Math.log(1.2));
  });

  it("keeps regions in reading order across the wrap", () => {
    const boxes = [box(400, 100), box(400, 100), box(400, 100), box(400, 100)];
    const flat = bestRowSplit(boxes, 40, 40, 1.6).flat();
    expect(flat.map((entry) => boxes.indexOf(entry))).toEqual([0, 1, 2, 3]);
  });

  it("puts a lone region in a single row", () => {
    expect(bestRowSplit([box(100, 100)], 40, 40, 1.6)).toEqual([[box(100, 100)]]);
  });

  it("handles no regions at all", () => {
    expect(bestRowSplit([], 40, 40, 1.6)).toEqual([]);
  });

  it("still wraps when there are too many regions to enumerate every split", () => {
    // Past the enumeration limit the candidates are greedy wraps; they must still be
    // rows in reading order covering every region exactly once.
    const boxes = Array.from({ length: 9 }, (_, index) => box(200 + index * 10, 100));
    const rows = bestRowSplit(boxes, 40, 40, 2.0);
    expect(rows.flat()).toEqual(boxes);
    expect(rows.length).toBeGreaterThan(1);
  });
});

/** The trust-zone showcase reduced to what the criterion is about. */
function zones(): MeasuredView {
  const document = loadDocument(
    JSON.stringify({
      apiVersion: "topoir.dev/v1alpha1",
      kind: "Architecture",
      metadata: { name: "zones" },
      model: {
        groups: [
          { id: "edge-zone", kind: "external-zone", label: "Edge", order: 0, layout: { mode: "row" } },
          { id: "cloud", kind: "cloud", label: "Cloud", order: 1, layout: { mode: "grid", columns: 2 } },
          { id: "app", kind: "security-boundary", label: "App", parent: "cloud", order: 0, layout: { mode: "grid", columns: 2 } },
        ],
        nodes: [
          { id: "customer", kind: "client", group: "edge-zone", order: 0 },
          // Declared `order: 0` just like the boundary it sits beside — a tie, in two
          // different lists, which is exactly the shape that misplaced the balancer.
          { id: "lb", kind: "load-balancer", group: "cloud", order: 0 },
          { id: "frontend", kind: "service", group: "app", order: 0 },
          { id: "core", kind: "service", group: "app", order: 1 },
        ],
        edges: [
          { id: "open", from: "customer", to: "lb", kind: "request" },
          { id: "route", from: "lb", to: "frontend", kind: "request" },
          { id: "invoke", from: "frontend", to: "core", kind: "request" },
        ],
      },
      views: [{ id: "overview", layout: { direction: "right" }, design: { composition: "architecture-map", story: ["open", "route", "invoke"] } }],
    }),
  ).document!;
  return measureView(projectView(document), resolveTheme("technical-clean"));
}

describe("the primary path orders the composition", () => {
  const spineOrder = ["customer", "lb", "frontend", "core"];

  it("places a balancer before the boundary it feeds", async () => {
    const result = await new CompositionEngine().layout(zones(), { spine: spineOrder });
    const at = (id: string) => result.geometry!.nodes.find((node) => node.id === id)!.x;
    expect(at("lb")).toBeLessThan(at("frontend"));
    expect(at("lb")).toBeLessThan(at("core"));
  });

  it("does not, without the path — which is the defect this fixes", async () => {
    // Pinned deliberately. With no primary path the boundary still sorts first, because
    // nothing separates two siblings that both declared `order: 0`. This asserts the fix
    // comes from the path and not from some incidental reshuffle.
    const result = await new CompositionEngine().layout(zones());
    const at = (id: string) => result.geometry!.nodes.find((node) => node.id === id)!.x;
    expect(at("lb")).toBeGreaterThan(at("frontend"));
  });

});

describe("the path only orders a sequence that runs the same way it does", () => {
  it("orders a row, a grid and a pack when reading runs across", () => {
    for (const mode of ["row", "grid", "pack"]) expect(ordersAlongReading(mode, true), mode).toBe(true);
  });

  it("does not order those same modes when reading runs down", () => {
    for (const mode of ["row", "grid", "pack"]) expect(ordersAlongReading(mode, false), mode).toBe(false);
  });

  it("orders a column only when reading runs down", () => {
    expect(ordersAlongReading("column", false)).toBe(true);
    expect(ordersAlongReading("column", true)).toBe(false);
  });

  it("never orders a layered container", () => {
    /**
     * A layered container's along-axis order is the layer assignment, which the
     * relationships already decide; its sibling sort is the band *across* the flow, where
     * every sibling is at the same point along the path and the barycenter is what
     * minimises crossings. Overriding it took the Pockito reference from 0 edge crossings
     * to 2, by lifting a boundary above a sibling component purely because the path
     * happened to enter that boundary.
     */
    expect(ordersAlongReading("layered", true)).toBe(false);
    expect(ordersAlongReading("layered", false)).toBe(false);
    expect(ordersAlongReading("auto", true)).toBe(false);
  });
});
