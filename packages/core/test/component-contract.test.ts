import { describe, expect, it } from "vitest";
import {
  attachmentsOfRole,
  contentExtent,
  fitToMedium,
  incompleteContent,
  LAYER_ORDER,
  primitivesFor,
  primitivesOnLayer,
  unrepresented,
  UNCONSTRAINED_MEDIUM,
  walkBlocks,
  type ComponentPlan,
  type Medium,
  type MeasuredBlock,
  type SceneDocument,
  type ShapedText,
} from "../src/index.js";

/**
 * T05 — the V2 component and scene contracts.
 *
 * The acceptance criterion is that **one** `ComponentPlan` structure can represent a
 * gateway route table, a process decision and an interaction participant, without any of
 * them being bent into the shape of a node in a topology graph. That is the assumption the
 * current IR bakes in, and it is why process and interaction cannot be added on top of it.
 *
 * These are type-level fixtures: they construct real values of the contract and assert the
 * structure holds. The measurement engine that produces them is T07.
 */

function text(source: string, width = 80): ShapedText {
  return {
    source,
    lines: [
      {
        text: source,
        x: 0,
        baseline: 12,
        advance: width,
        inkBounds: { x: 0, y: 2, width, height: 12 },
        continuesPrevious: false,
      },
    ],
    fontFamily: "DejaVu Sans",
    fontSize: 13,
    fontWeight: 600,
    lineHeight: 1.35,
    ascent: 11,
    descent: 3,
    direction: "ltr",
  };
}

function textBlock(id: string, source: string, bounds = { x: 0, y: 0, width: 80, height: 16 }): MeasuredBlock {
  return {
    type: "text",
    id,
    contentId: id,
    sizing: { min: { width: 40, height: 16 }, preferred: { width: bounds.width, height: bounds.height } },
    bounds,
    inkBounds: bounds,
    text: text(source, bounds.width),
  };
}

/**
 * An architecture gateway with a visible route table. Each route row is separately
 * attachable, so a connector meets the row it is drawn against rather than the card edge.
 */
function gatewayPlan(): ComponentPlan {
  const rows = ["/app/*", "/api/*", "/mcp/*"];
  return {
    id: "plan-gateway",
    occurrenceId: "occ-gateway",
    semanticRef: { kind: "occurrence", id: "gateway" },
    template: { id: "architecture.component", version: "1" },
    size: { min: { width: 180, height: 120 }, preferred: { width: 220, height: 160 } },
    layoutBounds: { x: 0, y: 0, width: 220, height: 160 },
    inkBounds: { x: -1, y: -1, width: 222, height: 162 },
    silhouette: { kind: "rect", bounds: { x: 0, y: 0, width: 220, height: 160 }, radius: 10 },
    blocks: [
      textBlock("gateway-label", "Edge gateway"),
      {
        type: "table",
        id: "gateway-routes",
        sizing: { min: { width: 180, height: 84 }, preferred: { width: 200, height: 84 } },
        bounds: { x: 10, y: 40, width: 200, height: 84 },
        inkBounds: { x: 10, y: 40, width: 200, height: 84 },
        columns: [{ id: "path", align: "start", width: 200 }],
        rows: rows.map((path, index) => ({
          id: `route-${index}`,
          bounds: { x: 10, y: 40 + index * 28, width: 200, height: 28 },
          cells: [
            {
              columnId: "path",
              bounds: { x: 14, y: 44 + index * 28, width: 192, height: 20 },
              content: textBlock(`route-${index}-label`, path, { x: 14, y: 44 + index * 28, width: 192, height: 20 }),
            },
          ],
        })),
      },
    ],
    attachments: rows.map((_, index) => ({
      id: `gateway-route-${index}`,
      role: "row" as const,
      point: { x: 220, y: 54 + index * 28 },
      normal: { x: 1, y: 0 },
      region: `route-${index}`,
      allowedDirections: ["east"] as const,
      capacity: 1,
    })),
    content: [
      { contentId: "gateway-label", kind: "rendered", sceneIds: ["s1"] },
      ...rows.map((_, index) => ({ contentId: `route-${index}-label`, kind: "rendered" as const, sceneIds: [`s${index + 2}`] })),
    ],
    accessibility: {
      label: "Edge gateway",
      readingOrder: ["gateway-label", "gateway-routes"],
    },
  };
}

/**
 * A process decision. Its silhouette is a diamond, and its outgoing attachments carry
 * outcome labels — neither of which a rectangle-and-side-midpoint model can express.
 */
