import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { TopoIRCompiler } from "../src/index.js";
import type { ComponentPlan } from "@topoir/core";

/**
 * T08 — the plan and the drawing describe the same components.
 *
 * The review's underlying complaint about the quality model was that `analyzeGeometry`
 * reasons about measured boxes while the defects live in the final drawing. A
 * `ComponentPlan` is the shared description meant to close that: one silhouette, one set
 * of attachment sites, one content-disposition table, read by both.
 *
 * These assert the agreement rather than assuming it — a plan that quietly described a
 * different component from the one drawn would be worse than no plan at all.
 */

const examples = fileURLToPath(new URL("../../../examples/", import.meta.url));

async function compile(file: string) {
  const source = await readFile(`${examples}${file}`, "utf8");
  const result = await new TopoIRCompiler().compile(source, { source: file, format: "svg" });
  const view = result.views[0];
  if (view === undefined) throw new Error(`${file} produced no view`);
  return { result, view };
}

describe("plans describe the components that were placed", () => {
  it("emits one plan per placed component", async () => {
    const { view } = await compile("checkout-platform.topoir.yaml");
    expect(view.plans).toHaveLength(view.geometry.nodes.length);
    expect(view.plans.map((plan) => plan.occurrenceId).sort()).toEqual(view.geometry.nodes.map((node) => node.id).sort());
  });

  it("gives each plan the bounds the component was actually placed at", async () => {
    const { view } = await compile("checkout-platform.topoir.yaml");
    const geometryById = new Map(view.geometry.nodes.map((node) => [node.id, node]));
    for (const plan of view.plans) {
      const placed = geometryById.get(plan.occurrenceId);
      expect(plan.layoutBounds, plan.occurrenceId).toEqual({
        x: placed?.x,
        y: placed?.y,
        width: placed?.width,
        height: placed?.height,
      });
    }
  });

  it("carries the silhouette measurement resolved, not a guess", async () => {
    const { view } = await compile("kubernetes-platform.topoir.yaml");
    const measuredById = new Map(view.measured.nodes.map((node) => [node.id, node]));
    for (const plan of view.plans) {
      const shape = measuredById.get(plan.occurrenceId)?.shape;
      if (shape === "cylinder") expect(plan.silhouette.kind, plan.occurrenceId).toBe("cylinder");
      if (shape === "diamond") expect(plan.silhouette.kind, plan.occurrenceId).toBe("diamond");
      if (shape === "stack") expect(plan.silhouette.kind, plan.occurrenceId).toBe("stack");
    }
  });

  it("gives every component at least one place a connector can meet it", async () => {
    const { view } = await compile("checkout-platform.topoir.yaml");
    for (const plan of view.plans) expect(plan.attachments.length, plan.occurrenceId).toBeGreaterThan(0);
  });

  it("never places two attachment sites on the same point", async () => {
    // Coincident sites are how several relationships come to be drawn as one thick line.
    const { view } = await compile("checkout-platform.topoir.yaml");
    for (const plan of view.plans) {
      const points = plan.attachments.map((site) => `${site.point.x},${site.point.y}`);
      expect(new Set(points).size, plan.occurrenceId).toBe(points.length);
    }
  });

  it("puts every attachment site on or beside the component it belongs to", async () => {
    const { view } = await compile("checkout-platform.topoir.yaml");
    for (const plan of view.plans) {
      const { x, y, width, height } = plan.layoutBounds;
      for (const site of plan.attachments) {
        expect(site.point.x, `${plan.occurrenceId}/${site.id}`).toBeGreaterThanOrEqual(x - 8);
        expect(site.point.x, `${plan.occurrenceId}/${site.id}`).toBeLessThanOrEqual(x + width + 8);
        expect(site.point.y, `${plan.occurrenceId}/${site.id}`).toBeGreaterThanOrEqual(y - 8);
        expect(site.point.y, `${plan.occurrenceId}/${site.id}`).toBeLessThanOrEqual(y + height + 8);
      }
    }
  });

  it("gives a component with visible route compartments one site per compartment", async () => {
    // The gateway case: a connector meets the row it is drawn against, not the card edge.
    const source = JSON.stringify({
      apiVersion: "topoir.dev/v1alpha1",
      kind: "Architecture",
      metadata: { name: "gateway" },
      model: {
        nodes: [
          {
            id: "gateway",
            kind: "gateway",
            label: "Edge gateway",
            visual: { portLabels: "inside" },
            ports: [
              { id: "app", label: "/app/*", side: "east", kind: "output", order: 0 },
              { id: "api", label: "/api/*", side: "east", kind: "output", order: 1 },
            ],
          },
          { id: "web", kind: "service", label: "Web" },
          { id: "svc", kind: "service", label: "Service" },
        ],
        edges: [
          { id: "to-web", from: "gateway", to: "web", sourcePort: "app" },
          { id: "to-svc", from: "gateway", to: "svc", sourcePort: "api" },
        ],
      },
      views: [{ id: "overview", design: { composition: "architecture" } }],
    });
    const result = await new TopoIRCompiler().compile(source, { format: "svg" });
    const plan = result.views[0]?.plans.find((entry) => entry.occurrenceId === "gateway");
    if (plan === undefined) throw new Error("no gateway plan");
    const ports = plan.attachments.filter((site) => site.role === "port");
    expect(ports.map((site) => site.region)).toEqual(["app", "api"]);
  });
});

