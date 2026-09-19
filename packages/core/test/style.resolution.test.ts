import { describe, expect, it } from "vitest";
import {
  componentTextColor,
  contrastRatio,
  hasOwnSurface,
  MINIMUM_TEXT_CONTRAST,
  namedTheme,
  readableTextOn,
  resolveStyle,
  resolveTheme,
  semanticTreatment,
  themes,
  unreadableSurfaces,
  type v1alpha2,
} from "../src/index.js";

/**
 * T13 — resolved style grammar.
 *
 * The acceptance criteria: inheritance is deterministic and acyclic; equivalent empty
 * overrides are equivalent; semantic marker/colour mapping survives focus and muting;
 * generated style previews pass scene QA.
 */

describe("style resolution is deterministic", () => {
  it("resolves a built-in pack", () => {
    const result = resolveStyle({ pack: "dark-engineering" });
    expect(result.diagnostics).toEqual([]);
    expect(result.style.pack).toBe("dark-engineering");
    expect(result.style.theme.canvas.background).toBe(namedTheme("dark-engineering").canvas.background);
  });

  it("rejects an unknown pack and lists what exists", () => {
    const result = resolveStyle({ pack: "nowhere" });
    expect(result.diagnostics[0]?.code).toBe("TOP257_STYLE_NOT_FOUND");
    expect(result.diagnostics[0]?.message).toContain("technical-clean");
  });

  it("resolves a workspace style chain from its root, whatever order it is declared in", () => {
    const styles: v1alpha2.Style[] = [
      { id: "brand-dark", extends: "brand", tokens: { canvas: { background: "#101418" } } },
      { id: "brand", extends: "technical-clean", tokens: { font: { labelSize: 15 } } },
    ];
    const forward = resolveStyle({ pack: "brand-dark" }, styles);
    const reversed = resolveStyle({ pack: "brand-dark" }, [...styles].reverse());
    // Declaration order must not change the answer.
    expect(forward.style.theme).toEqual(reversed.style.theme);
    expect(forward.style.theme.font.labelSize).toBe(15);
    expect(forward.style.theme.canvas.background).toBe("#101418");
  });

  it("lets view tokens win over the style they extend", () => {
    const styles: v1alpha2.Style[] = [{ id: "brand", extends: "technical-clean", tokens: { font: { labelSize: 15 } } }];
    const result = resolveStyle({ pack: "brand", tokens: { font: { labelSize: 19 } } }, styles);
    expect(result.style.theme.font.labelSize).toBe(19);
  });

  it("records which tokens the author set", () => {
    const result = resolveStyle({ pack: "technical-clean", tokens: { node: { byKind: { api: { text: "#111111" } } } } });
    expect([...result.style.authored]).toContain("node.byKind.api.text");
    expect([...result.style.authored]).not.toContain("node.byKind.api.fill");
  });
});

describe("an empty override is its base", () => {
  for (const theme of themes) {
    it(`an empty extension of ${theme.id} resolves to the same tokens`, () => {
      // T02 fixed the theme-name branching that broke this. Layering must not reintroduce it.
      const extended = resolveTheme({ extends: theme.id });
      const { id: _extendedId, ...extendedTokens } = extended;
      const { id: _baseId, ...baseTokens } = theme;
      expect(extendedTokens).toEqual(baseTokens);
    });
  }

  it("an empty workspace style resolves to its pack", () => {
    const withStyle = resolveStyle({ pack: "empty" }, [{ id: "empty", extends: "executive", tokens: {} }]);
    const direct = resolveStyle({ pack: "executive" });
    const strip = (theme: { id: string }) => ({ ...theme, id: "" });
    expect(strip(withStyle.style.theme)).toEqual(strip(direct.style.theme));
  });
});