function decisionPlan(): ComponentPlan {
  return {
    id: "plan-decision",
    occurrenceId: "occ-decision",
    semanticRef: { kind: "occurrence", id: "payment-authorized" },
    template: { id: "process.decision", version: "1" },
    size: { min: { width: 140, height: 100 }, preferred: { width: 160, height: 110 } },
    layoutBounds: { x: 0, y: 0, width: 160, height: 110 },
    inkBounds: { x: 0, y: 0, width: 160, height: 110 },
    silhouette: { kind: "diamond", bounds: { x: 0, y: 0, width: 160, height: 110 } },
    blocks: [textBlock("decision-label", "Payment authorised?", { x: 24, y: 40, width: 112, height: 30 })],
    attachments: [
      { id: "decision-in", role: "side", point: { x: 0, y: 55 }, normal: { x: -1, y: 0 }, allowedDirections: ["west"], capacity: 4 },
      {
        id: "decision-yes",
        role: "side",
        point: { x: 160, y: 55 },
        normal: { x: 1, y: 0 },
        allowedDirections: ["east"],
        capacity: 1,
        labelBounds: { x: 164, y: 42, width: 30, height: 16 },
      },
      {
        id: "decision-no",
        role: "side",
        point: { x: 80, y: 110 },
        normal: { x: 0, y: 1 },
        allowedDirections: ["south"],
        capacity: 1,
        labelBounds: { x: 84, y: 114, width: 24, height: 16 },
      },
    ],
    content: [{ contentId: "decision-label", kind: "rendered", sceneIds: ["s10"] }],
    accessibility: { label: "Decision: payment authorised?", readingOrder: ["decision-label"] },
  };
}

/**
 * An interaction participant. Its attachment surface is a lifeline, and its attachments
 * are positions in time, not sides of a box. Nothing about this is a graph node.
 */
function participantPlan(): ComponentPlan {
  return {
    id: "plan-participant",
    occurrenceId: "occ-participant",
    semanticRef: { kind: "occurrence", id: "identity-service" },
    template: { id: "interaction.participant", version: "1" },
    size: { min: { width: 120, height: 48 }, preferred: { width: 140, height: 52 } },
    layoutBounds: { x: 0, y: 0, width: 140, height: 52 },
    inkBounds: { x: 0, y: 0, width: 140, height: 640 },
    silhouette: { kind: "lifeline", x: 70, top: 52, bottom: 640 },
    blocks: [textBlock("participant-label", "Identity service", { x: 10, y: 16, width: 120, height: 20 })],
    attachments: [
      { id: "event-1", role: "event", point: { x: 70, y: 120 }, normal: { x: 1, y: 0 }, allowedDirections: ["east", "west"], capacity: 1 },
      { id: "event-2", role: "event", point: { x: 70, y: 188 }, normal: { x: -1, y: 0 }, allowedDirections: ["east", "west"], capacity: 1 },
      { id: "event-3", role: "event", point: { x: 70, y: 256 }, normal: { x: 1, y: 0 }, allowedDirections: ["east", "west"], capacity: 1 },
    ],
    content: [{ contentId: "participant-label", kind: "rendered", sceneIds: ["s20"] }],
    accessibility: { label: "Participant: identity service", readingOrder: ["participant-label"] },
  };
}

describe("one component plan covers three families", () => {
  const plans = { gateway: gatewayPlan(), decision: decisionPlan(), participant: participantPlan() };

  it("represents a gateway route table with per-row attachments", () => {
    const plan = plans.gateway;
    const table = plan.blocks.find((block) => block.type === "table");
    expect(table?.type).toBe("table");
    // Each visible route row is separately attachable, so a connector meets the row it is
    // drawn against rather than an arbitrary point on the card edge.
    const rowSites = attachmentsOfRole(plan, "row");
    expect(rowSites).toHaveLength(3);
    expect(rowSites.map((site) => site.region)).toEqual(["route-0", "route-1", "route-2"]);
  });

  it("represents a process decision with a diamond silhouette and outcome labels", () => {
    const plan = plans.decision;
    expect(plan.silhouette.kind).toBe("diamond");
    // Outcome labels belong to the attachment, not to the component or to a floating rect.
    const labelled = plan.attachments.filter((site) => site.labelBounds !== undefined);
    expect(labelled.map((site) => site.id)).toEqual(["decision-yes", "decision-no"]);
  });

  it("represents an interaction participant as a lifeline with timed attachments", () => {
    const plan = plans.participant;
    expect(plan.silhouette.kind).toBe("lifeline");
    const events = attachmentsOfRole(plan, "event");
    expect(events).toHaveLength(3);
    // Events are ordered in time down the lifeline, not spread around a perimeter.
    const ys = events.map((site) => site.point.y);
    expect([...ys].sort((left, right) => left - right)).toEqual(ys);
    // The header is small but the lifeline's ink runs far below it, which is exactly the
    // case a single layout rectangle cannot describe.
    expect(plan.inkBounds.height).toBeGreaterThan(plan.layoutBounds.height * 10);
  });

  it("uses the same structure for all three", () => {
    // The point of the contract: no family needs a field the others do not have.
    for (const [name, plan] of Object.entries(plans)) {
      expect(Object.keys(plan).sort(), name).toEqual(Object.keys(plans.gateway).sort());
      expect(plan.attachments.length, name).toBeGreaterThan(0);
      expect(plan.content.length, name).toBeGreaterThan(0);
      expect(plan.accessibility.label.length, name).toBeGreaterThan(0);
    }
  });

  it("assumes nothing about orthogonal boxes in a topology", () => {
    // Three different silhouettes, three different attachment roles.
    expect(new Set(Object.values(plans).map((plan) => plan.silhouette.kind)).size).toBe(3);
    expect(new Set(Object.values(plans).flatMap((plan) => plan.attachments.map((site) => site.role))).size).toBeGreaterThan(1);
  });
});

