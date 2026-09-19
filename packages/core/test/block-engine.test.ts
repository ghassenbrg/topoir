import { describe, expect, it } from "vitest";
import {
  blocksExtent,
  componentInk,
  contentDispositions,
  hasAbbreviatedText,
  measureBlock,
  measureContext,
  negotiateWidth,
  rowAttachments,
  shapedSize,
  sideAttachments,
  silhouetteInk,
  silhouettePoint,
  walkBlocks,
  type BlockSpec,
  type MeasuredBlock,
  type Silhouette,
  type TextStyle,
} from "../src/index.js";

/**
 * T07 — the measured block engine.
 *
 * The acceptance criteria: all legacy content can be expressed once; measured badges,
 * table cells and multi-asset strips contain actual content; explicit ellipsis produces
 * disposition data; and no renderer reflow is needed. The last one is the reason for all
 * the rest — the renderer places what was measured, so a badge cannot be measured at one
 * width and drawn at another.
 */

const context = measureContext();
const label: TextStyle = { fontSize: 13, fontWeight: 600, lineHeight: 1.35 };
const small: TextStyle = { fontSize: 10, fontWeight: 600, lineHeight: 1.2 };

function textSpec(id: string, text: string, maxLines = 2): BlockSpec {
  return { type: "text", id, contentId: id, text, style: label, maxLines };
}

describe("text blocks", () => {
  it("measures a run that fits on one line", () => {
    const block = measureBlock(textSpec("t", "Payments API"), context);
    expect(block.type).toBe("text");
    if (block.type !== "text") return;
    expect(block.text.lines).toHaveLength(1);
    expect(block.text.lines[0]?.text).toBe("Payments API");
    expect(block.bounds.width).toBeCloseTo(block.text.lines[0]!.advance, 1);
  });

  it("records the resolved face hash on the shaped run", () => {
    // Which exact font bytes produced these metrics, carried with the measurement.
    const block = measureBlock(textSpec("t", "Payments API"), context);
    if (block.type !== "text") return;
    expect(block.text.fontHash).toMatch(/^[0-9a-f]{64}$/u);
    expect(block.text.fontFamily).toBe(context.fonts.family);
  });

  it("gives every line a baseline the renderer can place without re-deriving it", () => {
    const block = measureBlock(textSpec("t", "Reconciliation across international regions", 3), {
      ...context,
      availableWidth: 120,
    });
    if (block.type !== "text") return;
    expect(block.text.lines.length).toBeGreaterThan(1);
    for (const [index, line] of block.text.lines.entries()) {
      expect(line.baseline).toBeCloseTo(index * block.text.lineHeight + block.text.ascent, 2);
    }
  });

  it("ink overhangs the line box by the descent", () => {
    // Layout height stacks line boxes; painted height includes descenders. Using the
    // layout box as the painted extent is what let text clip against a container edge.
    const block = measureBlock(textSpec("t", "paging"), context);
    if (block.type !== "text") return;
    expect(block.inkBounds.height).toBeGreaterThanOrEqual(block.text.ascent + block.text.descent - 0.01);
  });

  it("splits an over-wide word without inserting characters", () => {
    const identifier = "payments-reconciliation-service-identifier";
    const block = measureBlock({ type: "text", id: "t", text: identifier, style: label, maxLines: 8 }, { ...context, availableWidth: 90 });
    if (block.type !== "text") return;
    expect(block.text.lines.length).toBeGreaterThan(1);
    // Continuation flags make the rejoin exact.
    const rejoined = block.text.lines.map((line, index) => (index === 0 || line.continuesPrevious ? line.text : ` ${line.text}`)).join("");
    expect(rejoined).toBe(identifier);
  });

  it("keeps authored spaces between separate words", () => {
    const block = measureBlock({ type: "text", id: "t", text: "Payments API gateway", style: label, maxLines: 8 }, { ...context, availableWidth: 60 });
    if (block.type !== "text") return;
    const rejoined = block.text.lines.map((line, index) => (index === 0 || line.continuesPrevious ? line.text : ` ${line.text}`)).join("");
    expect(rejoined).toBe("Payments API gateway");
  });

  it("ellipsises on grapheme boundaries", () => {
    // Trimming by code unit would cut a surrogate pair in half and emit U+FFFD.
    const block = measureBlock({ type: "text", id: "t", text: "🇩🇪🇫🇷🇪🇸🇮🇹🇵🇹🇳🇱🇧🇪🇦🇹", style: label, maxLines: 1 }, { ...context, availableWidth: 40 });
    if (block.type !== "text") return;
    const drawn = block.text.lines.map((line) => line.text).join("");
    expect(drawn).not.toContain("\uFFFD");
    // And the ellipsis trimmed whole flags, so every surviving flag is intact.
    expect([...drawn.replace(/…$/u, "")].length % 2).toBe(0);
  });

  it("respects hard line breaks in the source", () => {
    const block = measureBlock({ type: "text", id: "t", text: "first\nsecond", style: label, maxLines: 4 }, context);
    if (block.type !== "text") return;
    expect(block.text.lines.map((line) => line.text)).toEqual(["first", "second"]);
  });
});

