import { describe, expect, it } from "vitest";
import {
  analyzeVisibility,
  contrastRatio,
  DEFAULT_FONT_FAMILY,
  fontDiagnostic,
  isColor,
  MINIMUM_TEXT_CONTRAST,
  namedTheme,
  normalizeColor,
  resolveFont,
  resolveTheme,
  SUPPORTED_FONT_FAMILIES,
  themes,
  type ViewGraph,
} from "../src/index.js";

/** T02 — font resolution, colour normalization, legibility and compositional inheritance. */

describe("font resolution", () => {
  it("honors a supported family", () => {
    const resolved = resolveFont("DejaVu Sans");
    expect(resolved).toEqual({ family: "DejaVu Sans", requested: "DejaVu Sans", substituted: false });
    expect(fontDiagnostic(resolved)).toBeUndefined();
  });

  it("matches a supported family regardless of case and padding", () => {
    expect(resolveFont("  dejavu sans  ").family).toBe("DejaVu Sans");
    expect(resolveFont("  dejavu sans  ").substituted).toBe(true);
  });

  it("takes the first supported entry of a CSS-style stack", () => {
    const resolved = resolveFont("'Inter', \"DejaVu Sans\", sans-serif");
    expect(resolved.family).toBe("DejaVu Sans");
    expect(resolved.substituted).toBe(true);
  });

  it("substitutes an unavailable family and says so", () => {
    const resolved = resolveFont("Invented Font Family");
    expect(resolved.family).toBe(DEFAULT_FONT_FAMILY);
    expect(resolved.substituted).toBe(true);
    const diagnostic = fontDiagnostic(resolved);
    expect(diagnostic?.code).toBe("TOP330_FONT_UNAVAILABLE");
    expect(diagnostic?.severity).toBe("warning");
    // The message names what was asked for, what was used, and what is available.
    expect(diagnostic?.message).toContain("Invented Font Family");
    expect(diagnostic?.message).toContain(DEFAULT_FONT_FAMILY);
    for (const family of SUPPORTED_FONT_FAMILIES) expect(diagnostic?.message).toContain(family);
  });

  it("always resolves to a family the compiler can actually use", () => {
    for (const requested of ["", "   ", "Comic Sans MS", "系统字体", "DejaVu Sans"]) {
      expect(SUPPORTED_FONT_FAMILIES).toContain(resolveFont(requested).family as "DejaVu Sans");
    }
  });

  it("resolves the family on every theme, including authored extensions", () => {
    for (const theme of themes) expect(SUPPORTED_FONT_FAMILIES).toContain(theme.font.family as "DejaVu Sans");
    const authored = resolveTheme({ font: { family: "Invented Font Family" } });
    expect(authored.font.family).toBe(DEFAULT_FONT_FAMILY);
  });

  it("does not read a font family as a colour", () => {
    // `red` is a colour name, but here it is a family. Normalizing it would give "#FF0000".
    expect(resolveTheme({ font: { family: "red" } }).font.family).toBe(DEFAULT_FONT_FAMILY);
  });
});

describe("colour normalization", () => {
  it("canonicalizes the forms the schema accepts", () => {
    expect(normalizeColor("#fff")).toBe("#FFFFFF");
    expect(normalizeColor("#FFF")).toBe("#FFFFFF");
    expect(normalizeColor("#ffffff")).toBe("#FFFFFF");
    expect(normalizeColor("white")).toBe("#FFFFFF");
    expect(normalizeColor("#1f2937")).toBe("#1F2937");
    expect(normalizeColor("#FFFFFFB8")).toBe("#FFFFFFB8");
  });

  it("rejects strings the schema pattern lets through but are not colours", () => {
    // `^(#[0-9A-Fa-f]{3,8}|[a-zA-Z]+)$` admits all of these.
    for (const value of ["#12345", "#1234567", "notacolor", "burgundy"]) {
      expect(isColor(value), value).toBe(false);
      expect(normalizeColor(value), value).toBeUndefined();
    }
  });

  it("leaves an unrecognized value alone rather than guessing a colour", () => {
    const theme = resolveTheme({ node: { byKind: { service: { fill: "burgundy" } } } });
    expect(theme.node.byKind.service?.fill).toBe("burgundy");
  });

  it("normalizes authored paint and the edge palette", () => {
    const theme = resolveTheme({
      node: { byKind: { service: { fill: "#eff6ff", text: "black" } } },
      edge: { palette: ["#2563eb", "red"] },
    });
    expect(theme.node.byKind.service?.fill).toBe("#EFF6FF");
    expect(theme.node.byKind.service?.text).toBe("#000000");
    expect(theme.edge.palette).toEqual(["#2563EB", "#FF0000"]);
  });
});

