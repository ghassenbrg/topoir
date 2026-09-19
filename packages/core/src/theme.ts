import type { DesignTokens, EdgeKind, GroupKind, NodeKind, NodeVisual } from "@topoir/schema";

export interface PaintStyle {
  readonly fill: string;
  readonly stroke: string;
  readonly text: string;
}

export interface TopoIRTheme {
  readonly id: string;
  readonly language?: {
    readonly component: "card" | "icon" | "architectural" | "sketch";
    readonly header: "plain" | "editorial" | "rule";
    readonly boundaries: "panel" | "outline" | "rail";
    readonly connectorRadius: number;
    readonly depth: number;
    readonly iconSize: number;
  };
  readonly font: {
    readonly family: string;
    readonly labelSize: number;
    readonly descriptionSize: number;
    readonly groupTitleSize: number;
    readonly edgeLabelSize: number;
    readonly lineHeight: number;
  };
  readonly canvas: {
    readonly background: string;
    readonly foreground: string;
    readonly muted: string;
  };
  readonly spacing: {
    readonly nodePaddingX: number;
    readonly nodePaddingY: number;
    readonly groupPadding: number;
    readonly groupTitleHeight: number;
    readonly layerGap: number;
    readonly nodeGap: number;
  };
  readonly node: {
    readonly minWidth: number;
    readonly minHeight: number;
    readonly maxTextWidth: number;
    readonly radius: number;
    readonly iconSize: number;
    readonly default: PaintStyle;
    readonly byKind: Readonly<Partial<Record<NodeKind, PaintStyle>>>;
  };
  readonly group: {
    readonly radius: number;
    readonly default: PaintStyle;
    readonly byKind: Readonly<Partial<Record<GroupKind, PaintStyle>>>;
  };
  readonly edge: {
    readonly stroke: string;
    readonly labelBackground: string;
    readonly labelText: string;
    readonly width: number;
    readonly byKind: Readonly<Partial<Record<EdgeKind, string>>>;
    readonly palette: readonly string[];
  };
  readonly annotation: {
    readonly note: PaintStyle;
    readonly warning: PaintStyle;
    readonly callout: PaintStyle;
  };
}

