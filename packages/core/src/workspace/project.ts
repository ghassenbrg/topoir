import type { Diagnostic, v1alpha2 } from "@topoir/schema";
import type { ViewGraph } from "../ir.js";
import { resolveLabel, type NormalizedEntity, type NormalizedWorkspace, type NormalizedWorkspaceModel } from "./normalize.js";

/**
 * Projecting a workspace view into the graph the compiler draws (T11).
 *
 * The contract's selection order, followed exactly: resolve includes; add explicitly
 * selected relationship endpoints; apply exclusions; retain required ancestry; derive
 * induced relationships **only when requested**; apply collapse; create occurrences; bind
 * rendered relationships.
 *
 * The review's finding was that selection was closure-based with no alternative: including
 * one relationship between two components silently included every other relationship
 * between them, so a narrow explanation could not be expressed. `edgePolicy: exact` is
 * the fix, and `induced` remains the default so existing behavior is unchanged.
 */

export interface ProjectionResult {
  readonly view?: ViewGraph;
  readonly diagnostics: readonly Diagnostic[];
  /** What happened to every model element: drawn, summarised by another, or left out. */
  readonly coverage: readonly CoverageEntry[];
}

export interface CoverageEntry {
  readonly element: string;
  readonly disposition: "rendered" | "representedBy" | "omitted";
  /** For `representedBy`, the occurrence standing in for it. */
  readonly representative?: string;
  readonly reason?: string;
}

export function projectWorkspaceView(workspace: NormalizedWorkspace, viewId?: string): ProjectionResult {
  const view =
    viewId === undefined ? workspace.views[0] : workspace.views.find((candidate) => candidate.id === viewId);
  if (view === undefined) {
    return {
      diagnostics: [
        {
          code: "TOP260_VIEW_NOT_FOUND",
          severity: "error",
          message: `Unknown view ${JSON.stringify(viewId)}. Available views: ${workspace.views.map((candidate) => candidate.id).join(", ")}.`,
        },
      ],
      coverage: [],
    };
  }
  const model = workspace.models.find((candidate) => candidate.id === view.model);
  if (model === undefined) {
    return {
      diagnostics: [{ code: "TOP255_MODEL_NOT_FOUND", severity: "error", message: `View ${JSON.stringify(view.id)} references unknown model ${JSON.stringify(view.model)}.` }],
      coverage: [],
    };
  }
  return project(workspace, model, view);
}

