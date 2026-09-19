import type { Diagnostic, v1alpha2 } from "@topoir/schema";
import type { Size } from "../ir.js";
import { UNCONSTRAINED_MEDIUM, type Medium } from "../scene/medium.js";

/**
 * Compiling a view's `presentation` block into something executable (T12).
 *
 * The review's finding about intent was that accepted fields did nothing and said nothing:
 * focusing a group produced a byte-identical SVG, and `audience` was documented as advisory
 * without that being visible anywhere. T04 made the *reporting* honest. This makes the
 * fields themselves executable, and keeps the distinction explicit for the ones that are
 * deliberately advisory.
 *
 * Every field in a compiled plan falls into exactly one bucket:
 *
 * - **executable** — it changes the drawing, and this module says how.
 * - **advisory** — it is recorded for the calling agent and deliberately changes nothing.
 * - **unsupported** — accepted by the schema, not executed yet, and reported when used.
 */

export type FieldDisposition = "executable" | "advisory" | "unsupported";

export interface PresentationPlan {
  /** The medium the diagram is being made for. Never absent; an unstated one is explicit. */
  readonly medium: Medium;
  /** True when the caller declared a medium rather than accepting the default. */
  readonly mediumDeclared: boolean;
  /** The smallest text this diagram may use, after resolving audience defaults. */
  readonly minimumTextSize: number;
  readonly focus: readonly string[];
  readonly story: readonly string[];
  readonly audience: "engineering" | "executive" | "presentation" | "learning";
  readonly takeaway?: string;
  readonly question?: string;
  readonly constraints: readonly CompiledConstraint[];
  /** Content that may never be dropped or abbreviated to make the diagram fit. */
  readonly requiredContent: readonly { readonly element: string; readonly field?: string }[];
  readonly detail: "minimal" | "standard" | "full";
  /** What became of every field the caller set. */
  readonly dispositions: readonly FieldRecord[];
}

export interface FieldRecord {
  readonly field: string;
  readonly disposition: FieldDisposition;
  readonly note?: string;
}

export interface CompiledConstraint {
  readonly id: string;
  readonly type: "order" | "place-relative" | "align" | "group";
  readonly strength: "required" | "preferred";
  readonly priority: number;
  /** Elements the constraint applies to, in the order it cares about. */
  readonly items: readonly string[];
  readonly axis?: "x" | "y";
  readonly side?: "above" | "below" | "left" | "right";
  readonly gap?: number;
}

export interface PresentationResult {
  readonly plan: PresentationPlan;
  readonly diagnostics: readonly Diagnostic[];
}

/**
 * Audience defaults.
 *
 * An executive deck is read across a room and a learning diagram is read closely, so the
 * smallest acceptable text differs. These are floors the caller can raise but not lower
 * below what the medium itself demands.
 */
const AUDIENCE_MINIMUM_TEXT: Readonly<Record<string, number>> = {
  engineering: 9,
  learning: 10,
  executive: 14,
  presentation: 16,
};

const MEDIUM_DEFAULTS: Readonly<Record<string, Size>> = {
  page: { width: 842, height: 595 },
  slide: { width: 1600, height: 900 },
  canvas: { width: 1200, height: 800 },
  screen: { width: 1600, height: 1000 },
};

