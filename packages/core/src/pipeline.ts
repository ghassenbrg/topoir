import {
  parseDocument,
  validateStructure,
  type Diagnostic,
  type TopoIRDocument,
} from "@topoir/schema";
import type { NormalizedDocument } from "./ir.js";
import { analyzeSemantics } from "./semantic.js";

export interface LoadOptions {
  readonly source?: string;
}

export interface LoadResult {
  readonly document?: NormalizedDocument;
  readonly diagnostics: readonly Diagnostic[];
}

export function loadDocument(text: string, options: LoadOptions = {}): LoadResult {
  const parsed = parseDocument(text, options);
  if (parsed.value === undefined) return { diagnostics: parsed.diagnostics };

  const structural = validateStructure(parsed.value, parsed.sourceMap);
  const diagnostics = [...parsed.diagnostics, ...structural.diagnostics];
  if (!structural.ok || structural.value === undefined) return { diagnostics };

  const semantic = analyzeSemantics(structural.value, parsed.sourceMap);
  return {
    ...(semantic.document === undefined ? {} : { document: semantic.document }),
    diagnostics: [...diagnostics, ...semantic.diagnostics],
  };
}

export function analyzeDocument(document: TopoIRDocument): LoadResult {
  const sourceMap = {
    source: "<object>",
    ranges: new Map(),
    find: () => undefined,
  };
  return analyzeSemantics(document, sourceMap);
}
