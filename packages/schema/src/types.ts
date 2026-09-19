export const TOPOIR_API_VERSION = "topoir.dev/v1alpha1" as const;
export const TOPOIR_DOCUMENT_KIND = "Architecture" as const;

export type TopoIRApiVersion = typeof TOPOIR_API_VERSION;
export type TopoIRDocumentKind = typeof TOPOIR_DOCUMENT_KIND;

export interface SourcePosition {
  readonly line: number;
  readonly column: number;
  readonly offset: number;
}

export interface SourceRange {
  readonly start: SourcePosition;
  readonly end: SourcePosition;
}

export type DiagnosticSeverity = "error" | "warning" | "info";

export interface Diagnostic {
  readonly code: string;
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly path?: string;
  readonly source?: string;
  readonly range?: SourceRange;
  readonly hint?: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

export type GroupKind =
  | "system"
  | "environment"
  | "cloud"
  | "region"
  | "zone"
  | "network"
  | "vpc"
  | "subnet"
  | "kubernetes-cluster"
  | "namespace"
  | "deployment"
  | "security-boundary"
  | "external-zone"
  | "logical";

export type NodeKind =
  | "client"
  | "service"
  | "api"
  | "worker"
  | "database"
  | "cache"
  | "queue"
  | "stream"
  | "object-storage"
  | "filesystem"
  | "gateway"
  | "load-balancer"
  | "firewall"
  | "identity-provider"
  | "vm"
  | "container"
  | "pod"
  | "kubernetes-service"
  | "function"
  | "cloud-service"
  | "external-system"
  | "generic";

export type EdgeKind =
  | "request"
  | "response"
  | "read"
  | "write"
  | "publish"
  | "consume"
  | "replicate"
  | "authenticate"
  | "authorize"
  | "stream"
  | "sync"
  | "async"
  | "control"
  | "data"
  | "dependency"
  | "network";

export type Direction = "right" | "left" | "down" | "up";
export type PortSide = "north" | "east" | "south" | "west" | "auto";

export const SUPPORTED_NODE_KINDS = [
  "client",
  "service",
  "api",
  "worker",
  "database",
  "cache",
  "queue",
  "stream",
  "object-storage",
  "filesystem",
  "gateway",
  "load-balancer",
  "firewall",
  "identity-provider",
  "vm",
  "container",
  "pod",
  "kubernetes-service",
  "function",
  "cloud-service",
  "external-system",
  "generic",
] as const satisfies readonly NodeKind[];

export interface DocumentMetadata {
  readonly name: string;
  readonly title?: string;
  readonly description?: string;
  readonly labels?: Readonly<Record<string, string>>;
  readonly [extension: `x-${string}`]: unknown;
}

export interface GroupLayout {
  readonly mode?: "auto" | "layered" | "row" | "column" | "grid" | "pack";
  readonly direction?: Direction;
  readonly columns?: number;
  readonly gap?: number;
  readonly [extension: `x-${string}`]: unknown;
}

export interface PaintOverride {
  readonly fill?: string;
  readonly stroke?: string;
  readonly text?: string;
}

export interface GroupVisual extends PaintOverride {
  readonly emphasis?: "primary" | "secondary" | "muted";
}

/**
 * The design tokens a view may author. Every field overrides the named base in `extends`,
 * so an author states only what makes this diagram's design its own.
 */
export interface DesignTokens {
  readonly extends?: string;
  readonly language?: {
    readonly component?: "card" | "icon" | "architectural" | "sketch";
    readonly header?: "plain" | "editorial" | "rule";
    readonly boundaries?: "panel" | "outline" | "rail";
    readonly connectorRadius?: number;
    readonly depth?: number;
    readonly iconSize?: number;
  };
  readonly font?: {
    readonly family?: string;
    readonly labelSize?: number;
    readonly descriptionSize?: number;
    readonly groupTitleSize?: number;
    readonly edgeLabelSize?: number;
    readonly lineHeight?: number;
  };
  readonly canvas?: { readonly background?: string; readonly foreground?: string; readonly muted?: string };
  readonly spacing?: {
    readonly nodePaddingX?: number;
    readonly nodePaddingY?: number;
    readonly groupPadding?: number;
    readonly groupTitleHeight?: number;
    readonly layerGap?: number;
    readonly nodeGap?: number;
  };
  readonly node?: {
    readonly minWidth?: number;
    readonly minHeight?: number;
    readonly maxTextWidth?: number;
    readonly radius?: number;
    readonly iconSize?: number;
    readonly default?: PaintOverride;
    readonly byKind?: Readonly<Record<string, PaintOverride>>;
  };
  readonly group?: {
    readonly radius?: number;
    readonly default?: PaintOverride;
    readonly byKind?: Readonly<Record<string, PaintOverride>>;
  };
  readonly edge?: {
    readonly stroke?: string;
    readonly labelBackground?: string;
    readonly labelText?: string;
    readonly width?: number;
    readonly byKind?: Readonly<Record<string, string>>;
    readonly palette?: readonly string[];
  };
  readonly annotation?: {
    readonly note?: PaintOverride;
    readonly warning?: PaintOverride;
    readonly callout?: PaintOverride;
  };
}

export interface GroupDefinition {
  readonly id: string;
  readonly label?: string;
  readonly kind: GroupKind;
  readonly visual?: GroupVisual;
  readonly parent?: string;
  readonly description?: string;
  readonly technology?: string;
  readonly icon?: string;
  readonly tags?: readonly string[];
  readonly order?: number;
  readonly layout?: GroupLayout;
  readonly [extension: `x-${string}`]: unknown;
}

export interface PortDefinition {
  readonly id: string;
  readonly label?: string;
  readonly side?: PortSide;
  readonly kind?: "input" | "output" | "bidirectional";
  readonly protocol?: string;
  readonly order?: number;
  readonly [extension: `x-${string}`]: unknown;
}

export interface NodeDefinition {
  readonly id: string;
  readonly label?: string;
  readonly kind: NodeKind;
  readonly group?: string;
  readonly description?: string;
  readonly technology?: string;
  readonly icon?: string;
  readonly tags?: readonly string[];
  readonly order?: number;
  readonly ports?: readonly PortDefinition[];
  readonly visual?: NodeVisual;
  readonly [extension: `x-${string}`]: unknown;
}

export interface FlowDefinition {
  readonly id: string;
  readonly label?: string;
  readonly description?: string;
  readonly color?: string;
  readonly style?: "solid" | "dashed" | "dotted";
  readonly order?: number;
  readonly [extension: `x-${string}`]: unknown;
}

export interface EdgeDefinition {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly sourcePort?: string;
  readonly targetPort?: string;
  readonly label?: string;
  readonly description?: string;
  readonly protocol?: string;
  readonly kind?: EdgeKind;
  readonly flow?: string;
  readonly direction?: "forward" | "back" | "both" | "none";
  readonly style?: "solid" | "dashed" | "dotted";
  readonly tags?: readonly string[];
  readonly order?: number;
  readonly emphasis?: "primary" | "secondary" | "muted";
  readonly status?: "normal" | "success" | "failure" | "warning";
  readonly step?: number;
  readonly [extension: `x-${string}`]: unknown;
}

export interface AnnotationDefinition {
  readonly id: string;
  readonly kind?: "note" | "warning" | "callout";
  readonly text: string;
  readonly visual?: PaintOverride;
  readonly anchor?: string;
  readonly tags?: readonly string[];
  readonly order?: number;
  readonly [extension: `x-${string}`]: unknown;
}

export interface ArchitectureModel {
  readonly groups?: readonly GroupDefinition[];
  readonly nodes?: readonly NodeDefinition[];
  readonly edges?: readonly EdgeDefinition[];
  readonly flows?: readonly FlowDefinition[];
  readonly annotations?: readonly AnnotationDefinition[];
  readonly [extension: `x-${string}`]: unknown;
}

export interface ViewSelector {
  readonly groups?: readonly string[];
  readonly nodes?: readonly string[];
  readonly edges?: readonly string[];
  readonly tags?: readonly string[];
  readonly [extension: `x-${string}`]: unknown;
}

export interface ViewLayout {
  readonly engine?: "auto" | "layered";
  readonly direction?: Direction;
  readonly aspectRatio?: number;
  readonly spacing?: "compact" | "normal" | "relaxed";
  readonly [extension: `x-${string}`]: unknown;
}

export interface ViewDefinition {
  readonly id: string;
  readonly title?: string;
  readonly description?: string;
  readonly include?: ViewSelector;
  readonly exclude?: ViewSelector;
  readonly layout?: ViewLayout;
  readonly theme?: string | DesignTokens;
  readonly showLegend?: boolean;
  readonly design?: DesignIntent;
  readonly [extension: `x-${string}`]: unknown;
}

export interface NodeVisual {
  readonly shape?: "auto" | "card" | "icon" | "cylinder" | "stack" | "pill" | "diamond" | "image";
  readonly emphasis?: "primary" | "secondary" | "muted";
  readonly status?: "normal" | "success" | "failure" | "warning";
  readonly badge?: string;
  readonly replicas?: number;
  readonly asset?: string;
  readonly assets?: readonly string[];
  readonly portLabels?: "hidden" | "inside";
}

export interface DesignIntent {
  readonly composition?: "topology" | "layers" | "sequence" | "swimlanes" | "comparison" | "architecture" | "architecture-map";
  readonly audience?: "engineering" | "executive" | "presentation";
  readonly takeaway?: string;
  readonly focus?: readonly string[];
  readonly story?: readonly string[];
  readonly optimize?: boolean;
}

export interface TopoIRDocument {
  readonly apiVersion: TopoIRApiVersion;
  readonly kind: TopoIRDocumentKind;
  readonly metadata: DocumentMetadata;
  readonly model: ArchitectureModel;
  readonly views?: readonly ViewDefinition[];
  readonly [extension: `x-${string}`]: unknown;
}

export interface ParsedDocument<T = unknown> {
  readonly value?: T;
  readonly diagnostics: readonly Diagnostic[];
  readonly sourceMap: SourceMap;
}

export interface SourceMap {
  readonly source: string;
  readonly ranges: ReadonlyMap<string, SourceRange>;
  find(pointer: string): SourceRange | undefined;
}

export interface ValidationResult<T> {
  readonly ok: boolean;
  readonly value?: T;
  readonly diagnostics: readonly Diagnostic[];
}
