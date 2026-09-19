import type {
  Diagnostic,
  SourceMap,
  TopoIRDocument,
  ViewSelector,
} from "@topoir/schema";
import type {
  NormalizedAnnotation,
  NormalizedDocument,
  NormalizedEdge,
  NormalizedFlow,
  NormalizedGroup,
  NormalizedNode,
  SemanticResult,
} from "./ir.js";

export function analyzeSemantics(
  document: TopoIRDocument,
  sourceMap: SourceMap,
): SemanticResult {
  const diagnostics: Diagnostic[] = [];
  const groups = document.model.groups ?? [];
  const nodes = document.model.nodes ?? [];
  const edges = document.model.edges ?? [];
  const flows = document.model.flows ?? [];
  const annotations = document.model.annotations ?? [];
  const views = document.views ?? [];

  collectDuplicateIds(groups, "/model/groups", "group", diagnostics, sourceMap);
  collectDuplicateIds(nodes, "/model/nodes", "node", diagnostics, sourceMap);
  collectDuplicateIds(edges, "/model/edges", "edge", diagnostics, sourceMap);
  collectDuplicateIds(flows, "/model/flows", "flow", diagnostics, sourceMap);
  collectDuplicateIds(annotations, "/model/annotations", "annotation", diagnostics, sourceMap);
  collectDuplicateIds(views, "/views", "view", diagnostics, sourceMap);

  const globalOwners = new Map<string, string>();
  for (const [kind, items, path] of [
    ["group", groups, "/model/groups"],
    ["node", nodes, "/model/nodes"],
    ["edge", edges, "/model/edges"],
    ["flow", flows, "/model/flows"],
    ["annotation", annotations, "/model/annotations"],
  ] as const) {
    items.forEach((item, index) => {
      const owner = globalOwners.get(item.id);
      if (owner !== undefined && owner !== kind) {
        diagnostics.push(
          diagnostic(
            "TOP202_ID_NAMESPACE_CONFLICT",
            `ID ${JSON.stringify(item.id)} is used by both a ${owner} and a ${kind}.`,
            `${path}/${index}/id`,
            sourceMap,
            "Use document-wide unique IDs so references and renderer IDs stay unambiguous.",
          ),
        );
      } else {
        globalOwners.set(item.id, kind);
      }
    });
  }

  const groupIds = new Set(groups.map((group) => group.id));
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edgeIds = new Set(edges.map((edge) => edge.id));
  const flowIds = new Set(flows.map((flow) => flow.id));

  groups.forEach((group, index) => {
    if (group.parent !== undefined && !groupIds.has(group.parent)) {
      diagnostics.push(
        diagnostic(
          "TOP210_GROUP_PARENT_NOT_FOUND",
          `Group ${JSON.stringify(group.id)} references unknown parent ${JSON.stringify(group.parent)}.`,
          `/model/groups/${index}/parent`,
          sourceMap,
        ),
      );
    }
    if (group.parent === group.id) {
      diagnostics.push(
        diagnostic(
          "TOP211_GROUP_CYCLE",
          `Group ${JSON.stringify(group.id)} cannot contain itself.`,
          `/model/groups/${index}/parent`,
          sourceMap,
        ),
      );
    }
  });
  collectGroupCycles(groups, diagnostics, sourceMap);

  nodes.forEach((node, nodeIndex) => {
    if (node.group !== undefined && !groupIds.has(node.group)) {
      diagnostics.push(
        diagnostic(
          "TOP220_NODE_GROUP_NOT_FOUND",
          `Node ${JSON.stringify(node.id)} references unknown group ${JSON.stringify(node.group)}.`,
          `/model/nodes/${nodeIndex}/group`,
          sourceMap,
        ),
      );
    }
    collectDuplicateIds(
      node.ports ?? [],
      `/model/nodes/${nodeIndex}/ports`,
      `port on node ${JSON.stringify(node.id)}`,
      diagnostics,
      sourceMap,
    );
  });

  edges.forEach((edge, edgeIndex) => {
    const source = nodeById.get(edge.from);
    const target = nodeById.get(edge.to);
    if (source === undefined) {
      diagnostics.push(
        diagnostic(
          "TOP230_EDGE_SOURCE_NOT_FOUND",
          `Edge ${JSON.stringify(edge.id)} references unknown source node ${JSON.stringify(edge.from)}.`,
          `/model/edges/${edgeIndex}/from`,
          sourceMap,
        ),
      );
    }
    if (target === undefined) {
      diagnostics.push(
        diagnostic(
          "TOP231_EDGE_TARGET_NOT_FOUND",
          `Edge ${JSON.stringify(edge.id)} references unknown target node ${JSON.stringify(edge.to)}.`,
          `/model/edges/${edgeIndex}/to`,
          sourceMap,
        ),
      );
    }
    if (
      source !== undefined &&
      edge.sourcePort !== undefined &&
      !(source.ports ?? []).some((port) => port.id === edge.sourcePort)
    ) {
      diagnostics.push(
        diagnostic(
          "TOP232_SOURCE_PORT_NOT_FOUND",
          `Edge ${JSON.stringify(edge.id)} references unknown port ${JSON.stringify(edge.sourcePort)} on node ${JSON.stringify(source.id)}.`,
          `/model/edges/${edgeIndex}/sourcePort`,
          sourceMap,
        ),
      );
    }
    if (
      target !== undefined &&
      edge.targetPort !== undefined &&
      !(target.ports ?? []).some((port) => port.id === edge.targetPort)
    ) {
      diagnostics.push(
        diagnostic(
          "TOP233_TARGET_PORT_NOT_FOUND",
          `Edge ${JSON.stringify(edge.id)} references unknown port ${JSON.stringify(edge.targetPort)} on node ${JSON.stringify(target.id)}.`,
          `/model/edges/${edgeIndex}/targetPort`,
          sourceMap,
        ),
      );
    }
    if (edge.flow !== undefined && !flowIds.has(edge.flow)) {
      diagnostics.push(
        diagnostic(
          "TOP234_EDGE_FLOW_NOT_FOUND",
          `Edge ${JSON.stringify(edge.id)} references unknown flow ${JSON.stringify(edge.flow)}.`,
          `/model/edges/${edgeIndex}/flow`,
          sourceMap,
        ),
      );
    }
  });

  const anchorIds = new Set([...groupIds, ...nodeById.keys(), ...edgeIds]);
  annotations.forEach((annotation, index) => {
    if (annotation.anchor !== undefined && !anchorIds.has(annotation.anchor)) {
      diagnostics.push(
        diagnostic(
          "TOP240_ANNOTATION_ANCHOR_NOT_FOUND",
          `Annotation ${JSON.stringify(annotation.id)} references unknown anchor ${JSON.stringify(annotation.anchor)}.`,
          `/model/annotations/${index}/anchor`,
          sourceMap,
        ),
      );
    }
  });

  views.forEach((view, index) => {
    validateSelector(view.include, `/views/${index}/include`, groupIds, nodeById, edgeIds, diagnostics, sourceMap);
    validateSelector(view.exclude, `/views/${index}/exclude`, groupIds, nodeById, edgeIds, diagnostics, sourceMap);
    for (const [field, ids, known] of [["focus", view.design?.focus, new Set([...nodeById.keys(), ...groupIds])], ["story", view.design?.story, edgeIds]] as const) {
      ids?.forEach((id, at) => {
        if (!known.has(id)) diagnostics.push(diagnostic("TOP251_DESIGN_REFERENCE_NOT_FOUND", `Unknown ${field} reference ${id}.`, `/views/${index}/design/${field}/${at}`, sourceMap));
      });
    }
  });

  if (diagnostics.some((item) => item.severity === "error")) {
    return { diagnostics };
  }

  const normalized: NormalizedDocument = {
    apiVersion: document.apiVersion,
    kind: document.kind,
    metadata: document.metadata,
    model: {
      groups: stableSort(groups.map(normalizeGroup)),
      nodes: stableSort(nodes.map(normalizeNode)),
      edges: stableSort(edges.map(normalizeEdge)),
      flows: stableSort(flows.map(normalizeFlow)),
      annotations: stableSort(annotations.map(normalizeAnnotation)),
    },
    views: stableSort(
      views.length === 0
        ? [{ id: "overview", title: document.metadata.title ?? document.metadata.name }]
        : views,
    ),
    sourceMap,
  };
  return { document: normalized, diagnostics };
}

