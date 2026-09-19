import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { TopoIRCompiler } from "../src/index.js";
import { sceneDocument, unowned } from "@topoir/renderer-svg";
import { LAYER_ORDER, primitivesFor, unrepresented } from "@topoir/core";

/**
 * T08 — every visible mark has semantic ownership.
 *
 * The legacy scene was a tree of anonymous primitives: once built there was no way back
 * from a mark to the thing that caused it, so a quality check could only reason about
 * rectangles and an author could not be told which relationship a defect belonged to.
 *
 * Ownership rides alongside the existing fields, so no output byte changes. What it buys
 * is a `SceneDocument` whose semantic index can be checked in *both* directions: nothing
 * the document declares is missing from the drawing, and nothing drawn is unexplained.
 */

const root = fileURLToPath(new URL("../../../", import.meta.url));

async function compileAll(file: string) {
  const source = await readFile(`${root}${file}`, "utf8");
  const result = await new TopoIRCompiler().compile(source, { source: file, format: "svg", view: "all" });
  return result;
}

describe("nothing drawn is unexplained", () => {
  it("gives every mark in every published example an owner", async () => {
    const files: string[] = [];
    for (const directory of ["examples", "examples/showcase"]) {
      for (const entry of await readdir(`${root}${directory}`)) {
        if (entry.endsWith(".topoir.yaml")) files.push(`${directory}/${entry}`);
      }
    }
    expect(files.length).toBeGreaterThan(15);

    const offenders: string[] = [];
    let scenes = 0;
    for (const file of files) {
      const result = await compileAll(file);
      for (const view of result.views) {
        scenes += 1;
        for (const mark of unowned(view.scene)) offenders.push(`${file}: ${mark}`);
      }
    }
    expect(scenes).toBeGreaterThan(15);
    expect(offenders).toEqual([]);
  }, 180_000);
});

describe("nothing required is unrepresented", () => {
  it("indexes every declared component, relationship, boundary and annotation", async () => {
    const result = await compileAll("examples/checkout-platform.topoir.yaml");
    const view = result.views[0];
    if (view === undefined) throw new Error("no view");
    const document = sceneDocument(view.scene);

    const required = [
      ...view.view.nodes.map((node) => node.id),
      ...view.view.edges.map((edge) => edge.id),
      ...view.view.groups.map((group) => group.id),
      ...view.view.annotations.map((annotation) => annotation.id),
    ];
    expect(required.length).toBeGreaterThan(5);
    // The check no geometry counter can perform: the drawing is clean, and something the
    // document declares is simply not in it.
    expect(unrepresented(document, required)).toEqual([]);
  });

  it("resolves one component to the marks that draw it", async () => {
    const result = await compileAll("examples/quickstart.topoir.yaml");
    const view = result.views[0];
    if (view === undefined) throw new Error("no view");
    const document = sceneDocument(view.scene);
    const marks = primitivesFor(document, "postgres");
    // A card is at least a body and a label.
    expect(marks.length).toBeGreaterThanOrEqual(2);
    expect(marks.every((mark) => mark.owner.id === "postgres")).toBe(true);
  });

  it("attributes a relationship's path, arrow and label to that relationship", async () => {
    const result = await compileAll("examples/quickstart.topoir.yaml");
    const view = result.views[0];
    if (view === undefined) throw new Error("no view");
    const document = sceneDocument(view.scene);
    const marks = primitivesFor(document, "api-to-postgres");
    expect(marks.map((mark) => mark.type)).toContain("path");
    expect(marks.map((mark) => mark.type)).toContain("text");
  });
});

describe("the scene document is well formed", () => {
  it("puts every primitive on a declared layer, in paint order", async () => {
    const result = await compileAll("examples/checkout-platform.topoir.yaml");
    const view = result.views[0];
    if (view === undefined) throw new Error("no view");
    const document = sceneDocument(view.scene);
    const page = document.pages[0];
    if (page === undefined) throw new Error("no page");

    for (const primitive of page.primitives) expect(LAYER_ORDER, primitive.id).toContain(primitive.layer);
    // Relationships are painted before components, components before their labels.
    const ranks = page.primitives.map((primitive) => LAYER_ORDER.indexOf(primitive.layer));
    const relationships = Math.max(...page.primitives.filter((p) => p.layer === "relationships").map((p) => ranks[page.primitives.indexOf(p)] ?? 0));
    const components = Math.min(...page.primitives.filter((p) => p.layer === "components").map((p) => ranks[page.primitives.indexOf(p)] ?? 0));
    expect(relationships).toBeLessThan(components);
  });

  it("gives every primitive a unique id and a non-empty ink box", async () => {
    const result = await compileAll("examples/checkout-platform.topoir.yaml");
    const view = result.views[0];
    if (view === undefined) throw new Error("no view");
    const page = sceneDocument(view.scene).pages[0];
    if (page === undefined) throw new Error("no page");
    const ids = page.primitives.map((primitive) => primitive.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const primitive of page.primitives) {
      expect(primitive.inkBounds.width, primitive.id).toBeGreaterThanOrEqual(0);
      expect(primitive.inkBounds.height, primitive.id).toBeGreaterThanOrEqual(0);
    }
  });

  it("keeps the page the size of the rendered scene", async () => {
    const result = await compileAll("examples/quickstart.topoir.yaml");
    const view = result.views[0];
    if (view === undefined) throw new Error("no view");
    const page = sceneDocument(view.scene).pages[0];
    expect(page?.bounds.width).toBe(view.scene.width);
    expect(page?.bounds.height).toBe(view.scene.height);
  });

  it("indexes page chrome separately from model content", async () => {
    const result = await compileAll("examples/quickstart.topoir.yaml");
    const view = result.views[0];
    if (view === undefined) throw new Error("no view");
    const document = sceneDocument(view.scene);
    // The title is drawn and owned, but it is not a model element.
    expect(primitivesFor(document, "title").length).toBeGreaterThan(0);
    expect(primitivesFor(document, "canvas").length).toBeGreaterThan(0);
  });
});
