import type { Diagnostic } from "@topoir/schema";
import type { MeasuredText, MeasuredView } from "./ir.js";

/**
 * Content accounting over a measured view.
 *
 * The review found that an author could not tell full content from shortened content: a
 * 124-character node label was drawn as two ellipsised lines while `droppedLabels` stayed
 * zero and no diagnostic was emitted. The contract in
 * `docs/design/04-components-and-styles.md` allows abbreviation, but requires it to be
 * *declared by measurement* rather than inferred later from a missing primitive.
 *
 * This is the narrow T01 form of that rule: measurement already records a
 * `TextDisposition`, and this pass turns every `abbreviated` disposition into a diagnostic
 * that names the owner, the content role and how much was lost. T07 replaces it with the
 * full `ContentDisposition` table carrying owning scene IDs.
 */
export interface ContentReport {
  readonly diagnostics: readonly Diagnostic[];
  readonly metrics: Readonly<Record<string, number>>;
}

interface Owned {
  readonly owner: string;
  readonly role: string;
  readonly text: MeasuredText;
}

export function analyzeContent(view: MeasuredView): ContentReport {
  const owned: Owned[] = [];
  for (const node of view.nodes) {
    owned.push({ owner: `node ${node.id}`, role: "label", text: node.labelText });
    if (node.descriptionText) owned.push({ owner: `node ${node.id}`, role: "description", text: node.descriptionText });
    if (node.badgeText) owned.push({ owner: `node ${node.id}`, role: "badge", text: node.badgeText });
    for (const port of node.ports) {
      if (port.labelText) owned.push({ owner: `port ${node.id}.${port.id}`, role: "label", text: port.labelText });
    }
  }
  for (const group of view.groups) owned.push({ owner: `group ${group.id}`, role: "title", text: group.labelText });
  for (const edge of view.edges) {
    if (edge.labelText) owned.push({ owner: `relationship ${edge.id}`, role: "label", text: edge.labelText });
  }
  for (const annotation of view.annotations) {
    owned.push({ owner: `annotation ${annotation.id}`, role: "text", text: annotation.textLayout });
  }

  const abbreviated = owned.filter((entry) => entry.text.disposition === "abbreviated");
  const diagnostics: Diagnostic[] = abbreviated.map((entry) => ({
    code: "TOP440_TEXT_ABBREVIATED",
    severity: "warning",
    message:
      `The ${entry.role} of ${entry.owner} did not fit and was abbreviated to ` +
      `${JSON.stringify(entry.text.lines.join(" "))}; ${entry.text.omittedGraphemes ?? 0} of ` +
      `${graphemeCount(entry.text.source)} characters are not drawn. Shorten the text, raise the ` +
      `component's text width, or accept the abbreviation deliberately.`,
  }));

  return {
    diagnostics,
    metrics: {
      abbreviatedTextRuns: abbreviated.length,
      omittedGraphemes: abbreviated.reduce((sum, entry) => sum + (entry.text.omittedGraphemes ?? 0), 0),
    },
  };
}

function graphemeCount(value: string): number {
  return [...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(value.replace(/\s+/gu, ""))].length;
}
