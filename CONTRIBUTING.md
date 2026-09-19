# Contributing to TopoIR

TopoIR is building a deterministic compiler, not an editor. Contributions should preserve the boundary: authors express architecture semantics; the compiler owns geometry and artifacts.

## Development setup

Use Node.js 22 or 24 and pnpm 11.

```bash
corepack enable
pnpm install
pnpm check
pnpm topoir doctor
```

The repository uses strict TypeScript ESM. Do not add a runtime dependency without checking maintenance, license, install footprint, and whether the capability belongs in core.

## Changes

- Schema changes require JSON Schema, TypeScript type, validation, documentation, example, and migration/versioning consideration in one pull request.
- Layout/routing changes require a focused fixture and geometry-quality assertion. Never expose a raw ELK option merely to make one fixture pass.
- Renderer changes require deterministic repeated output. Update a golden hash only after visually inspecting the artifact and explaining the intentional difference.
- New icons/assets require source, version, license, attribution, and hash metadata. Do not copy a vendor logo based on assumed fair use.
- Diagnostics require a stable code in the correct family. Tests should match codes, not entire prose.
- CLI/MCP additions should remain task-level and non-interactive. Keep machine data on stdout and human progress on stderr.

Update `PROGRESS.md` while an implementation effort is in flight so another contributor can resume from exact verified state.

## Verification

```bash
pnpm check
pnpm benchmark
```

`pnpm check` builds every package, type-checks it, and runs unit, property, fixture, SDK, CLI, and MCP tests. Before submitting a visual change, render the affected example to both SVG and PNG and inspect the PNG at full resolution.

The benchmark is informative rather than a universal wall-clock gate; report the Node/platform tuple and compare the same machine and lockfile.

## Commits and pull requests

Keep changes scoped and explain the semantic or compiler invariant they improve. Include before/after artifacts for visual work and note any remaining quality warnings. Do not commit `.tmp/` inputs or local render experiments.
