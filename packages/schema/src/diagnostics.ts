/**
 * The complete set of diagnostic codes the compiler can emit.
 *
 * The contract asks agents to branch on `code` rather than on message wording, which only
 * works if the codes can actually be enumerated. They could not: the codes existed as
 * string literals spread across five packages, and the reference documentation listed
 * about a third of them. This module is the single list, and `TOPOIR_DIAGNOSTIC_CODES`
 * is the value an agent can read at runtime or a test can assert against.
 *
 * Families:
 * - `TOP1xx` parse, structural schema and command-line usage
 * - `TOP2xx` semantic model references
 * - `TOP3xx` themes and visual assets
 * - `TOP4xx` layout, geometry and content quality
 * - `TOP9xx` unexpected failure
 */
export const TOPOIR_DIAGNOSTIC_CODES = [
  "TOP100_PARSE_ERROR",
  "TOP101_PARSE_WARNING",
  "TOP102_DOCUMENT_CONVERSION_FAILED",
  "TOP110_SCHEMA_INVALID",
  "TOP111_REQUIRED_PROPERTY",
  "TOP112_UNKNOWN_PROPERTY",
  "TOP113_TYPE_MISMATCH",
  "TOP120_CLI_USAGE",
  "TOP201_DUPLICATE_ID",
  "TOP202_ID_NAMESPACE_CONFLICT",
  "TOP210_GROUP_PARENT_NOT_FOUND",
  "TOP211_GROUP_CYCLE",
  "TOP220_NODE_GROUP_NOT_FOUND",
  "TOP230_EDGE_SOURCE_NOT_FOUND",
  "TOP231_EDGE_TARGET_NOT_FOUND",
  "TOP232_SOURCE_PORT_NOT_FOUND",
  "TOP233_TARGET_PORT_NOT_FOUND",
  "TOP234_EDGE_FLOW_NOT_FOUND",
  "TOP240_ANNOTATION_ANCHOR_NOT_FOUND",
  "TOP250_VIEW_REFERENCE_NOT_FOUND",
  "TOP251_DESIGN_REFERENCE_NOT_FOUND",
  "TOP260_VIEW_NOT_FOUND",
  "TOP310_THEME_NOT_FOUND",
  "TOP320_ASSET_DIRECTORY_INVALID",
  "TOP320_ASSET_METADATA_INVALID",
  "TOP321_ASSET_INVALID",
  "TOP322_ASSET_NOT_FOUND",
  "TOP323_ASSET_OVERRIDDEN",
  "TOP400_LAYOUT_FAILED",
  "TOP402_COMPOSITION_PORT_UNSUPPORTED",
  "TOP410_NODE_OVERLAP",
  "TOP411_NODE_OUTSIDE_GROUP",
  "TOP412_RELATIONSHIP_DROPPED",
  "TOP413_COMPONENT_DROPPED",
  "TOP414_EDGE_LABEL_DROPPED",
  "TOP420_EDGE_ROUTE_EMPTY",
  "TOP421_EDGE_NOT_ORTHOGONAL",
  "TOP422_EDGE_INTERSECTS_NODE",
  "TOP423_ILLEGAL_BOUNDARY_CROSSING",
  "TOP424_EDGE_CROSSES_OWN_ENDPOINT",
  "TOP425_EDGE_SEGMENTS_COINCIDENT",
  "TOP430_LABEL_OVERLAP",
  "TOP431_GROUP_TITLE_INTERSECTION",
  "TOP432_ANNOTATION_OVERLAP",
  "TOP433_ASPECT_OFF_TARGET",
  "TOP434_CANVAS_SPARSE",
  "TOP440_TEXT_ABBREVIATED",
  "TOP900_INTERNAL_ERROR",
] as const;

export type TopoIRDiagnosticCode = (typeof TOPOIR_DIAGNOSTIC_CODES)[number];

/** The `TOP1xx`-style family prefix a code belongs to. */
export function diagnosticFamily(code: string): string {
  return `${code.slice(0, 4)}xx`;
}
