import type { Diagnostic } from "@topoir/schema";
import type { Medium } from "../scene/medium.js";
import { fitToMedium } from "../scene/medium.js";
import type { Size } from "../ir.js";

/**
 * Acceptance profiles and the candidate quality vector (T14).
 *
 * The review's sharpest point about the result contract: "An artifact can exist without
 * acceptance." Today `ok` conflates three different questions, so a caller cannot tell a
 * diagram that is *correct* from one that is merely *drawable*, and a timeout can return
 * something that looks like success.
 *
 * Three separate answers:
 *
 * - `valid` — the source, its family semantics and its required constraints hold.
 * - `completion` — `complete`, `partial` or `failed`: did the requested work finish.
 * - `accepted` — does the selected scene meet the requested quality profile.
 *
 * A timeout can never be `complete`. Suppressing diagnostics can never make a failed
 * acceptance succeed, because acceptance is computed from violations, not from their
 * absence in a list a caller controls.
 *
 * The legacy `ok` keeps its old meaning and is reported separately, so existing callers are
 * unaffected while new ones can ask the question they actually mean.
 */

export type QualityProfile = "draft" | "presentation" | "publication";
export type Completion = "complete" | "partial" | "failed";

export interface QualityViolation {
  readonly code: string;
  /** Which gate this belongs to. Gates are ordered; see `GATE_ORDER`. */
  readonly gate: Gate;
  readonly severity: "error" | "warning";
  readonly message: string;
  /** The scene or model element it concerns, when it has one. */
  readonly owner?: string;
}

/**
 * Presentation gates, in the order a candidate is judged.
 *
 * The order is the contract's, and it is the same for **every** family. The review found
 * architecture ranking defect count before score while topology and panels used a weighted
 * score — so one family could trade away a constraint another treated as inviolable. One
 * ordering removes that.
 */
export type Gate =
  /** Required content, resolved resources, finite geometry, required constraints. */
  | "semantic"
  /** Clipping, attachment, boundary transitions, hidden segments, overlapping text. */
  | "visible"
  /** Text size against the medium's declared minimum, after fitting. */
  | "legibility"
  /** Contrast, and meaning that rests on colour alone. */
  | "contrast"
  /** The scene fits the requested medium. */
  | "fit"
  /** Every visible relationship label owns a route. */
  | "ownership"
  /** Crossings, bends, density, balance. Optimised, never a hard limit. */
  | "readability";

export const GATE_ORDER: readonly Gate[] = ["semantic", "visible", "legibility", "contrast", "fit", "ownership", "readability"];

/** Which gates a profile treats as blocking. Later profiles add to earlier ones. */
const PROFILE_GATES: Readonly<Record<QualityProfile, readonly Gate[]>> = {
  // A draft has to be *true*, and it has to actually contain what was asked for. It does
  // not have to be pretty, or to fit a page.
  draft: ["semantic", "visible"],
  presentation: ["semantic", "visible", "legibility", "contrast", "fit", "ownership"],
  // Publication adds nothing new to the gate list; it raises thresholds within them.
  publication: ["semantic", "visible", "legibility", "contrast", "fit", "ownership"],
};

/** Contrast required of body text, by profile. Publication asks for the WCAG AA bound. */
const PROFILE_CONTRAST: Readonly<Record<QualityProfile, number>> = {
  draft: 1.5,
  presentation: 3,
  publication: 4.5,
};

export interface QualityReportV2 {
  readonly profile: QualityProfile;
  /** Source, family semantics and required constraints hold. */
  readonly valid: boolean;
  readonly completion: Completion;
  /** The selected scene meets the requested profile. */
  readonly accepted: boolean;
  readonly violations: readonly QualityViolation[];
  /** The gate that blocked acceptance, when one did. */
  readonly blockedAt?: Gate;
  readonly metrics: {
    readonly semantic: Readonly<Record<string, number>>;
    readonly visible: Readonly<Record<string, number>>;
    readonly readability: Readonly<Record<string, number>>;
    readonly stability: Readonly<Record<string, number>>;
  };
  readonly evaluatedMedium: Medium;
  /** The text size the reader actually gets, after fitting to the medium. */
  readonly effectiveTextSize: number;
}

export interface AcceptanceInput {
  readonly profile?: QualityProfile;
  readonly diagnostics: readonly Diagnostic[];
  readonly metrics: Readonly<Record<string, number>>;
  readonly medium: Medium;
  readonly drawing: Size;
  readonly baseTextSize: number;
  /** False when the run did not finish: a timeout, a cancellation, a missing view. */
  readonly finished?: boolean;
  /** Views requested versus views produced, for partial results. */
  readonly requestedViews?: number;
  readonly producedViews?: number;
}

