/**
 * Authoring types for the v1alpha2 workspace envelope.
 *
 * GENERATED FROM `schema/topoir.v1alpha2.schema.json`. Do not edit by hand.
 * Regenerate with `pnpm --filter @topoir/schema generate`; a test fails if this file
 * and the schema disagree, so the two cannot drift apart unnoticed.
 */

export type Id = string;

export type NonEmptyString = string;

export type Tags = readonly Id[];

export type Color = string;

export interface Paint {
  readonly "fill"?: string;
  readonly "stroke"?: string;
  readonly "text"?: string;
}

export type Direction = "right" | "left" | "down" | "up";

export interface Metadata {
  readonly "name": Id;
  readonly "title"?: NonEmptyString;
  readonly "description"?: string;
  readonly "labels"?: Readonly<Record<string, unknown>>;
}

export interface Node {
  readonly "id": Id;
  readonly "label"?: NonEmptyString;
  readonly "kind": "client" | "service" | "api" | "worker" | "database" | "cache" | "queue" | "stream" | "object-storage" | "filesystem" | "gateway" | "load-balancer" | "firewall" | "identity-provider" | "vm" | "container" | "pod" | "kubernetes-service" | "function" | "cloud-service" | "external-system" | "generic";
  readonly "group"?: Id;
  readonly "description"?: string;
  readonly "technology"?: NonEmptyString;
  readonly "icon"?: string;
  readonly "tags"?: Tags;
  readonly "order"?: number;
  readonly "visual"?: NodeVisual;
  readonly "ports"?: readonly Port[];
  readonly "entity"?: Id;
  readonly "provenance"?: Provenance;
}

export interface NodeVisual {
  readonly "shape"?: "auto" | "card" | "icon" | "cylinder" | "stack" | "pill" | "diamond" | "image";
  readonly "emphasis"?: "primary" | "secondary" | "muted";
  readonly "status"?: "normal" | "success" | "failure" | "warning";
  readonly "badge"?: string;
  readonly "replicas"?: number;
  readonly "asset"?: string;
  readonly "assets"?: readonly string[];
  readonly "portLabels"?: "hidden" | "inside";
}

export interface Port {
  readonly "id": Id;
  readonly "label"?: NonEmptyString;
  readonly "side"?: "north" | "east" | "south" | "west" | "auto";
  readonly "kind"?: "input" | "output" | "bidirectional";
  readonly "protocol"?: NonEmptyString;
  readonly "order"?: number;
}

export interface Group {
  readonly "id": Id;
  readonly "label"?: NonEmptyString;
  readonly "kind": "system" | "environment" | "cloud" | "region" | "zone" | "network" | "vpc" | "subnet" | "kubernetes-cluster" | "namespace" | "deployment" | "security-boundary" | "external-zone" | "logical";
  readonly "parent"?: Id;
  readonly "description"?: string;
  readonly "technology"?: NonEmptyString;
  readonly "icon"?: string;
  readonly "tags"?: Tags;
  readonly "order"?: number;
  readonly "layout"?: GroupLayout;
  readonly "visual"?: {
    readonly "fill"?: string;
    readonly "stroke"?: string;
    readonly "text"?: string;
    readonly "emphasis"?: "primary" | "secondary" | "muted";
  };
  readonly "entity"?: Id;
  readonly "provenance"?: Provenance;
}

export interface GroupLayout {
  readonly "mode"?: "auto" | "layered" | "row" | "column" | "grid" | "pack";
  readonly "direction"?: Direction;
  readonly "columns"?: number;
  readonly "gap"?: number;
}

export interface Edge {
  readonly "id": Id;
  readonly "from": Id;
  readonly "to": Id;
  readonly "sourcePort"?: Id;
  readonly "targetPort"?: Id;
  readonly "label"?: NonEmptyString;
  readonly "description"?: string;
  readonly "protocol"?: NonEmptyString;
  readonly "kind"?: "request" | "response" | "read" | "write" | "publish" | "consume" | "replicate" | "authenticate" | "authorize" | "stream" | "sync" | "async" | "control" | "data" | "dependency" | "network";
  readonly "flow"?: Id;
  readonly "emphasis"?: "primary" | "secondary" | "muted";
  readonly "status"?: "normal" | "success" | "failure" | "warning";
  readonly "step"?: number;
  readonly "direction"?: "forward" | "back" | "both" | "none";
  readonly "style"?: "solid" | "dashed" | "dotted";
  readonly "tags"?: Tags;
  readonly "order"?: number;
  readonly "provenance"?: Provenance;
}

export interface Flow {
  readonly "id": Id;
  readonly "label"?: NonEmptyString;
  readonly "description"?: string;
  readonly "color"?: string;
  readonly "style"?: "solid" | "dashed" | "dotted";
  readonly "order"?: number;
}

