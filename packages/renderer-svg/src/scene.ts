export interface Scene {
  readonly width: number;
  readonly height: number;
  readonly title: string;
  readonly description?: string;
  readonly background: string;
  readonly fontFamily: string;
  readonly children: readonly SceneElement[];
  readonly attribution?: string;
}

export type SceneElement = SceneGroup | SceneRect | SceneCircle | ScenePath | SceneText | SceneImage;

/**
 * What in the model a mark exists for (T08).
 *
 * The legacy scene is a tree of anonymous primitives: once built, there is no way back
 * from a mark to the thing that caused it, so a quality check can only reason about
 * rectangles and an author cannot be told which relationship a defect belongs to.
 *
 * Ownership is carried alongside the existing fields rather than replacing them. The SVG
 * serializer enumerates the attributes it emits, so this changes no output byte; what it
 * enables is `sceneDocument`, which turns a built scene into a `SceneDocument` with a
 * semantic index that can be checked in both directions — nothing required unrepresented,
 * nothing drawn unexplained.
 */
export interface SceneOwner {
  readonly kind: "occurrence" | "relationship" | "region" | "annotation" | "chrome";
  readonly id: string;
  /** Which part of the owner this mark is, such as `label` or `badge`. */
  readonly part?: string;
}

export interface SceneImage {
  readonly owner?: SceneOwner;
  readonly type: "image";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly href: string;
  readonly title: string;
}

export interface SceneGroup {
  readonly owner?: SceneOwner;
  readonly type: "group";
  readonly id?: string;
  readonly className?: string;
  readonly transform?: string;
  readonly opacity?: number;
  readonly children: readonly SceneElement[];
}

export interface SceneRect {
  readonly owner?: SceneOwner;
  readonly type: "rect";
  readonly id?: string;
  readonly className?: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rx?: number;
  readonly fill: string;
  readonly stroke?: string;
  readonly strokeWidth?: number;
  readonly dash?: string;
  readonly opacity?: number;
}

export interface SceneCircle {
  readonly owner?: SceneOwner;
  readonly type: "circle";
  readonly cx: number;
  readonly cy: number;
  readonly radius: number;
  readonly fill: string;
  readonly stroke?: string;
  readonly strokeWidth?: number;
}

export interface ScenePath {
  readonly owner?: SceneOwner;
  readonly type: "path";
  readonly id?: string;
  readonly className?: string;
  readonly d: string;
  readonly fill?: string;
  readonly stroke?: string;
  readonly strokeWidth?: number;
  readonly dash?: string;
  readonly lineCap?: "round" | "square" | "butt";
  readonly lineJoin?: "round" | "bevel" | "miter";
  readonly markerStart?: string;
  readonly markerEnd?: string;
}

export interface SceneText {
  readonly owner?: SceneOwner;
  readonly type: "text";
  readonly id?: string;
  readonly className?: string;
  readonly x: number;
  readonly y: number;
  readonly lines: readonly string[];
  readonly lineHeight: number;
  readonly fill: string;
  readonly fontSize: number;
  readonly fontWeight?: number;
  readonly anchor?: "start" | "middle" | "end";
}
