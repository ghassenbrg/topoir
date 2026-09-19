import { Resvg } from "@resvg/resvg-js";
import { bundledFontFiles } from "./fonts.js";

export interface PngOptions {
  readonly scale?: number;
  readonly background?: string;
}

export function renderPng(svg: string, options: PngOptions = {}): Uint8Array {
  const scale = options.scale ?? 1;
  if (!Number.isFinite(scale) || scale <= 0 || scale > 8) {
    throw new Error("PNG scale must be greater than 0 and at most 8.");
  }
  const renderer = new Resvg(svg, {
    background: options.background ?? "#F8FAFC",
    fitTo: { mode: "zoom", value: scale },
    font: {
      loadSystemFonts: false,
      fontFiles: bundledFontFiles,
      defaultFontFamily: "DejaVu Sans",
      sansSerifFamily: "DejaVu Sans",
    },
  });
  const png = renderer.render().asPng();
  const metadata = svg.match(/<metadata id="topoir-artwork-licenses">([\s\S]*?)<\/metadata>/)?.[1];
  if (!metadata) return png;
  const text = metadata.replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"').replaceAll("&apos;", "'").replaceAll("&amp;", "&");
  // iTXt: keyword NUL, compression flag/method (0), empty language and
  // translated keyword (NUL each), then uncompressed UTF-8 attribution.
  const payload = Buffer.concat([Buffer.from("Artwork licenses\0\0\0\0\0", "ascii"), Buffer.from(text, "utf8")]);
  const chunk = Buffer.alloc(payload.length + 12);
  chunk.writeUInt32BE(payload.length, 0);
  chunk.write("iTXt", 4, "ascii");
  payload.copy(chunk, 8);
  let crc = 0xffffffff;
  for (const byte of chunk.subarray(4, -4)) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  chunk.writeUInt32BE((crc ^ 0xffffffff) >>> 0, chunk.length - 4);
  return Buffer.concat([png.subarray(0, png.length - 12), chunk, png.subarray(png.length - 12)]);
}