function project(workspace: NormalizedWorkspace, model: NormalizedWorkspaceModel, view: v1alpha2.WorkspaceView): ProjectionResult {
  const diagnostics: Diagnostic[] = [];
  const body = model.body;
  const groups = body.groups ?? [];
  const nodes = body.nodes ?? [];
  const edges = body.edges ?? [];
  const annotations = body.annotations ?? [];
  const flows = body.flows ?? [];
  const entities = new Map(workspace.entities.map((entity) => [entity.id, entity]));
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edgeById = new Map(edges.map((edge) => [edge.id, edge]));

  const projection = view.projection ?? {};
  const edgePolicy = projection.edgePolicy ?? "induced";

  // 1. Includes. Absent means everything.
  const selectedGroups = new Set<string>();
  const selectedNodes = new Set<string>();
  const selectedEdges = new Set<string>();
  if (projection.include === undefined) {
    for (const group of groups) selectedGroups.add(group.id);
    for (const node of nodes) selectedNodes.add(node.id);
    for (const edge of edges) selectedEdges.add(edge.id);
  } else {
    select(projection.include, { groups, nodes, edges }, selectedGroups, selectedNodes, selectedEdges);
  }

  // 2. An explicitly selected relationship makes its endpoints visible. This is true under
  // both policies: a relationship with an invisible end is not a relationship.
  for (const id of [...selectedEdges]) {
    const edge = edgeById.get(id);
    if (edge === undefined) continue;
    selectedNodes.add(edge.from);
    selectedNodes.add(edge.to);
  }
  // Selecting a boundary selects what it contains.
  expandContainment(groups, nodes, selectedGroups, selectedNodes);

  // 3. Exclusions.
  const excludedGroups = new Set<string>();
  const excludedNodes = new Set<string>();
  const excludedEdges = new Set<string>();
  if (projection.exclude !== undefined) {
    select(projection.exclude, { groups, nodes, edges }, excludedGroups, excludedNodes, excludedEdges);
    expandContainment(groups, nodes, excludedGroups, excludedNodes);
  }
  for (const id of excludedGroups) selectedGroups.delete(id);
  for (const id of excludedNodes) selectedNodes.delete(id);
  for (const id of excludedEdges) selectedEdges.delete(id);

  // 4. Induced relationships, only when asked for. `exact` never adds one.
  if (edgePolicy === "induced" && projection.include !== undefined) {
    for (const edge of edges) {
      if (selectedNodes.has(edge.from) && selectedNodes.has(edge.to)) selectedEdges.add(edge.id);
    }
  }
  // A relationship whose endpoint was excluded cannot be drawn under either policy.
  for (const id of [...selectedEdges]) {
    const edge = edgeById.get(id);
    if (edge === undefined || !selectedNodes.has(edge.from) || !selectedNodes.has(edge.to)) selectedEdges.delete(id);
  }

  // 5. Ancestry. A visible component brings its containment chain with it, or the diagram
  // claims it sits somewhere it does not.
  for (const id of [...selectedNodes]) {
    let groupId = nodeById.get(id)?.group;
    while (groupId !== undefined) {
      selectedGroups.add(groupId);
      groupId = groupById.get(groupId)?.parent;
    }
  }

  // 6. Collapse. A collapsed boundary's contents are represented by it, not dropped.
  const coverage: CoverageEntry[] = [];
  const collapsedInto = new Map<string, string>();
  for (const rule of projection.collapse ?? []) {
    if (!groupById.has(rule.element)) {
      diagnostics.push({
        code: "TOP258_COLLAPSE_TARGET_INVALID",
        severity: "error",
        message: `Collapse targets ${JSON.stringify(rule.element)}, which is not a boundary in model ${JSON.stringify(model.id)}. Only a container can be summarised.`,
      });
      continue;
    }
    for (const node of nodes) {
      if (!withinGroup(node.group, rule.element, groupById)) continue;
      if (!selectedNodes.has(node.id)) continue;
      selectedNodes.delete(node.id);
      collapsedInto.set(node.id, rule.element);
    }
    for (const group of groups) {
      if (group.id === rule.element || !withinGroup(group.parent, rule.element, groupById)) continue;
      selectedGroups.delete(group.id);
      collapsedInto.set(group.id, rule.element);
    }
  }
  // A relationship into a collapsed region now meets the summary itself.
  const rewritten = new Map<string, { from: string; to: string }>();
  for (const id of [...selectedEdges]) {
    const edge = edgeById.get(id);
    if (edge === undefined) continue;
    const from = collapsedInto.get(edge.from) ?? edge.from;
    const to = collapsedInto.get(edge.to) ?? edge.to;
    if (from === to) {
      // Both ends fell inside one summary: the relationship is internal to it now.
      selectedEdges.delete(id);
      coverage.push({ element: id, disposition: "representedBy", representative: from, reason: "both endpoints are inside a collapsed boundary" });
      continue;
    }
    if (from !== edge.from || to !== edge.to) rewritten.set(id, { from, to });
  }

  // 7. Occurrences. An implicit occurrence id is its element id; an explicit one with the
  // same id replaces it, and any other explicit id is an additional appearance.
  const occurrences = new Map<string, { element: string; label?: string; role: string }>();
  for (const id of selectedNodes) occurrences.set(id, { element: id, role: "primary" });
  for (const declared of projection.occurrences ?? []) {
    if (!nodeById.has(declared.element)) {
      diagnostics.push({
        code: "TOP259_OCCURRENCE_ELEMENT_NOT_FOUND",
        severity: "error",
        message: `Occurrence ${JSON.stringify(declared.id)} references unknown element ${JSON.stringify(declared.element)}.`,
      });
      continue;
    }
    if (!selectedNodes.has(declared.element)) {
      diagnostics.push({
        code: "TOP259_OCCURRENCE_ELEMENT_NOT_FOUND",
        severity: "error",
        message: `Occurrence ${JSON.stringify(declared.id)} is of element ${JSON.stringify(declared.element)}, which this view does not include.`,
      });
      continue;
    }
    occurrences.set(declared.id, {
      element: declared.element,
      ...(declared.label === undefined ? {} : { label: declared.label }),
      role: declared.role ?? "primary",
    });
  }

  // 8. Binding. An element appearing more than once makes every relationship touching it
  // ambiguous, and a guess would silently draw the wrong connection.
  const byElement = new Map<string, string[]>();
  for (const [id, occurrence] of occurrences) {
    byElement.set(occurrence.element, [...(byElement.get(occurrence.element) ?? []), id]);
  }
  const bindings = new Map((projection.connections ?? []).map((binding) => [binding.relationship, binding]));
  const resolvedEnds = new Map<string, { from: string; to: string }>();
  for (const id of selectedEdges) {
    const edge = edgeById.get(id);
    if (edge === undefined) continue;
    const ends = rewritten.get(id) ?? { from: edge.from, to: edge.to };
    const binding = bindings.get(id);
    const resolve = (element: string, explicit: string | undefined, role: "from" | "to"): string | undefined => {
      const candidates = byElement.get(element) ?? [element];
      if (explicit !== undefined) {
        if (!occurrences.has(explicit)) {
          diagnostics.push({
            code: "TOP261_CONNECTION_BINDING_INVALID",
            severity: "error",
            message: `Relationship ${JSON.stringify(id)} binds its ${role} to occurrence ${JSON.stringify(explicit)}, which this view does not contain.`,
          });
          return undefined;
        }
        return explicit;
      }
      if (candidates.length > 1) {
        diagnostics.push({
          code: "TOP262_CONNECTION_AMBIGUOUS",
          severity: "error",
          message:
            `Relationship ${JSON.stringify(id)} has ${candidates.length} candidate occurrences for its ${role} ` +
            `(${candidates.map((candidate) => JSON.stringify(candidate)).join(", ")}). ` +
            `Add a projection.connections entry binding it to one, or the drawing would guess.`,
        });
        return undefined;
      }
      return candidates[0];
    };
    const from = resolve(ends.from, binding?.from, "from");
    const to = resolve(ends.to, binding?.to, "to");
    if (from === undefined || to === undefined) continue;
    resolvedEnds.set(id, { from, to });
  }

  if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) return { diagnostics, coverage };

  // 9. Coverage for everything the model declared.
  for (const node of nodes) {
    const summary = collapsedInto.get(node.id);
    if (summary !== undefined) coverage.push({ element: node.id, disposition: "representedBy", representative: summary });
    else if (occurrences.has(node.id) || (byElement.get(node.id) ?? []).length > 0) coverage.push({ element: node.id, disposition: "rendered" });
    else coverage.push({ element: node.id, disposition: "omitted", reason: "not selected by this view's projection" });
  }
  for (const edge of edges) {
    if (coverage.some((entry) => entry.element === edge.id)) continue;
    coverage.push(
      selectedEdges.has(edge.id)
        ? { element: edge.id, disposition: "rendered" }
        : { element: edge.id, disposition: "omitted", reason: edgePolicy === "exact" ? "not selected, and edgePolicy is exact" : "not selected by this view's projection" },
    );
  }

  const visibleNodeIds = new Set([...occurrences.values()].map((occurrence) => occurrence.element));
  const visibleEdges = edges.filter((edge) => selectedEdges.has(edge.id));
  const visibleFlowIds = new Set(visibleEdges.flatMap((edge) => (edge.flow === undefined ? [] : [edge.flow])));
  const visibleIds = new Set<string>([...selectedGroups, ...visibleNodeIds, ...selectedEdges]);

  const graph: ViewGraph = {
    id: view.id,
    title: view.title ?? workspace.metadata.title ?? workspace.metadata.name,
    ...(view.description === undefined ? {} : { description: view.description }),
    theme: view.presentation?.style?.pack ?? "technical-clean",
    ...(designFrom(view) === undefined ? {} : { design: designFrom(view)! }),
    showLegend: view.showLegend ?? visibleFlowIds.size > 1,
    layout: {
      engine: "auto",
      direction: view.presentation?.composition?.direction ?? "right",
      aspectRatio: aspectFor(view),
      spacing: "normal",
    },
    groups: groups
      .filter((group) => selectedGroups.has(group.id))
      .map((group) => normalizeGroup(group, entities)),
    nodes: nodes
      .filter((node) => visibleNodeIds.has(node.id))
      .map((node) => normalizeNode(node, entities)),
    edges: visibleEdges.map((edge) => {
      const ends = resolvedEnds.get(edge.id) ?? { from: edge.from, to: edge.to };
      return normalizeEdge(edge, ends);
    }),
    flows: flows.filter((flow) => visibleFlowIds.has(flow.id)).map((flow) => ({ ...flow, label: flow.label ?? flow.id, style: flow.style ?? "solid" })) as ViewGraph["flows"],
    annotations: annotations
      .filter((annotation) => annotation.anchor === undefined || visibleIds.has(annotation.anchor))
      .map((annotation) => ({ ...annotation, tags: annotation.tags ?? [] })) as ViewGraph["annotations"],
  };

  return { view: graph, diagnostics, coverage };
}

