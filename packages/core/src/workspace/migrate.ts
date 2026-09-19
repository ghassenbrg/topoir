import type { Diagnostic, TopoIRDocument, ViewDefinition, v1alpha2 } from "@topoir/schema";

/**
 * Migrating a v1alpha1 `Architecture` document to a v1alpha2 workspace (T11).
 *
 * The rule the contract states and this enforces: migration **preserves facts and IDs**.
 * It invents nothing — no entities the author did not declare, no provenance, no
 * presentation intent that was not there. Anything v1alpha1 can express that v1alpha2
 * expresses differently is translated; anything it cannot is reported rather than dropped.
 *
 * A migration that quietly normalised or improved a document would be worse than none: the
 * author could no longer tell which facts came from them.
 */

export interface MigrationResult {
  readonly workspace?: v1alpha2.DiagramWorkspace;
  readonly diagnostics: readonly Diagnostic[];
  /** Every model element in the source, so the inventory can be compared with the output. */
  readonly inventory: readonly string[];
}

export function migrateToWorkspace(document: TopoIRDocument): MigrationResult {
  const diagnostics: Diagnostic[] = [];
  const model = document.model;
  const inventory = [
    ...(model.groups ?? []).map((group) => group.id),
    ...(model.nodes ?? []).map((node) => node.id),
    ...(model.edges ?? []).map((edge) => edge.id),
    ...(model.annotations ?? []).map((annotation) => annotation.id),
  ];

  const views = (document.views ?? []).map((view): v1alpha2.WorkspaceView => {
    const projection = migrateProjection(view);
    const presentation = migratePresentation(view, diagnostics);
    return {
      id: view.id,
      model: "model",
      ...(view.title === undefined ? {} : { title: view.title }),
      ...(view.description === undefined ? {} : { description: view.description }),
      ...(view.showLegend === undefined ? {} : { showLegend: view.showLegend }),
      ...(projection === undefined ? {} : { projection }),
      ...(presentation === undefined ? {} : { presentation }),
    };
  });

  // v1alpha1 permits a document with no views; v1alpha2 requires at least one, because a
  // model with nothing projecting it produces no diagram.
  const resolvedViews: readonly v1alpha2.WorkspaceView[] =
    views.length > 0 ? views : [{ id: "overview", model: "model" }];
  if (views.length === 0) {
    diagnostics.push({
      code: "TOP270_MIGRATION_DEFAULT_APPLIED",
      severity: "warning",
      message:
        'The source declares no views, which v1alpha1 allows and v1alpha2 does not. An "overview" view of the whole model was added; it matches what the v1alpha1 compiler drew by default.',
    });
  }

  const workspace: v1alpha2.DiagramWorkspace = {
    apiVersion: "topoir.dev/v1alpha2",
    kind: "DiagramWorkspace",
    metadata: document.metadata,
    models: [
      {
        id: "model",
        family: "architecture",
        ...(document.metadata.title === undefined ? {} : { title: document.metadata.title }),
        body: migrateBody(model),
      },
    ],
    views: resolvedViews,
  };

  return { workspace, diagnostics, inventory };
}

/** The family body, carried across unchanged. Absent collections stay absent. */
function migrateBody(model: TopoIRDocument["model"]): v1alpha2.ArchitectureBody {
  const body: Record<string, unknown> = {};
  if (model.groups !== undefined) body["groups"] = model.groups;
  if (model.nodes !== undefined) body["nodes"] = model.nodes;
  if (model.edges !== undefined) body["edges"] = model.edges;
  if (model.flows !== undefined) body["flows"] = model.flows;
  if (model.annotations !== undefined) body["annotations"] = model.annotations;
  return body as v1alpha2.ArchitectureBody;
}

function migrateProjection(view: ViewDefinition): v1alpha2.Projection | undefined {
  const include = migrateSelector(view.include);
  const exclude = migrateSelector(view.exclude);
  if (include === undefined && exclude === undefined) return undefined;
  return {
    ...(include === undefined ? {} : { include }),
    ...(exclude === undefined ? {} : { exclude }),
    // v1alpha1 has exactly one selection behaviour, and it is the induced one. Migrating
    // to `exact` would change which relationships appear, which is not a migration.
    edgePolicy: "induced",
  };
}

