import {
  isMap,
  isNode,
  isScalar,
  isSeq,
  LineCounter,
  parseDocument as parseYamlDocument,
  type Node,
} from "yaml";
import { DocumentSourceMap, escapeJsonPointer } from "./source-map.js";
import type { Diagnostic, ParsedDocument, SourceRange } from "./types.js";

export interface ParseOptions {
  readonly source?: string;
}

export function parseDocument(text: string, options: ParseOptions = {}): ParsedDocument {
  const source = options.source ?? "<input>";
  const lineCounter = new LineCounter();
  const document = parseYamlDocument(text, {
    lineCounter,
    prettyErrors: false,
    strict: true,
    uniqueKeys: true,
  });

  const ranges = new Map<string, SourceRange>();
  if (document.contents !== null) {
    collectRanges(document.contents, "", ranges, lineCounter);
  }
  const sourceMap = new DocumentSourceMap(source, ranges);

  const diagnostics: Diagnostic[] = document.errors.map((error) => {
    const start = error.pos[0] ?? 0;
    const end = error.pos[1] ?? start + 1;
    return {
      code: "TOP100_PARSE_ERROR",
      severity: "error",
      message: error.message,
      source,
      range: rangeFromOffsets(start, end, lineCounter),
    };
  });

  for (const warning of document.warnings) {
    const start = warning.pos[0] ?? 0;
    const end = warning.pos[1] ?? start + 1;
    diagnostics.push({
      code: "TOP101_PARSE_WARNING",
      severity: "warning",
      message: warning.message,
      source,
      range: rangeFromOffsets(start, end, lineCounter),
    });
  }

  if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    return { diagnostics, sourceMap };
  }

  try {
    return {
      value: document.toJS({ maxAliasCount: 100 }),
      diagnostics,
      sourceMap,
    };
  } catch (error) {
    return {
      diagnostics: [
        ...diagnostics,
        {
          code: "TOP102_DOCUMENT_CONVERSION_FAILED",
          severity: "error",
          message: error instanceof Error ? error.message : "Could not convert the document.",
          source,
        },
      ],
      sourceMap,
    };
  }
}

function collectRanges(
  node: Node,
  pointer: string,
  ranges: Map<string, SourceRange>,
  lineCounter: LineCounter,
): void {
  if (node.range != null) {
    ranges.set(pointer, rangeFromOffsets(node.range[0], node.range[1], lineCounter));
  }

  if (isMap(node)) {
    for (const pair of node.items) {
      if (!isScalar(pair.key)) continue;
      const key = String(pair.key.value);
      const childPointer = `${pointer}/${escapeJsonPointer(key)}`;
      if (isNode(pair.value)) {
        collectRanges(pair.value, childPointer, ranges, lineCounter);
      }
    }
  } else if (isSeq(node)) {
    node.items.forEach((item, index) => {
      if (isNode(item)) collectRanges(item, `${pointer}/${index}`, ranges, lineCounter);
    });
  }
}

function rangeFromOffsets(start: number, end: number, lineCounter: LineCounter): SourceRange {
  const startPosition = lineCounter.linePos(start);
  const endPosition = lineCounter.linePos(end);
  return {
    start: { line: startPosition.line, column: startPosition.col, offset: start },
    end: { line: endPosition.line, column: endPosition.col, offset: end },
  };
}
