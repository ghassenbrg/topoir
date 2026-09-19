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

export interface SceneImage {
  readonly type: "image";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly href: string;
  readonly title: string;
}

export interface SceneGroup {
  readonly type: "group";
  readonly id?: string;
  readonly className?: string;
  readonly transform?: string;
  readonly opacity?: number;
  readonly children: readonly SceneElement[];
}

export interface SceneRect {
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
  readonly type: "circle";
  readonly cx: number;
  readonly cy: number;
  readonly radius: number;
  readonly fill: string;
  readonly stroke?: string;
  readonly strokeWidth?: number;
}

export interface ScenePath {
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