function migrateSelector(selector: { readonly nodes?: readonly string[]; readonly groups?: readonly string[]; readonly edges?: readonly string[]; readonly tags?: readonly string[] } | undefined): v1alpha2.ProjectionSelector | undefined {
  if (selector === undefined) return undefined;
  // v1alpha1 separates ids by kind; v1alpha2 uses one element namespace per model.
  const elements = [...(selector.groups ?? []), ...(selector.nodes ?? []), ...(selector.edges ?? [])];
  if (elements.length === 0 && (selector.tags ?? []).length === 0) return undefined;
  return {
    ...(elements.length === 0 ? {} : { elements }),
    ...((selector.tags ?? []).length === 0 ? {} : { tags: selector.tags }),
  };
}

function migratePresentation(view: ViewDefinition, diagnostics: Diagnostic[]): v1alpha2.Presentation | undefined {
  const design = view.design;
  const layout = view.layout;
  const intent: NonNullable<v1alpha2.Presentation["intent"]> = {
    ...(design?.audience === undefined ? {} : { audience: design.audience }),
    ...(design?.takeaway === undefined ? {} : { takeaway: design.takeaway }),
    ...(design?.focus === undefined ? {} : { focus: design.focus }),
    ...(design?.story === undefined ? {} : { story: design.story }),
  };
  const style =
    typeof view.theme === "string"
      ? { pack: view.theme }
      : view.theme === undefined
        ? undefined
        : { tokens: view.theme as v1alpha2.DesignTokens };
  const composition =
    design?.composition === undefined && layout?.direction === undefined
      ? undefined
      : {
          ...(design?.composition === undefined ? {} : { strategy: design.composition }),
          ...(layout?.direction === undefined ? {} : { direction: layout.direction }),
        };

  // `layout.aspectRatio` states a proportion but not a size, so it cannot become a medium
  // without inventing dimensions the author never gave.
  if (layout?.aspectRatio !== undefined) {
    diagnostics.push({
      code: "TOP271_MIGRATION_NOT_REPRESENTABLE",
      severity: "warning",
      message:
        `View ${JSON.stringify(view.id)} sets layout.aspectRatio ${layout.aspectRatio}, which v1alpha2 expresses through ` +
        `presentation.medium. A medium needs real dimensions, and inventing them would put a size in the document the ` +
        `author never wrote, so the target proportion was not migrated. Add a medium with the size you are drawing for.`,
    });
  }
  if (layout?.spacing !== undefined || layout?.engine !== undefined) {
    diagnostics.push({
      code: "TOP271_MIGRATION_NOT_REPRESENTABLE",
      severity: "warning",
      message: `View ${JSON.stringify(view.id)} sets layout.${layout.spacing !== undefined ? "spacing" : "engine"}, which has no v1alpha2 equivalent and was not migrated.`,
    });
  }

  const hasIntent = Object.keys(intent).length > 0;
  if (!hasIntent && style === undefined && composition === undefined) return undefined;
  return {
    ...(hasIntent ? { intent } : {}),
    ...(style === undefined ? {} : { style }),
    ...(composition === undefined ? {} : { composition }),
  };
}

/**
 * Every model element id in a migrated workspace.
 *
 * Compared against the source inventory, this is what proves migration lost nothing. An
 * equality assertion over these two lists is stronger than spot-checking fields.
 */
export function workspaceInventory(workspace: v1alpha2.DiagramWorkspace): readonly string[] {
  return workspace.models.flatMap((model) => [
    ...(model.body.groups ?? []).map((group) => group.id),
    ...(model.body.nodes ?? []).map((node) => node.id),
    ...(model.body.edges ?? []).map((edge) => edge.id),
    ...(model.body.annotations ?? []).map((annotation) => annotation.id),
  ]);
}