describe("contrast", () => {
  it("matches the WCAG reference ratios", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBe(21);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBe(1);
    expect(contrastRatio("#777777", "#FFFFFF")).toBeCloseTo(4.48, 1);
  });

  it("is symmetric", () => {
    expect(contrastRatio("#1F2937", "#F8FAFC")).toBe(contrastRatio("#F8FAFC", "#1F2937"));
  });

  it("composites translucent text over its backdrop before comparing", () => {
    // Fully transparent text is invisible whatever its channels claim.
    expect(contrastRatio("#00000000", "#FFFFFF")).toBe(1);
  });

  it("returns undefined rather than a number for a value that is not a colour", () => {
    expect(contrastRatio("burgundy", "#FFFFFF")).toBeUndefined();
  });

  it("finds every built-in theme's component text readable", () => {
    for (const theme of themes) {
      for (const [kind, paint] of Object.entries({ default: theme.node.default, ...theme.node.byKind })) {
        const ratio = contrastRatio(paint.text, paint.fill);
        expect(ratio, `${theme.id} / ${kind}`).toBeGreaterThanOrEqual(MINIMUM_TEXT_CONTRAST);
      }
    }
  });
});

function view(overrides: Partial<ViewGraph> = {}): ViewGraph {
  return {
    id: "overview",
    title: "test",
    nodes: [{ id: "a", kind: "service", label: "Service", ports: [] }],
    groups: [],
    edges: [],
    annotations: [],
    flows: [],
    ...overrides,
  } as unknown as ViewGraph;
}

describe("visibility analysis", () => {
  it("reports text that cannot be read against its own fill", () => {
    const theme = resolveTheme({ node: { byKind: { service: { fill: "#FFFFFF", text: "#FFFFFF", stroke: "#FFFFFF" } } } });
    const report = analyzeVisibility(view(), theme);
    const reported = report.diagnostics.filter((diagnostic) => diagnostic.code === "TOP442_TEXT_NOT_LEGIBLE");
    expect(reported).toHaveLength(1);
    expect(reported[0]?.severity).toBe("error");
    expect(report.metrics.illegibleSurfaces).toBe(1);
  });

  it("reports a value that is not a colour", () => {
    const theme = resolveTheme({ node: { byKind: { service: { fill: "burgundy" } } } });
    const report = analyzeVisibility(view(), theme);
    expect(report.diagnostics.map((diagnostic) => diagnostic.code)).toContain("TOP331_COLOR_INVALID");
  });

  it("ignores theme entries for kinds the view does not use", () => {
    // The broken paint is on `database`, and this view has no database.
    const theme = resolveTheme({ node: { byKind: { database: { fill: "#FFFFFF", text: "#FFFFFF" } } } });
    expect(analyzeVisibility(view(), theme).diagnostics).toEqual([]);
  });

  it("accepts every built-in theme on a view using each node kind", () => {
    const kinds = ["service", "api", "database", "cache", "queue", "client", "gateway"] as const;
    const nodes = kinds.map((kind, index) => ({ id: `n${index}`, kind, label: kind, ports: [] }));
    for (const theme of themes) {
      const report = analyzeVisibility(view({ nodes } as never), theme);
      expect(report.diagnostics, theme.id).toEqual([]);
    }
  });
});

describe("compositional theme inheritance", () => {
  /**
   * The review's finding: `dark-engineering` adds a logo backplate and
   * `{extends: dark-engineering}` removed it, because the renderer compared `theme.id`
   * against theme names and an extension resolves to `dark-engineering+authored`.
   * The decisions are tokens now, so they merge like everything else.
   */
  for (const base of themes) {
    it(`an empty extension of ${base.id} resolves to the same tokens`, () => {
      const extended = resolveTheme({ extends: base.id });
      // The id deliberately still records that tokens were authored.
      expect(extended.id).toBe(`${base.id}+authored`);
      const { id: _baseId, ...baseTokens } = base;
      const { id: _extendedId, ...extendedTokens } = extended;
      expect(extendedTokens).toEqual(baseTokens);
    });
  }

  it("keeps the semantic tokens the renderer used to infer from theme names", () => {
    expect(namedTheme("executive").language?.accentBar).toBe(true);
    expect(namedTheme("executive").language?.depthFill).toBe("#DDDCD5");
    expect(namedTheme("whiteboard").language?.depthFill).toBe("#D3E6DF");
    expect(namedTheme("dark-engineering").language?.assetBackplate).toBe("#F8FAFC");
    expect(namedTheme("blueprint").language?.assetBackplate).toBe("#F8FAFC");
    // Themes that never had the treatment still do not.
    expect(namedTheme("technical-clean").language?.assetBackplate).toBeUndefined();
    expect(namedTheme("minimal").language?.accentBar).toBeUndefined();
  });

  it("carries those tokens through an extension that overrides something else", () => {
    const extended = resolveTheme({ extends: "dark-engineering", font: { labelSize: 16 } });
    expect(extended.language?.assetBackplate).toBe("#F8FAFC");
    expect(extended.font.labelSize).toBe(16);
  });
});
