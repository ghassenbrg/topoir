export * from "./ir.js";
export * from "./capabilities.js";
// V2 contracts (T05). Interfaces only: T07 implements the measurement engine behind
// ComponentPlan and T08 migrates the renderer onto it. Nothing here is wired into the
// compiler yet, and the capability registry does not advertise it.
export * from "./components/index.js";
export * from "./scene/index.js";
export * from "./color.js";
export * from "./content.js";
export * from "./font-registry.js";
export * from "./fonts.js";
export * from "./visibility.js";
export * from "./font-measurer.js";
export * from "./measure.js";
export * from "./pipeline.js";
export * from "./quality.js";
export * from "./quality/scene.js";
export * from "./semantic.js";
export * from "./theme.js";
export * from "./view.js";