describe("text takes the colour of the surface it is painted on", () => {
  it("keeps a preferred colour that is readable", () => {
    expect(readableTextOn("#FFFFFF", "#164E63", "#172033")).toBe("#164E63");
  });

  it("falls back when the preferred colour cannot be read there", () => {
    // The defect: two tokens from different groups paired by position rather than contract.
    expect(readableTextOn("#0F1420", "#202630", "#EAF0FA")).toBe("#EAF0FA");
  });

  it("keeps a preferred colour the compiler cannot measure, rather than guessing", () => {
    expect(readableTextOn("#FFFFFF", "burgundy", "#172033")).toBe("burgundy");
  });

  it("knows which components have a surface of their own", () => {
    const icons = namedTheme("cloud-architecture");
    expect(hasOwnSurface({ kind: "service" }, icons)).toBe(false);
    // A replicated component is drawn as a stack, with a fill, even in an icon theme.
    expect(hasOwnSurface({ kind: "service", visual: { replicas: 3 } }, icons)).toBe(true);
    // An explicit shape overrides the theme in both directions.
    expect(hasOwnSurface({ kind: "service", visual: { shape: "card" } }, icons)).toBe(true);
    expect(hasOwnSurface({ kind: "service", visual: { shape: "icon" } }, namedTheme("technical-clean"))).toBe(false);
  });

  it("gives a surface-less label the canvas colour when its own would be unreadable", () => {
    // Exactly the T09 case: darken the canvas, say nothing about component text.
    const dark = resolveTheme({ extends: "cloud-architecture", canvas: { background: "#0F1420", foreground: "#EAF0FA" } });
    expect(componentTextColor({ kind: "service" }, dark)).toBe("#EAF0FA");
  });

  it("keeps a surface-less label's own colour when it is readable", () => {
    // The built-in light icon theme was never broken, so nothing about it changes.
    const light = namedTheme("cloud-architecture");
    expect(componentTextColor({ kind: "service" }, light)).toBe(light.node.byKind.service?.text);
  });

  it("respects an explicitly authored colour even when it is a poor choice", () => {
    // The author chose it. The scene check reports it; resolution does not overrule it.
    const dark = resolveTheme({ extends: "cloud-architecture", canvas: { background: "#0F1420" }, node: { byKind: { service: { text: "#111111" } } } });
    expect(componentTextColor({ kind: "service" }, dark, new Set(["service"]))).toBe("#111111");
  });

  it("leaves a component that has its own surface alone", () => {
    const dark = resolveTheme({ extends: "technical-clean", canvas: { background: "#0F1420" } });
    // A card is read against its own fill, which the canvas change did not touch.
    expect(componentTextColor({ kind: "service" }, dark)).toBe(namedTheme("technical-clean").node.byKind.service?.text);
  });
});

describe("semantic meaning survives presentation", () => {
  const theme = namedTheme("technical-clean");

  it("carries a role, not just a colour", () => {
    expect(semanticTreatment(theme, { status: "failure" }).role).toBe("failure");
    expect(semanticTreatment(theme, { status: "success" }).role).toBe("success");
    expect(semanticTreatment(theme, { focused: true }).role).toBe("focus");
    expect(semanticTreatment(theme).role).toBe("normal");
  });

  it("keeps a status role and its marker when the mark is muted", () => {
    // A muted failure is still a failure. Deriving the colour at drawing time and throwing
    // the role away is how a muted relationship loses its status meaning.
    const muted = semanticTreatment(theme, { status: "failure", emphasis: "muted" });
    expect(muted.role).toBe("failure");
    expect(muted.marker).toBe("dashed");
    expect(muted.color).toBe(semanticTreatment(theme, { status: "failure" }).color);
    // Only the opacity differs.
    expect(muted.opacity).toBeLessThan(1);
  });

  it("gives each status a distinct marker, so meaning does not depend on colour alone", () => {
    const markers = (["failure", "warning", "success"] as const).map((status) => semanticTreatment(theme, { status }).marker);
    expect(new Set(markers).size).toBe(markers.length);
  });

  it("does not turn a plain muted mark into a status", () => {
    const muted = semanticTreatment(theme, { emphasis: "muted" });
    expect(muted.role).toBe("muted");
    expect(muted.color).toBe(theme.canvas.muted);
  });

  it("treats status as stronger than focus, because a failure is not decoration", () => {
    expect(semanticTreatment(theme, { status: "failure", focused: true }).role).toBe("failure");
  });
});

describe("style previews are legible", () => {
  /**
   * The acceptance criterion "generated style previews pass scene QA", checked at the
   * resolution layer: every built-in pack, across every component kind it styles, must
   * produce text readable on the surface it will be drawn on.
   */
  it("finds no unreadable surface in any built-in pack", () => {
    for (const theme of themes) {
      expect(unreadableSurfaces(theme).map((entry) => `${theme.id}/${entry.kind}`), theme.id).toEqual([]);
    }
  });

  it("keeps every pack's chrome readable on its own canvas", () => {
    for (const theme of themes) {
      const ratio = contrastRatio(theme.canvas.foreground, theme.canvas.background);
      expect(ratio, theme.id).toBeGreaterThanOrEqual(MINIMUM_TEXT_CONTRAST);
    }
  });

  it("keeps a darkened extension of every pack readable", () => {
    // The T09 pattern applied to every pack, not just the two the generator happened to hit.
    for (const theme of themes) {
      const dark = resolveTheme({ extends: theme.id, canvas: { background: "#0F1420", foreground: "#EAF0FA", muted: "#94A6BF" } });
      for (const kind of ["service", "api", "database", "queue"] as const) {
        const surface = hasOwnSurface({ kind }, dark) ? (dark.node.byKind[kind] ?? dark.node.default).fill : dark.canvas.background;
        const ratio = contrastRatio(componentTextColor({ kind }, dark), surface);
        expect(ratio, `${theme.id}/${kind}`).toBeGreaterThanOrEqual(MINIMUM_TEXT_CONTRAST);
      }
    }
  });
});