describe("badge blocks", () => {
  it("contains the whole badge when it has room to wrap", () => {
    const badge = "W".repeat(48);
    const block = measureBlock({ type: "badge", id: "b", contentId: "b", text: badge, style: small, maxLines: 4 }, { ...context, availableWidth: 200 });
    if (block.type !== "badge") return;
    // The defect this exists to prevent: a badge measured narrower than its own text.
    expect(block.text.lines.map((line) => line.text).join("")).toBe(badge);
    expect(block.bounds.width).toBeLessThanOrEqual(200);
    expect(block.bounds.width).toBeGreaterThanOrEqual(shapedSize(block.text).width - 0.01);
  });

  it("reports what was lost when even wrapping is not enough", () => {
    const badge = "W".repeat(48);
    const block = measureBlock({ type: "badge", id: "b", contentId: "b", text: badge, style: small, maxLines: 1 }, { ...context, availableWidth: 60 });
    const dispositions = contentDispositions([block]);
    expect(dispositions).toHaveLength(1);
    expect(dispositions[0]?.kind).toBe("abbreviated");
    expect(dispositions[0]?.omittedGraphemes ?? 0).toBeGreaterThan(0);
    expect(dispositions[0]?.reason).toBeDefined();
  });
});

describe("asset blocks", () => {
  it("keeps one block per authored role even when two roles share an image", () => {
    // Deduplicating image bytes must never deduplicate authored roles.
    const spec: BlockSpec = {
      type: "row",
      id: "strip",
      gap: 8,
      children: ["primary", "secondary"].map((role): BlockSpec => ({
        type: "asset",
        id: `asset-${role}`,
        contentId: `asset-${role}`,
        role,
        intrinsic: { width: 24, height: 24 },
        target: { width: 24, height: 24 },
        href: "data:image/svg+xml;base64,SAME",
        resolvedHash: "identical-bytes",
      })),
    };
    const block = measureBlock(spec, context);
    const assets = walkBlocks(block).filter((entry) => entry.type === "asset");
    expect(assets).toHaveLength(2);
    expect(assets.map((entry) => (entry.type === "asset" ? entry.role : ""))).toEqual(["primary", "secondary"]);
  });

  it("lays six roles side by side, all inside the measured strip", () => {
    const roles = ["a", "b", "c", "d", "e", "f"];
    const block = measureBlock(
      {
        type: "row",
        id: "strip",
        gap: 8,
        children: roles.map((role): BlockSpec => ({ type: "asset", id: role, role, intrinsic: { width: 24, height: 24 }, target: { width: 24, height: 24 }, href: "x" })),
      },
      context,
    );
    if (block.type !== "row") return;
    expect(block.children).toHaveLength(6);
    // Every icon is inside the strip the parent measured.
    for (const child of block.children) {
      expect(child.bounds.x).toBeGreaterThanOrEqual(0);
      expect(child.bounds.x + child.bounds.width).toBeLessThanOrEqual(block.bounds.width + 0.01);
    }
    expect(block.bounds.width).toBeCloseTo(6 * 24 + 5 * 8, 1);
  });

  it("records an unresolved role as omitted rather than closing the gap", () => {
    const block = measureBlock(
      { type: "asset", id: "missing", contentId: "missing", role: "nowhere", target: { width: 24, height: 24 } },
      context,
    );
    const dispositions = contentDispositions([block]);
    expect(dispositions[0]?.kind).toBe("omitted");
    expect(dispositions[0]?.reason).toContain("nowhere");
  });

  it("preserves intrinsic aspect when fitting", () => {
    const block = measureBlock({ type: "asset", id: "a", role: "wide", intrinsic: { width: 200, height: 50 }, target: { width: 100, height: 100 }, href: "x" }, context);
    if (block.type !== "asset") return;
    expect(block.bounds.width / block.bounds.height).toBeCloseTo(4, 2);
    expect(block.bounds.width).toBeLessThanOrEqual(100);
  });
});

