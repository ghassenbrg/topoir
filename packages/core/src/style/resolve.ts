import type { Diagnostic, v1alpha2 } from "@topoir/schema";
import { contrastRatio, MINIMUM_TEXT_CONTRAST } from "../color.js";
import { namedTheme, resolveTheme, type PaintStyle, type TopoIRTheme } from "../theme.js";

/**
 * Resolved style grammar (T13).
 *
 * The contract's precedence, in order: family defaults → style pack/variant → workspace
 * named style → view tokens → semantic selector rules → occurrence overrides →
 * status/focus rules. Each layer sees the one below it fully resolved, so resolution is
 * deterministic and a caller can be shown the final tokens rather than a stack of partials.
 *
 * Two properties this exists to guarantee:
 *
 * - An empty override is behaviourally identical to its base. T02 fixed the theme-name
 *   branching that broke this; the layering here cannot reintroduce it, because an empty
 *   layer contributes no keys.
 * - Semantic meaning survives presentation. Status and focus are **named token roles**, not
 *   hardcoded colours, so a muted relationship keeps its status marker and a legend keeps
 *   its mapping even when the thing it describes is dimmed.
 */

/** Which layer set a token. Kept so the cascade can tell authored from inherited. */
export type TokenOrigin = "family" | "pack" | "named" | "view" | "selector" | "occurrence" | "state";

export interface ResolvedStyle {
  readonly theme: TopoIRTheme;
  /** Token paths the author set, at any layer above the family defaults. */
  readonly authored: ReadonlySet<string>;
  /** The style pack this resolved from, for provenance in inspection output. */
  readonly pack: string;
  readonly variant?: string;
}

export interface StyleLayer {
  readonly origin: TokenOrigin;
  readonly tokens: v1alpha2.DesignTokens;
}

export interface StyleResolutionResult {
  readonly style: ResolvedStyle;
  readonly diagnostics: readonly Diagnostic[];
}

/**
 * Resolves a workspace's named styles and a view's own tokens into one theme.
 *
 * `styles` are the workspace's reusable definitions; `reference` is what the view asked
 * for. Inheritance is followed to its root before anything is merged, so a style three
 * levels deep resolves the same way whatever order the definitions appear in.
 */
export function resolveStyle(
  reference: { readonly pack?: string; readonly variant?: string; readonly tokens?: v1alpha2.DesignTokens } | undefined,
  styles: readonly v1alpha2.Style[] = [],
): StyleResolutionResult {
  const diagnostics: Diagnostic[] = [];
  const styleById = new Map(styles.map((style) => [style.id, style]));
  const layers: StyleLayer[] = [];

  let pack = "technical-clean";
  if (reference?.pack !== undefined) {
    const named = styleById.get(reference.pack);
    if (named !== undefined) {
      // A workspace style. Walk to its root first so the deepest base merges first.
      const chain: v1alpha2.Style[] = [];
      const seen = new Set<string>();
      let current: v1alpha2.Style | undefined = named;
      while (current !== undefined && !seen.has(current.id)) {
        seen.add(current.id);
        chain.unshift(current);
        current = current.extends === undefined ? undefined : styleById.get(current.extends);
      }
      // The root of the chain may itself name a built-in pack.
      const root = chain[0];
      if (root?.extends !== undefined && !styleById.has(root.extends)) pack = root.extends;
      for (const style of chain) layers.push({ origin: "named", tokens: style.tokens });
    } else if (isBuiltInPack(reference.pack)) {
      pack = reference.pack;
    } else {
      diagnostics.push({
        code: "TOP257_STYLE_NOT_FOUND",
        severity: "error",
        message: `Unknown style ${JSON.stringify(reference.pack)}. Available packs: ${builtInPacks().join(", ")}${styles.length === 0 ? "" : `; workspace styles: ${styles.map((style) => style.id).join(", ")}`}.`,
      });
    }
  }
  if (reference?.tokens !== undefined) layers.push({ origin: "view", tokens: reference.tokens });

  const authored = new Set<string>();
  for (const layer of layers) collectPaths(layer.tokens, "", authored);

  // The existing resolver already does correct, acyclic token merging; layering on top of
  // it keeps one implementation of precedence rather than two that can disagree.
  const merged = layers.reduce<v1alpha2.DesignTokens>((accumulated, layer) => mergeTokens(accumulated, layer.tokens), {});
  const base = layers.length === 0 ? namedTheme(pack) : resolveTheme({ extends: pack, ...merged } as never);

  return {
    style: {
      theme: applyCanvasCascade(base, authored),
      authored,
      pack,
      ...(reference?.variant === undefined ? {} : { variant: reference.variant }),
    },
    diagnostics,
  };
}

/**
 * Text drawn directly on the canvas belongs to the canvas, not to the component.
 *
 * A component with no fill of its own — an icon-style card — has no surface: its label sits
 * on the page. When a style darkens the canvas but does not restate the component text
 * colour, the inherited light-canvas colour is carried onto a dark page and the label
 * becomes unreadable. T09 found nine generated cases doing exactly that, at contrast ratios
 * of 1.13–1.27:1, and the token-level check could not see it because it compared component
 * text against component *fill*, which an icon component does not have.
 *
 * So a fill-less component's label takes `canvas.foreground` — the colour the author chose
 * for text on this canvas — unless a text colour was explicitly authored for that kind, in
 * which case the author's choice stands and the scene check reports it if it is unreadable.
 */