function designFrom(view: v1alpha2.WorkspaceView): ViewGraph["design"] | undefined {
  const intent = view.presentation?.intent;
  const strategy = view.presentation?.composition?.strategy;
  if (intent === undefined && strategy === undefined) return undefined;
  return {
    ...(strategy === undefined ? {} : { composition: strategy as never }),
    ...(intent?.audience === undefined || intent.audience === "learning" ? {} : { audience: intent.audience }),
    ...(intent?.takeaway === undefined ? {} : { takeaway: intent.takeaway }),
    ...(intent?.focus === undefined ? {} : { focus: intent.focus }),
    ...(intent?.story === undefined ? {} : { story: intent.story }),
  } as ViewGraph["design"];
}

/** A declared medium fixes the target proportion; without one the default applies. */
function aspectFor(view: v1alpha2.WorkspaceView): number {
  const medium = view.presentation?.medium;
  if (medium?.width !== undefined && medium.height !== undefined && medium.height > 0) {
    return Math.round((medium.width / medium.height) * 10000) / 10000;
  }
  return 1.6;
}

function normalizeGroup(group: v1alpha2.Group, entities: ReadonlyMap<string, NormalizedEntity>): ViewGraph["groups"][number] {
  return {
    ...group,
    label: resolveLabel(group, entities),
    tags: group.tags ?? [],
    layout: { mode: "auto", ...(group.layout ?? {}) },
  } as ViewGraph["groups"][number];
}

