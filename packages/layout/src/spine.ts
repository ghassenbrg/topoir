import type { MeasuredView } from "@topoir/core";
import type { Diagnostic } from "@topoir/schema";

/**
 * The request spine: the primary path a reader follows (T16).
 *
 * Layering currently treats every relationship as forward progress. A feedback
 * relationship — a callback, a replication ack, a retry — therefore pushes its target a
 * band further along, and the primary flow stops reading in the order it happens in. On a
 * model with a cycle the longest-path pass simply saturates, and the progression is
 * whatever the iteration cap left behind.
 *
 * This separates the three roles a relationship can play:
 *
 * - **spine** — it advances the primary path.
 * - **branch** — it leaves the spine and does not return, such as a write to state.
 * - **feedback** — it runs backwards against the progression.
 *
 * Only spine and branch relationships order the layout. Feedback relationships are still
 * drawn, still routed and still counted; they just stop distorting the reading order.
 */

export type EdgeRole = "spine" | "branch" | "feedback";

export interface SpineAnalysis {
  /** Components on the primary path, in the order a reader meets them. */
  readonly spine: readonly string[];
  readonly edgeRoles: ReadonlyMap<string, EdgeRole>;
  /**
   * Components reached only by branches — state, identity, observability. They belong in a
   * supporting band rather than inline in the primary progression.
   */
  readonly supporting: ReadonlySet<string>;
  readonly diagnostics: readonly Diagnostic[];
}

/**
 * Relationship kinds that advance a request, in preference order.
 *
 * A request reaching a service is progress; a write to a database is a branch off it. This
 * is why a three-tier system reads left to right rather than the database landing in the
 * middle of the flow.
 */
const ADVANCING = new Set(["request", "response", "call", "invoke", "publish", "consume", "async", "stream", "dependency"]);
const SUPPORTING_KINDS = new Set(["read", "write", "replicate", "authenticate", "authorize", "observe"]);

/** Component kinds a reader treats as where the story begins. */
const ENTRY_KINDS = new Set(["client", "external-system", "identity-provider"]);

export interface SpineOptions {
  /** Relationship ids the author ordered explicitly. They define the spine outright. */
  readonly story?: readonly string[];
  /** Required orderings from the presentation plan, checked for impossibility. */
  readonly requiredOrder?: readonly (readonly string[])[];
  readonly viewId?: string;
}

export function analyzeSpine(view: MeasuredView, options: SpineOptions = {}): SpineAnalysis {
  const diagnostics: Diagnostic[] = [];
  const edgeById = new Map(view.edges.map((edge) => [edge.id, edge]));
  const nodeIds = new Set(view.nodes.map((node) => node.id));

  // 1. The spine. An explicit story is the author telling us the order outright; without
  // one it is the longest chain of advancing relationships.
  const storyEdges = (options.story ?? []).map((id) => edgeById.get(id)).filter((edge) => edge !== undefined);
  const spine = storyEdges.length > 0 ? chainFrom(storyEdges) : longestAdvancingChain(view);
  const spineIndex = new Map(spine.map((id, index) => [id, index]));

  // 2. Role each relationship against that order.
  const edgeRoles = new Map<string, EdgeRole>();
  for (const edge of view.edges) {
    const from = spineIndex.get(edge.from);
    const to = spineIndex.get(edge.to);
    if (from !== undefined && to !== undefined) {
      edgeRoles.set(edge.id, to > from ? "spine" : "feedback");
      continue;
    }
    // One end off the spine. It is feedback only if it runs back into the spine from a
    // component the spine already passed through.
    edgeRoles.set(edge.id, "branch");
  }

  // 3. Supporting components: everything not on the spine, reached only by branches.
  const supporting = new Set<string>();
  for (const node of view.nodes) {
    if (spineIndex.has(node.id)) continue;
    const incident = view.edges.filter((edge) => edge.from === node.id || edge.to === node.id);
    if (incident.length === 0) continue;
    if (incident.every((edge) => edgeRoles.get(edge.id) !== "spine")) supporting.add(node.id);
  }

  // 4. A required ordering that contains a cycle can never be monotonic. Reporting it is
  // the difference between "the layout ignored your constraint" and "what you asked for
  // cannot exist".
  for (const order of options.requiredOrder ?? []) {
    const cycle = findCycleAmong(order, view);
    if (cycle === undefined) continue;
    diagnostics.push({
      code: "TOP472_MONOTONIC_PATH_IMPOSSIBLE",
      severity: "error",
      message:
        `View ${JSON.stringify(options.viewId ?? view.id)} requires ${order.map((id) => JSON.stringify(id)).join(" before ")}, ` +
        `but the model has a cycle through ${cycle.map((id) => JSON.stringify(id)).join(" -> ")}. ` +
        `No arrangement can place all of them in that order, so the request is impossible rather than merely unmet.`,
    });
  }
  for (const id of (options.story ?? []).filter((id) => !edgeById.has(id))) {
    if (nodeIds.has(id)) continue;
    diagnostics.push({
      code: "TOP251_DESIGN_REFERENCE_NOT_FOUND",
      severity: "error",
      message: `Story step ${JSON.stringify(id)} is not a relationship in this view.`,
    });
  }

  return { spine, edgeRoles, supporting, diagnostics };
}