export function compilePresentation(
  presentation: v1alpha2.Presentation | undefined,
  context: { readonly elementIds: ReadonlySet<string>; readonly groupIds: ReadonlySet<string>; readonly viewId: string },
): PresentationResult {
  const diagnostics: Diagnostic[] = [];
  const dispositions: FieldRecord[] = [];
  const intent = presentation?.intent;

  const audience = intent?.audience ?? "engineering";
  if (intent?.audience !== undefined) {
    dispositions.push({
      field: "intent.audience",
      disposition: "executable",
      note: `sets the minimum text size floor to ${AUDIENCE_MINIMUM_TEXT[audience] ?? 9}px`,
    });
  }
  if (intent?.question !== undefined) {
    dispositions.push({ field: "intent.question", disposition: "advisory", note: "recorded for the calling agent; it does not change the drawing" });
  }
  if (intent?.takeaway !== undefined) {
    dispositions.push({ field: "intent.takeaway", disposition: "executable", note: "drawn as the diagram subtitle" });
  }

  // Focus. T04 reported boundary focus as unapplied; T12 applies it.
  const focus: string[] = [];
  for (const id of intent?.focus ?? []) {
    if (context.elementIds.has(id) || context.groupIds.has(id)) {
      focus.push(id);
      continue;
    }
    diagnostics.push({
      code: "TOP251_DESIGN_REFERENCE_NOT_FOUND",
      severity: "error",
      message: `View ${JSON.stringify(context.viewId)} focuses ${JSON.stringify(id)}, which is not an element of its model.`,
    });
  }
  if (focus.length > 0) dispositions.push({ field: "intent.focus", disposition: "executable", note: "emphasises the named components and boundaries" });

  const story: string[] = [];
  for (const id of intent?.story ?? []) {
    if (context.elementIds.has(id)) {
      story.push(id);
      continue;
    }
    diagnostics.push({
      code: "TOP251_DESIGN_REFERENCE_NOT_FOUND",
      severity: "error",
      message: `View ${JSON.stringify(context.viewId)} orders ${JSON.stringify(id)} in its story, which is not an element of its model.`,
    });
  }
  if (story.length > 0) dispositions.push({ field: "intent.story", disposition: "executable", note: "numbers the named relationships in reading order" });

  const { medium, declared } = compileMedium(presentation?.medium, audience);
  if (declared) dispositions.push({ field: "medium", disposition: "executable", note: `${medium.extent.width}x${medium.extent.height}, minimum text ${medium.minimumTextSize}px` });

  const constraints = compileConstraints(presentation?.constraints ?? [], context, diagnostics);
  if (constraints.length > 0) dispositions.push({ field: "constraints", disposition: "executable", note: `${constraints.length} compiled` });

  const requiredContent = (presentation?.contentPolicy?.required ?? []).filter((entry) => {
    if (context.elementIds.has(entry.element) || context.groupIds.has(entry.element)) return true;
    diagnostics.push({
      code: "TOP251_DESIGN_REFERENCE_NOT_FOUND",
      severity: "error",
      message: `View ${JSON.stringify(context.viewId)} requires content of ${JSON.stringify(entry.element)}, which is not an element of its model.`,
    });
    return false;
  });
  if (requiredContent.length > 0) dispositions.push({ field: "contentPolicy.required", disposition: "executable", note: "this content may not be dropped or abbreviated to fit" });

  if (presentation?.composition?.candidates !== undefined) {
    dispositions.push({ field: "composition.candidates", disposition: "unsupported", note: "candidate generation is T19; one candidate is produced" });
    diagnostics.push({
      code: "TOP252_INTENT_NOT_APPLIED",
      severity: "warning",
      message:
        `View ${JSON.stringify(context.viewId)} asks for ${presentation.composition.candidates} composition candidates. ` +
        `This build produces one, so the request does not change the drawing. Tracked as T19.`,
    });
  }

  return {
    plan: {
      medium,
      mediumDeclared: declared,
      minimumTextSize: medium.minimumTextSize,
      focus,
      story,
      audience,
      ...(intent?.takeaway === undefined ? {} : { takeaway: intent.takeaway }),
      ...(intent?.question === undefined ? {} : { question: intent.question }),
      constraints,
      requiredContent,
      detail: presentation?.contentPolicy?.detail ?? "standard",
      dispositions,
    },
    diagnostics,
  };
}

/**
 * Normalizes a declared medium into a concrete one.
 *
 * A fixed-size medium with no dimensions gets its kind's conventional size rather than
 * being rejected — an author who says "slide" has said enough. The effective minimum text
 * size is the larger of what the caller asked for and what the audience demands, because a
 * caller cannot make executive-deck text smaller by naming a number.
 */
export function compileMedium(
  declared: v1alpha2.Medium | undefined,
  audience: string,
): { readonly medium: Medium; readonly declared: boolean } {
  const audienceFloor = AUDIENCE_MINIMUM_TEXT[audience] ?? 9;
  if (declared === undefined) {
    return { medium: { ...UNCONSTRAINED_MEDIUM, minimumTextSize: audienceFloor }, declared: false };
  }
  const fallback = MEDIUM_DEFAULTS[declared.kind] ?? MEDIUM_DEFAULTS["screen"]!;
  const padding = declared.padding ?? 0;
  const extent: Size = {
    width: declared.width ?? fallback.width,
    height: declared.height ?? fallback.height,
  };
  return {
    medium: {
      // A slide is a fixed pixel canvas as far as fitting is concerned.
      kind: declared.kind === "slide" ? "canvas" : declared.kind,
      extent,
      ...(declared.dpi === undefined ? {} : { dpi: declared.dpi }),
      minimumTextSize: Math.max(declared.minTextSize ?? 0, audienceFloor),
      chrome: { top: padding, right: padding, bottom: padding, left: padding },
      allowPagination: declared.fit === "paginate",
    },
    declared: true,
  };
}

/**
 * Compiles constraints and detects the contradictions among them.
 *
 * A required constraint that cannot be satisfied is an error, not a preference that lost a
 * vote. Two required orderings that disagree can never both hold, so the contradiction is
 * reported **with both constraint ids** — an author given only "layout failed" has nothing
 * to act on.
 */
