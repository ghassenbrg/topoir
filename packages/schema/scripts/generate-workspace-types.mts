/**
 * Generates TypeScript authoring types from the v1alpha2 JSON Schema.
 *
 * The schema is the wire authority. Hand-written types beside it drift, and the drift is
 * invisible until a document that validates fails to typecheck or the reverse. This emits
 * the types from the schema, `pnpm --filter @topoir/schema generate` refreshes them, and a
 * test regenerates in memory and fails if the file on disk differs.
 *
 * Run: pnpm --filter @topoir/schema generate
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

interface Schema {
  readonly type?: string | string[];
  readonly const?: unknown;
  readonly enum?: readonly unknown[];
  readonly $ref?: string;
  readonly items?: Schema;
  readonly properties?: Record<string, Schema | true>;
  readonly required?: readonly string[];
  readonly additionalProperties?: boolean | Schema;
  readonly oneOf?: readonly Schema[];
  readonly description?: string;
  readonly $defs?: Record<string, Schema>;
}

const here = fileURLToPath(new URL(".", import.meta.url));
const schemaPath = `${here}../schema/topoir.v1alpha2.schema.json`;
const outputPath = `${here}../src/workspace-types.ts`;

/** `workspaceView` -> `WorkspaceView`. Definition names are already unique. */
function typeName(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function literal(value: unknown): string {
  return typeof value === "string" ? JSON.stringify(value) : String(value);
}

function render(schema: Schema | true, defs: Record<string, Schema>, depth: number): string {
  if (schema === true) return "unknown";
  if (schema.$ref !== undefined) return typeName(schema.$ref.replace("#/$defs/", ""));
  if (schema.const !== undefined) return literal(schema.const);
  if (schema.enum !== undefined) return schema.enum.map(literal).join(" | ");
  if (schema.oneOf !== undefined) return schema.oneOf.map((branch) => render(branch, defs, depth)).join(" | ");
  if (schema.type === "array") return `readonly ${wrap(render(schema.items ?? true, defs, depth))}[]`;
  if (schema.type === "object" || schema.properties !== undefined) return renderObject(schema, defs, depth);
  if (schema.type === "string") return "string";
  if (schema.type === "number" || schema.type === "integer") return "number";
  if (schema.type === "boolean") return "boolean";
  return "unknown";
}

/** Parenthesise a union before `[]`, or `A | B[]` means something else entirely. */
function wrap(rendered: string): string {
  return rendered.includes("|") ? `(${rendered})` : rendered;
}

function renderObject(schema: Schema, defs: Record<string, Schema>, depth: number): string {
  const properties = schema.properties ?? {};
  const required = new Set(schema.required ?? []);
  const indent = "  ".repeat(depth + 1);
  const lines = Object.entries(properties).map(([key, value]) => {
    const optional = required.has(key) ? "" : "?";
    const rendered = render(value, defs, depth + 1);
    const doc =
      value !== true && value.description !== undefined ? `${indent}/** ${value.description} */\n` : "";
    return `${doc}${indent}readonly ${JSON.stringify(key)}${optional}: ${rendered};`;
  });
  if (lines.length === 0) return "Readonly<Record<string, unknown>>";
  return `{\n${lines.join("\n")}\n${"  ".repeat(depth)}}`;
}

export function generate(): string {
  const schema = JSON.parse(readFileSync(schemaPath, "utf8")) as Schema;
  const defs = schema.$defs ?? {};
  const blocks: string[] = [
    "/**",
    " * Authoring types for the v1alpha2 workspace envelope.",
    " *",
    " * GENERATED FROM `schema/topoir.v1alpha2.schema.json`. Do not edit by hand.",
    " * Regenerate with `pnpm --filter @topoir/schema generate`; a test fails if this file",
    " * and the schema disagree, so the two cannot drift apart unnoticed.",
    " */",
    "",
  ];
  for (const [key, definition] of Object.entries(defs)) {
    const name = typeName(key);
    const rendered = render(definition, defs, 0);
    if (definition.description !== undefined) blocks.push(`/** ${definition.description} */`);
    // Only a plain object becomes an interface. A discriminated union renders as
    // `{...} | {...}`, which is not valid interface syntax.
    const isPlainObject = rendered.startsWith("{") && definition.oneOf === undefined;
    blocks.push(isPlainObject ? `export interface ${name} ${rendered}` : `export type ${name} = ${rendered};`);
    blocks.push("");
  }
  blocks.push("/** A complete v1alpha2 workspace document. */");
  blocks.push(`export interface DiagramWorkspace ${renderObject(schema, defs, 0)}`);
  blocks.push("");
  return blocks.join("\n");
}

if (process.argv.includes("--write")) {
  writeFileSync(outputPath, generate());
  process.stdout.write(`wrote ${outputPath}\n`);
}
