import { createRequire } from "node:module";
import { openSync, type Font } from "fontkit";
import type { Size } from "./ir.js";
import type { TextMeasurer, TextStyle } from "./measure.js";

const require = createRequire(import.meta.url);

export class BundledFontTextMeasurer implements TextMeasurer {
  public readonly id = "dejavu-sans-fontkit-v1";
  private readonly regular: Font;
  private readonly bold: Font;

  public constructor() {
    this.regular = openFont("dejavu-fonts-ttf/ttf/DejaVuSans.ttf");
    this.bold = openFont("dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf");
  }

  public measure(text: string, style: TextStyle): Size {
    const font = (style.fontWeight ?? 400) >= 600 ? this.bold : this.regular;
    const run = font.layout(text.normalize("NFC"));
    const scale = style.fontSize / font.unitsPerEm;
    return {
      width: round(run.advanceWidth * scale),
      height: round(style.fontSize * style.lineHeight),
    };
  }
}

function openFont(modulePath: string): Font {
  const opened = openSync(require.resolve(modulePath));
  if ("fonts" in opened) throw new Error(`Expected a single font file for ${modulePath}.`);
  return opened;
}

let defaultMeasurer: BundledFontTextMeasurer | undefined;

export function bundledFontTextMeasurer(): BundledFontTextMeasurer {
  defaultMeasurer ??= new BundledFontTextMeasurer();
  return defaultMeasurer;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