function normalizeGroup(group: TopoIRDocument["model"]["groups"] extends readonly (infer T)[] | undefined ? T : never): NormalizedGroup {
  return {
    ...group,
    label: group.label ?? humanize(group.id),
    tags: sortedUnique(group.tags ?? []),
    layout: {
      mode: group.layout?.mode ?? "auto",
      direction: group.layout?.direction ?? "right",
      ...(group.layout?.columns === undefined ? {} : { columns: group.layout.columns }),
      ...(group.layout?.gap === undefined ? {} : { gap: group.layout.gap }),
    },
  };
}

function normalizeNode(node: TopoIRDocument["model"]["nodes"] extends readonly (infer T)[] | undefined ? T : never): NormalizedNode {
  return {
    ...node,
    label: node.label ?? humanize(node.id),
    tags: sortedUnique(node.tags ?? []),
    ports: stableSort(
      (node.ports ?? []).map((port) => ({
        ...port,
        label: port.label ?? humanize(port.id),
        side: port.side ?? "auto",
        kind: port.kind ?? "bidirectional",
      })),
    ),
  };
}

function normalizeEdge(edge: TopoIRDocument["model"]["edges"] extends readonly (infer T)[] | undefined ? T : never): NormalizedEdge {
  return {
    ...edge,
    kind: edge.kind ?? "dependency",
    direction: edge.direction ?? "forward",
    style: edge.style ?? (edge.kind === "async" ? "dashed" : "solid"),
    tags: sortedUnique(edge.tags ?? []),
  };
}

