export * from "./build-scene.js";
export * from "./png.js";
export * from "./scene.js";
export * from "./svg.js";

/**
 * Compatibility re-exports for the V2 scene contract (T05).
 *
 * `SceneDocument` and its primitives live in `@topoir/core`, because quality analysis and
 * export both need them and neither should have to depend on an SVG package. They are
 * re-exported here so a consumer that reaches for scene types through the renderer — as
 * every existing caller does — keeps finding them in one place through the migration.
 *
 * The legacy `Scene` above is unchanged and remains what `buildScene` returns until T08.
 */
export type {
  LayerId,
  SceneClipPrimitive,
  SceneDocument,
  SceneEllipsePrimitive,
  SceneImagePrimitive,
  ScenePage,
  ScenePathPrimitive,
  ScenePrimitive,
  ScenePrimitiveBase,
  SceneRectPrimitive,
  SceneSymbolPrimitive,
  SceneTextPrimitive,
} from "@topoir/core";
export { LAYER_ORDER, primitivesFor, primitivesOnLayer, unrepresented } from "@topoir/core";
