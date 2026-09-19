import { topoirSchema } from "@topoir/schema";
import type { Diagnostic } from "@topoir/schema";
import type { ViewGraph } from "./ir.js";
import { themes } from "./theme.js";

/**
 * The single table of what this build can actually do.
 *
 * The review found MCP design discovery listing five compositions and omitting
 * `architecture` and `architecture-map`, both of which are implemented — so an agent
 * following discovery could not see the full tool. The list was a hand-maintained literal
 * that had fallen behind the schema.
 *
 * Everything discoverable is derived from this module, and a test holds it against the
 * schema's own enum, so a composition cannot be added to the schema without appearing
 * here, and cannot be advertised here without existing in the schema.
 */

/**
 * How far a capability actually works.
 *
 * - `implemented` — works, and its quality is covered by the benchmarks.
 * - `experimental` — produces output, but is not covered by a family acceptance gate.
 * - `advisory` — accepted and recorded, but deliberately does not change the drawing.
 * - `unsupported` — accepted by the schema, but not yet executed. Reported when used.
 *
 * `advisory` and `unsupported` are distinct on purpose. Advisory metadata is doing its
 * job when it changes nothing; unsupported intent is a gap, and a caller that sets it is
 * entitled to be told the drawing does not reflect it.
 */
export type Maturity = "implemented" | "experimental" | "advisory" | "unsupported";

export interface Capability {
  readonly id: string;
  readonly kind: "composition" | "intent" | "style" | "format";
  readonly maturity: Maturity;
  readonly summary: string;
  /** The task that will implement this, for anything not yet `implemented`. */
  readonly plannedIn?: string;
}

const COMPOSITIONS: readonly Capability[] = [
  { id: "architecture", kind: "composition", maturity: "implemented", summary: "Grouped infrastructure with boundary-aware routing. The default for system diagrams." },
  { id: "architecture-map", kind: "composition", maturity: "implemented", summary: "Architecture arranged as a spatial map rather than a flow." },
  { id: "topology", kind: "composition", maturity: "implemented", summary: "Graph topology with orthogonal routing." },
  { id: "layers", kind: "composition", maturity: "implemented", summary: "Layered tiers in a single reading direction." },
  { id: "sequence", kind: "composition", maturity: "experimental", summary: "Participant lifelines with ordered messages. Not yet covered by a family acceptance gate.", plannedIn: "T24" },
  { id: "swimlanes", kind: "composition", maturity: "experimental", summary: "Lanes of ownership across a flow. Not yet covered by a family acceptance gate.", plannedIn: "T22" },
  { id: "comparison", kind: "composition", maturity: "experimental", summary: "Side-by-side panels for before/after or option comparison.", plannedIn: "T35" },
];

const INTENTS: readonly Capability[] = [
  {
    id: "design.focus",
    kind: "intent",
    maturity: "unsupported",
    summary:
      "Focusing a component emphasises it. Focusing a group is accepted but does not yet change the drawing, and is reported as TOP252_INTENT_NOT_APPLIED.",
    plannedIn: "T12",
  },
  {
    id: "design.audience",
    kind: "intent",
    maturity: "advisory",
    summary: "Recorded for a calling agent's own use. It deliberately does not change geometry or style.",
  },
  {
    id: "design.takeaway",
    kind: "intent",
    maturity: "advisory",
    summary: "The one sentence a reader should leave with. Recorded, not drawn.",
  },
  {
    id: "design.story",
    kind: "intent",
    maturity: "implemented",
    summary: "Ordered relationships are numbered in the drawing.",
  },
  {
    id: "design.optimize",
    kind: "intent",
    maturity: "implemented",
    summary: "Selects the objective candidate ranking optimises for.",
  },
  {
    id: "layout.aspectRatio",
    kind: "intent",
    maturity: "implemented",
    summary: "Target canvas proportion. Missing it by more than 3x is reported as TOP433_ASPECT_OFF_TARGET.",
  },
];

const FORMATS: readonly Capability[] = [
  { id: "svg", kind: "format", maturity: "implemented", summary: "Vector output with embedded fonts." },
  { id: "png", kind: "format", maturity: "implemented", summary: "Raster output at a requested scale, with logical and pixel dimensions reported separately." },
];

/** Every capability this build exposes, in a stable order. */
export function capabilities(): readonly Capability[] {
  return [
    ...COMPOSITIONS,
    ...INTENTS,
    ...FORMATS,
    ...themes.map(
      (theme): Capability => ({
        id: theme.id,
        kind: "style",
        maturity: "implemented",
        summary: `Visual language: ${theme.language?.component ?? "card"} components, ${theme.language?.boundaries ?? "panel"} boundaries.`,
      }),
    ),
  ];
}

export function capabilitiesOfKind(kind: Capability["kind"]): readonly Capability[] {
  return capabilities().filter((capability) => capability.kind === kind);
}

/**
 * The composition names the schema accepts. Read from the schema rather than repeated, so
 * the two cannot drift.
 */
export function schemaCompositions(): readonly string[] {
  const defs = (topoirSchema as { $defs?: Record<string, unknown> })["$defs"] ?? {};
  const design = defs["design"] as { properties?: { composition?: { enum?: string[] } } } | undefined;
  return design?.properties?.composition?.enum ?? [];
}

/**
 * Intent a view declares that this build does not execute.
 *
 * The review found that focusing a group produced a byte-identical SVG with no diagnostic,
 * so a caller had no way to tell "focus applied" from "focus ignored". Accepted-but-inert
 * intent is now reported.
 */
export function intentDiagnostics(view: ViewGraph): readonly Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const focus = view.design?.focus ?? [];
  const groupIds = new Set(view.groups.map((group) => group.id));
  const focusedGroups = focus.filter((id) => groupIds.has(id));
  if (focusedGroups.length > 0) {
    diagnostics.push({
      code: "TOP252_INTENT_NOT_APPLIED",
      severity: "warning",
      message:
        `View ${JSON.stringify(view.id)} focuses ${focusedGroups.map((id) => JSON.stringify(id)).join(", ")}, ` +
        `which ${focusedGroups.length === 1 ? "is a boundary" : "are boundaries"}. Boundary focus is accepted but is not ` +
        `applied by this build, so the drawing does not reflect it. Focus a component instead, or track T12.`,
    });
  }
  return diagnostics;
}
