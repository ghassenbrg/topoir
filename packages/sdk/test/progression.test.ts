import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { TopoIRCompiler } from "../src/index.js";

/**
 * T16 — does the primary path actually read as a progression?
 *
 * This is the criterion the milestone is about, asserted on real content rather than a
 * fixture, because the defect it guards only appeared at the scale of a real diagram.
 *
 * The trust-zone showcase declares its own story, so the intended reading order is not in
 * doubt: `customer -> edge -> lb -> frontend -> core -> f5 -> card-core`. What had to be
 * earned is that the drawing agrees with it.
 */

const SHOWCASE = "../../../examples/showcase/trust-zones.topoir.yaml";
const STORY = ["customer", "edge", "lb", "frontend", "core", "f5", "card-core"] as const;

async function showcase() {
  const source = readFileSync(new URL(SHOWCASE, import.meta.url), "utf8");
  const result = await new TopoIRCompiler().compile(source);
  const view = result.views[0];
  expect(view?.geometry, "the showcase must compile").toBeDefined();
  return view!.geometry!;
}

describe("the request spine reads in the order it happens in", () => {
  it("advances at every step, except for a true carriage return", async () => {
    /**
     * A step may go backwards in x only by wrapping to a new row — and a new row starts at
     * the diagram's left margin, which is what makes it read as a wrap rather than as a
     * jump back into the middle of the picture.
     *
     * That last clause is the whole test. Before this work the path went
     * `... core@1656 -> f5@712 ...`, which is also one backward step, but it landed in a
     * region beginning at x=684 — the reader is thrown back across the diagram into
     * somewhere arbitrary. Counting backward steps alone would have called that acceptable.
     */
    const geometry = await showcase();
    const node = (id: string) => geometry.nodes.find((entry) => entry.id === id)!;
    const leftMargin = Math.min(...geometry.groups.map((group) => group.x));
    const regionOf = (id: string) => {
      const box = node(id);
      const containing = geometry.groups.filter(
        (group) => box.x >= group.x && box.y >= group.y && box.x + box.width <= group.x + group.width && box.y + box.height <= group.y + group.height,
      );
      // The outermost region: a nested boundary does not start a row.
      return containing.sort((left, right) => right.width * right.height - left.width * left.height)[0]!;
    };

    const backward: string[] = [];
    for (const [index, id] of STORY.slice(1).entries()) {
      const previous = node(STORY[index]!);
      const current = node(id);
      if (current.x >= previous.x) continue;
      backward.push(`${STORY[index]} -> ${id}`);
      const region = regionOf(id);
      expect(region.x, `${STORY[index]} -> ${id} goes backwards, so it must wrap to a row at the left margin`).toBeCloseTo(leftMargin, 0);
      expect(current.y, `${STORY[index]} -> ${id} must move down to the next row`).toBeGreaterThan(previous.y);
    }
    // One wrap is a progression across two rows. Several would be a zigzag.
    expect(backward.length, `backward steps: ${backward.join(", ")}`).toBeLessThanOrEqual(1);
  });

  it("puts the balancer before the components it feeds", async () => {
    // Step 3 of the author's own story used to be drawn to the right of steps 4 and 5.
    const geometry = await showcase();
    const at = (id: string) => geometry.nodes.find((entry) => entry.id === id)!.x;
    expect(at("lb")).toBeLessThan(at("frontend"));
    expect(at("lb")).toBeLessThan(at("core"));
    expect(at("lb")).toBeLessThan(at("webapp"));
  });

  it("crosses each trust boundary in story order", async () => {
    // The takeaway the author wrote is "the black request spine crosses each trust
    // boundary once". A reader meets the zones in the order the request enters them.
    const geometry = await showcase();
    const node = (id: string) => geometry.nodes.find((entry) => entry.id === id)!;
    const zoneOf = (id: string) => {
      const box = node(id);
      const containing = geometry.groups.filter(
        (group) => group.parent === undefined && box.x >= group.x && box.y >= group.y && box.x + box.width <= group.x + group.width && box.y + box.height <= group.y + group.height,
      );
      return containing[0]?.id;
    };
    const met: string[] = [];
    for (const id of STORY) {
      const zone = zoneOf(id);
      if (zone !== undefined && met[met.length - 1] !== zone) met.push(zone);
    }
    expect(met).toEqual(["internet", "gcp", "fdc"]);
    // Once each: a zone re-entered later would mean the path doubled back through it.
    expect(new Set(met).size).toBe(met.length);
  });

  it("keeps the components the path never reaches out of it", async () => {
    // Partner APIs, the caches and the stores are supporting; they must not sit between
    // two consecutive steps of the primary path and break the run.
    const geometry = await showcase();
    const node = (id: string) => geometry.nodes.find((entry) => entry.id === id)!;
    const partner = node("partner");
    const core = node("core");
    expect(partner.y, "an external dependency belongs below the path, not along it").toBeGreaterThan(core.y + core.height);
  });
});

describe("ordering by the path must not cost legibility elsewhere", () => {
  it("keeps the Pockito reference free of edge crossings", async () => {
    /**
     * This reference declares a story too, so it exercises the same machinery — and it is
     * where the first version of the rule was caught. Ordering siblings by path position
     * *across* the reading direction lifted the API boundary above a sibling component
     * purely because the path entered it, and took this diagram from 0 edge crossings to
     * 2. A reference diagram sets the quality bar; it does not get to regress so another
     * diagram can improve.
     */
    const source = readFileSync(new URL("../../../examples/pockito-reference.topoir.yaml", import.meta.url), "utf8");
    const result = await new TopoIRCompiler().compile(source);
    const view = result.views[0];
    expect(view?.geometry).toBeDefined();
    expect(view!.quality.metrics.readability.edgeCrossings).toBe(0);
    expect(view!.quality.metrics.readability.coincidentEdgeSegments).toBe(0);
    expect(view!.quality.metrics.readability.labelOverlaps).toBe(0);
  });
});
