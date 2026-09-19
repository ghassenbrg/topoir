import { describe, expect, it } from "vitest";
import { compileConstraints, compileMedium, compilePresentation, findContradictions, type v1alpha2 } from "../src/index.js";

/**
 * T12 — the presentation block, compiled into something executable.
 *
 * The acceptance criteria: every accepted field is executable or explicitly advisory or
 * unsupported; group focus works; medium and effective text minimum are explicit; a
 * contradictory required order returns constraint IDs.
 */

const context = {
  elementIds: new Set(["api", "db", "queue", "submit", "persist"]),
  groupIds: new Set(["production"]),
  viewId: "overview",
};

function compile(presentation: v1alpha2.Presentation) {
  return compilePresentation(presentation, context);
}

describe("every accepted field has a stated disposition", () => {
  it("records each field as executable, advisory or unsupported", () => {
    const result = compile({
      intent: { question: "What is checkout responsible for?", audience: "executive", takeaway: "Two responsibilities.", focus: ["api"], story: ["submit"] },
      medium: { kind: "slide", width: 1600, height: 900 },
      constraints: [{ id: "c", type: "order", items: ["api", "db"], axis: "x" }],
      contentPolicy: { required: [{ element: "api", field: "label" }] },
    });
    const byField = new Map(result.plan.dispositions.map((entry) => [entry.field, entry]));
    expect(byField.get("intent.audience")?.disposition).toBe("executable");
    expect(byField.get("intent.takeaway")?.disposition).toBe("executable");
    expect(byField.get("intent.focus")?.disposition).toBe("executable");
    expect(byField.get("intent.story")?.disposition).toBe("executable");
    expect(byField.get("medium")?.disposition).toBe("executable");
    expect(byField.get("constraints")?.disposition).toBe("executable");
    expect(byField.get("contentPolicy.required")?.disposition).toBe("executable");
    // Deliberately advisory: it is recorded for the calling agent's own use.
    expect(byField.get("intent.question")?.disposition).toBe("advisory");
    for (const entry of result.plan.dispositions) expect(entry.note, entry.field).toBeDefined();
  });

  it("reports a field it accepts but does not execute", () => {
    // Candidate generation is T19. Accepting the number and producing one candidate
    // without saying so is the defect T04 removed; this keeps it removed.
    const result = compile({ composition: { candidates: 3 } });
    expect(result.plan.dispositions.find((entry) => entry.field === "composition.candidates")?.disposition).toBe("unsupported");
    const reported = result.diagnostics.filter((diagnostic) => diagnostic.code === "TOP252_INTENT_NOT_APPLIED");
    expect(reported).toHaveLength(1);
    expect(reported[0]?.message).toContain("T19");
  });

  it("records nothing for fields the caller did not set", () => {
    expect(compile({}).plan.dispositions).toEqual([]);
  });
});

describe("focus and story reference real elements", () => {
  it("accepts focus on a component and on a boundary", () => {
    const result = compile({ intent: { focus: ["api", "production"] } });
    expect(result.diagnostics).toEqual([]);
    expect(result.plan.focus).toEqual(["api", "production"]);
  });

  it("rejects focus on something the model does not contain", () => {
    const result = compile({ intent: { focus: ["nowhere"] } });
    expect(result.diagnostics[0]?.code).toBe("TOP251_DESIGN_REFERENCE_NOT_FOUND");
    expect(result.plan.focus).toEqual([]);
  });

  it("rejects a story step that is not an element", () => {
    expect(compile({ intent: { story: ["nowhere"] } }).diagnostics[0]?.code).toBe("TOP251_DESIGN_REFERENCE_NOT_FOUND");
  });

  it("rejects required content naming something absent", () => {
    expect(compile({ contentPolicy: { required: [{ element: "nowhere" }] } }).diagnostics[0]?.code).toBe("TOP251_DESIGN_REFERENCE_NOT_FOUND");
  });
});