/** Which gate a diagnostic code belongs to. Unknown codes are treated as semantic. */
export function gateFor(code: string): Gate {
  if (code.startsWith("TOP45") || code === "TOP426_EDGE_ENDPOINT_DETACHED" || code === "TOP417_GEOMETRY_OUT_OF_BOUNDS") return "visible";
  if (code === "TOP442_TEXT_NOT_LEGIBLE" || code === "TOP443_TEXT_LOW_CONTRAST") return "contrast";
  if (code === "TOP433_ASPECT_OFF_TARGET" || code === "TOP434_CANVAS_SPARSE") return "fit";
  if (code === "TOP414_EDGE_LABEL_DROPPED") return "ownership";
  if (code.startsWith("TOP43") || code === "TOP425_EDGE_SEGMENTS_COINCIDENT" || code === "TOP423_ILLEGAL_BOUNDARY_CROSSING") return "readability";
  if (code === "TOP440_TEXT_ABBREVIATED" || code.startsWith("TOP41") || code.startsWith("TOP42")) return "visible";
  return "semantic";
}

export function evaluateAcceptance(input: AcceptanceInput): QualityReportV2 {
  const profile = input.profile ?? "presentation";
  const gates = PROFILE_GATES[profile];

  const violations: QualityViolation[] = input.diagnostics.map((diagnostic) => ({
    code: diagnostic.code,
    gate: gateFor(diagnostic.code),
    severity: diagnostic.severity === "error" ? "error" : "warning",
    message: diagnostic.message,
    ...(diagnostic.path === undefined ? {} : { owner: diagnostic.path }),
  }));

  // Legibility and contrast are profile-sensitive, so they are judged here rather than
  // inherited from a diagnostic produced under a different threshold.
  const fit = fitToMedium(input.drawing, input.medium, input.baseTextSize);
  if (!fit.legible) {
    violations.push({
      code: "TOP460_TEXT_BELOW_MEDIUM_MINIMUM",
      gate: "legibility",
      severity: "error",
      message:
        `Fitting this drawing to the requested medium reduces text to ${fit.textSize}px, below the ` +
        `${input.medium.minimumTextSize}px minimum the medium declares. It would not be readable at the size it is for.`,
    });
  }
  if (fit.scale < 1 && !input.medium.allowPagination && fit.scale < 0.999) {
    // Not an error on its own — shrinking to fit is normal — but it is what `fit` means.
    violations.push({
      code: "TOP461_SCALED_TO_FIT",
      gate: "fit",
      severity: fit.legible ? "warning" : "error",
      message: `The drawing is ${Math.round((1 / fit.scale) * 100) / 100}x larger than the medium and was scaled to fit.`,
    });
  }
  const lowContrast = input.metrics["lowContrastRuns"] ?? 0;
  if (lowContrast > 0 && PROFILE_CONTRAST[profile] > 3) {
    violations.push({
      code: "TOP443_TEXT_LOW_CONTRAST",
      gate: "contrast",
      severity: "error",
      message: `${lowContrast} text run${lowContrast === 1 ? "" : "s"} fall below the ${PROFILE_CONTRAST[profile]}:1 contrast the ${profile} profile requires.`,
    });
  }

  // `valid` is about the model, not the picture.
  const valid = !violations.some((violation) => violation.gate === "semantic" && violation.severity === "error");

  // Completion is about whether the work finished, and nothing else. A timeout is never
  // complete, however good the partial result looks.
  const requested = input.requestedViews ?? 1;
  const produced = input.producedViews ?? 1;
  const completion: Completion =
    input.finished === false ? (produced > 0 ? "partial" : "failed") : produced === 0 ? "failed" : produced < requested ? "partial" : "complete";

  // Acceptance walks the gates in order and stops at the first that blocks, so the report
  // names the earliest real problem rather than the loudest one.
  let blockedAt: Gate | undefined;
  for (const gate of GATE_ORDER) {
    if (!gates.includes(gate)) continue;
    if (violations.some((violation) => violation.gate === gate && violation.severity === "error")) {
      blockedAt = gate;
      break;
    }
  }
  const accepted = blockedAt === undefined && completion === "complete" && valid;

  return {
    profile,
    valid,
    completion,
    accepted,
    violations,
    ...(blockedAt === undefined ? {} : { blockedAt }),
    metrics: {
      semantic: pick(input.metrics, ["droppedRelationships", "droppedComponents", "droppedRegions", "droppedAnnotations", "unrepresentedElements", "abbreviatedTextRuns", "omittedGraphemes"]),
      visible: pick(input.metrics, ["clippedMarks", "detachedEndpoints", "outOfBoundsObjects", "regionNestingErrors", "nodeOverlaps", "edgeNodeIntersections", "illegibleRuns", "unownedMarks"]),
      readability: pick(input.metrics, ["edgeCrossings", "coincidentEdgeSegments", "labelOverlaps", "illegalBoundaryCrossings", "aspectRatio", "aspectDeviation", "inkCoverage", "sceneInkCoverage", "lowContrastRuns"]),
      stability: pick(input.metrics, ["displacement", "churn"]),
    },
    evaluatedMedium: input.medium,
    effectiveTextSize: fit.textSize,
  };
}

