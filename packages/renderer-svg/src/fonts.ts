import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const fonts = [
  { weight: 400, path: "dejavu-fonts-ttf/ttf/DejaVuSans.ttf" },
  { weight: 700, path: "dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf" },
] as const;

export const bundledFontFiles = fonts.map((font) =>
  require.resolve(font.path),
);

let cachedCss: string | undefined;

export function embeddedFontCss(): string {
  if (cachedCss !== undefined) return cachedCss;
  cachedCss = fonts
    .map((font, index) => {
      const file = bundledFontFiles[index];
      if (file === undefined) throw new Error(`Missing bundled DejaVu Sans font for weight ${font.weight}.`);
      const data = readFileSync(file).toString("base64");
      return `@font-face{font-family:'DejaVu Sans';font-style:normal;font-weight:${font.weight};font-display:block;src:url(data:font/ttf;base64,${data}) format('truetype')}`;
    })
    .join("");
  return cachedCss;
}
