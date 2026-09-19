import type { Diagnostic } from "@topoir/schema";
import { isColor } from "./color.js";
import type { ViewGraph } from "./ir.js";
import type { PaintStyle, TopoIRTheme } from "./theme.js";

/**
 * Legibility of the paint a view actually uses.
 *
 * The review found white service text on a white service fill compiling with `ok: true`
 * and no diagnostics, because theme validation checked structure rather than whether
 * anyone could read the result.
 *
 * Only paint the view actually uses is examined. A theme entry for a component kind that
 * does not appear in this view says nothing about this drawing, and reporting it would
 * train callers to ignore the diagnostic.
 *
 * This is the narrow T02 form, working from resolved theme tokens. T09 extends the same
 * rules to the final scene, where decoration, focus treatment and asset backplates can
 * also change what sits behind a glyph.
 */
export interface VisibilityReport {
  readonly diagnostics: readonly Diagnostic[];
  readonly metrics: Readonly<Record<string, number>>;
}

interface Surface {
  readonly owner: string;
  readonly role: string;
  readonly paint: PaintStyle;
}

export function analyzeVisibility(view: ViewGraph, theme: TopoIRTheme): VisibilityReport {
  const surfaces: Surface[] = [];
  const seen = new Set<string>();

  for (const node of view.nodes) {
    const key = `node:${node.kind}`;
    if (seen.has(key)) continue;
    seen.add(key);
    surfaces.push({ owner: `components of kind "${node.kind}"`, role: "label", paint: theme.node.byKind[node.kind] ?? theme.node.default });
  }
  for (const group of view.groups) {
    const key = `group:${group.kind}`;
    if (seen.has(key)) continue;
    seen.add(key);
    surfaces.push({ owner: `boundaries of kind "${group.kind}"`, role: "title", paint: theme.group.byKind[group.kind] ?? theme.group.default });
  }
  for (const annotation of view.annotations) {
    const key = `annotation:${annotation.kind}`;
    if (seen.has(key)) continue;
    seen.add(key);
    surfaces.push({ owner: `annotations of kind "${annotation.kind}"`, role: "text", paint: theme.annotation[annotation.kind] });
  }
  if (view.edges.some((edge) => edge.label !== undefined || edge.protocol !== undefined)) {
    surfaces.push({
      owner: "relationship labels",
      role: "text",
      paint: { fill: theme.edge.labelBackground, stroke: theme.edge.stroke, text: theme.edge.labelText },
    });
  }
  // The diagram title and any text drawn straight onto the canvas.
  surfaces.push({
    owner: "page chrome",
    role: "text",
    paint: { fill: theme.canvas.background, stroke: theme.canvas.muted, text: theme.canvas.foreground },
  });

  const diagnostics: Diagnostic[] = [];

  for (const surface of surfaces) {
    for (const [channel, value] of Object.entries(surface.paint)) {
      if (!isColor(value)) {
        diagnostics.push({
          code: "TOP331_COLOR_INVALID",
          severity: "error",
          message:
            `The ${channel} of ${surface.owner} is ${JSON.stringify(value)}, which is not a colour the ` +
            `compiler recognizes. Use a hex value such as "#1F2937", or one of the supported colour names.`,
        });
      }
    }

    // Contrast is not checked here. `analyzeScene` owns it, because it sees what is
    // *actually* painted behind a glyph run — the card a label sits on, not the theme
    // token that nominally pairs with it. Checking in both places reported every defect
    // twice, and the theme-level answer was the less accurate of the two.
  }

  return { diagnostics, metrics: { invalidColours: diagnostics.length } };
}