function normalizeFlow(flow: TopoIRDocument["model"]["flows"] extends readonly (infer T)[] | undefined ? T : never): NormalizedFlow {
  return {
    ...flow,
    label: flow.label ?? humanize(flow.id),
    style: flow.style ?? "solid",
  };
}

function normalizeAnnotation(annotation: TopoIRDocument["model"]["annotations"] extends readonly (infer T)[] | undefined ? T : never): NormalizedAnnotation {
  return {
    ...annotation,
    kind: annotation.kind ?? "note",
    tags: sortedUnique(annotation.tags ?? []),
  };
}

function collectDuplicateIds<T extends { readonly id: string }>(
  items: readonly T[],
  basePath: string,
  kind: string,
  diagnostics: Diagnostic[],
  sourceMap: SourceMap,
): void {
  const firstIndex = new Map<string, number>();
  items.forEach((item, index) => {
    const first = firstIndex.get(item.id);
    if (first === undefined) {
      firstIndex.set(item.id, index);
      return;
    }
    diagnostics.push(
      diagnostic(
        "TOP201_DUPLICATE_ID",
        `Duplicate ${kind} ID ${JSON.stringify(item.id)} (first declared at index ${first}).`,
        `${basePath}/${index}/id`,
        sourceMap,
      ),
    );
  });
}

function collectGroupCycles(
  groups: readonly { readonly id: string; readonly parent?: string }[],
  diagnostics: Diagnostic[],
  sourceMap: SourceMap,
): void {
  const parentById = new Map(groups.map((group) => [group.id, group.parent]));
  const reported = new Set<string>();
  groups.forEach((group, index) => {
    const path: string[] = [];
    const seen = new Set<string>();
    let current: string | undefined = group.id;
    while (current !== undefined) {
      if (seen.has(current)) {
        const cycle = [...path.slice(path.indexOf(current)), current];
        const signature = [...new Set(cycle)].sort().join("|");
        if (!reported.has(signature)) {
          reported.add(signature);
          diagnostics.push(
            diagnostic(
              "TOP211_GROUP_CYCLE",
              `Group containment cycle: ${cycle.join(" -> ")}.`,
              `/model/groups/${index}/parent`,
              sourceMap,
            ),
          );
        }
        return;
      }
      seen.add(current);
      path.push(current);
      current = parentById.get(current);
    }
  });
}

function validateSelector(
  selector: ViewSelector | undefined,
  basePath: string,
  groupIds: ReadonlySet<string>,
  nodes: ReadonlyMap<string, unknown>,
  edgeIds: ReadonlySet<string>,
  diagnostics: Diagnostic[],
  sourceMap: SourceMap,
): void {
  if (selector === undefined) return;
  for (const [field, values, known] of [
    ["groups", selector.groups, groupIds],
    ["nodes", selector.nodes, new Set(nodes.keys())],
    ["edges", selector.edges, edgeIds],
  ] as const) {
    values?.forEach((id, index) => {
      if (!known.has(id)) {
        diagnostics.push(
          diagnostic(
            "TOP250_VIEW_REFERENCE_NOT_FOUND",
            `View selector references unknown ${field.slice(0, -1)} ${JSON.stringify(id)}.`,
            `${basePath}/${field}/${index}`,
            sourceMap,
          ),
        );
      }
    });
  }
}

function diagnostic(
  code: string,
  message: string,
  path: string,
  sourceMap: SourceMap,
  hint?: string,
): Diagnostic {
  const range = sourceMap.find(path);
  return {
    code,
    severity: "error",
    message,
    path,
    source: sourceMap.source,
    ...(range === undefined ? {} : { range }),
    ...(hint === undefined ? {} : { hint }),
  };
}

/**
 * Explicitly ranked siblings come first in their declared rank, then unranked siblings by
 * ID. An absent `order` means "unranked", not `order: 0`; conflating the two let one
 * ranked item sink below unrelated unranked siblings and silently broke author intent.
 */
function stableSort<T extends { readonly id: string; readonly order?: number }>(items: readonly T[]): T[] {
  return [...items].sort((left, right) => {
    const leftRank = left.order ?? Number.POSITIVE_INFINITY;
    const rightRank = right.order ?? Number.POSITIVE_INFINITY;
    if (leftRank !== rightRank) return leftRank - rightRank;
    return left.id.localeCompare(right.id, "en");
  });
}

function sortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, "en"));
}

function humanize(value: string): string {
  const words = value.replaceAll(/[._-]+/g, " ");
  return words.replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase("en"));
}
