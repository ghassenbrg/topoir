import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { crc32, inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { TopoIRCompiler } from "../src/index.js";

const examplePath = resolve(process.cwd(), "examples/checkout-platform.topoir.yaml");

describe("TopoIR compiler", () => {
  it("compiles nested architecture semantics to quality-checked geometry", async () => {
    const source = await readFile(examplePath, "utf8");
    const result = await new TopoIRCompiler().compile(source, {
      source: examplePath,
      view: "data",
      format: "svg",
    });

    expect(result.ok).toBe(true);
    expect(result.diagnostics.filter((item) => item.severity === "error")).toEqual([]);
    expect(result.views).toHaveLength(1);
    expect(result.views[0]?.geometry.groups.map((group) => group.id)).toEqual(
      expect.arrayContaining(["aws", "eu-west-1", "production-vpc", "data-tier", "eks"]),
    );
    expect(result.views[0]?.metrics).toMatchObject({
      nodeOverlaps: 0,
      edgeNodeIntersections: 0,
      nonOrthogonalSegments: 0,
      emptyRoutes: 0,
    });
    expect(String(result.artifacts[0]?.content)).toContain("data-topoir-renderer=\"svg-v1\"");
    expect(String(result.artifacts[0]?.content)).toContain("@font-face");
  });

  it("produces byte-identical SVG and stable manifest hashes", async () => {
    const source = await readFile(examplePath, "utf8");
    const compiler = new TopoIRCompiler();
    const first = await compiler.compile(source, { source: examplePath, view: "data", format: "svg" });
    const second = await compiler.compile(source, { source: examplePath, view: "data", format: "svg" });

    expect(first.artifacts[0]?.content).toBe(second.artifacts[0]?.content);
    expect(first.artifacts[0]?.sha256).toBe(second.artifacts[0]?.sha256);
    expect(first.manifest).toEqual(second.manifest);
  });

  it("exports a valid PNG without loading system fonts", async () => {
    const source = await readFile(examplePath, "utf8");
    const result = await new TopoIRCompiler().compile(source, {
      source: examplePath,
      view: "data",
      format: "png",
    });
    const content = result.artifacts[0]?.content;

    expect(result.ok).toBe(true);
    expect(content).toBeInstanceOf(Uint8Array);
    expect([...((content as Uint8Array | undefined)?.slice(0, 8) ?? [])]).toEqual([
      137, 80, 78, 71, 13, 10, 26, 10,
    ]);
    const png = Buffer.from(content as Uint8Array);
    const imageData: Buffer[] = [];
    let attribution = "";
    for (let offset = 8; offset < png.length;) {
      const length = png.readUInt32BE(offset);
      const type = png.toString("ascii", offset + 4, offset + 8);
      const data = png.subarray(offset + 8, offset + 8 + length);
      expect(crc32(png.subarray(offset + 4, offset + 8 + length))).toBe(png.readUInt32BE(offset + 8 + length));
      if (type === "IDAT") imageData.push(data);
      if (type === "iTXt") {
        const keywordEnd = data.indexOf(0);
        expect([...data.subarray(keywordEnd, keywordEnd + 5)]).toEqual([0, 0, 0, 0, 0]);
        attribution += data.subarray(keywordEnd + 5).toString("utf8");
      }
      offset += length + 12;
    }
    expect(inflateSync(Buffer.concat(imageData)).length).toBeGreaterThan(0);
    expect(attribution).toContain("Permission");
    expect(attribution).not.toContain("&quot;");
  });

  it("matches the quickstart golden SVG contract", async () => {
    const path = resolve(process.cwd(), "examples/quickstart.topoir.yaml");
    const source = await readFile(path, "utf8");
    const result = await new TopoIRCompiler().compile(source, { source: path, format: "svg" });

    expect(result.artifacts[0]?.sha256).toBe("26fce4879da6203b1bbba55e1a0d5f6fbbeb220e3ee7976bb1a8e39103865c4d");
    expect(result.views[0]?.geometry.bounds).toEqual({ x: 0, y: 0, width: 1068.27, height: 198 });
  });
});