function applyCanvasCascade(theme: TopoIRTheme, authored: ReadonlySet<string>): TopoIRTheme {
  if (theme.language?.component !== "icon") return theme;

  const onCanvas = theme.canvas.foreground;
  const cascade = (paint: PaintStyle, path: string): PaintStyle =>
    authored.has(`${path}.text`) ? paint : { ...paint, text: onCanvas };

  return {
    ...theme,
    node: {
      ...theme.node,
      default: cascade(theme.node.default, "node.default"),
      byKind: Object.fromEntries(
        Object.entries(theme.node.byKind).map(([kind, paint]) => [kind, cascade(paint as PaintStyle, `node.byKind.${kind}`)]),
      ) as TopoIRTheme["node"]["byKind"],
    },
  };
}

/**
 * The status and focus treatment for a mark, as named roles rather than literal colours.
 *
 * Returning a role plus its resolved colour is what lets a legend keep its mapping when a
 * relationship is muted: the role is unchanged, only the paint is dimmed. Deriving the
 * colour at the point of drawing, and throwing the role away, is how a muted relationship
 * loses its status meaning.
 */
export type SemanticRole = "normal" | "success" | "warning" | "failure" | "focus" | "muted";

export interface SemanticTreatment {
  readonly role: SemanticRole;
  readonly color: string;
  /** A second carrier, so meaning does not depend on colour alone. */
  readonly marker: "none" | "solid" | "dashed" | "dotted" | "double";
  /** Reduced opacity for a de-emphasised mark. The role is unchanged. */
  readonly opacity: number;
}

const STATUS_COLORS: Readonly<Record<string, string>> = {
  failure: "#E54864",
  warning: "#D99B21",
  success: "#21A675",
};

export function semanticTreatment(
  theme: TopoIRTheme,
  options: { readonly status?: string; readonly emphasis?: string; readonly focused?: boolean } = {},
): SemanticTreatment {
  const { status, emphasis, focused } = options;
  if (status !== undefined && status !== "normal") {
    const color = STATUS_COLORS[status];
    if (color !== undefined) {
      return {
        role: status as SemanticRole,
        color,
        // Status carries a distinct stroke pattern as well as a colour, so the meaning
        // survives greyscale printing and colour-vision differences.
        marker: status === "failure" ? "dashed" : status === "warning" ? "dotted" : "solid",
        // Muting dims a status mark but never discards its role or its marker.
        opacity: emphasis === "muted" ? 0.55 : 1,
      };
    }
  }
  if (focused === true || emphasis === "primary") {
    return { role: "focus", color: theme.edge.palette[0] ?? theme.edge.stroke, marker: "solid", opacity: 1 };
  }
  if (emphasis === "muted") {
    return { role: "muted", color: theme.canvas.muted, marker: "solid", opacity: 0.55 };
  }
  return { role: "normal", color: theme.edge.stroke, marker: "solid", opacity: 1 };
}

/** Component text that cannot be read on the surface it will be drawn on. */
export function unreadableSurfaces(theme: TopoIRTheme): readonly { kind: string; ratio: number }[] {
  const fillLess = theme.language?.component === "icon";
  const found: { kind: string; ratio: number }[] = [];
  for (const [kind, paint] of Object.entries({ default: theme.node.default, ...theme.node.byKind })) {
    const surface = fillLess ? theme.canvas.background : (paint as PaintStyle).fill;
    const ratio = contrastRatio((paint as PaintStyle).text, surface);
    if (ratio !== undefined && ratio < MINIMUM_TEXT_CONTRAST) found.push({ kind, ratio });
  }
  return found;
}

function builtInPacks(): readonly string[] {
  return ["technical-clean", "cloud-architecture", "executive", "dark-engineering", "blueprint", "whiteboard", "minimal"];
}

function isBuiltInPack(id: string): boolean {
  return builtInPacks().includes(id);
}

/** Every leaf path an authored token object sets, such as `node.byKind.api.text`. */
function collectPaths(value: unknown, prefix: string, into: Set<string>): void {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    if (prefix !== "") into.add(prefix);
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (child === undefined) continue;
    collectPaths(child, prefix === "" ? key : `${prefix}.${key}`, into);
  }
}

/** Deep merge where a later layer wins key by key, never wholesale. */
function mergeTokens(base: v1alpha2.DesignTokens, layer: v1alpha2.DesignTokens): v1alpha2.DesignTokens {
  const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(layer as Record<string, unknown>)) {
    if (value === undefined) continue;
    const existing = result[key];
    result[key] =
      typeof value === "object" && value !== null && !Array.isArray(value) && typeof existing === "object" && existing !== null && !Array.isArray(existing)
        ? mergeTokens(existing as v1alpha2.DesignTokens, value as v1alpha2.DesignTokens)
        : value;
  }
  return result as v1alpha2.DesignTokens;
}
