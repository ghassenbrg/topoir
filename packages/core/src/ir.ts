import type {
  AnnotationDefinition,
  Diagnostic,
  EdgeDefinition,
  FlowDefinition,
  GroupDefinition,
  GroupLayout,
  NodeDefinition,
  NodeVisual,
  PortDefinition,
  SourceMap,
  TopoIRDocument,
  ViewDefinition,
  DesignIntent,
  DesignTokens,
} from "@topoir/schema";

export interface NormalizedGroup
  extends Omit<GroupDefinition, "label" | "tags" | "layout"> {
  readonly label: string;
  readonly tags: readonly string[];
  readonly layout: Required<Pick<GroupLayout, "mode" | "direction">> &
    Pick<GroupLayout, "columns" | "gap">;
}

export interface NormalizedPort
  extends Omit<PortDefinition, "label" | "side" | "kind"> {
  readonly label: string;
  readonly side: NonNullable<PortDefinition["side"]>;
  readonly kind: NonNullable<PortDefinition["kind"]>;
}

export interface NormalizedNode
  extends Omit<NodeDefinition, "label" | "tags" | "ports"> {
  readonly label: string;
  readonly tags: readonly string[];
  readonly ports: readonly NormalizedPort[];
}

export interface NormalizedEdge
  extends Omit<EdgeDefinition, "kind" | "direction" | "style" | "tags"> {
  readonly kind: NonNullable<EdgeDefinition["kind"]>;
  readonly direction: NonNullable<EdgeDefinition["direction"]>;
  readonly style: NonNullable<EdgeDefinition["style"]>;
  readonly tags: readonly string[];
}

export interface NormalizedFlow extends Omit<FlowDefinition, "label" | "style"> {
  readonly label: string;
  readonly style: NonNullable<FlowDefinition["style"]>;
}

export interface NormalizedAnnotation
  extends Omit<AnnotationDefinition, "kind" | "tags"> {
  readonly kind: NonNullable<AnnotationDefinition["kind"]>;
  readonly tags: readonly string[];
}

export interface NormalizedModel {
  readonly groups: readonly NormalizedGroup[];
  readonly nodes: readonly NormalizedNode[];
  readonly edges: readonly NormalizedEdge[];
  readonly flows: readonly NormalizedFlow[];
  readonly annotations: readonly NormalizedAnnotation[];
}

export interface NormalizedDocument {
  readonly apiVersion: TopoIRDocument["apiVersion"];
  readonly kind: TopoIRDocument["kind"];
  readonly metadata: TopoIRDocument["metadata"];
  readonly model: NormalizedModel;
  readonly views: readonly ViewDefinition[];
  readonly sourceMap: SourceMap;
}

