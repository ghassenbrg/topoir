import { describe, expect, it } from "vitest";
import { analyzeContent, bundledFontTextMeasurer, layoutText, measureView, resolveTheme, type TextStyle, type ViewGraph } from "../src/index.js";

/**
 * T01 — content preservation at the measurement layer.
 *
 * These assert the reusable pieces directly, so a later refactor into ComponentPlan (T07)
 * has to keep the same guarantees rather than only keeping the end-to-end fixtures green.
 */

const measurer = bundledFontTextMeasurer();
const style: TextStyle = { fontSize: 13, fontWeight: 600, lineHeight: 1.35 };

describe("layoutText disposition", () => {
  it("declares text that fits as rendered and keeps every grapheme", () => {
    const result = layoutText("Payments API", 210, style, measurer);
    expect(result.disposition).toBe("rendered");
    expect(result.omittedGraphemes).toBeUndefined();
    expect(result.source).toBe("Payments API");
    expect(result.lines.join(" ")).toBe("Payments API");
  });

  it("declares abbreviation and counts what is not drawn", () => {
    const source =
      "Primary service for account reconciliation across international regions with guaranteed delivery and strict audit requirements";
    const result = layoutText(source, 210, style, measurer);
    expect(result.disposition).toBe("abbreviated");
    expect(result.source).toBe(source);
    expect(result.omittedGraphemes ?? 0).toBeGreaterThan(0);
    // The count is a real accounting of the loss, not a flag: what is drawn plus what is
    // declared missing has to add back up to the authored text.
    const drawn = result.lines.join("").replace(/…$/u, "").replace(/\s+/gu, "").length;
    expect(drawn + (result.omittedGraphemes ?? 0)).toBe(source.replace(/\s+/gu, "").length);
  });

  it("raising the width removes both the abbreviation and its declaration", () => {
    const source = "Primary service for account reconciliation across international regions";
    expect(layoutText(source, 160, style, measurer).disposition).toBe("abbreviated");
    expect(layoutText(source, 4000, style, measurer).disposition).toBe("rendered");
  });
});

describe("layoutText word splitting", () => {
  /**
   * A word too wide for the component is split across lines. Rejoining those lines must
   * give back the authored text exactly: inserting a space would rewrite an identifier,
   * a URL or an ARN into something the author never wrote.
   */
  const identifiers = [
    "payments-reconciliation-service-identifier-0001",
    "arn:aws:iam::123456789012:role/PaymentsReconciliationExecutionRole",
    "https://payments.internal.example.com/v2/reconciliation/settlements",
    "SELECT_settlement_batch_id_FROM_reconciliation_ledger_partition_2026",
  ];

  for (const identifier of identifiers) {
    it(`splits ${identifier.slice(0, 24)}… without inserting characters`, () => {
      const result = layoutText(identifier, 120, style, measurer, 12);
      expect(result.disposition).toBe("rendered");
      expect(result.lines.length).toBeGreaterThan(1);
      expect(result.lines.join("")).toBe(identifier);
    });
  }

  it("keeps authored spaces between separate words", () => {
    const result = layoutText("Payments API gateway", 4000, style, measurer);
    expect(result.lines).toEqual(["Payments API gateway"]);
  });

  it("splits grapheme clusters rather than code units", () => {
    // Each flag is a surrogate pair; splitting mid-pair would emit replacement characters.
    // This tests the splitting logic specifically: DejaVu has no glyphs for regional
    // indicators, so such a label would also raise TOP332_GLYPH_NOT_AVAILABLE (T06). That
    // is a separate concern — wrapping must stay grapheme-safe for scripts the pack does
    // cover, which the covered-script case below asserts.
    const flags = "🇩🇪🇫🇷🇪🇸🇮🇹🇵🇹🇳🇱🇧🇪🇦🇹🇵🇱🇸🇪";
    const result = layoutText(flags, 40, style, measurer, 12);
    expect(result.lines.join("")).toBe(flags);
    expect(result.lines.join("")).not.toContain("�");
  });

  it("splits a covered non-Latin script without losing characters", () => {
    // Cyrillic is inside the DejaVu pack, so this exercises grapheme-safe splitting on
    // text that genuinely renders rather than on code points that would be tofu anyway.
    const cyrillic = "Расчётыиурегулированиемеждународныхплатежей";
    const result = layoutText(cyrillic, 110, style, measurer, 12);
    expect(result.disposition).toBe("rendered");
    expect(result.lines.length).toBeGreaterThan(1);
    expect(result.lines.join("")).toBe(cyrillic);
  });
});

/** A minimal view graph, so measurement can be exercised without the whole compiler. */
function view(nodes: ViewGraph["nodes"]): ViewGraph {
  return {
    id: "overview",
    title: "test",
    nodes,
    groups: [],
    edges: [],
    annotations: [],
    flows: [],
  } as unknown as ViewGraph;
}

