import { Ajv2020, type ErrorObject, type ValidateFunction } from "ajv/dist/2020.js";
import schema from "../schema/topoir.v1alpha2.schema.json" with { type: "json" };
import { acceptedFamilies, findFamily } from "./families.js";
import { escapeJsonPointer } from "./source-map.js";
import type { Diagnostic, SourceMap } from "./types.js";

/**
 * Structural validation for the `v1alpha2` workspace envelope (T10).
 *
 * `v1alpha1`/`Architecture` remains fully supported through its own loader; this is
 * additive. A document declares which language it is written in, and is validated against
 * that language rather than against a guess.
 *
 * Two checks run before the schema, because JSON Schema's own failures for them are
 * unhelpful. An unsupported `apiVersion` otherwise reports "must be equal to constant",
 * and an unimplemented family reports "must match exactly one schema in oneOf" — neither
 * tells an author what is wrong or what to do about it.
 */

export const topoirWorkspaceSchema = schema;

export const WORKSPACE_API_VERSION = "topoir.dev/v1alpha2";
export const WORKSPACE_KIND = "DiagramWorkspace";

const ajv = new Ajv2020({ allErrors: true, strict: true, validateFormats: false });
const validateWorkspaceSchema = ajv.compile(schema) as ValidateFunction<unknown>;

export interface WorkspaceValidationResult {
  readonly ok: boolean;
  readonly value?: unknown;
  readonly diagnostics: readonly Diagnostic[];
}

/** Whether a parsed value claims to be a v1alpha2 workspace, whatever else is wrong with it. */
export function isWorkspaceDocument(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return record["apiVersion"] === WORKSPACE_API_VERSION || record["kind"] === WORKSPACE_KIND;
}

export function validateWorkspace(value: unknown, sourceMap?: SourceMap): WorkspaceValidationResult {
  const diagnostics: Diagnostic[] = [];
  const at = (pointer: string): Partial<Diagnostic> => {
    const range = sourceMap?.find(pointer);
    return { path: pointer, ...(range === undefined ? {} : { range }) };
  };

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {
      ok: false,
      diagnostics: [{ code: "TOP110_SCHEMA_INVALID", severity: "error", message: "A TopoIR workspace must be a mapping." }],
    };
  }
  const record = value as Record<string, unknown>;

  // 1. Envelope, reported in the author's terms rather than as a failed const.
  if (record["apiVersion"] !== WORKSPACE_API_VERSION) {
    diagnostics.push({
      code: "TOP103_UNSUPPORTED_API_VERSION",
      severity: "error",
      message:
        `Unsupported apiVersion ${JSON.stringify(String(record["apiVersion"] ?? ""))}. ` +
        `This loader accepts ${JSON.stringify(WORKSPACE_API_VERSION)}; ` +
        `documents using "topoir.dev/v1alpha1" are handled by the v1alpha1 loader.`,
      ...at("/apiVersion"),
    });
  }
  if (record["kind"] !== WORKSPACE_KIND) {
    diagnostics.push({
      code: "TOP103_UNSUPPORTED_API_VERSION",
      severity: "error",
      message: `Unsupported kind ${JSON.stringify(String(record["kind"] ?? ""))}; expected ${JSON.stringify(WORKSPACE_KIND)}.`,
      ...at("/kind"),
    });
  }

  // 2. Families, before the body schema, so an unimplemented family says so plainly
  // instead of failing as an unmatched discriminated union.
  const models = Array.isArray(record["models"]) ? (record["models"] as unknown[]) : [];
  for (const [index, entry] of models.entries()) {
    if (typeof entry !== "object" || entry === null) continue;
    const family = (entry as Record<string, unknown>)["family"];
    if (typeof family !== "string") continue;
    const descriptor = findFamily(family);
    const pointer = `/models/${index}/family`;
    if (descriptor === undefined) {
      diagnostics.push({
        code: "TOP104_UNKNOWN_FAMILY",
        severity: "error",
        message:
          `Unknown diagram family ${JSON.stringify(family)}. ` +
          `Families this build accepts: ${acceptedFamilies().map((item) => item.id).join(", ")}.`,
        ...at(pointer),
      });
      continue;
    }
    if (descriptor.maturity === "planned") {
      diagnostics.push({
        code: "TOP105_FAMILY_NOT_IMPLEMENTED",
        severity: "error",
        message:
          `The ${JSON.stringify(family)} family is reserved but not implemented in this build, so a document ` +
          `using it is rejected rather than silently producing nothing. ${descriptor.summary}` +
          `${descriptor.plannedIn === undefined ? "" : ` Tracked as ${descriptor.plannedIn}.`}`,
        ...at(pointer),
      });
    }
  }

  if (diagnostics.length > 0) return { ok: false, diagnostics };

  // 3. Full structural validation.
  if (validateWorkspaceSchema(value)) return { ok: true, value, diagnostics };
  for (const error of validateWorkspaceSchema.errors ?? []) diagnostics.push(schemaDiagnostic(error, sourceMap));
  return { ok: false, diagnostics: dedupe(diagnostics) };
}

function schemaDiagnostic(error: ErrorObject, sourceMap?: SourceMap): Diagnostic {
  const pointer = error.instancePath === "" ? "/" : error.instancePath;
  const range = sourceMap?.find(pointer);
  const code =
    error.keyword === "required"
      ? "TOP111_REQUIRED_PROPERTY"
      : error.keyword === "additionalProperties"
        ? "TOP112_UNKNOWN_PROPERTY"
        : error.keyword === "type"
          ? "TOP113_TYPE_MISMATCH"
          : "TOP110_SCHEMA_INVALID";
  const detail =
    error.keyword === "additionalProperties"
      ? `has unknown property ${JSON.stringify(String((error.params as { additionalProperty?: unknown }).additionalProperty ?? ""))}`
      : error.keyword === "required"
        ? `is missing required property ${JSON.stringify(String((error.params as { missingProperty?: unknown }).missingProperty ?? ""))}`
        : (error.message ?? "is invalid");
  return {
    code,
    severity: "error",
    message: `${pointer === "/" ? "The workspace" : pointer} ${detail}.`,
    path: pointer,
    ...(range === undefined ? {} : { range }),
  };
}

/** Ajv reports one error per failing branch of a union; the author needs one message. */
function dedupe(diagnostics: readonly Diagnostic[]): readonly Diagnostic[] {
  const seen = new Set<string>();
  return diagnostics.filter((diagnostic) => {
    const key = `${diagnostic.code}${diagnostic.path ?? ""}${diagnostic.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export { escapeJsonPointer };