export function compileConstraints(
  declared: readonly v1alpha2.Constraint[],
  context: { readonly elementIds: ReadonlySet<string>; readonly groupIds: ReadonlySet<string>; readonly viewId: string },
  diagnostics: Diagnostic[],
): readonly CompiledConstraint[] {
  const compiled: CompiledConstraint[] = [];
  const seen = new Set<string>();

  for (const constraint of declared) {
    if (seen.has(constraint.id)) {
      diagnostics.push({
        code: "TOP201_DUPLICATE_ID",
        severity: "error",
        message: `Duplicate constraint id ${JSON.stringify(constraint.id)} in view ${JSON.stringify(context.viewId)}.`,
      });
      continue;
    }
    seen.add(constraint.id);

    const items = "items" in constraint ? constraint.items : [constraint.subject, constraint.reference];
    const unknown = items.filter((id) => !context.elementIds.has(id) && !context.groupIds.has(id));
    if (unknown.length > 0) {
      diagnostics.push({
        code: "TOP263_CONSTRAINT_REFERENCE_NOT_FOUND",
        severity: "error",
        message:
          `Constraint ${JSON.stringify(constraint.id)} references ${unknown.map((id) => JSON.stringify(id)).join(", ")}, ` +
          `which ${unknown.length === 1 ? "is not an element" : "are not elements"} of the model this view projects.`,
      });
      continue;
    }

    compiled.push({
      id: constraint.id,
      type: constraint.type,
      strength: constraint.strength ?? "required",
      priority: constraint.priority ?? 5,
      items: [...items],
      ...("axis" in constraint && constraint.axis !== undefined ? { axis: constraint.axis } : {}),
      ...("side" in constraint && constraint.side !== undefined ? { side: constraint.side } : {}),
      ...("gap" in constraint && constraint.gap !== undefined ? { gap: constraint.gap } : {}),
    });
  }

  diagnostics.push(...findContradictions(compiled, context.viewId));
  return compiled;
}

/**
 * Required constraints that cannot all hold at once.
 *
 * Only `required` constraints contradict: two preferences that disagree are a ranking
 * question, and reporting them as errors would make the softer strength useless.
 */
export function findContradictions(constraints: readonly CompiledConstraint[], viewId: string): readonly Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const required = constraints.filter((constraint) => constraint.strength === "required");

  // Ordering: build the "before" pairs each constraint demands on each axis and look for a
  // pair demanded in both directions.
  const pairs = new Map<string, { before: string; after: string; constraint: string }[]>();
  const addPair = (axis: string, before: string, after: string, id: string): void => {
    const key = `${axis}:${[before, after].sort().join("|")}`;
    pairs.set(key, [...(pairs.get(key) ?? []), { before, after, constraint: id }]);
  };
  for (const constraint of required) {
    if (constraint.type === "order") {
      const axis = constraint.axis ?? "x";
      for (let index = 1; index < constraint.items.length; index += 1) {
        addPair(axis, constraint.items[index - 1]!, constraint.items[index]!, constraint.id);
      }
    }
    if (constraint.type === "place-relative" && constraint.side !== undefined) {
      const axis = constraint.side === "left" || constraint.side === "right" ? "x" : "y";
      const [subject, reference] = constraint.items;
      if (subject === undefined || reference === undefined) continue;
      const subjectFirst = constraint.side === "left" || constraint.side === "above";
      addPair(axis, subjectFirst ? subject : reference, subjectFirst ? reference : subject, constraint.id);
    }
  }
  for (const entries of pairs.values()) {
    const forward = entries.filter((entry) => entry.before === entries[0]?.before);
    const backward = entries.filter((entry) => entry.before !== entries[0]?.before);
    if (forward.length === 0 || backward.length === 0) continue;
    const ids = [...new Set(entries.map((entry) => entry.constraint))];
    diagnostics.push({
      code: "TOP264_CONSTRAINTS_CONTRADICT",
      severity: "error",
      message:
        `View ${JSON.stringify(viewId)} has required constraints that cannot all hold: ` +
        `${ids.map((id) => JSON.stringify(id)).join(" and ")} demand opposite orderings of ` +
        `${JSON.stringify(forward[0]!.before)} and ${JSON.stringify(forward[0]!.after)}. ` +
        `Relax one to "preferred", or remove it.`,
    });
  }

  // An element cannot be required to align on an axis and be ordered along the same axis
  // relative to the element it aligns with: aligning fixes them equal, ordering does not.
  for (const align of required.filter((constraint) => constraint.type === "align")) {
    for (const order of required.filter((constraint) => constraint.type === "order")) {
      if (align.axis === undefined || (order.axis ?? "x") !== align.axis) continue;
      const shared = align.items.filter((id) => order.items.includes(id));
      if (shared.length < 2) continue;
      diagnostics.push({
        code: "TOP264_CONSTRAINTS_CONTRADICT",
        severity: "error",
        message:
          `View ${JSON.stringify(viewId)} requires ${JSON.stringify(align.id)} to align ` +
          `${shared.map((id) => JSON.stringify(id)).join(" and ")} on the ${align.axis} axis, while ` +
          `${JSON.stringify(order.id)} requires them to be ordered along it. Alignment fixes them equal; ` +
          `ordering separates them. Relax one to "preferred".`,
      });
    }
  }

  return diagnostics;
}
