/**
 * The diagram families this build knows about, and how far each one actually works.
 *
 * The registry is the single answer to "can this build draw a process diagram". A family
 * listed as `planned` has no body schema and is rejected with a message saying so — which
 * is the point. The review's finding about discovery was that an agent following the tool's
 * own inventory could not see what it really supported; the same failure in the other
 * direction, accepting a family and producing nothing useful, would be worse.
 */

export type FamilyMaturity =
  /** Body schema, semantics, layout and quality gates all exist. */
  | "supported"
  /** Body schema exists and compiles, but no family acceptance gate covers it yet. */
  | "experimental"
  /** Named and reserved, with no body schema. Documents using it are rejected. */
  | "planned";

export interface FamilyDescriptor {
  readonly id: string;
  readonly maturity: FamilyMaturity;
  readonly summary: string;
  /** The roadmap task that will implement or promote it. Absent once supported. */
  readonly plannedIn?: string;
}

export const DIAGRAM_FAMILIES: readonly FamilyDescriptor[] = [
  {
    id: "architecture",
    maturity: "supported",
    summary: "Components, boundaries and the relationships between them. The default for system diagrams.",
  },
  {
    id: "process",
    maturity: "planned",
    summary:
      "Tasks, decisions, forks and joins with lane ownership. The body schema does not exist yet, so a document using this family is rejected rather than silently producing an empty diagram.",
    plannedIn: "T21",
  },
  {
    id: "interaction",
    maturity: "planned",
    summary:
      "Participants exchanging ordered messages over lifelines, with activations and fragments. The body schema does not exist yet, so a document using this family is rejected.",
    plannedIn: "T23",
  },
];

export function findFamily(id: string): FamilyDescriptor | undefined {
  return DIAGRAM_FAMILIES.find((family) => family.id === id);
}

/** Families whose bodies this build can actually validate and compile. */
export function acceptedFamilies(): readonly FamilyDescriptor[] {
  return DIAGRAM_FAMILIES.filter((family) => family.maturity !== "planned");
}