describe("content disposition", () => {
  it("reports nothing incomplete when everything rendered", () => {
    expect(incompleteContent(gatewayPlan())).toEqual([]);
  });

  it("surfaces abbreviated and omitted content without comparing pictures", () => {
    const plan: ComponentPlan = {
      ...gatewayPlan(),
      content: [
        { contentId: "gateway-label", kind: "abbreviated", sceneIds: ["s1"], reason: "narrower than preferred", omittedGraphemes: 12 },
        { contentId: "route-2-label", kind: "omitted", sceneIds: [], reason: "no room in the compartment" },
        { contentId: "route-0-label", kind: "rendered", sceneIds: ["s2"] },
      ],
    };
    const incomplete = incompleteContent(plan);
    expect(incomplete.map((entry) => entry.contentId)).toEqual(["gateway-label", "route-2-label"]);
    // Anything other than `rendered` has to say why.
    for (const entry of incomplete) expect(entry.reason).toBeDefined();
  });
});

describe("block walking", () => {
  it("reaches content nested inside a table cell", () => {
    const table = gatewayPlan().blocks.find((block) => block.type === "table");
    if (table === undefined) throw new Error("no table");
    const ids = walkBlocks(table).map((block) => block.id);
    expect(ids).toContain("gateway-routes");
    expect(ids).toContain("route-1-label");
  });

  it("reaches content nested inside rows and columns", () => {
    const nested: MeasuredBlock = {
      type: "column",
      id: "outer",
      sizing: { min: { width: 10, height: 10 }, preferred: { width: 100, height: 40 } },
      bounds: { x: 0, y: 0, width: 100, height: 40 },
      inkBounds: { x: 0, y: 0, width: 100, height: 40 },
      gap: 4,
      align: "start",
      children: [
        {
          type: "row",
          id: "inner",
          sizing: { min: { width: 10, height: 10 }, preferred: { width: 100, height: 18 } },
          bounds: { x: 0, y: 0, width: 100, height: 18 },
          inkBounds: { x: 0, y: 0, width: 100, height: 18 },
          gap: 2,
          align: "center",
          children: [textBlock("deep", "deep")],
        },
      ],
    };
    expect(walkBlocks(nested).map((block) => block.id)).toEqual(["outer", "inner", "deep"]);
  });
});

describe("shaped text", () => {
  it("keeps the authored source alongside the visible lines", () => {
    const shaped = text("Payments API");
    expect(shaped.source).toBe("Payments API");
    expect(shaped.lines.map((line) => line.text).join(" ")).toBe(shaped.source);
  });

  it("marks a mid-word continuation so rejoining cannot insert a space", () => {
    const identifier = "payments-reconciliation-service";
    const shaped: ShapedText = {
      ...text(identifier),
      lines: [
        { text: "payments-reconcili", x: 0, baseline: 12, advance: 100, inkBounds: { x: 0, y: 2, width: 100, height: 12 }, continuesPrevious: false },
        { text: "ation-service", x: 0, baseline: 28, advance: 70, inkBounds: { x: 0, y: 18, width: 70, height: 12 }, continuesPrevious: true },
      ],
    };
    // Joining with the flag gives the source back exactly; joining with spaces would not.
    const rejoined = shaped.lines.map((line, index) => (index === 0 || line.continuesPrevious ? line.text : ` ${line.text}`)).join("");
    expect(rejoined).toBe(identifier);
  });
});

