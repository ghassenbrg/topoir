import { mkdtemp, writeFile, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { AssetRegistry, discoverAssets, safeSvg } from "../src/index.js";

const logo = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80"><rect width="240" height="80" fill="#2563EB"/></svg>';

describe("offline asset inventory", () => {
  it("resolves technology aliases and keeps search payloads small", () => {
    const registry = new AssetRegistry();
    expect(registry.size).toBeGreaterThan(2500);
    expect(registry.resolve("postgres")?.id).toBe("devicon:postgresql");
    expect(registry.resolve("k8s")?.id).toBe("devicon:kubernetes");
    expect(registry.resolve("pod")?.id).toBe("k8s:pod");
    expect(registry.resolve("configmap")?.license).toContain("Apache-2.0");
    expect(registry.resolve("aws lambda")?.collection).toBe("lucide");
    expect(registry.resolve("keycloak")?.id).toBe("lucide:fingerprint-pattern");
    expect(registry.resolve("traefik")?.description).toContain("not provider-native");
    expect(registry.search("postgres", 2)[0]?.license).toContain("MIT");
    expect(JSON.stringify(registry.search("postgres", 2))).not.toContain("base64");
  });

  it("discovers human-readable names, metadata aliases and dimensions without leaking image bodies", async () => {
    const dir = await mkdtemp(join(tmpdir(), "topoir-assets-"));
    await writeFile(join(dir, "payment api.svg"), logo);
    await writeFile(join(dir, "assets.yaml"), 'assets:\n  payment-api:\n    file: payment api.svg\n    aliases: [payments, payment backend]\n    description: Internal payment service\n');
    const { registry, diagnostics } = await discoverAssets(dir);
    expect(diagnostics).toEqual([]);
    expect(registry.resolve("payments")).toMatchObject({ id: "custom:payment-api", width: 240, height: 80 });
    expect(registry.search("payment backend", 2)[0]?.id).toBe("custom:payment-api");
    expect(JSON.stringify(registry.search("payments", 2))).not.toContain("base64");
  });

  it.each(["png", "jpeg", "webp"] as const)("normalizes %s images to deterministic embedded PNG", async (format) => {
    const dir = await mkdtemp(join(tmpdir(), "topoir-raster-"));
    const bytes = await sharp({ create: { width: 48, height: 24, channels: 4, background: "#22AA88" } }).toFormat(format).toBuffer();
    await writeFile(join(dir, `gateway.${format}`), bytes);
    const { registry, diagnostics } = await discoverAssets(dir);
    expect(diagnostics).toEqual([]);
    expect(registry.resolve("gateway")).toMatchObject({ width: 48, height: 24, mediaType: "image/png", collection: "custom" });
    expect(registry.resolve("gateway")?.dataUri).toMatch(/^data:image\/png;base64,/);
  });

  it("rejects escaping references and missing metadata files", async () => {
    const dir = await mkdtemp(join(tmpdir(), "topoir-escape-"));
    await writeFile(join(dir, "assets.yaml"), 'assets:\n  missing:\n    file: missing.svg\n');
    expect((await discoverAssets(dir)).diagnostics[0]?.code).toBe("TOP320_ASSET_METADATA_INVALID");
    const external = await mkdtemp(join(tmpdir(), "topoir-external-"));
    await writeFile(join(external, "logo.svg"), logo);
    await symlink(join(external, "logo.svg"), join(dir, "linked.svg"));
    await writeFile(join(dir, "assets.yaml"), 'assets:\n  escaped:\n    file: linked.svg\n');
    expect((await discoverAssets(dir)).diagnostics[0]?.message).toContain("escapes");
  });

  it.each([
    '<svg viewBox="0 0 10 10"><script>alert(1)</script></svg>',
    '<svg viewBox="0 0 10 10" onload="alert(1)"/>',
    '<svg viewBox="0 0 10 10"><use href="https://example.com/x.svg"/></svg>',
    '<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg>&x;</svg>',
    '<svg viewBox="0 0 10 10"><rect fill="url(https://example.com/a)"/></svg>',
    '<svg viewBox="NaN 0 10 10"/>',
  ])("rejects active or externally referenced SVG", (source) => { expect(() => safeSvg(source)).toThrow(); });

  it("accepts passive gradients and preserves the source aspect ratio", () => {
    expect(safeSvg('<svg viewBox="0 0 200 50"><defs><linearGradient id="a"><stop offset="0" stop-color="#fff"/></linearGradient></defs><rect width="200" height="50" fill="url(#a)"/></svg>')).toMatchObject({ width: 200, height: 50 });
  });
});
