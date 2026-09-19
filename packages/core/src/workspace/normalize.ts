import type { Diagnostic } from "@topoir/schema";
import { isWorkspaceDocument, parseDocument, validateWorkspace, type v1alpha2 } from "@topoir/schema";

/**
 * Normalizing a v1alpha2 workspace (T11).
 *
 * A workspace separates three things the v1alpha1 document conflated: an **entity** is a
 * real-world thing, a **model element** is that thing's role in one diagram family, and an
 * **occurrence** is one appearance of that element in one view. One checkout service can be
 * an architecture component, a process owner and an interaction participant — three
 * elements, one identity — and can appear twice in a single view without becoming two
 * services.
 *
 * Normalization resolves entity references and label precedence and checks the reference
 * graph. It does not project: that is `projectWorkspaceView`.
 */

export interface NormalizedEntity {
  readonly id: string;
  readonly kind: string;
  readonly label: string;
  readonly description?: string;
  readonly tags: readonly string[];
  readonly provenance: readonly v1alpha2.Provenance[number][];
}

export interface NormalizedWorkspaceModel {
  readonly id: string;
  readonly family: string;
  readonly familyVersion?: string;
  readonly title?: string;
  readonly body: v1alpha2.ArchitectureBody;
}

export interface NormalizedWorkspace {
  readonly apiVersion: string;
  readonly kind: string;
  readonly metadata: v1alpha2.Metadata;
  readonly sources: readonly v1alpha2.Source[];
  readonly entities: readonly NormalizedEntity[];
  readonly models: readonly NormalizedWorkspaceModel[];
  readonly styles: readonly v1alpha2.Style[];
  readonly views: readonly v1alpha2.WorkspaceView[];
  readonly viewSets: readonly v1alpha2.ViewSet[];
}

export interface WorkspaceLoadResult {
  readonly workspace?: NormalizedWorkspace;
  readonly diagnostics: readonly Diagnostic[];
}

export function loadWorkspace(text: string, options: { readonly source?: string } = {}): WorkspaceLoadResult {
  const parsed = parseDocument(text, options);
  if (parsed.value === undefined) return { diagnostics: parsed.diagnostics };
  if (!isWorkspaceDocument(parsed.value)) {
    return {
      diagnostics: [
        ...parsed.diagnostics,
        {
          code: "TOP103_UNSUPPORTED_API_VERSION",
          severity: "error",
          message: "This document is not a topoir.dev/v1alpha2 DiagramWorkspace. Load it with the v1alpha1 loader.",
        },
      ],
    };
  }
  const structural = validateWorkspace(parsed.value, parsed.sourceMap);
  const diagnostics = [...parsed.diagnostics, ...structural.diagnostics];
  if (!structural.ok || structural.value === undefined) return { diagnostics };

  const document = structural.value as v1alpha2.DiagramWorkspace;
  const semantic = analyzeWorkspace(document);
  return {
    ...(semantic.workspace === undefined ? {} : { workspace: semantic.workspace }),
    diagnostics: [...diagnostics, ...semantic.diagnostics],
  };
}