export const technicalCleanTheme: TopoIRTheme = {
  id: "technical-clean",
  font: {
    family: "DejaVu Sans",
    labelSize: 14,
    descriptionSize: 11,
    groupTitleSize: 13,
    edgeLabelSize: 11,
    lineHeight: 1.25,
  },
  canvas: {
    background: "#F8FAFC",
    foreground: "#172033",
    muted: "#64748B",
  },
  spacing: {
    nodePaddingX: 16,
    nodePaddingY: 13,
    groupPadding: 24,
    groupTitleHeight: 38,
    layerGap: 76,
    nodeGap: 36,
  },
  node: {
    minWidth: 148,
    minHeight: 64,
    maxTextWidth: 210,
    radius: 10,
    iconSize: 28,
    default: { fill: "#FFFFFF", stroke: "#94A3B8", text: "#172033" },
    byKind: {
      client: { fill: "#F8FAFC", stroke: "#64748B", text: "#172033" },
      service: { fill: "#EFF6FF", stroke: "#3B82F6", text: "#172033" },
      api: { fill: "#EFF6FF", stroke: "#2563EB", text: "#172033" },
      worker: { fill: "#F5F3FF", stroke: "#7C3AED", text: "#172033" },
      database: { fill: "#ECFDF5", stroke: "#059669", text: "#064E3B" },
      cache: { fill: "#FFF7ED", stroke: "#EA580C", text: "#7C2D12" },
      queue: { fill: "#FDF4FF", stroke: "#C026D3", text: "#701A75" },
      stream: { fill: "#FDF2F8", stroke: "#DB2777", text: "#831843" },
      gateway: { fill: "#ECFEFF", stroke: "#0891B2", text: "#164E63" },
      "load-balancer": { fill: "#ECFEFF", stroke: "#0E7490", text: "#164E63" },
      "identity-provider": { fill: "#FFF7ED", stroke: "#D97706", text: "#78350F" },
      "external-system": { fill: "#F8FAFC", stroke: "#64748B", text: "#334155" },
    },
  },
  group: {
    radius: 14,
    default: { fill: "#FFFFFFB8", stroke: "#94A3B8", text: "#334155" },
    byKind: {
      cloud: { fill: "#F0F9FFB8", stroke: "#38BDF8", text: "#075985" },
      region: { fill: "#F8FAFCB8", stroke: "#64748B", text: "#334155" },
      vpc: { fill: "#F0FDF4B8", stroke: "#22C55E", text: "#166534" },
      subnet: { fill: "#F7FEE7B8", stroke: "#84CC16", text: "#3F6212" },
      "kubernetes-cluster": { fill: "#EFF6FFB8", stroke: "#3B82F6", text: "#1E40AF" },
      namespace: { fill: "#F8FAFCB8", stroke: "#94A3B8", text: "#475569" },
      "security-boundary": { fill: "#FFF7ED8C", stroke: "#F97316", text: "#9A3412" },
      "external-zone": { fill: "#F8FAFC8C", stroke: "#94A3B8", text: "#475569" },
    },
  },
  edge: {
    stroke: "#475569",
    labelBackground: "#FFFFFF",
    labelText: "#334155",
    width: 1.8,
    byKind: {
      authenticate: "#D97706",
      authorize: "#D97706",
      replicate: "#7C3AED",
      publish: "#C026D3",
      consume: "#C026D3",
      async: "#C026D3",
      read: "#059669",
      write: "#059669",
    },
    palette: ["#2563EB", "#C026D3", "#059669", "#D97706", "#DC2626", "#7C3AED", "#0891B2"],
  },
  annotation: {
    note: { fill: "#FFFBEB", stroke: "#F59E0B", text: "#78350F" },
    warning: { fill: "#FEF2F2", stroke: "#EF4444", text: "#7F1D1D" },
    callout: { fill: "#EFF6FF", stroke: "#3B82F6", text: "#1E3A8A" },
  },
};