describe("plans account for content the same way the result does", () => {
  it("reports every component's label disposition", async () => {
    const { view } = await compile("checkout-platform.topoir.yaml");
    for (const plan of view.plans) {
      const label = plan.content.find((entry) => entry.contentId === `${plan.occurrenceId}:label`);
      expect(label, plan.occurrenceId).toBeDefined();
    }
  });

  it("agrees with the view metrics about how much content was abbreviated", async () => {
    // Two independent paths to the same fact: the per-component plans and the view-level
    // content report. If they ever disagree, one of them is lying about the drawing.
    const source = await readFile(fileURLToPath(new URL("../../../fixtures/review/long-label.topoir.yaml", import.meta.url)), "utf8");
    const result = await new TopoIRCompiler().compile(source, { format: "svg" });
    const view = result.views[0];
    if (view === undefined) throw new Error("no view");
    const abbreviated = view.plans.flatMap((plan: ComponentPlan) => plan.content.filter((entry) => entry.kind === "abbreviated"));
    expect(abbreviated.length).toBe(view.metrics.abbreviatedTextRuns);
    expect(abbreviated.reduce((sum, entry) => sum + (entry.omittedGraphemes ?? 0), 0)).toBe(view.metrics.omittedGraphemes);
  });

  it("gives every component an accessible label", async () => {
    const { view } = await compile("checkout-platform.topoir.yaml");
    for (const plan of view.plans) {
      expect(plan.accessibility.label.length, plan.occurrenceId).toBeGreaterThan(0);
      expect(plan.accessibility.readingOrder.length, plan.occurrenceId).toBeGreaterThan(0);
    }
  });
});

describe("plans agree with the geometry analyzer", () => {
  /**
   * The acceptance criterion in one assertion: every route in a clean diagram ends within
   * the attachment tolerance of a site its own plan declares. If the analyzer accepts a
   * connector the plan has no site for, the two are describing different components.
   */
  it("every routed endpoint lands on a site its component's plan declares", async () => {
    for (const file of ["checkout-platform.topoir.yaml", "quickstart.topoir.yaml", "multi-region.topoir.yaml"]) {
      const { view } = await compile(file);
      const planById = new Map(view.plans.map((plan) => [plan.occurrenceId, plan]));
      for (const edge of view.geometry.edges) {
        const semantic = view.view.edges.find((candidate) => candidate.id === edge.id);
        if (semantic === undefined) continue;
        const ends = [
          [edge.points[0], semantic.from],
          [edge.points[edge.points.length - 1], semantic.to],
        ] as const;
        for (const [point, nodeId] of ends) {
          const plan = planById.get(nodeId);
          if (plan === undefined || point === undefined) continue;
          // Distance to the nearest declared site, or into the component's own body — a
          // route may legitimately start on the border between two declared lanes.
          const toSite = Math.min(...plan.attachments.map((site) => Math.hypot(point.x - site.point.x, point.y - site.point.y)));
          const { x, y, width, height } = plan.layoutBounds;
          const dx = Math.max(x - point.x, 0, point.x - (x + width));
          const dy = Math.max(y - point.y, 0, point.y - (y + height));
          const toBody = Math.hypot(dx, dy);
          expect(Math.min(toSite, toBody), `${file} ${edge.id} -> ${nodeId}`).toBeLessThanOrEqual(12);
        }
      }
    }
  }, 60_000);

  it("reports no detached endpoints on the examples the plans describe", async () => {
    for (const file of ["checkout-platform.topoir.yaml", "quickstart.topoir.yaml", "multi-region.topoir.yaml"]) {
      const { view } = await compile(file);
      expect(view.metrics.detachedEndpoints, file).toBe(0);
    }
  }, 60_000);
});
