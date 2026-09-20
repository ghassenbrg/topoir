import type { CompiledConstraint, GeometryView, LayoutResult, MeasuredView, Medium } from "@topoir/core";
import type { Diagnostic } from "@topoir/schema";

/**
 * What a layout backend can actually do (T15).
 *
 * Composition, placement, routing and refinement were one 940-line module with no stated
 * interface, so "can this backend honour a required ordering constraint?" had no answer
 * short of reading it. A caller could hand a backend a constraint it silently ignored, and
 * the result would look like a layout that simply chose not to obey.
 *
 * A backend declares what it supports. The orchestrator admits work only if the backend
 * can do it, and a **required** constraint a backend cannot honour is a failure — not a
 * preference that quietly lost.
 */

export interface BackendCapabilities {
  /** Constraint types the backend can enforce. */
  readonly constraints: readonly CompiledConstraint["type"][];
  /** Whether it can keep components inside declared boundaries. */
  readonly containment: boolean;
  /** Whether it routes connectors, as opposed to returning straight lines. */
  readonly routing: boolean;
  /** Whether it honours explicit attachment sites rather than choosing its own. */
  readonly attachments: boolean;
  /** Whether it can produce more than one arrangement to choose between. */
  readonly candidates: boolean;
  /** Whether it can take a prior layout and keep unchanged regions in place. */
  readonly stability: boolean;
}

export interface LayoutBackend {
  readonly id: string;
  readonly capabilities: BackendCapabilities;
  layout(view: MeasuredView, request: LayoutRequest): Promise<LayoutResult>;
}

export interface LayoutRequest {
  /** Constraints the presentation plan compiled. */
  readonly constraints?: readonly CompiledConstraint[];
  /** How many arrangements to consider, when the backend supports more than one. */
  readonly candidates?: number;
  /** A previous layout, when stable re-layout was asked for. */
  readonly prior?: GeometryView;
  /** Relationship ids the author ordered, which define the primary path outright. */
  readonly story?: readonly string[];
  /** Required orderings, checked for impossibility against the model's own cycles. */
  readonly requiredOrder?: readonly (readonly string[])[];
  /**
   * The medium the drawing is for, and the text size it starts from.
   *
   * A backend that chooses between arrangements needs this, because "better" is not a
   * property of a drawing on its own. A wider arrangement with fewer crossings can still be
   * the worse one: it is scaled down harder to reach the page, and past a point the text
   * stops being readable at the size it is actually for. Acceptance has always known that;
   * without this the backend did not, and could hand back a layout that scored well on
   * every counter it could see and was then rejected for a reason it was never told about.
   */
  readonly fit?: FitTarget;
}

/** What a drawing has to fit into, for a backend that is choosing between arrangements. */
export interface FitTarget {
  readonly medium: Medium;
  readonly baseTextSize: number;
}

export interface AdmissionResult {
  readonly admitted: boolean;
  readonly diagnostics: readonly Diagnostic[];
}

/**
 * Whether a backend can be asked to do this work.
 *
 * A **required** constraint the backend cannot enforce is an error: the caller asked for
 * something the result would not have, and returning a layout anyway would be a lie about
 * what was honoured. A **preferred** constraint it cannot enforce is a warning, because a
 * preference not being met is a legitimate outcome — but the caller is still told, rather
 * than being left to infer it from the picture.
 */
export function admit(backend: LayoutBackend, request: LayoutRequest): AdmissionResult {
  const diagnostics: Diagnostic[] = [];
  const supported = new Set(backend.capabilities.constraints);

  for (const constraint of request.constraints ?? []) {
    if (supported.has(constraint.type)) continue;
    diagnostics.push({
      code: constraint.strength === "required" ? "TOP470_CONSTRAINT_UNSUPPORTED" : "TOP471_CONSTRAINT_NOT_HONOURED",
      severity: constraint.strength === "required" ? "error" : "warning",
      message:
        `Constraint ${JSON.stringify(constraint.id)} is a ${constraint.type} constraint, which the ` +
        `${JSON.stringify(backend.id)} layout backend cannot enforce. ` +
        (constraint.strength === "required"
          ? `It is required, so the layout was not attempted; a result that ignored it would misreport what was honoured. ` +
            `Relax it to "preferred", or use a backend that supports ${constraint.type}.`
          : `It is preferred, so layout continues without it.`),
    });
  }

  if (request.prior !== undefined && !backend.capabilities.stability) {
    diagnostics.push({
      code: "TOP471_CONSTRAINT_NOT_HONOURED",
      severity: "warning",
      message: `A prior layout was supplied, but ${JSON.stringify(backend.id)} cannot keep unchanged regions in place, so the result is laid out afresh.`,
    });
  }
  if ((request.candidates ?? 1) > 1 && !backend.capabilities.candidates) {
    diagnostics.push({
      code: "TOP471_CONSTRAINT_NOT_HONOURED",
      severity: "warning",
      message: `${request.candidates} candidates were requested, but ${JSON.stringify(backend.id)} produces one arrangement, so there is nothing to choose between.`,
    });
  }

  return { admitted: !diagnostics.some((diagnostic) => diagnostic.severity === "error"), diagnostics };
}

/** Capabilities with everything off, for a backend to spread and set what it has. */
export const NO_CAPABILITIES: BackendCapabilities = {
  constraints: [],
  containment: false,
  routing: false,
  attachments: false,
  candidates: false,
  stability: false,
};
