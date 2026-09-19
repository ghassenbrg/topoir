/**
 * Colour normalization and legibility.
 *
 * The schema's colour pattern is `^(#[0-9A-Fa-f]{3,8}|[a-zA-Z]+)$`, which accepts strings
 * that are not colours at all: a seven-digit hex value, or any run of letters. Those reach
 * rendering as-is and are silently ignored by the SVG consumer. Resolution normalizes what
 * it can and reports what it cannot.
 *
 * The review also found white text on a white fill compiling with no diagnostic, because
 * theme validation checked structure rather than legibility. `contrastRatio` is the WCAG
 * 2.1 relative-luminance ratio, used to catch paint nobody can read.
 */

export interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  /** 0-1. A fully transparent colour is invisible whatever its channels say. */
  readonly a: number;
}

/**
 * The CSS named colours the compiler recognizes. This is deliberately the small set that
 * appears in practice rather than the full CSS list: an unrecognized name is reported, not
 * guessed at, so a typo cannot silently paint something the author did not choose.
 */
const NAMED_COLORS: Readonly<Record<string, string>> = {
  aqua: "#00FFFF",
  black: "#000000",
  blue: "#0000FF",
  brown: "#A52A2A",
  crimson: "#DC143C",
  cyan: "#00FFFF",
  darkblue: "#00008B",
  darkgray: "#A9A9A9",
  darkgreen: "#006400",
  darkgrey: "#A9A9A9",
  darkred: "#8B0000",
  fuchsia: "#FF00FF",
  gold: "#FFD700",
  gray: "#808080",
  green: "#008000",
  grey: "#808080",
  indigo: "#4B0082",
  lightblue: "#ADD8E6",
  lightgray: "#D3D3D3",
  lightgrey: "#D3D3D3",
  lime: "#00FF00",
  magenta: "#FF00FF",
  maroon: "#800000",
  navy: "#000080",
  olive: "#808000",
  orange: "#FFA500",
  pink: "#FFC0CB",
  purple: "#800080",
  red: "#FF0000",
  silver: "#C0C0C0",
  teal: "#008080",
  transparent: "#00000000",
  violet: "#EE82EE",
  white: "#FFFFFF",
  yellow: "#FFFF00",
};

/** Parses a colour, or returns undefined when the value is not one the compiler knows. */
export function parseColor(value: string): Rgb | undefined {
  const text = value.trim();
  const named = NAMED_COLORS[text.toLowerCase()];
  const hex = named ?? text;
  if (!hex.startsWith("#")) return undefined;
  const digits = hex.slice(1);
  if (!/^[0-9A-Fa-f]+$/u.test(digits)) return undefined;
  const expand = (pair: string): number => Number.parseInt(pair.length === 1 ? pair + pair : pair, 16);
  if (digits.length === 3 || digits.length === 4) {
    return {
      r: expand(digits[0]!),
      g: expand(digits[1]!),
      b: expand(digits[2]!),
      a: digits.length === 4 ? expand(digits[3]!) / 255 : 1,
    };
  }
  if (digits.length === 6 || digits.length === 8) {
    return {
      r: expand(digits.slice(0, 2)),
      g: expand(digits.slice(2, 4)),
      b: expand(digits.slice(4, 6)),
      a: digits.length === 8 ? expand(digits.slice(6, 8)) / 255 : 1,
    };
  }
  // 5 and 7 digits match the schema pattern but are not valid colours.
  return undefined;
}

/** Normalizes a recognized colour to `#RRGGBB` or `#RRGGBBAA`; returns undefined otherwise. */
export function normalizeColor(value: string): string | undefined {
  const rgb = parseColor(value);
  if (rgb === undefined) return undefined;
  const pair = (channel: number): string => channel.toString(16).padStart(2, "0").toUpperCase();
  const base = `#${pair(rgb.r)}${pair(rgb.g)}${pair(rgb.b)}`;
  return rgb.a === 1 ? base : `${base}${pair(Math.round(rgb.a * 255))}`;
}

export function isColor(value: string): boolean {
  return parseColor(value) !== undefined;
}

/** WCAG 2.1 relative luminance. */
function luminance({ r, g, b }: Rgb): number {
  const channel = (value: number): number => {
    const scaled = value / 255;
    return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Composites a possibly translucent colour over an opaque backdrop. */
export function composite(front: Rgb, behind: Rgb): Rgb {
  if (front.a >= 1) return front;
  const blend = (a: number, b: number): number => Math.round(a * front.a + b * (1 - front.a));
  return { r: blend(front.r, behind.r), g: blend(front.g, behind.g), b: blend(front.b, behind.b), a: 1 };
}

/**
 * WCAG 2.1 contrast ratio between two colours, 1 (identical) to 21 (black on white).
 * Returns undefined when either value is not a colour the compiler recognizes.
 */
export function contrastRatio(foreground: string, background: string): number | undefined {
  const front = parseColor(foreground);
  const behind = parseColor(background);
  if (front === undefined || behind === undefined) return undefined;
  const resolved = composite(front, behind);
  const lighter = Math.max(luminance(resolved), luminance(behind));
  const darker = Math.min(luminance(resolved), luminance(behind));
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
}

/**
 * The ratio below which body text is treated as unreadable.
 *
 * WCAG AA asks for 4.5:1 for normal text and 3:1 for large text. Diagram labels are drawn
 * at a range of sizes and over decorated fills, and the compiler is not the arbiter of a
 * designer's palette, so the gate here is the lower large-text bound: it catches paint
 * nobody can read without rejecting deliberately soft secondary text.
 */
export const MINIMUM_TEXT_CONTRAST = 3;

/** The ratio below which two fills are treated as indistinguishable from one another. */
export const MINIMUM_SHAPE_CONTRAST = 1.1;
