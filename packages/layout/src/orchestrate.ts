import type { LayoutEngine, LayoutResult, MeasuredView } from "@topoir/core";
import type { Diagnostic } from "@topoir/schema";
import { CompositionEngine, ElkLayoutEngine } from "@topoir/layout-elk";
import { admit, NO_CAPABILITIES, type BackendCapabilities, type LayoutBackend, type LayoutRequest } from "./backend.js";
import { analyzeSpine, orderingExclusions, readingOrder } from "./spine.js";

/**
 * Layout orchestration (T15).
 *
 * The stages of layout — planning a macro arrangement, placing components, routing
 * connectors, refining labels — lived in one module with the ELK translation, so none of
 * them could be reasoned about, replaced or tested independently. This package owns the
 * orchestration and the backend contract; `@topoir/layout-elk` stays exactly what it was
 * and is wrapped as one backend among others.
 *
 * Nothing about the produced geometry changes. What changes is that a caller can ask what
 * a backend supports, and be told when it cannot honour something they required.
 */

/** The composition engine, which is what every current diagram is laid out by. */
export const COMPOSITION_CAPABILITIES: BackendCapabilities = {
  ...NO_CAPABILITIES,
  // It places components in boundaries and routes orthogonally around obstacles, and it
  // honours declared route compartments as attachment sites.
  containment: true,
  routing: true,
  attachments: true,
  // It does not yet take constraints, produce alternatives or preserve a prior layout.
  // Saying so is the point: T16 and T19 add the first two, T29 the third.
  constraints: [],
  candidates: false,
  stability: false,
};

/** The raw ELK backend, available for graphs the composition engine does not specialise. */
export const ELK_CAPABILITIES: BackendCapabilities = {
  ...NO_CAPABILITIES,
  containment: true,
  routing: true,
  attachments: true,
};

export function compositionBackend(): LayoutBackend {
  const engine = new CompositionEngine();
  return {
    id: engine.id,
    capabilities: COMPOSITION_CAPABILITIES,
    layout: async (view, request) => {
      // The spine decides which relationships order the layout. A feedback relationship is
      // still drawn and routed; it just stops pushing its target a band further along.
      const analysis = analyzeSpine(view, {
        ...(request.story === undefined ? {} : { story: request.story }),
        ...(request.requiredOrder === undefined ? {} : { requiredOrder: request.requiredOrder }),
        viewId: view.id,
      });
      // Where the path enters a boundary is what orders the boundaries themselves — but
      // only when the author declared the path. An inferred one still excludes feedback
      // from layer assignment; it does not get to reorder siblings.
      const order = readingOrder(analysis);
      const result = await engine.layout(view, {
        excludeFromOrdering: orderingExclusions(analysis),
        ...(order === undefined ? {} : { spine: order }),
      });
      return { ...result, diagnostics: [...analysis.diagnostics, ...result.diagnostics] };
    },
  };
}

export function elkBackend(): LayoutBackend {
  const engine = new ElkLayoutEngine();
  return {
    id: engine.id,
    capabilities: ELK_CAPABILITIES,
    layout: async (view) => engine.layout(view),
  };
}

export interface OrchestrationResult extends LayoutResult {
  /** Which backend produced this, for provenance in inspection output. */
  readonly backend: string;
}

/**
 * Runs a layout request against a backend, admitting it first.
 *
 * Admission is not advisory. When a required constraint cannot be enforced, **no layout is
 * attempted** — returning geometry that ignored it would misreport what was honoured, and
 * the caller would have no way to tell.
 */
export async function orchestrate(
  view: MeasuredView,
  backend: LayoutBackend,
  request: LayoutRequest = {},
): Promise<OrchestrationResult> {
  const admission = admit(backend, request);
  if (!admission.admitted) {
    return { diagnostics: admission.diagnostics, backend: backend.id };
  }
  const result = await backend.layout(view, request);
  return {
    ...result,
    diagnostics: [...admission.diagnostics, ...result.diagnostics],
    backend: backend.id,
  };
}

/**
 * A `LayoutEngine` that routes through the orchestrator.
 *
 * Existing callers pass a `LayoutEngine`; this keeps that working while the constraint
 * admission and capability reporting sit behind it. Handing the adapter a request is how a
 * caller opts into the new behaviour without a breaking change.
 */
export class OrchestratedLayoutEngine implements LayoutEngine {
  public readonly id: string;
  private readonly backend: LayoutBackend;
  private readonly request: LayoutRequest;

  public constructor(backend: LayoutBackend = compositionBackend(), request: LayoutRequest = {}) {
    this.backend = backend;
    this.request = request;
    this.id = backend.id;
  }

  public get capabilities(): BackendCapabilities {
    return this.backend.capabilities;
  }

  public async layout(view: MeasuredView): Promise<LayoutResult> {
    return orchestrate(view, this.backend, this.request);
  }
}

/** Backends this build ships, in the order they are preferred. */
export function availableBackends(): readonly LayoutBackend[] {
  return [compositionBackend(), elkBackend()];
}

/**
 * The backend best able to satisfy a request.
 *
 * Preference order first, then admission: the first backend that can actually do the work
 * wins. When none can, the preferred one is returned so the caller gets its diagnostics
 * rather than a bare "no backend" with nothing to act on.
 */
export function selectBackend(request: LayoutRequest = {}): { readonly backend: LayoutBackend; readonly diagnostics: readonly Diagnostic[] } {
  const backends = availableBackends();
  for (const backend of backends) {
    const admission = admit(backend, request);
    if (admission.admitted) return { backend, diagnostics: admission.diagnostics };
  }
  const fallback = backends[0]!;
  return { backend: fallback, diagnostics: admit(fallback, request).diagnostics };
}
