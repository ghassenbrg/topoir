import { describe, expect, it } from "vitest";
import { renderSvg } from "../src/svg.js";
import type { Scene } from "../src/scene.js";

/**
 * The renderer had no unit coverage. Its guarantees — self-contained output, canonical
 * ordering, escaping and no network references — were only ever asserted end to end
 * through one golden hash, which says a byte changed but never which guarantee broke.
 */

const scene = (children: Scene["children"], extra: Partial<Scene> = {}): Scene => ({
  width: 400,
  height: 200,
  title: "Diagram",
  background: "#ffffff",
  fontFamily: "DejaVu Sans",
  children,
  ...extra,
});

describe("renderSvg", () => {
  it("declares the accessible title and description the document asked for", () => {
    const svg = renderSvg(scene([], { title: "Payments", description: "How money moves" }));
    expect(svg).toContain('<title id="topoir-title">Payments</title>');
    expect(svg).toContain('<desc id="topoir-description">How money moves</desc>');
    expect(svg).toContain('aria-labelledby="topoir-title topoir-description"');
  });

  it("falls back to a description derived from the title", () => {
    expect(renderSvg(scene([], { title: "Payments" }))).toContain("Architecture diagram: Payments");
  });

  it("escapes markup in author-supplied text instead of emitting it", () => {
    const svg = renderSvg(
      scene([{ type: "text", x: 0, y: 0, lines: ['<script>alert("x")</script>'], lineHeight: 16, fontSize: 12, fill: "#000" }], {
        title: "A & B <tag>",
      }),
    );
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;");
    expect(svg).toContain("A &amp; B &lt;tag&gt;");
  });

  it("embeds the font rather than naming a system one", () => {
    const svg = renderSvg(scene([]));
    expect(svg).toContain("@font-face");
    expect(svg).toContain("base64,");
  });

  it("references nothing over the network", () => {
    const svg = renderSvg(
      scene([{ type: "text", x: 0, y: 0, lines: ["hello"], lineHeight: 16, fontSize: 12, fill: "#000" }], { attribution: "Icons: CC-BY" }),
    );
    expect(svg).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
  });

  it("carries artwork attribution in metadata when there is any", () => {
    expect(renderSvg(scene([], { attribution: "Devicon, MIT" }))).toContain(
      '<metadata id="topoir-artwork-licenses">Devicon, MIT</metadata>',
    );
    expect(renderSvg(scene([]))).not.toContain("topoir-artwork-licenses");
  });

  it("orders arrowhead markers deterministically whatever order the colors arrive in", () => {
    const path = (stroke: string) => ({ type: "path" as const, d: "M0 0L10 0", stroke, strokeWidth: 1, markerEnd: stroke });
    const forward = renderSvg(scene([path("#111111"), path("#eeeeee"), path("#777777")]));
    const reverse = renderSvg(scene([path("#777777"), path("#eeeeee"), path("#111111")]));
    const markers = (svg: string) => [...svg.matchAll(/<marker id="([^"]+)"/g)].map((match) => match[1]);
    expect(markers(forward)).toEqual(markers(reverse));
    expect(markers(forward)).toHaveLength(3);
  });

  it("produces identical bytes for the same scene", () => {
    const build = () => renderSvg(scene([{ type: "rect", x: 1, y: 2, width: 3, height: 4, fill: "#fff" }]));
    expect(build()).toBe(build());
  });

  it("refuses an image that is not embedded data", () => {
    expect(() =>
      renderSvg(scene([{ type: "image", x: 0, y: 0, width: 10, height: 10, href: "https://example.com/logo.png", title: "logo" }])),
    ).toThrow();
  });

  it("accepts an embedded data image", () => {
    const href = "data:image/png;base64,iVBORw0KGgo=";
    expect(renderSvg(scene([{ type: "image", x: 0, y: 0, width: 10, height: 10, href, title: "logo" }]))).toContain(href);
  });
});
