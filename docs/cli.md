# CLI reference

The CLI is designed for unattended agent use. Data written to stdout is never mixed with progress logs; render status and human diagnostics go to stderr.

## `validate`

```bash
topoir validate architecture.topoir.yaml
topoir validate - --json < architecture.topoir.yaml
topoir validate architecture.topoir.yaml --warnings-as-errors
```

Runs parsing, JSON Schema validation, and semantic validation without layout or rendering.

## `render` / `export`

```bash
topoir render architecture.topoir.yaml --view overview --format svg --output architecture.svg
topoir render architecture.topoir.yaml --view all --format both --output diagrams --manifest
topoir render - --format png --output - < architecture.topoir.yaml > architecture.png
```

Options:

- `-o, --output <path|->` — exact file for one artifact, directory for multiple artifacts, or stdout.
- `-f, --format <svg|png|both>` — defaults to SVG.
- `-V, --view <id|all>` — defaults to `overview` when declared, otherwise stable first view.
- `--scale <0..8>` — PNG zoom factor, default 1.
- `--manifest` — write `topoir.manifest.json` next to artifacts.
- `--assets <directory>` — discover and embed a local asset inventory; also supported by `inspect`.
- `--json` — return a machine-readable command report.
- `--warnings-as-errors` — refuse artifact writes when any quality warning exists.

SVG is self-contained and includes its font. PNG rasterization does not load system fonts.

## `inspect`

```bash
topoir inspect architecture.topoir.yaml --stage model
topoir inspect architecture.topoir.yaml --stage view --view data
topoir inspect architecture.topoir.yaml --stage geometry --view deployment
topoir inspect architecture.topoir.yaml --stage metrics
topoir inspect architecture.topoir.yaml --stage manifest
```

Stages are stable JSON intended for diagnostics and tooling. Geometry is compiler output and should not be copied back into authoring documents.

## Schema, icons, and doctor

```bash
topoir schema
topoir capabilities
topoir icons list --json
topoir icons search database
topoir assets search payments --assets ./topoir-assets --json
topoir styles
topoir doctor
```

`doctor` performs an in-memory schema/layout/SVG/PNG compile and reports the Node/platform tuple. It does not read network resources.

`capabilities` lists every composition, intent, style and output format this build exposes,
each with the maturity it has actually reached:

| Maturity | Meaning |
| --- | --- |
| `implemented` | Works, and its quality is covered by the benchmarks |
| `experimental` | Produces output, but is not covered by a family acceptance gate |
| `advisory` | Accepted and recorded; deliberately does not change the drawing |
| `unsupported` | Accepted by the schema but not executed. Using it is reported as `TOP252_INTENT_NOT_APPLIED` |

The MCP `topoir://docs/design` inventory is generated from the same table, so the two
surfaces cannot disagree about what the tool can do, and a test holds the composition list
against the schema's own enum.

`assets` and `icons` search the offline inventory; custom assets join it when `--assets` is supplied. `styles` returns visual-language metadata as JSON. Prefer narrow searches over dumping thousands of icons into an agent context. See [asset documentation](assets.md) for metadata format and license boundaries.

## Exit codes

| Code | Meaning |
|---:|---|
| 0 | Successful command |
| 1 | Document, semantic, layout, quality, or rendering failure |
| 2 | Invalid CLI usage |
| 3 | I/O or unexpected internal failure |

Diagnostic codes, not prose, are the stable automation interface.

Every command accepts `--help` and prints its own usage. A bad flag or missing argument is reported as `TOP120_CLI_USAGE` with exit code 2 and that command's usage text, not as an internal failure.