describe("medium and the effective text minimum are explicit", () => {
  it("gives an undeclared medium a concrete default rather than leaving it unknown", () => {
    const { medium, declared } = compileMedium(undefined, "engineering");
    expect(declared).toBe(false);
    expect(medium.extent.width).toBeGreaterThan(0);
    expect(medium.minimumTextSize).toBe(9);
  });

  it("gives a fixed-size medium its conventional size when dimensions are omitted", () => {
    // An author who says "slide" has said enough; rejecting it would be pedantry.
    const { medium } = compileMedium({ kind: "slide" }, "engineering");
    expect(medium.extent).toEqual({ width: 1600, height: 900 });
    const page = compileMedium({ kind: "page" }, "engineering");
    expect(page.medium.extent).toEqual({ width: 842, height: 595 });
  });

  it("uses declared dimensions when given", () => {
    const { medium } = compileMedium({ kind: "canvas", width: 640, height: 480, padding: 16 }, "engineering");
    expect(medium.extent).toEqual({ width: 640, height: 480 });
    expect(medium.chrome).toEqual({ top: 16, right: 16, bottom: 16, left: 16 });
  });

  it("takes the larger of the caller's minimum and the audience floor", () => {
    // A caller cannot make executive-deck text smaller by naming a number.
    expect(compileMedium({ kind: "slide", minTextSize: 8 }, "executive").medium.minimumTextSize).toBe(14);
    expect(compileMedium({ kind: "slide", minTextSize: 20 }, "executive").medium.minimumTextSize).toBe(20);
  });

  it("raises the floor for an audience that reads from further away", () => {
    const floors = (["engineering", "learning", "executive", "presentation"] as const).map(
      (audience) => compileMedium(undefined, audience).medium.minimumTextSize,
    );
    // Monotonic: engineering <= learning <= executive <= presentation.
    expect([...floors].sort((left, right) => left - right)).toEqual(floors);
  });

  it("treats a slide as a fixed pixel canvas for fitting", () => {
    expect(compileMedium({ kind: "slide" }, "engineering").medium.kind).toBe("canvas");
  });

  it("carries pagination only when the caller asked for it", () => {
    expect(compileMedium({ kind: "page", fit: "paginate" }, "engineering").medium.allowPagination).toBe(true);
    expect(compileMedium({ kind: "page", fit: "contain" }, "engineering").medium.allowPagination).toBe(false);
  });

  it("surfaces the effective minimum on the compiled plan", () => {
    expect(compile({ intent: { audience: "presentation" } }).plan.minimumTextSize).toBe(16);
  });
});

describe("each constraint type compiles", () => {
  const cases: readonly v1alpha2.Constraint[] = [
    { id: "order", type: "order", items: ["api", "db"], axis: "x" },
    { id: "relative", type: "place-relative", subject: "db", reference: "api", side: "below", gap: 48 },
    { id: "align", type: "align", items: ["api", "db"], axis: "y" },
    { id: "group", type: "group", items: ["api", "db"] },
  ];

  for (const constraint of cases) {
    it(`compiles a ${constraint.type} constraint`, () => {
      const diagnostics: never[] = [];
      const compiled = compileConstraints([constraint], context, diagnostics as never);
      expect(diagnostics).toEqual([]);
      expect(compiled).toHaveLength(1);
      expect(compiled[0]?.type).toBe(constraint.type);
      // Unstated strength is required, not preferred: an author who states a constraint
      // and no strength has stated a requirement.
      expect(compiled[0]?.strength).toBe("required");
      expect(compiled[0]?.items.length).toBeGreaterThanOrEqual(2);
    });
  }

  it("keeps a declared strength and priority", () => {
    const compiled = compileConstraints(
      [{ id: "c", type: "order", items: ["api", "db"], strength: "preferred", priority: 3 }],
      context,
      [] as never,
    );
    expect(compiled[0]?.strength).toBe("preferred");
    expect(compiled[0]?.priority).toBe(3);
  });

  it("rejects a constraint naming an element the view does not contain", () => {
    const diagnostics: unknown[] = [];
    const compiled = compileConstraints([{ id: "c", type: "order", items: ["api", "nowhere"] }], context, diagnostics as never);
    expect(compiled).toEqual([]);
    expect((diagnostics[0] as { code: string }).code).toBe("TOP263_CONSTRAINT_REFERENCE_NOT_FOUND");
    expect((diagnostics[0] as { message: string }).message).toContain("nowhere");
  });

  it("rejects duplicate constraint ids", () => {
    const diagnostics: unknown[] = [];
    compileConstraints(
      [
        { id: "c", type: "order", items: ["api", "db"] },
        { id: "c", type: "order", items: ["db", "queue"] },
      ],
      context,
      diagnostics as never,
    );
    expect((diagnostics as { code: string }[]).map((entry) => entry.code)).toContain("TOP201_DUPLICATE_ID");
  });
});

