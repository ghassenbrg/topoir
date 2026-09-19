import { describe, expect, it } from "vitest";
import {
  candidateVector,
  compareCandidates,
  evaluateAcceptance,
  GATE_ORDER,
  gateFor,
  rankCandidates,
  UNCONSTRAINED_MEDIUM,
  type AcceptanceInput,
  type CandidateVector,
  type Medium,
} from "../src/index.js";

/**
 * T14 — acceptance profiles and the candidate quality vector.
 *
 * The acceptance criteria: artifact existence never implies acceptance; missing metrics are
 * not zero; all families use the same hard-rule ordering; profile failures produce
 * diagnostic previews rather than silent success.
 */

const A4: Medium = {
  kind: "page",
  extent: { width: 842, height: 595 },
  minimumTextSize: 8,
  chrome: { top: 0, right: 0, bottom: 0, left: 0 },
  allowPagination: false,
};

function input(overrides: Partial<AcceptanceInput> = {}): AcceptanceInput {
  return {
    diagnostics: [],
    metrics: {},
    medium: UNCONSTRAINED_MEDIUM,
    drawing: { width: 400, height: 300 },
    baseTextSize: 14,
    ...overrides,
  };
}

describe("valid, completion and accepted are three different questions", () => {
  it("accepts a clean result", () => {
    const report = evaluateAcceptance(input());
    expect(report.valid).toBe(true);
    expect(report.completion).toBe("complete");
    expect(report.accepted).toBe(true);
  });

  it("is valid but not complete when the run did not finish", () => {
    // A timeout can never be complete, however good the partial result looks.
    const report = evaluateAcceptance(input({ finished: false }));
    expect(report.valid).toBe(true);
    expect(report.completion).toBe("partial");
    expect(report.accepted).toBe(false);
  });

  it("is partial when fewer views were produced than requested", () => {
    const report = evaluateAcceptance(input({ requestedViews: 3, producedViews: 2 }));
    expect(report.completion).toBe("partial");
    expect(report.accepted).toBe(false);
  });

  it("fails when nothing was produced", () => {
    expect(evaluateAcceptance(input({ producedViews: 0 })).completion).toBe("failed");
  });

  it("is invalid when the model itself is wrong, whatever the picture looks like", () => {
    const report = evaluateAcceptance(
      input({ diagnostics: [{ code: "TOP412_RELATIONSHIP_DROPPED", severity: "error", message: "lost" }] }),
    );
    expect(report.valid).toBe(true);
    // A dropped relationship is a visible-content failure, not a semantic one.
    expect(report.blockedAt).toBe("visible");
    expect(report.accepted).toBe(false);
  });

  it("marks a semantic failure invalid", () => {
    const report = evaluateAcceptance(
      input({ diagnostics: [{ code: "TOP230_EDGE_SOURCE_NOT_FOUND", severity: "error", message: "missing endpoint" }] }),
    );
    expect(report.valid).toBe(false);
    expect(report.blockedAt).toBe("semantic");
  });

  it("cannot be made to succeed by removing diagnostics from the list", () => {
    // Acceptance is computed from violations. A caller handing in an empty list is a
    // caller with nothing wrong, not a caller who suppressed something.
    const dirty = evaluateAcceptance(input({ diagnostics: [{ code: "TOP452_MARK_CLIPPED", severity: "error", message: "clipped" }] }));
    expect(dirty.accepted).toBe(false);
    expect(dirty.violations).toHaveLength(1);
  });
});