describe("measured node content", () => {
  const theme = resolveTheme(undefined);

  it("gives every authored asset role its own slot, including roles sharing an image", () => {
    const references = ["devicon:postgresql", "devicon:redis", "devicon:python", "devicon:go", "devicon:docker", "devicon:kubernetes"];
    const measured = measureView(
      view([{ id: "a", kind: "service", label: "Service", ports: [], visual: { assets: references } } as never]),
      theme,
      measurer,
      () => ({ width: 24, height: 24 }),
    );
    expect(measured.nodes[0]?.assetRoles?.map((role) => role.reference)).toEqual(references);
  });

  it("keeps an unresolved role in place rather than closing the gap", () => {
    const measured = measureView(
      view([{ id: "a", kind: "service", label: "Service", ports: [], visual: { assets: ["known", "missing", "known-2"] } } as never]),
      theme,
      measurer,
      (reference) => (reference === "missing" ? undefined : { width: 24, height: 24 }),
    );
    const roles = measured.nodes[0]?.assetRoles ?? [];
    expect(roles.map((role) => role.reference)).toEqual(["known", "missing", "known-2"]);
    expect(roles[1]?.size).toBeUndefined();
  });

  it("sizes a node to hold its own badge", () => {
    const badge = "W".repeat(48);
    const measured = measureView(
      view([{ id: "a", kind: "service", label: "Service", ports: [], visual: { badge } } as never]),
      theme,
      measurer,
    );
    const node = measured.nodes[0];
    expect(node?.badgeText?.disposition).toBe("rendered");
    expect(node?.badgeText?.lines.join("")).toBe(badge);
    expect(node?.width ?? 0).toBeGreaterThanOrEqual(node?.badgeText?.width ?? 0);
  });

  it("reports abbreviated content with its owner and role", () => {
    const measured = measureView(
      view([
        {
          id: "reconciler",
          kind: "service",
          label: "Primary service for account reconciliation across international regions with guaranteed delivery",
          ports: [],
        } as never,
      ]),
      theme,
      measurer,
    );
    const report = analyzeContent(measured);
    expect(report.metrics.abbreviatedTextRuns).toBe(1);
    expect(report.diagnostics).toHaveLength(1);
    expect(report.diagnostics[0]?.code).toBe("TOP440_TEXT_ABBREVIATED");
    expect(report.diagnostics[0]?.severity).toBe("warning");
    expect(report.diagnostics[0]?.message).toContain("node reconciler");
    expect(report.diagnostics[0]?.message).toContain("label");
  });

  it("says nothing when all content fits", () => {
    const measured = measureView(view([{ id: "a", kind: "service", label: "API", ports: [] } as never]), theme, measurer);
    const report = analyzeContent(measured);
    expect(report.diagnostics).toEqual([]);
    expect(report.metrics.abbreviatedTextRuns).toBe(0);
    expect(report.metrics.omittedGraphemes).toBe(0);
  });
});

describe("an over-long identifier breaks where a reader expects", () => {
  /**
   * `RC_LoggingSystem_UserTrace_Encryption` came out as "RC_LoggingSystem_UserTr" /
   * "ace_Encryption": a word split down the middle, which is markedly harder to read than
   * the same text broken after a separator. Found by reproducing a reference diagram, whose
   * own rendering breaks these identifiers exactly where this now does.
   */
  const style: TextStyle = { fontFamily: "Inter", fontSize: 14, fontWeight: 600, lineHeight: 1.3 };
  const measurer = bundledFontTextMeasurer();

  it("breaks an underscore identifier after an underscore", () => {
    const { lines } = layoutText("RC_LoggingSystem_UserTrace_Encryption", 170, style, measurer, 4);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines.slice(0, -1)) expect(line, line).toMatch(/[_\-./:@+]$/u);
  });

  it("breaks a hyphenated identifier after a hyphen", () => {
    const { lines } = layoutText("card-tracedata-filestore-consumer", 150, style, measurer, 4);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines.slice(0, -1)) expect(line, line).toMatch(/-$/u);
  });

  it("still breaks a run with no separator at all", () => {
    // Graphemes remain the fallback; a token with nothing to break on must still fit.
    const { lines } = layoutText("A".repeat(120), 120, style, measurer, 4);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) expect(measurer.measure(line, style).width).toBeLessThanOrEqual(120);
  });

  it("loses no characters when it breaks", () => {
    const source = "trace-e-navi-api-s23u-3as_yyyy-MM-dd-HH";
    const { lines, disposition } = layoutText(source, 200, style, measurer, 4);
    expect(disposition).toBe("rendered");
    expect(lines.join("")).toBe(source);
  });

  it("keeps every line inside the width it was given", () => {
    for (const text of ["RC_MemberSystem_UserTrace_Encryption", "card-usertrace-decryption-consumer", "a/b/c/d/e/f/g/h/i/j/k/l/m/n"]) {
      for (const line of layoutText(text, 140, style, measurer, 6).lines) {
        expect(measurer.measure(line, style).width, `${text} -> ${line}`).toBeLessThanOrEqual(140);
      }
    }
  });

  it("does not insert a space where it broke a word", () => {
    // The pieces of one word are rejoined without a separator; a space would change the id.
    const { lines } = layoutText("card-tracedata-linkage-consumer", 150, style, measurer, 4);
    expect(lines.join("")).toBe("card-tracedata-linkage-consumer");
  });
});