describe("tables", () => {
  const table: BlockSpec = {
    type: "table",
    id: "routes",
    columns: [{ id: "path" }, { id: "target" }],
    rows: [
      { id: "r0", cells: [{ columnId: "path", content: textSpec("p0", "/app/*", 1) }, { columnId: "target", content: textSpec("t0", "web", 1) }] },
      { id: "r1", cells: [{ columnId: "path", content: textSpec("p1", "/api/v2/very/long/resource", 1) }, { columnId: "target", content: textSpec("t1", "api", 1) }] },
      { id: "r2", cells: [{ columnId: "path", content: textSpec("p2", "/mcp/*", 1) }, { columnId: "target", content: textSpec("t2", "mcp", 1) }] },
    ],
  };

  it("sizes a column to its widest cell", () => {
    const block = measureBlock(table, context);
    if (block.type !== "table") return;
    const path = block.columns.find((column) => column.id === "path");
    const widest = block.rows
      .flatMap((row) => row.cells.filter((cell) => cell.columnId === "path"))
      .map((cell) => cell.content.bounds.width);
    expect(path?.width ?? 0).toBeGreaterThanOrEqual(Math.max(...widest));
  });

  it("keeps every cell's content inside its own cell", () => {
    // The property that makes a route table trustworthy: what the row shows is what the
    // row measured, so a connector attached to that row points at the right text.
    const block = measureBlock(table, context);
    if (block.type !== "table") return;
    for (const row of block.rows) {
      for (const cell of row.cells) {
        expect(cell.content.bounds.x).toBeGreaterThanOrEqual(cell.bounds.x - 0.01);
        expect(cell.content.bounds.y).toBeGreaterThanOrEqual(cell.bounds.y - 0.01);
        expect(cell.content.bounds.x + cell.content.bounds.width).toBeLessThanOrEqual(cell.bounds.x + cell.bounds.width + 0.01);
        expect(cell.content.bounds.y + cell.content.bounds.height).toBeLessThanOrEqual(cell.bounds.y + cell.bounds.height + 0.01);
      }
    }
  });

  it("stacks rows without overlap", () => {
    const block = measureBlock(table, context);
    if (block.type !== "table") return;
    for (let index = 1; index < block.rows.length; index += 1) {
      const previous = block.rows[index - 1]!;
      const current = block.rows[index]!;
      expect(current.bounds.y).toBeGreaterThanOrEqual(previous.bounds.y + previous.bounds.height - 0.01);
    }
  });

  it("carries real content in every cell", () => {
    const block = measureBlock(table, context);
    const texts = walkBlocks(block).filter((entry) => entry.type === "text");
    expect(texts).toHaveLength(6);
    expect(texts.every((entry) => entry.type === "text" && entry.text.lines.length > 0)).toBe(true);
  });
});