const cloud: TopoIRTheme = {
  ...technicalCleanTheme, id: "cloud-architecture",
  language: { component: "icon", header: "editorial", boundaries: "outline", connectorRadius: 5, depth: 0, iconSize: 48 },
  canvas: { background: "#FFFFFF", foreground: "#172B4D", muted: "#5E6C84" },
  font: { ...technicalCleanTheme.font, labelSize: 14, groupTitleSize: 14 },
  node: { ...technicalCleanTheme.node, minWidth: 120, minHeight: 100, maxTextWidth: 165, iconSize: 48 },
};
const executive: TopoIRTheme = {
  ...technicalCleanTheme, id: "executive",
  language: { component: "card", header: "editorial", boundaries: "rail", connectorRadius: 16, depth: 5, iconSize: 34 },
  canvas: { background: "#F4F1EB", foreground: "#172C38", muted: "#657779" },
  font: { ...technicalCleanTheme.font, labelSize: 17, descriptionSize: 12, groupTitleSize: 14 },
  node: { ...technicalCleanTheme.node, minWidth: 200, minHeight: 100, radius: 16, iconSize: 34, byKind: {}, default: { fill: "#FFFFFF", stroke: "#93A6A3", text: "#172C38" } },
  group: { ...technicalCleanTheme.group, byKind: {}, default: { fill: "#EAE7E0", stroke: "#B9C1B9", text: "#435C5D" } },
  edge: { ...technicalCleanTheme.edge, stroke: "#4A7772", width: 2.4, byKind: {} },
};
const dark: TopoIRTheme = {
  ...technicalCleanTheme, id: "dark-engineering",
  language: { component: "architectural", header: "rule", boundaries: "panel", connectorRadius: 4, depth: 0, iconSize: 34 },
  canvas: { background: "#0C1322", foreground: "#E6EDF7", muted: "#9BABBF" },
  node: { ...technicalCleanTheme.node, minHeight: 80, radius: 5, iconSize: 34, byKind: {}, default: { fill: "#17243A", stroke: "#587495", text: "#E6EDF7" } },
  group: { ...technicalCleanTheme.group, radius: 8, byKind: {}, default: { fill: "#111C2D", stroke: "#354B66", text: "#B5C9DF" } },
  edge: { ...technicalCleanTheme.edge, stroke: "#8BA8C8", labelBackground: "#17243A", labelText: "#C8D9ED", byKind: {}, palette: ["#60A5FA", "#C084FC", "#34D399", "#FBBF24", "#FB7185"] },
  annotation: { note: { fill: "#17243A", stroke: "#587495", text: "#C8D9ED" }, warning: { fill: "#391D2A", stroke: "#FB7185", text: "#FDA4AF" }, callout: { fill: "#142D40", stroke: "#38BDF8", text: "#BAE6FD" } },
};
const blueprint: TopoIRTheme = {
  ...dark, id: "blueprint",
  language: { component: "architectural", header: "rule", boundaries: "outline", connectorRadius: 0, depth: 0, iconSize: 30 },
  canvas: { background: "#12344B", foreground: "#E3F6FF", muted: "#9BC5DA" },
  node: { ...dark.node, radius: 0, default: { fill: "#12344B", stroke: "#A6D7EC", text: "#E3F6FF" } },
  group: { ...dark.group, radius: 0, default: { fill: "#12344B", stroke: "#59869E", text: "#C3E6F7" } },
};
const sketch: TopoIRTheme = {
  ...technicalCleanTheme, id: "whiteboard",
  language: { component: "sketch", header: "plain", boundaries: "outline", connectorRadius: 14, depth: 4, iconSize: 34 },
  canvas: { background: "#FFFDF7", foreground: "#302F2B", muted: "#77736B" },
  node: { ...technicalCleanTheme.node, radius: 3, minHeight: 86, iconSize: 34, default: { fill: "#FFFDF7", stroke: "#514C43", text: "#302F2B" }, byKind: {} },
  group: { ...technicalCleanTheme.group, radius: 4, default: { fill: "#FFFDF7", stroke: "#AAA393", text: "#514C43" }, byKind: {} },
  edge: { ...technicalCleanTheme.edge, stroke: "#514C43", width: 2.2, byKind: {} },
};
const minimal: TopoIRTheme = {
  ...technicalCleanTheme, id: "minimal",
  language: { component: "card", header: "rule", boundaries: "rail", connectorRadius: 0, depth: 0, iconSize: 24 },
  canvas: { background: "#FFFFFF", foreground: "#202630", muted: "#68717D" },
  node: { ...technicalCleanTheme.node, minWidth: 130, minHeight: 52, radius: 2, iconSize: 24, byKind: {}, default: { fill: "#FFFFFF", stroke: "#B4BBC5", text: "#202630" } },
  group: { ...technicalCleanTheme.group, radius: 0, byKind: {}, default: { fill: "#F7F8FA", stroke: "#D9DDE3", text: "#68717D" } },
  edge: { ...technicalCleanTheme.edge, width: 1.2, byKind: {}, stroke: "#68717D" },
};
export const themes: readonly TopoIRTheme[] = [technicalCleanTheme, cloud, executive, dark, blueprint, sketch, minimal];

