import type { SourceMap, SourceRange } from "./types.js";

export class DocumentSourceMap implements SourceMap {
  public readonly ranges: ReadonlyMap<string, SourceRange>;

  public constructor(
    public readonly source: string,
    ranges: ReadonlyMap<string, SourceRange>,
  ) {
    this.ranges = ranges;
  }

  public find(pointer: string): SourceRange | undefined {
    let candidate = pointer;
    while (true) {
      const match = this.ranges.get(candidate);
      if (match !== undefined) return match;
      const slash = candidate.lastIndexOf("/");
      if (slash < 0) return this.ranges.get("");
      candidate = candidate.slice(0, slash);
    }
  }
}

export function escapeJsonPointer(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}