export interface ViewGraph {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly theme: string | DesignTokens;
  readonly showLegend: boolean;
  readonly design?: DesignIntent;
  readonly layout: {
    readonly engine: "auto" | "layered";
    readonly direction: "right" | "left" | "down" | "up";
    readonly aspectRatio: number;
    readonly spacing: "compact" | "normal" | "relaxed";
  };
  readonly groups: readonly NormalizedGroup[];
  readonly nodes: readonly NormalizedNode[];
  readonly edges: readonly NormalizedEdge[];
  readonly flows: readonly NormalizedFlow[];
  readonly annotations: readonly NormalizedAnnotation[];
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Rect extends Point, Size {}

export interface MeasuredPort extends NormalizedPort {
  readonly owner: string;
  readonly labelText?: MeasuredText;
  /**
   * The measured attachment slot for a visible internal compartment, relative to the
   * owning component's origin. Layout pins the port to this slot and the renderer draws
   * the compartment at the same rectangle, so the drawn route table and the geometry
   * the connectors attach to cannot drift apart.
   */
  readonly slot?: Rect;
}

/**
 * How much of a piece of authored content actually reached the drawing.
 *
 * `abbreviated` is a legal outcome, but the contract requires it to be *declared by
 * measurement* rather than inferred later from a missing primitive. A caller that sees
 * `rendered` can rely on every grapheme of `source` being present in `lines`.
 *
 * This is the narrow T01 form of the `ContentDisposition` table in
 * `docs/design/04-components-and-styles.md`; T07 replaces it with the full per-content
 * mapping that also carries owning scene IDs.
 */
export type TextDisposition = "rendered" | "abbreviated";

export interface MeasuredText extends Size {
  readonly lines: readonly string[];
  readonly lineHeight: number;
  /** The complete authored text this layout was derived from. */
  readonly source: string;
  readonly disposition: TextDisposition;
  /** Graphemes of `source` that no line carries. Present only when abbreviated. */
  readonly omittedGraphemes?: number;
}

export interface MeasuredNode extends NormalizedNode, Size {
  readonly ports: readonly MeasuredPort[];
  readonly labelText: MeasuredText;
  readonly descriptionText?: MeasuredText;
  readonly imageSize?: Size;
  readonly assetSizes?: readonly Size[];
  /**
   * The badge strip, measured before layout so the node is sized to hold it. Without
   * this the badge was drawn at whatever width its text happened to need and ran off
   * the component — and off the canvas — with no diagnostic.
   */
  readonly badgeText?: MeasuredText;
  /**
   * One entry per authored asset role, in authored order. Roles are distinct even when
   * two of them resolve to the same image bytes, so this array is never deduplicated by
   * resolved asset identity. `size` is absent when the role did not resolve.
   */
  readonly assetRoles?: readonly MeasuredAssetRole[];
  /**
   * The silhouette measurement resolved for this component, recorded so nothing
   * downstream re-derives it.
   *
   * Geometry analysis and drawing used to each decide what shape a component is: the
   * renderer called `nodeShape`, and the analyzer assumed a rectangle. A route meeting a
   * diamond's corner or a cylinder's curved cap is correctly attached but sits outside the
   * bounding box, and one meeting the bounding box is inside it but visibly detached from
   * the drawn outline. Carrying the resolved shape here means both see the same component.
   */
  readonly shape?: NodeVisual["shape"];
}

export interface MeasuredAssetRole {
  readonly reference: string;
  readonly size?: Size;
}

export interface MeasuredGroup extends NormalizedGroup {
  readonly titleHeight: number;
  readonly padding: { readonly top: number; readonly right: number; readonly bottom: number; readonly left: number };
  readonly labelText: MeasuredText;
}

export interface MeasuredAnnotation extends NormalizedAnnotation, Size {
  readonly textLayout: MeasuredText;
}

export interface MeasuredEdge extends NormalizedEdge {
  readonly labelText?: MeasuredText;
}

export interface MeasuredView extends Omit<ViewGraph, "groups" | "nodes" | "edges" | "annotations"> {
  readonly groups: readonly MeasuredGroup[];
  readonly nodes: readonly MeasuredNode[];
  readonly edges: readonly MeasuredEdge[];
  readonly annotations: readonly MeasuredAnnotation[];
}

export interface GeometryPort extends Point {
  readonly id: string;
  readonly owner: string;
  readonly side: "north" | "east" | "south" | "west";
}

export interface GeometryNode extends Rect {
  readonly id: string;
  readonly ports: readonly GeometryPort[];
}

export interface GeometryGroup extends Rect {
  readonly id: string;
  readonly parent?: string;
}

export interface GeometryLabel extends Rect {
  readonly text: string;
}

export interface GeometryEdge {
  readonly id: string;
  readonly points: readonly Point[];
  readonly label?: GeometryLabel;
}

export interface GeometryAnnotation extends Rect {
  readonly id: string;
}

export interface GeometryView {
  readonly id: string;
  readonly bounds: Rect;
  readonly groups: readonly GeometryGroup[];
  readonly nodes: readonly GeometryNode[];
  readonly edges: readonly GeometryEdge[];
  readonly annotations: readonly GeometryAnnotation[];
}

export interface LayoutResult {
  readonly geometry?: GeometryView;
  readonly diagnostics: readonly Diagnostic[];
  readonly metrics?: Readonly<Record<string, number>>;
}

export interface LayoutEngine {
  readonly id: string;
  layout(view: MeasuredView): Promise<LayoutResult>;
}

export interface SemanticResult {
  readonly document?: NormalizedDocument;
  readonly diagnostics: readonly Diagnostic[];
}