export function resolveTheme(theme: string | DesignTokens | undefined): TopoIRTheme {
  if (theme === undefined) return technicalCleanTheme;
  if (typeof theme === "string") return namedTheme(theme);
  // Authored tokens layer over a named base, so an author states only what makes this
  // diagram's design its own and never has to restate a whole design system.
  const base = namedTheme(theme.extends ?? technicalCleanTheme.id);
  return {
    ...base,
    id: `${base.id}+authored`,
    ...(base.language || theme.language ? { language: { ...(base.language ?? defaultLanguage), ...strip(theme.language) } } : {}),
    font: { ...base.font, ...strip(theme.font) },
    canvas: { ...base.canvas, ...strip(theme.canvas) },
    spacing: { ...base.spacing, ...strip(theme.spacing) },
    node: {
      ...base.node,
      ...strip(theme.node, ["default", "byKind"]),
      default: { ...base.node.default, ...strip(theme.node?.default) },
      byKind: mergePaints(base.node.byKind, theme.node?.byKind, base.node.default),
    },
    group: {
      ...base.group,
      ...strip(theme.group, ["default", "byKind"]),
      default: { ...base.group.default, ...strip(theme.group?.default) },
      byKind: mergePaints(base.group.byKind, theme.group?.byKind, base.group.default),
    },
    edge: {
      ...base.edge,
      ...strip(theme.edge, ["byKind", "palette"]),
      byKind: { ...base.edge.byKind, ...strip(theme.edge?.byKind) },
      palette: theme.edge?.palette?.length ? [...theme.edge.palette] : base.edge.palette,
    },
    annotation: {
      note: { ...base.annotation.note, ...strip(theme.annotation?.note) },
      warning: { ...base.annotation.warning, ...strip(theme.annotation?.warning) },
      callout: { ...base.annotation.callout, ...strip(theme.annotation?.callout) },
    },
  };
}

export function namedTheme(id: string): TopoIRTheme {
  const theme = themes.find((item) => item.id === id);
  if (!theme) throw new Error(`Unknown theme ${JSON.stringify(id)}. Available themes: ${themes.map((item) => item.id).join(", ")}.`);
  return theme;
}

const defaultLanguage = { component: "card", header: "plain", boundaries: "panel", connectorRadius: 8, depth: 0, iconSize: 28 } as const;

/** Drop absent keys so an override never erases a base value with `undefined`. */
function strip<T extends object>(value: T | undefined, omit: readonly string[] = []): Partial<T> {
  if (!value) return {};
  return Object.fromEntries(
    Object.entries(value).filter(([key, entry]) => entry !== undefined && !omit.includes(key)),
  ) as Partial<T>;
}

/** An authored paint may state only one channel; the rest comes from the base entry. */
function mergePaints<K extends string>(
  base: Readonly<Partial<Record<K, PaintStyle>>>,
  authored: Readonly<Record<string, Partial<PaintStyle>>> | undefined,
  fallback: PaintStyle,
): Readonly<Partial<Record<K, PaintStyle>>> {
  if (!authored) return base;
  const merged: Record<string, PaintStyle> = { ...(base as Record<string, PaintStyle>) };
  for (const [kind, paint] of Object.entries(authored)) {
    merged[kind] = { ...(merged[kind] ?? fallback), ...strip(paint) };
  }
  return merged as Readonly<Partial<Record<K, PaintStyle>>>;
}

export function nodeShape(node: { kind: NodeKind; visual?: NodeVisual }, theme: TopoIRTheme): NonNullable<NodeVisual["shape"]> {
  if (node.visual?.shape && node.visual.shape !== "auto") return node.visual.shape;
  if ((node.visual?.replicas ?? 1) > 1) return "stack";
  if (theme.language?.component === "icon") return "icon";
  if (theme.language?.component === "architectural" || theme.language?.component === "sketch") {
    if (node.kind === "database" || node.kind === "cache") return "cylinder";
    if (node.kind === "pod" || node.kind === "container") return "stack";
  }
  return "card";
}

/**
 * The ordered asset references a component displays.
 *
 * An explicit `visual.assets` list is the complete, author-owned set of asset
 * roles for the component. When it is absent the single automatic asset is
 * resolved from the usual priority chain. Measurement and rendering must both
 * call this so a component can never be measured for one asset and drawn with
 * another.
 */
export function assetReferences(node: {
  kind: NodeKind;
  icon?: string | undefined;
  technology?: string | undefined;
  visual?: NodeVisual | undefined;
}): readonly string[] {
  const explicit = node.visual?.assets ?? [];
  if (explicit.length > 0) return [...new Set(explicit)];
  return [node.visual?.asset ?? node.icon ?? node.technology ?? node.kind];
}
