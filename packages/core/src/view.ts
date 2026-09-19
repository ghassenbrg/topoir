import type { ViewDefinition, ViewSelector } from "@topoir/schema";
import type { NormalizedDocument, ViewGraph } from "./ir.js";

export function projectView(document: NormalizedDocument, viewId?: string): ViewGraph {
  const view = selectView(document, viewId);
  const model = document.model;
  const groupById = new Map(model.groups.map((group) => [group.id, group]));
  const nodeById = new Map(model.nodes.map((node) => [node.id, node]));
  const edgeById = new Map(model.edges.map((edge) => [edge.id, edge]));

  const selectedGroups = new Set<string>();
  const selectedNodes = new Set<string>();
  const selectedEdges = new Set<string>();

  if (view.include === undefined) {
    model.groups.forEach((group) => selectedGroups.add(group.id));
    model.nodes.forEach((node) => selectedNodes.add(node.id));
    model.edges.forEach((edge) => selectedEdges.add(edge.id));
  } else {
    applyInclude(view.include, document, selectedGroups, selectedNodes, selectedEdges);
  }

  // Explicitly selected edges make their endpoint nodes visible.
  for (const edgeId of selectedEdges) {
    const edge = edgeById.get(edgeId);
    if (edge !== undefined) {
      selectedNodes.add(edge.from);
      selectedNodes.add(edge.to);
    }
  }

  // Selecting a group includes its descendants and their nodes.
  let changed = true;
  while (changed) {
    changed = false;
    for (const group of model.groups) {
      if (group.parent !== undefined && selectedGroups.has(group.parent) && !selectedGroups.has(group.id)) {
        selectedGroups.add(group.id);
        changed = true;
      }
    }
  }
  for (const node of model.nodes) {
    if (node.group !== undefined && selectedGroups.has(node.group)) selectedNodes.add(node.id);
  }

  // Edges whose two endpoints are visible are included by default.
  for (const edge of model.edges) {
    if (selectedNodes.has(edge.from) && selectedNodes.has(edge.to)) selectedEdges.add(edge.id);
  }

  const excludedGroups = new Set<string>();
  const excludedNodes = new Set<string>();
  const excludedEdges = new Set<string>();
  if (view.exclude !== undefined) {
    applyInclude(view.exclude, document, excludedGroups, excludedNodes, excludedEdges);
  }
  changed = true;
  while (changed) {
    changed = false;
    for (const group of model.groups) {
      if (group.parent !== undefined && excludedGroups.has(group.parent) && !excludedGroups.has(group.id)) {
        excludedGroups.add(group.id);
        changed = true;
      }
    }
  }
  for (const node of model.nodes) {
    if (node.group !== undefined && excludedGroups.has(node.group)) excludedNodes.add(node.id);
  }

  for (const id of excludedGroups) selectedGroups.delete(id);
  for (const id of excludedNodes) selectedNodes.delete(id);
  for (const id of excludedEdges) selectedEdges.delete(id);
  for (const edgeId of [...selectedEdges]) {
    const edge = edgeById.get(edgeId);
    if (edge === undefined || !selectedNodes.has(edge.from) || !selectedNodes.has(edge.to)) {
      selectedEdges.delete(edgeId);
    }
  }

  // Every visible node brings its containment ancestry into the view.
  for (const nodeId of selectedNodes) {
    let groupId = nodeById.get(nodeId)?.group;
    while (groupId !== undefined) {
      selectedGroups.add(groupId);
      groupId = groupById.get(groupId)?.parent;
    }
  }

  const visibleEdges = model.edges.filter((edge) => selectedEdges.has(edge.id));
  const visibleFlowIds = new Set(visibleEdges.flatMap((edge) => (edge.flow === undefined ? [] : [edge.flow])));
  const visibleEntityIds = new Set([...selectedGroups, ...selectedNodes, ...selectedEdges]);

  return {
    id: view.id,
    title: view.title ?? document.metadata.title ?? document.metadata.name,
    ...(view.description === undefined ? {} : { description: view.description }),
    theme: view.theme ?? "technical-clean",
    ...(view.design === undefined ? {} : { design: view.design }),
    showLegend: view.showLegend ?? visibleFlowIds.size > 1,
    layout: {
      engine: view.layout?.engine ?? "auto",
      direction: view.layout?.direction ?? (view.design?.composition === "layers" ? "down" : "right"),
      aspectRatio: view.layout?.aspectRatio ?? 1.6,
      spacing: view.layout?.spacing ?? "normal",
    },
    groups: model.groups.filter((group) => selectedGroups.has(group.id)),
    nodes: model.nodes.filter((node) => selectedNodes.has(node.id)),
    edges: visibleEdges,
    flows: model.flows.filter((flow) => visibleFlowIds.has(flow.id)),
    annotations: model.annotations.filter((annotation) => {
      if (annotation.anchor !== undefined && !visibleEntityIds.has(annotation.anchor)) return false;
      if (view.include === undefined) return !matchesSelector(annotation, view.exclude);
      return matchesSelector(annotation, view.include) || annotation.anchor === undefined || visibleEntityIds.has(annotation.anchor);
    }),
  };
}

function selectView(document: NormalizedDocument, viewId?: string): ViewDefinition {
  const view =
    viewId === undefined
      ? (document.views.find((candidate) => candidate.id === "overview") ?? document.views[0])
      : document.views.find((candidate) => candidate.id === viewId);
  if (view === undefined) {
    const available = document.views.map((candidate) => candidate.id).join(", ");
    throw new Error(`Unknown view ${JSON.stringify(viewId)}. Available views: ${available}.`);
  }
  return view;
}

function applyInclude(
  selector: ViewSelector,
  document: NormalizedDocument,
  groups: Set<string>,
  nodes: Set<string>,
  edges: Set<string>,
): void {
  selector.groups?.forEach((id) => groups.add(id));
  selector.nodes?.forEach((id) => nodes.add(id));
  selector.edges?.forEach((id) => edges.add(id));
  const tags = new Set(selector.tags ?? []);
  if (tags.size === 0) return;
  document.model.groups.filter((item) => hasTag(item.tags, tags)).forEach((item) => groups.add(item.id));
  document.model.nodes.filter((item) => hasTag(item.tags, tags)).forEach((item) => nodes.add(item.id));
  document.model.edges.filter((item) => hasTag(item.tags, tags)).forEach((item) => edges.add(item.id));
}

function matchesSelector(
  item: { readonly id: string; readonly tags: readonly string[] },
  selector: ViewSelector | undefined,
): boolean {
  if (selector === undefined) return false;
  return (
    selector.nodes?.includes(item.id) === true ||
    selector.groups?.includes(item.id) === true ||
    selector.edges?.includes(item.id) === true ||
    hasTag(item.tags, new Set(selector.tags ?? []))
  );
}

function hasTag(itemTags: readonly string[], selectedTags: ReadonlySet<string>): boolean {
  return itemTags.some((tag) => selectedTags.has(tag));
}