describe("containers", () => {
  it("a row offers each child only what remains after the gaps", () => {
    const block = measureBlock(
      { type: "row", id: "r", gap: 10, children: [textSpec("a", "one"), textSpec("b", "two")] },
      { ...context, availableWidth: 100 },
    );
    if (block.type !== "row") return;
    expect(block.bounds.width).toBeLessThanOrEqual(100);
  });

  it("a column stacks children and takes the widest", () => {
    const block = measureBlock({ type: "column", id: "c", gap: 4, children: [textSpec("a", "short"), textSpec("b", "much longer label")] }, context);
    if (block.type !== "column") return;
    expect(block.children[1]!.bounds.y).toBeCloseTo(block.children[0]!.bounds.height + 4, 1);
    expect(block.bounds.width).toBe(Math.max(...block.children.map((child) => child.bounds.width)));
  });

  it("centres children when asked", () => {
    const block = measureBlock({ type: "column", id: "c", align: "center", children: [textSpec("a", "wide enough label"), textSpec("b", "x")] }, context);
    if (block.type !== "column") return;
    expect(block.children[1]!.bounds.x).toBeGreaterThan(0);
  });

  it("a grid places children in rows of the requested width", () => {
    const children = ["a", "b", "c", "d", "e"].map((id) => textSpec(id, id));
    const block = measureBlock({ type: "grid", id: "g", columns: 2, gap: 6, children }, context);
    if (block.type !== "grid") return;
    expect(block.children[0]!.bounds.y).toBe(block.children[1]!.bounds.y);
    expect(block.children[2]!.bounds.y).toBeGreaterThan(block.children[0]!.bounds.y);
  });

  it("a stack reserves the ink its offset sheets paint", () => {
    // Reserving only the front sheet is how stacked components overlapped their neighbours.
    const block = measureBlock({ type: "stack", id: "s", depth: 3, offset: 7, children: [textSpec("a", "replicated")] }, context);
    expect(block.inkBounds.width).toBeCloseTo(block.bounds.width + 14, 1);
    expect(block.inkBounds.height).toBeCloseTo(block.bounds.height + 14, 1);
  });

  it("a spacer reserves space but paints nothing", () => {
    const block = measureBlock({ type: "spacer", id: "s", size: { width: 40, height: 12 } }, context);
    expect(block.bounds.width).toBe(40);
    expect(block.inkBounds.width).toBe(0);
  });

  it("a container's ink is the union of what its children paint", () => {
    const block = measureBlock({ type: "column", id: "c", gap: 4, children: [textSpec("a", "one"), { type: "spacer", id: "s", size: { width: 200, height: 20 } }] }, context);
    // The spacer is wide but paints nothing, so it must not inflate the painted extent.
    expect(block.bounds.width).toBe(200);
    expect(block.inkBounds.width).toBeLessThan(200);
  });
});

describe("bounded width negotiation", () => {
  const long = "Primary service for account reconciliation across international regions";

  it("takes the preferred width when the content fits", () => {
    const result = negotiateWidth({ type: "text", id: "t", text: "API", style: label, maxLines: 2 }, context, {
      preferred: 210,
      alternatives: [320, 420],
    });
    expect(result.width).toBe(210);
    expect(result.attempts).toBe(1);
    expect(result.exhausted).toBe(false);
  });

  it("widens only as far as it must", () => {
    const result = negotiateWidth({ type: "text", id: "t", text: long, style: label, maxLines: 2 }, context, {
      preferred: 120,
      alternatives: [240, 480, 960],
    });
    expect(result.exhausted).toBe(false);
    expect(result.width).toBeGreaterThan(120);
    expect(hasAbbreviatedText(result.block)).toBe(false);
  });

  it("stops at the cap and says the search was exhausted", () => {
    // The contract is "cap alternatives and return the best legal result with
    // diagnostics", not "keep expanding until the diagram happens to fit".
    const result = negotiateWidth({ type: "text", id: "t", text: long, style: label, maxLines: 1 }, context, {
      preferred: 60,
      alternatives: [80, 100],
      max: 100,
    });
    expect(result.exhausted).toBe(true);
    expect(result.width).toBeLessThanOrEqual(100);
    expect(hasAbbreviatedText(result.block)).toBe(true);
  });

  it("never exceeds the maximum, whatever the alternatives ask for", () => {
    const result = negotiateWidth({ type: "text", id: "t", text: long, style: label, maxLines: 1 }, context, {
      preferred: 50,
      alternatives: [5000],
      max: 150,
    });
    expect(result.width).toBeLessThanOrEqual(150);
  });

  it("does not call a wrapped run abbreviated", () => {
    // Wrapping moves the spaces; it does not lose characters.
    const wrapped = measureBlock({ type: "text", id: "t", text: long, style: label, maxLines: 9 }, { ...context, availableWidth: 120 });
    expect(hasAbbreviatedText(wrapped)).toBe(false);
  });
});