describe("contradictory required constraints return their ids", () => {
  const compiled = (constraints: readonly v1alpha2.Constraint[]) =>
    compileConstraints(constraints, context, [] as never);

  it("detects two required orderings that disagree, naming both", () => {
    // An author told only "layout failed" has nothing to act on.
    const diagnostics = findContradictions(
      compiled([
        { id: "forward", type: "order", items: ["api", "db"], axis: "x" },
        { id: "backward", type: "order", items: ["db", "api"], axis: "x" },
      ]),
      "overview",
    );
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.code).toBe("TOP264_CONSTRAINTS_CONTRADICT");
    expect(diagnostics[0]?.severity).toBe("error");
    expect(diagnostics[0]?.message).toContain('"forward"');
    expect(diagnostics[0]?.message).toContain('"backward"');
  });

  it("detects an ordering that contradicts a relative placement", () => {
    const diagnostics = findContradictions(
      compiled([
        { id: "below", type: "place-relative", subject: "db", reference: "api", side: "below" },
        { id: "above", type: "order", items: ["db", "api"], axis: "y" },
      ]),
      "overview",
    );
    // `below` puts api first on y; `above` puts db first. They cannot both hold.
    expect(diagnostics).toHaveLength(0 + 1);
    expect(diagnostics[0]?.message).toContain('"below"');
  });

  it("detects alignment fighting an ordering on the same axis", () => {
    const diagnostics = findContradictions(
      compiled([
        { id: "aligned", type: "align", items: ["api", "db"], axis: "x" },
        { id: "ordered", type: "order", items: ["api", "db"], axis: "x" },
      ]),
      "overview",
    );
    expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain("TOP264_CONSTRAINTS_CONTRADICT");
    expect(diagnostics[0]?.message).toContain("Alignment fixes them equal");
  });

  it("does not report disagreeing preferences as contradictions", () => {
    // Two preferences that disagree are a ranking question. Reporting them as errors would
    // make the softer strength useless.
    const diagnostics = findContradictions(
      compiled([
        { id: "forward", type: "order", items: ["api", "db"], axis: "x", strength: "preferred" },
        { id: "backward", type: "order", items: ["db", "api"], axis: "x", strength: "preferred" },
      ]),
      "overview",
    );
    expect(diagnostics).toEqual([]);
  });

  it("does not report orderings on different axes as contradictions", () => {
    const diagnostics = findContradictions(
      compiled([
        { id: "horizontal", type: "order", items: ["api", "db"], axis: "x" },
        { id: "vertical", type: "order", items: ["db", "api"], axis: "y" },
      ]),
      "overview",
    );
    expect(diagnostics).toEqual([]);
  });

  it("accepts a consistent chain of required orderings", () => {
    const diagnostics = findContradictions(
      compiled([
        { id: "a", type: "order", items: ["api", "db"], axis: "x" },
        { id: "b", type: "order", items: ["db", "queue"], axis: "x" },
      ]),
      "overview",
    );
    expect(diagnostics).toEqual([]);
  });

  it("surfaces contradictions through the full compile, not only the helper", () => {
    const result = compile({
      constraints: [
        { id: "forward", type: "order", items: ["api", "db"], axis: "x" },
        { id: "backward", type: "order", items: ["db", "api"], axis: "x" },
      ],
    });
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain("TOP264_CONSTRAINTS_CONTRADICT");
  });
});