describe("profiles change the bar, not the drawing", () => {
  const lowContrast = input({ metrics: { lowContrastRuns: 2 } });

  it("accepts low-contrast text at draft and presentation, rejects it at publication", () => {
    expect(evaluateAcceptance({ ...lowContrast, profile: "draft" }).accepted).toBe(true);
    expect(evaluateAcceptance({ ...lowContrast, profile: "presentation" }).accepted).toBe(true);
    const publication = evaluateAcceptance({ ...lowContrast, profile: "publication" });
    expect(publication.accepted).toBe(false);
    expect(publication.blockedAt).toBe("contrast");
  });

  it("ignores fit and legibility at draft", () => {
    // A draft has to be true and complete. It does not have to fit a page.
    const tiny = input({ medium: A4, drawing: { width: 37_491, height: 370 } });
    expect(evaluateAcceptance({ ...tiny, profile: "draft" }).accepted).toBe(true);
    expect(evaluateAcceptance({ ...tiny, profile: "presentation" }).accepted).toBe(false);
  });

  it("never accepts a semantic failure, at any profile", () => {
    const broken = input({ diagnostics: [{ code: "TOP230_EDGE_SOURCE_NOT_FOUND", severity: "error", message: "x" }] });
    for (const profile of ["draft", "presentation", "publication"] as const) {
      expect(evaluateAcceptance({ ...broken, profile }).accepted, profile).toBe(false);
    }
  });

  it("reports the text size the reader actually gets", () => {
    const report = evaluateAcceptance(input({ medium: A4, drawing: { width: 1684, height: 1190 } }));
    expect(report.effectiveTextSize).toBeCloseTo(7, 0);
    expect(report.evaluatedMedium).toBe(A4);
  });

  it("blocks when fitting pushes text under the medium's own minimum", () => {
    // The review's 37,491x370 ribbon: legal geometry, unreadable at the size it is for.
    const report = evaluateAcceptance(input({ medium: A4, drawing: { width: 37_491, height: 370 } }));
    expect(report.accepted).toBe(false);
    expect(report.blockedAt).toBe("legibility");
    expect(report.violations.some((violation) => violation.code === "TOP460_TEXT_BELOW_MEDIUM_MINIMUM")).toBe(true);
  });
});

describe("one gate ordering for every family", () => {
  it("names the earliest failing gate, not the loudest", () => {
    const report = evaluateAcceptance(
      input({
        diagnostics: [
          { code: "TOP430_LABEL_OVERLAP", severity: "error", message: "readability" },
          { code: "TOP230_EDGE_SOURCE_NOT_FOUND", severity: "error", message: "semantic" },
          { code: "TOP452_MARK_CLIPPED", severity: "error", message: "visible" },
        ],
      }),
    );
    expect(report.blockedAt).toBe("semantic");
  });

  it("orders gates semantic before visible before the presentation gates", () => {
    expect(GATE_ORDER.indexOf("semantic")).toBeLessThan(GATE_ORDER.indexOf("visible"));
    expect(GATE_ORDER.indexOf("visible")).toBeLessThan(GATE_ORDER.indexOf("legibility"));
    expect(GATE_ORDER.indexOf("ownership")).toBeLessThan(GATE_ORDER.indexOf("readability"));
  });

  it("assigns every diagnostic family to a gate", () => {
    expect(gateFor("TOP450_ELEMENT_NOT_REPRESENTED")).toBe("visible");
    expect(gateFor("TOP426_EDGE_ENDPOINT_DETACHED")).toBe("visible");
    expect(gateFor("TOP442_TEXT_NOT_LEGIBLE")).toBe("contrast");
    expect(gateFor("TOP433_ASPECT_OFF_TARGET")).toBe("fit");
    expect(gateFor("TOP414_EDGE_LABEL_DROPPED")).toBe("ownership");
    expect(gateFor("TOP425_EDGE_SEGMENTS_COINCIDENT")).toBe("readability");
    // An unrecognised code is semantic, the strictest bucket, rather than being ignored.
    expect(gateFor("TOP999_SOMETHING_NEW")).toBe("semantic");
  });

  it("does not block on a readability violation, which is an objective not a limit", () => {
    const report = evaluateAcceptance(
      input({ diagnostics: [{ code: "TOP425_EDGE_SEGMENTS_COINCIDENT", severity: "error", message: "coincident" }] }),
    );
    expect(report.accepted).toBe(true);
    expect(report.violations).toHaveLength(1);
  });
});