describe("silhouettes", () => {
  const bounds = { x: 10, y: 20, width: 100, height: 60 };

  it("a rect attaches on its edges", () => {
    const rect: Silhouette = { kind: "rect", bounds };
    expect(silhouettePoint(rect, "west", 0.5)).toEqual({ x: 10, y: 50 });
    expect(silhouettePoint(rect, "east", 0.5)).toEqual({ x: 110, y: 50 });
  });

  it("a diamond attaches on its corners, not its rectangle", () => {
    // A side midpoint of the bounding box is outside a diamond entirely, which is exactly
    // how a connector ends up visibly detached from a decision.
    const diamond: Silhouette = { kind: "diamond", bounds };
    expect(silhouettePoint(diamond, "north", 0.5)).toEqual({ x: 60, y: 20 });
    expect(silhouettePoint(diamond, "west", 0.5)).toEqual({ x: 10, y: 50 });
  });

  it("a cylinder attaches on its straight body, clear of the caps", () => {
    const cylinder: Silhouette = { kind: "cylinder", bounds, capHeight: 12 };
    const top = silhouettePoint(cylinder, "west", 0);
    const bottom = silhouettePoint(cylinder, "west", 1);
    expect(top.y).toBeGreaterThanOrEqual(bounds.y + 12);
    expect(bottom.y).toBeLessThanOrEqual(bounds.y + bounds.height - 12);
  });

  it("a lifeline attaches along its length", () => {
    const lifeline: Silhouette = { kind: "lifeline", x: 70, top: 52, bottom: 452 };
    expect(silhouettePoint(lifeline, "east", 0)).toEqual({ x: 70, y: 52 });
    expect(silhouettePoint(lifeline, "east", 0.5)).toEqual({ x: 70, y: 252 });
  });

  it("ink is larger than layout for a cylinder and a stack", () => {
    expect(silhouetteInk({ kind: "cylinder", bounds, capHeight: 12 }).height).toBeGreaterThan(bounds.height);
    expect(silhouetteInk({ kind: "stack", bounds, offset: 7, sheets: 3 }).width).toBeCloseTo(bounds.width + 14, 1);
    // A plain rect paints exactly its bounds.
    expect(silhouetteInk({ kind: "rect", bounds })).toEqual(bounds);
  });

  it("clamps a fraction outside 0..1 onto the outline", () => {
    const rect: Silhouette = { kind: "rect", bounds };
    expect(silhouettePoint(rect, "west", -5)).toEqual(silhouettePoint(rect, "west", 0));
    expect(silhouettePoint(rect, "west", 5)).toEqual(silhouettePoint(rect, "west", 1));
  });
});

describe("attachment sites", () => {
  const bounds = { x: 0, y: 0, width: 100, height: 90 };

  it("spaces several sites along one side so connectors stay distinguishable", () => {
    const sites = sideAttachments({ kind: "rect", bounds }, "east", 3, "n1");
    expect(sites).toHaveLength(3);
    const ys = sites.map((site) => site.point.y);
    expect([...ys].sort((a, b) => a - b)).toEqual(ys);
    // Never coincident: that is what makes three relationships read as three lines.
    expect(new Set(ys).size).toBe(3);
    for (const site of sites) expect(site.point.x).toBe(100);
  });

  it("derives one site per table row, pointing at the row it belongs to", () => {
    const table = measureBlock(
      {
        type: "table",
        id: "routes",
        columns: [{ id: "path" }],
        rows: ["/app/*", "/api/*", "/mcp/*"].map((path, index) => ({
          id: `r${index}`,
          cells: [{ columnId: "path", content: textSpec(`p${index}`, path, 1) }],
        })),
      },
      context,
    );
    const sites = rowAttachments(table, "east", "gw");
    expect(sites).toHaveLength(3);
    expect(sites.map((site) => site.region)).toEqual(["r0", "r1", "r2"]);
    if (table.type !== "table") return;
    // Each site sits at the vertical centre of its own row.
    for (const [index, site] of sites.entries()) {
      const row = table.rows[index]!;
      expect(site.point.y).toBeCloseTo(row.bounds.y + row.bounds.height / 2, 1);
    }
  });

  it("returns nothing for a block that is not a table", () => {
    expect(rowAttachments(measureBlock(textSpec("t", "x"), context), "east", "p")).toEqual([]);
  });
});

describe("component ink", () => {
  it("unions the silhouette with everything the blocks paint", () => {
    const blocks: MeasuredBlock[] = [measureBlock(textSpec("t", "Payments API"), context)];
    const ink = componentInk({ kind: "rect", bounds: { x: 0, y: 0, width: 40, height: 20 } }, blocks);
    // The label is wider than the 40px box, so the painted extent has to say so.
    expect(ink.width).toBeGreaterThan(40);
  });

  it("measures the extent of a set of placed blocks", () => {
    const column = measureBlock({ type: "column", id: "c", gap: 4, children: [textSpec("a", "one"), textSpec("b", "two")] }, context);
    if (column.type !== "column") return;
    expect(blocksExtent(column.children).height).toBeCloseTo(column.bounds.height, 1);
  });
});