/** The component order an ordered list of relationships walks through. */
function chainFrom(edges: readonly { readonly from: string; readonly to: string }[]): readonly string[] {
  const order: string[] = [];
  const seen = new Set<string>();
  for (const edge of edges) {
    for (const id of [edge.from, edge.to]) {
      if (seen.has(id)) continue;
      seen.add(id);
      order.push(id);
    }
  }
  return order;
}

/**
 * The longest chain of advancing relationships.
 *
 * Computed over the advancing subgraph only, so a database write does not extend the
 * primary path. Ties break on the component id, so the spine is deterministic.
 */
function longestAdvancingChain(view: MeasuredView): readonly string[] {
  const advancing = view.edges.filter((edge) => ADVANCING.has(edge.kind) || !SUPPORTING_KINDS.has(edge.kind));
  const outgoing = new Map<string, string[]>();
  for (const edge of advancing) outgoing.set(edge.from, [...(outgoing.get(edge.from) ?? []), edge.to]);

  const best = new Map<string, readonly string[]>();
  const visiting = new Set<string>();
  const walk = (id: string): readonly string[] => {
    const cached = best.get(id);
    if (cached !== undefined) return cached;
    // A cycle ends the chain *before* the repeat. Returning the repeated id instead puts
    // the same component in the spine twice, and the index map then takes its last
    // position — which mis-roles every relationship touching it, marking the request that
    // reaches it as feedback and the callback as forward progress.
    if (visiting.has(id)) return [];
    visiting.add(id);
    let longest: readonly string[] = [];
    let cyclic = false;
    for (const next of [...(outgoing.get(id) ?? [])].sort((left, right) => left.localeCompare(right, "en"))) {
      if (visiting.has(next)) {
        cyclic = true;
        continue;
      }
      const tail = walk(next);
      if (tail.length > longest.length) longest = tail;
    }
    visiting.delete(id);
    const chain = [id, ...longest];
    // A result computed while inside a cycle depends on the path that reached it, so it
    // is not a safe answer for a different path. Only acyclic results are cached.
    if (!cyclic) best.set(id, chain);
    return chain;
  };

  // Where the spine starts matters more than how long it is. On a cycle every node can
  // begin a chain of the same length, and picking alphabetically produced a spine running
  // backwards through the model — which then marked the real request as feedback and
  // excluded it from ordering, placing the entry point last. A reader enters where the
  // requests enter.
  const incoming = new Map<string, number>(view.nodes.map((node) => [node.id, 0]));
  for (const edge of advancing) incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1);
  const startScore = (node: { readonly id: string; readonly kind: string }): number => {
    const degree = incoming.get(node.id) ?? 0;
    // An entry-point kind outranks a lower in-degree: a client with one callback pointing
    // at it is still where the reader starts.
    const entry = ENTRY_KINDS.has(node.kind) ? -1 : 0;
    return entry * 1000 + degree;
  };
  const ordered = [...view.nodes].sort(
    (left, right) => startScore(left) - startScore(right) || left.id.localeCompare(right.id, "en"),
  );

  let winner: readonly string[] = [];
  let winnerScore = Number.POSITIVE_INFINITY;
  for (const node of ordered) {
    const chain = walk(node.id);
    const score = startScore(node);
    // A better start wins outright; among equal starts, the longer chain wins.
    if (score < winnerScore || (score === winnerScore && chain.length > winner.length)) {
      winner = chain;
      winnerScore = score;
    }
  }
  return winner;
}

/** A cycle among the named components, following relationships in the view. */
function findCycleAmong(members: readonly string[], view: MeasuredView): readonly string[] | undefined {
  const wanted = new Set(members);
  const outgoing = new Map<string, string[]>();
  for (const edge of view.edges) {
    if (!wanted.has(edge.from) || !wanted.has(edge.to)) continue;
    outgoing.set(edge.from, [...(outgoing.get(edge.from) ?? []), edge.to]);
  }
  const state = new Map<string, "visiting" | "done">();
  let found: readonly string[] | undefined;
  const walk = (id: string, path: readonly string[]): void => {
    if (found !== undefined || state.get(id) === "done") return;
    if (state.get(id) === "visiting") {
      found = [...path.slice(path.indexOf(id)), id];
      return;
    }
    state.set(id, "visiting");
    for (const next of outgoing.get(id) ?? []) walk(next, [...path, id]);
    state.set(id, "done");
  };
  for (const member of members) walk(member, []);
  return found;
}

/**
 * Relationship ids that must not order the layout.
 *
 * This is what a placement stage consumes: the set to leave out of layer assignment, so a
 * callback does not push its target a band further along than the request that caused it.
 */
export function orderingExclusions(analysis: SpineAnalysis): ReadonlySet<string> {
  const excluded = new Set<string>();
  for (const [id, role] of analysis.edgeRoles) if (role === "feedback") excluded.add(id);
  return excluded;
}