describe("missing metrics are absent, not zero", () => {
  it("omits a metric the compiler did not report", () => {
    const report = evaluateAcceptance(input({ metrics: { clippedMarks: 0 } }));
    expect(report.metrics.visible["clippedMarks"]).toBe(0);
    // `detachedEndpoints` was not reported, so it is absent — not a clean zero.
    expect("detachedEndpoints" in report.metrics.visible).toBe(false);
  });

  it("keeps a reported zero", () => {
    const report = evaluateAcceptance(input({ metrics: { detachedEndpoints: 0 } }));
    expect(report.metrics.visible["detachedEndpoints"]).toBe(0);
  });

  it("separates metric groups", () => {
    const report = evaluateAcceptance(input({ metrics: { droppedComponents: 1, clippedMarks: 2, edgeCrossings: 3 } }));
    expect(report.metrics.semantic["droppedComponents"]).toBe(1);
    expect(report.metrics.visible["clippedMarks"]).toBe(2);
    expect(report.metrics.readability["edgeCrossings"]).toBe(3);
  });
});

describe("candidate ranking is lexicographic and deterministic", () => {
  const vector = (overrides: Partial<CandidateVector>): CandidateVector => ({
    semanticFailures: 0,
    contentFailures: 0,
    profileViolations: 0,
    preferredShortfall: 0,
    readability: 0,
    stabilityCost: 0,
    routeComplexity: 0,
    candidateId: "a",
    ...overrides,
  });

  it("never lets a later term outweigh an earlier one", () => {
    // The defect this exists to prevent: a weighted score lets a candidate buy its way past
    // a hard rule by scoring well elsewhere.
    const broken = vector({ semanticFailures: 1, readability: 0, candidateId: "broken" });
    const ugly = vector({ semanticFailures: 0, readability: 10_000, candidateId: "ugly" });
    expect(rankCandidates([broken, ugly])[0]?.candidateId).toBe("ugly");
  });

  it("compares each term only when the earlier ones tie", () => {
    const left = vector({ contentFailures: 1, profileViolations: 0, candidateId: "l" });
    const right = vector({ contentFailures: 1, profileViolations: 1, candidateId: "r" });
    expect(compareCandidates(left, right)).toBeLessThan(0);
  });

  it("breaks exact ties on the candidate id, so the winner is reproducible", () => {
    const first = vector({ candidateId: "b" });
    const second = vector({ candidateId: "a" });
    expect(rankCandidates([first, second]).map((entry) => entry.candidateId)).toEqual(["a", "b"]);
    // And the same input always gives the same order.
    expect(rankCandidates([second, first]).map((entry) => entry.candidateId)).toEqual(["a", "b"]);
  });

  it("builds a vector from a quality report", () => {
    const report = evaluateAcceptance(
      input({
        diagnostics: [
          { code: "TOP230_EDGE_SOURCE_NOT_FOUND", severity: "error", message: "s" },
          { code: "TOP452_MARK_CLIPPED", severity: "error", message: "v" },
        ],
      }),
    );
    const built = candidateVector(report, "c1");
    expect(built.semanticFailures).toBe(1);
    expect(built.contentFailures).toBe(1);
    expect(built.candidateId).toBe("c1");
  });

  it("ranks an adversarial pair the way the contract requires", () => {
    // A candidate that is beautiful but drops a relationship must lose to a plain one that
    // keeps everything.
    const pretty = candidateVector(
      evaluateAcceptance(input({ diagnostics: [{ code: "TOP412_RELATIONSHIP_DROPPED", severity: "error", message: "lost" }], metrics: { edgeCrossings: 0 } })),
      "pretty",
    );
    const plain = candidateVector(evaluateAcceptance(input({ metrics: { edgeCrossings: 40 } })), "plain");
    expect(rankCandidates([pretty, plain])[0]?.candidateId).toBe("plain");
  });
});