describe("scene document ownership", () => {
  const document: SceneDocument = {
    id: "overview",
    title: "Payments",
    background: "#FFFFFF",
    pages: [
      {
        id: "page-1",
        bounds: { x: 0, y: 0, width: 800, height: 600 },
        primitives: [
          { id: "s1", type: "rect", owner: { kind: "occurrence", id: "api" }, layer: "components", bounds: { x: 0, y: 0, width: 100, height: 60 }, inkBounds: { x: 0, y: 0, width: 100, height: 60 }, fill: "#FFF" },
          { id: "s2", type: "path", owner: { kind: "relationship", id: "api-db" }, layer: "relationships", d: "M0 0L10 0", inkBounds: { x: 0, y: -1, width: 10, height: 2 } },
          { id: "s3", type: "rect", owner: { kind: "chrome", id: "legend" }, layer: "chrome", bounds: { x: 0, y: 560, width: 800, height: 40 }, inkBounds: { x: 0, y: 560, width: 800, height: 40 } },
        ],
      },
    ],
    semanticIndex: { api: ["s1"], "api-db": ["s2"], legend: ["s3"] },
    readingOrder: ["s1", "s2", "s3"],
    content: [],
  };

  it("resolves a model element to the marks that represent it", () => {
    expect(primitivesFor(document, "api").map((primitive) => primitive.id)).toEqual(["s1"]);
  });

  it("names a required element that nothing represents", () => {
    // The check no geometry counter can perform: the drawing is clean, and a declared fact
    // is simply not in it.
    expect(unrepresented(document, ["api", "api-db", "cache"])).toEqual(["cache"]);
  });

  it("gives every primitive an owner, so no mark is unexplained", () => {
    for (const page of document.pages) {
      for (const primitive of page.primitives) {
        expect(primitive.owner.id, primitive.id).toBeTruthy();
        expect(LAYER_ORDER, primitive.id).toContain(primitive.layer);
      }
    }
  });

  it("separates layers", () => {
    const page = document.pages[0];
    if (page === undefined) throw new Error("no page");
    expect(primitivesOnLayer(page, "relationships").map((primitive) => primitive.id)).toEqual(["s2"]);
    expect(primitivesOnLayer(page, "interaction")).toEqual([]);
  });

  it("paints relationships under components and labels over them", () => {
    // Fixed order: a label that falls behind a component in some documents and in front in
    // others is a bug that only shows up sometimes.
    expect(LAYER_ORDER.indexOf("relationships")).toBeLessThan(LAYER_ORDER.indexOf("components"));
    expect(LAYER_ORDER.indexOf("components")).toBeLessThan(LAYER_ORDER.indexOf("relationshipLabels"));
    expect(LAYER_ORDER.indexOf("annotations")).toBeLessThan(LAYER_ORDER.indexOf("chrome"));
  });
});

describe("medium", () => {
  const a4Landscape: Medium = {
    kind: "page",
    extent: { width: 842, height: 595 },
    dpi: 72,
    minimumTextSize: 8,
    chrome: { top: 48, right: 24, bottom: 32, left: 24 },
    allowPagination: true,
  };

  it("subtracts chrome from usable area", () => {
    expect(contentExtent(a4Landscape)).toEqual({ width: 794, height: 515 });
  });

  it("reports a fit that keeps text legible", () => {
    const fit = fitToMedium({ width: 1588, height: 1030 }, a4Landscape, 14);
    expect(fit.scale).toBeCloseTo(0.5, 2);
    expect(fit.textSize).toBeCloseTo(7, 1);
    // 7pt is under this medium's 8pt floor, so this is not a fit, and it says so rather
    // than handing back an unreadable page.
    expect(fit.legible).toBe(false);
  });

  it("accepts a drawing that fits without shrinking", () => {
    const fit = fitToMedium({ width: 400, height: 300 }, a4Landscape, 14);
    expect(fit.scale).toBe(1);
    expect(fit.textSize).toBe(14);
    expect(fit.legible).toBe(true);
  });

  it("reproduces the review's unreadable ribbon as an illegible fit", () => {
    // 37,491x370 with every geometry counter at zero: legal, and unreadable on any page.
    const fit = fitToMedium({ width: 37_491, height: 370 }, a4Landscape, 14);
    expect(fit.legible).toBe(false);
    expect(fit.textSize).toBeLessThan(1);
  });

  it("has an unconstrained default for callers that state no medium", () => {
    expect(fitToMedium({ width: 100, height: 100 }, UNCONSTRAINED_MEDIUM, 14).legible).toBe(true);
  });
});