export interface Annotation {
  readonly "id": Id;
  readonly "kind"?: "note" | "warning" | "callout";
  readonly "text": NonEmptyString;
  readonly "anchor"?: Id;
  readonly "tags"?: Tags;
  readonly "order"?: number;
  readonly "visual"?: {
    readonly "fill"?: string;
    readonly "stroke"?: string;
    readonly "text"?: string;
  };
}

/** Design tokens for this view. Every field overrides the base named by `extends`. */
export interface DesignTokens {
  readonly "extends"?: Id;
  readonly "language"?: {
    readonly "component"?: "card" | "icon" | "architectural" | "sketch";
    readonly "header"?: "plain" | "editorial" | "rule";
    readonly "boundaries"?: "panel" | "outline" | "rail";
    readonly "connectorRadius"?: number;
    readonly "depth"?: number;
    readonly "iconSize"?: number;
  };
  readonly "font"?: {
    readonly "family"?: NonEmptyString;
    readonly "labelSize"?: number;
    readonly "descriptionSize"?: number;
    readonly "groupTitleSize"?: number;
    readonly "edgeLabelSize"?: number;
    readonly "lineHeight"?: number;
  };
  readonly "canvas"?: {
    readonly "background"?: string;
    readonly "foreground"?: string;
    readonly "muted"?: string;
  };
  readonly "spacing"?: {
    readonly "nodePaddingX"?: number;
    readonly "nodePaddingY"?: number;
    readonly "groupPadding"?: number;
    readonly "groupTitleHeight"?: number;
    readonly "layerGap"?: number;
    readonly "nodeGap"?: number;
  };
  readonly "node"?: {
    readonly "minWidth"?: number;
    readonly "minHeight"?: number;
    readonly "maxTextWidth"?: number;
    readonly "radius"?: number;
    readonly "iconSize"?: number;
    readonly "default"?: {
      readonly "fill"?: string;
      readonly "stroke"?: string;
      readonly "text"?: string;
    };
    readonly "byKind"?: Readonly<Record<string, unknown>>;
  };
  readonly "group"?: {
    readonly "radius"?: number;
    readonly "default"?: {
      readonly "fill"?: string;
      readonly "stroke"?: string;
      readonly "text"?: string;
    };
    readonly "byKind"?: Readonly<Record<string, unknown>>;
  };
  readonly "edge"?: {
    readonly "stroke"?: string;
    readonly "labelBackground"?: string;
    readonly "labelText"?: string;
    readonly "width"?: number;
    readonly "byKind"?: Readonly<Record<string, unknown>>;
    readonly "palette"?: readonly string[];
  };
  readonly "annotation"?: {
    readonly "note"?: {
      readonly "fill"?: string;
      readonly "stroke"?: string;
      readonly "text"?: string;
    };
    readonly "warning"?: {
      readonly "fill"?: string;
      readonly "stroke"?: string;
      readonly "text"?: string;
    };
    readonly "callout"?: {
      readonly "fill"?: string;
      readonly "stroke"?: string;
      readonly "text"?: string;
    };
  };
}

/** A cross-model element reference. Local family references are plain element IDs. */
export interface Reference {
  readonly "model": Id;
  readonly "element": Id;
}

/** Metadata only. The compiler never fetches a source. */
export interface Source {
  readonly "id": Id;
  readonly "kind": "repository" | "manifest" | "trace" | "document" | "conversation" | "other";
  readonly "locator": NonEmptyString;
  readonly "revision"?: string;
  readonly "contentHash"?: string;
}

/** How a fact came to be known. Observed, inferred and assumed are kept distinct. */
export type Provenance = readonly ({
  readonly "source": Id;
  readonly "pointer"?: string;
  readonly "relation": "observed" | "inferred" | "assumed";
  readonly "note"?: string;
})[];

/** A reusable real-world thing. One entity can appear in several models in different roles. */
export interface Entity {
  readonly "id": Id;
  readonly "kind": NonEmptyString;
  readonly "label": NonEmptyString;
  readonly "description"?: string;
  readonly "tags"?: Tags;
  readonly "provenance"?: Provenance;
}

export interface ArchitectureBody {
  readonly "groups"?: readonly Group[];
  readonly "nodes"?: readonly Node[];
  readonly "edges"?: readonly Edge[];
  readonly "flows"?: readonly Flow[];
  readonly "annotations"?: readonly Annotation[];
}

/** A model's body is selected by its family. Only families this build implements are accepted. */
export type Model = {
  readonly "id"?: unknown;
  readonly "familyVersion"?: unknown;
  readonly "title"?: unknown;
  readonly "description"?: unknown;
  readonly "family"?: "architecture";
  readonly "body"?: ArchitectureBody;
};