function normalizeNode(node: v1alpha2.Node, entities: ReadonlyMap<string, NormalizedEntity>): ViewGraph["nodes"][number] {
  return {
    ...node,
    label: resolveLabel(node, entities),
    tags: node.tags ?? [],
    ports: (node.ports ?? []).map((port, index) => ({ ...port, label: port.label ?? port.id, side: port.side ?? "auto", kind: port.kind ?? "inout", order: port.order ?? index })),
  } as ViewGraph["nodes"][number];
}

function normalizeEdge(edge: v1alpha2.Edge, ends: { from: string; to: string }): ViewGraph["edges"][number] {
  return {
    ...edge,
    from: ends.from,
    to: ends.to,
    kind: edge.kind ?? "dependency",
    direction: edge.direction ?? "forward",
    style: edge.style ?? "solid",
    tags: edge.tags ?? [],
  } as ViewGraph["edges"][number];
}

function expandContainment(
  groups: readonly v1alpha2.Group[],
  nodes: readonly v1alpha2.Node[],
  selectedGroups: Set<string>,
  selectedNodes: Set<string>,
): void {
  let changed = true;
  while (changed) {
    changed = false;
    for (const group of groups) {
      if (group.parent !== undefined && selectedGroups.has(group.parent) && !selectedGroups.has(group.id)) {
        selectedGroups.add(group.id);
        changed = true;
      }
    }
  }
  for (const node of nodes) {
    if (node.group !== undefined && selectedGroups.has(node.group)) selectedNodes.add(node.id);
  }
}

function withinGroup(
  start: string | undefined,
  ancestor: string,
  groupById: ReadonlyMap<string, v1alpha2.Group>,
): boolean {
  let current = start;
  const seen = new Set<string>();
  while (current !== undefined && !seen.has(current)) {
    if (current === ancestor) return true;
    seen.add(current);
    current = groupById.get(current)?.parent;
  }
  return false;
}

function select(
  selector: v1alpha2.ProjectionSelector,
  model: { groups: readonly v1alpha2.Group[]; nodes: readonly v1alpha2.Node[]; edges: readonly v1alpha2.Edge[] },
  groups: Set<string>,
  nodes: Set<string>,
  edges: Set<string>,
): void {
  const groupIds = new Set(model.groups.map((group) => group.id));
  const nodeIds = new Set(model.nodes.map((node) => node.id));
  const edgeIds = new Set(model.edges.map((edge) => edge.id));
  for (const id of selector.elements ?? []) {
    if (groupIds.has(id)) groups.add(id);
    else if (nodeIds.has(id)) nodes.add(id);
    else if (edgeIds.has(id)) edges.add(id);
  }
  const tags = new Set(selector.tags ?? []);
  if (tags.size === 0) return;
  for (const group of model.groups) if ((group.tags ?? []).some((tag) => tags.has(tag))) groups.add(group.id);
  for (const node of model.nodes) if ((node.tags ?? []).some((tag) => tags.has(tag))) nodes.add(node.id);
  for (const edge of model.edges) if ((edge.tags ?? []).some((tag) => tags.has(tag))) edges.add(edge.id);
}