/** Reference checks the schema cannot express, plus entity resolution. */
export function analyzeWorkspace(document: v1alpha2.DiagramWorkspace): WorkspaceLoadResult {
  const diagnostics: Diagnostic[] = [];
  const entityById = new Map((document.entities ?? []).map((entity) => [entity.id, entity]));
  const sourceIds = new Set((document.sources ?? []).map((source) => source.id));

  const duplicate = (kind: string, ids: readonly string[], pointer: string): void => {
    const seen = new Set<string>();
    for (const [index, id] of ids.entries()) {
      if (seen.has(id)) {
        diagnostics.push({
          code: "TOP201_DUPLICATE_ID",
          severity: "error",
          message: `Duplicate ${kind} id ${JSON.stringify(id)}. ${kind} ids share one namespace.`,
          path: `${pointer}/${index}/id`,
        });
      }
      seen.add(id);
    }
  };
  duplicate("entity", (document.entities ?? []).map((entity) => entity.id), "/entities");
  duplicate("model", document.models.map((model) => model.id), "/models");
  duplicate("view", document.views.map((view) => view.id), "/views");
  duplicate("style", (document.styles ?? []).map((style) => style.id), "/styles");

  for (const [index, entity] of (document.entities ?? []).entries()) {
    for (const [entryIndex, entry] of (entity.provenance ?? []).entries()) {
      if (sourceIds.has(entry.source)) continue;
      diagnostics.push({
        code: "TOP253_SOURCE_NOT_FOUND",
        severity: "error",
        message: `Provenance on entity ${JSON.stringify(entity.id)} references undeclared source ${JSON.stringify(entry.source)}.`,
        path: `/entities/${index}/provenance/${entryIndex}/source`,
      });
    }
  }

  const models: NormalizedWorkspaceModel[] = [];
  for (const [index, model] of document.models.entries()) {
    const body = model.body;
    const elementIds = [
      ...(body.groups ?? []).map((group) => group.id),
      ...(body.nodes ?? []).map((node) => node.id),
      ...(body.edges ?? []).map((edge) => edge.id),
      ...(body.annotations ?? []).map((annotation) => annotation.id),
    ];
    duplicate("element", elementIds, `/models/${index}/body`);

    // An element may claim an identity, but only one that exists.
    for (const node of body.nodes ?? []) {
      if (node.entity !== undefined && !entityById.has(node.entity)) {
        diagnostics.push({
          code: "TOP254_ENTITY_NOT_FOUND",
          severity: "error",
          message: `Node ${JSON.stringify(node.id)} in model ${JSON.stringify(model.id)} references unknown entity ${JSON.stringify(node.entity)}.`,
          path: `/models/${index}/body`,
        });
      }
    }
    models.push({
      id: model.id,
      family: model.family,
      ...(model.familyVersion === undefined ? {} : { familyVersion: model.familyVersion }),
      ...(model.title === undefined ? {} : { title: model.title }),
      body,
    });
  }

  const modelIds = new Set(models.map((model) => model.id));
  for (const [index, view] of document.views.entries()) {
    if (modelIds.has(view.model)) continue;
    diagnostics.push({
      code: "TOP255_MODEL_NOT_FOUND",
      severity: "error",
      message: `View ${JSON.stringify(view.id)} references unknown model ${JSON.stringify(view.model)}.`,
      path: `/views/${index}/model`,
    });
  }

  const viewIds = new Set(document.views.map((view) => view.id));
  for (const [index, set] of (document.viewSets ?? []).entries()) {
    for (const [entryIndex, id] of set.views.entries()) {
      if (viewIds.has(id)) continue;
      diagnostics.push({
        code: "TOP250_VIEW_REFERENCE_NOT_FOUND",
        severity: "error",
        message: `View set ${JSON.stringify(set.id)} references unknown view ${JSON.stringify(id)}.`,
        path: `/viewSets/${index}/views/${entryIndex}`,
      });
    }
  }

  // Style inheritance must be acyclic, or resolution never terminates.
  const styleById = new Map((document.styles ?? []).map((style) => [style.id, style]));
  for (const style of document.styles ?? []) {
    const seen = new Set<string>([style.id]);
    let current = style.extends;
    while (current !== undefined) {
      if (seen.has(current)) {
        diagnostics.push({
          code: "TOP256_STYLE_CYCLE",
          severity: "error",
          message: `Style ${JSON.stringify(style.id)} inherits from itself through ${[...seen].join(" -> ")}.`,
        });
        break;
      }
      seen.add(current);
      const next = styleById.get(current);
      if (next === undefined) {
        diagnostics.push({
          code: "TOP257_STYLE_NOT_FOUND",
          severity: "error",
          message: `Style ${JSON.stringify(style.id)} extends unknown style ${JSON.stringify(current)}.`,
        });
        break;
      }
      current = next.extends;
    }
  }

  if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) return { diagnostics };

  return {
    workspace: {
      apiVersion: document.apiVersion,
      kind: document.kind,
      metadata: document.metadata,
      sources: document.sources ?? [],
      entities: (document.entities ?? []).map((entity) => ({
        id: entity.id,
        kind: entity.kind,
        label: entity.label,
        ...(entity.description === undefined ? {} : { description: entity.description }),
        tags: entity.tags ?? [],
        provenance: entity.provenance ?? [],
      })),
      models,
      styles: document.styles ?? [],
      views: document.views,
      viewSets: document.viewSets ?? [],
    },
    diagnostics,
  };
}

/**
 * The label an element displays.
 *
 * Precedence is local label, then the referenced entity's label, then the element id. An
 * element that borrows its identity's name must not be forced to restate it, and an
 * element with no label at all must still be identifiable rather than blank.
 */
export function resolveLabel(
  element: { readonly id: string; readonly label?: string; readonly entity?: string },
  entities: ReadonlyMap<string, NormalizedEntity>,
): string {
  if (element.label !== undefined && element.label !== "") return element.label;
  if (element.entity !== undefined) {
    const entity = entities.get(element.entity);
    if (entity !== undefined) return entity.label;
  }
  return element.id;
}
