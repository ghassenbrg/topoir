/**
 * Shared references between the component contract and the scene contract.
 *
 * These live in their own module so `scene/` and `components/` can both use them without
 * either importing the other, which keeps the two contracts independent.
 */
export type { ElementRef, ContentDisposition, OwnerKind, DispositionKind } from "../components/plan.js";
export type { ShapedText as ShapedTextRef, ShapedLine } from "../components/blocks.js";
