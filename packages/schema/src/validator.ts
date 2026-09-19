import { Ajv2020, type ErrorObject, type ValidateFunction } from "ajv/dist/2020.js";
import schema from "../schema/topoir.schema.json" with { type: "json" };
import type {
  Diagnostic,
  SourceMap,
  TopoIRDocument,
  ValidationResult,
} from "./types.js";

export const topoirSchema = schema;

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  validateFormats: false,
});

const validateDocumentSchema = ajv.compile(schema) as ValidateFunction<TopoIRDocument>;

export function validateStructure(
  value: unknown,
  sourceMap?: SourceMap,
): ValidationResult<TopoIRDocument> {
  if (validateDocumentSchema(value)) {
    return { ok: true, value, diagnostics: [] };
  }

  const diagnostics = (validateDocumentSchema.errors ?? []).map((error) =>
    errorToDiagnostic(error, sourceMap),
  );
  return { ok: false, diagnostics };
}

function errorToDiagnostic(error: ErrorObject, sourceMap?: SourceMap): Diagnostic {
  const missingProperty =
    error.keyword === "required" && typeof error.params["missingProperty"] === "string"
      ? String(error.params["missingProperty"])
      : undefined;
  const additionalProperty =
    error.keyword === "additionalProperties" &&
    typeof error.params["additionalProperty"] === "string"
      ? String(error.params["additionalProperty"])
      : undefined;
  const referencedProperty = missingProperty ?? additionalProperty;
  const path =
    referencedProperty === undefined
      ? error.instancePath
      : `${error.instancePath}/${escapeSegment(referencedProperty)}`;
  const code =
    error.keyword === "required"
      ? "TOP111_REQUIRED_PROPERTY"
      : error.keyword === "additionalProperties"
        ? "TOP112_UNKNOWN_PROPERTY"
        : error.keyword === "type"
          ? "TOP113_TYPE_MISMATCH"
          : "TOP110_SCHEMA_INVALID";
  const range = sourceMap?.find(path);

  return {
    code,
    severity: "error",
    message: additionalProperty
      ? `Unknown property ${JSON.stringify(additionalProperty)}.`
      : `${path || "/"} ${error.message ?? "does not match the TopoIR schema"}.`,
    path,
    ...(sourceMap === undefined ? {} : { source: sourceMap.source }),
    ...(range === undefined ? {} : { range }),
    details: { keyword: error.keyword, ...error.params },
  };
}

function escapeSegment(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}