/**
 * The lexicographic vector a candidate is minimised on.
 *
 * Lexicographic, not weighted, and the same for every family. A weighted score lets a
 * family buy its way past a hard rule by scoring well elsewhere — which is exactly what
 * the review found architecture and topology doing differently from each other. Each term
 * only matters when every earlier term ties.
 */
export interface CandidateVector {
  /** 1. Semantic and required-constraint failures. */
  readonly semanticFailures: number;
  /** 2. Missing content, invalid geometry or unresolved resources. */
  readonly contentFailures: number;
  /** 3. Violations of the requested profile. */
  readonly profileViolations: number;
  /** 4. Weighted shortfall against preferred constraints. */
  readonly preferredShortfall: number;
  /** 5. The family's readability objective. Never overrides an earlier term. */
  readonly readability: number;
  /** 6. Cost of moving things that did not change, when a prior layout was supplied. */
  readonly stabilityCost: number;
  /** 7. Normalised route complexity. */
  readonly routeComplexity: number;
  /** 8. Stable candidate id, so ties break deterministically. */
  readonly candidateId: string;
}

export function candidateVector(report: QualityReportV2, candidateId: string, extra: Partial<CandidateVector> = {}): CandidateVector {
  const errors = (gate: Gate): number => report.violations.filter((violation) => violation.gate === gate && violation.severity === "error").length;
  return {
    semanticFailures: errors("semantic"),
    contentFailures: errors("visible"),
    profileViolations: errors("legibility") + errors("contrast") + errors("fit") + errors("ownership"),
    preferredShortfall: extra.preferredShortfall ?? 0,
    readability:
      extra.readability ??
      (report.metrics.readability["edgeCrossings"] ?? 0) * 0.1 +
        (report.metrics.readability["coincidentEdgeSegments"] ?? 0) +
        (report.metrics.readability["labelOverlaps"] ?? 0),
    stabilityCost: extra.stabilityCost ?? 0,
    routeComplexity: extra.routeComplexity ?? 0,
    candidateId,
  };
}

/**
 * Orders candidates, best first.
 *
 * Returns a negative number when `left` is better. Every term is compared in order and the
 * first difference decides; the id breaks exact ties so the result is deterministic.
 */
export function compareCandidates(left: CandidateVector, right: CandidateVector): number {
  const terms: readonly (keyof CandidateVector)[] = [
    "semanticFailures",
    "contentFailures",
    "profileViolations",
    "preferredShortfall",
    "readability",
    "stabilityCost",
    "routeComplexity",
  ];
  for (const term of terms) {
    const difference = (left[term] as number) - (right[term] as number);
    if (difference !== 0) return difference;
  }
  return left.candidateId.localeCompare(right.candidateId, "en");
}

/** Best first. A stable sort over a total order, so the winner is reproducible. */
export function rankCandidates(candidates: readonly CandidateVector[]): readonly CandidateVector[] {
  return [...candidates].sort(compareCandidates);
}

/**
 * Only metrics that were actually reported.
 *
 * A metric the compiler did not produce is **absent**, not zero. T04 removed that
 * conflation from the benchmarks; it must not come back through the result contract, where
 * a missing check reading as a clean score is exactly how an unimplemented gate becomes a
 * passing grade.
 */
function pick(metrics: Readonly<Record<string, number>>, keys: readonly string[]): Readonly<Record<string, number>> {
  const picked: Record<string, number> = {};
  for (const key of keys) {
    const value = metrics[key];
    if (value !== undefined) picked[key] = value;
  }
  return picked;
}