export interface Projection {
  readonly "include"?: ProjectionSelector;
  readonly "exclude"?: ProjectionSelector;
  /** induced adds relationships between visible endpoints; exact retains only what was selected and never adds one. */
  readonly "edgePolicy"?: "induced" | "exact";
  readonly "ancestorPolicy"?: "retain" | "summarize";
  readonly "collapse"?: readonly {
    readonly "element": Id;
    readonly "mode": "summary";
    readonly "label"?: string;
  }[];
  readonly "occurrences"?: readonly ({
    readonly "id": Id;
    readonly "element": Id;
    readonly "role"?: "primary" | "detail" | "repeated";
    readonly "label"?: string;
    readonly "detail"?: "minimal" | "standard" | "full";
  })[];
  /** Required when a relationship endpoint has more than one candidate occurrence. */
  readonly "connections"?: readonly {
    readonly "relationship": Id;
    readonly "from"?: Id;
    readonly "to"?: Id;
  }[];
}

export interface ProjectionSelector {
  readonly "elements"?: readonly Id[];
  readonly "tags"?: Tags;
}

/** Legibility is a property of a drawing at a size, so the size is declared. */
export interface Medium {
  readonly "kind": "page" | "slide" | "canvas" | "screen";
  readonly "width"?: number;
  readonly "height"?: number;
  readonly "padding"?: number;
  readonly "minTextSize"?: number;
  readonly "fit"?: "contain" | "paginate";
  readonly "dpi"?: number;
}

/** A required constraint that cannot be satisfied is an error, not a preference that was outvoted. */
export type Constraint = {
  readonly "id"?: unknown;
  readonly "strength"?: unknown;
  readonly "priority"?: unknown;
  readonly "type"?: "order";
  readonly "items": readonly Id[];
  readonly "axis"?: "x" | "y";
} | {
  readonly "id"?: unknown;
  readonly "strength"?: unknown;
  readonly "priority"?: unknown;
  readonly "type"?: "place-relative";
  readonly "subject": Id;
  readonly "reference": Id;
  readonly "side": "above" | "below" | "left" | "right";
  readonly "gap"?: number;
} | {
  readonly "id"?: unknown;
  readonly "strength"?: unknown;
  readonly "priority"?: unknown;
  readonly "type"?: "align";
  readonly "items": readonly Id[];
  readonly "axis": "x" | "y";
} | {
  readonly "id"?: unknown;
  readonly "strength"?: unknown;
  readonly "priority"?: unknown;
  readonly "type"?: "group";
  readonly "items": readonly Id[];
};

export interface Presentation {
  readonly "intent"?: {
    readonly "question"?: string;
    readonly "audience"?: "engineering" | "executive" | "presentation" | "learning";
    readonly "takeaway"?: string;
    readonly "focus"?: readonly Id[];
    readonly "story"?: readonly Id[];
  };
  readonly "medium"?: Medium;
  readonly "style"?: {
    readonly "pack"?: NonEmptyString;
    readonly "variant"?: string;
    readonly "tokens"?: DesignTokens;
  };
  readonly "composition"?: {
    readonly "strategy"?: NonEmptyString;
    readonly "candidates"?: number;
    readonly "direction"?: Direction;
  };
  readonly "constraints"?: readonly Constraint[];
  readonly "contentPolicy"?: {
    readonly "detail"?: "minimal" | "standard" | "full";
    /** Content that may never be omitted or abbreviated to make a diagram fit. */
    readonly "required"?: readonly {
      readonly "element": Id;
      readonly "field"?: string;
    }[];
  };
}

export interface WorkspaceView {
  readonly "id": Id;
  readonly "model": Id;
  readonly "title"?: string;
  readonly "description"?: string;
  readonly "showLegend"?: boolean;
  readonly "projection"?: Projection;
  readonly "presentation"?: Presentation;
}

export interface Style {
  readonly "id": Id;
  readonly "extends"?: Id;
  readonly "tokens": DesignTokens;
}

export interface ViewSet {
  readonly "id": Id;
  readonly "views": readonly Id[];
  readonly "title"?: string;
  readonly "sharedStyle"?: Id;
}

/** A complete v1alpha2 workspace document. */
export interface DiagramWorkspace {
  readonly "apiVersion": "topoir.dev/v1alpha2";
  readonly "kind": "DiagramWorkspace";
  readonly "metadata": Metadata;
  readonly "sources"?: readonly Source[];
  readonly "entities"?: readonly Entity[];
  readonly "models": readonly Model[];
  readonly "styles"?: readonly Style[];
  readonly "views": readonly WorkspaceView[];
  readonly "viewSets"?: readonly ViewSet[];
}
