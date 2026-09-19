# Security policy

TopoIR v0.1 is local compiler software processing untrusted YAML/JSON and producing SVG/PNG. It does not require network access or execute document-provided code.

## Supported versions

Until the first stable release, security fixes target the latest tagged alpha. Upgrade promptly; pre-1.0 branches do not receive long-term support.

## Report a vulnerability

Use the repository host's private security-advisory feature when available. Do not open a public issue for a suspected vulnerability. Include the affected version/commit, platform, minimal document or asset, impact, and reproduction steps. Maintainers should acknowledge a complete report within seven days and coordinate disclosure after a fix is available.

## Threat model

Security-sensitive areas include:

- YAML aliases, nesting, size, and parser resource consumption;
- schema/semantic validation bypasses and unsafe `x-*` handling;
- filesystem paths in CLI inputs/outputs;
- SVG/XML active content, external references, and injection;
- icon/font pack path traversal, licensing metadata, and malicious complexity;
- native PNG rasterizer inputs and dependency supply chain;
- MCP input size, artifact size, and protocol framing.

Current mitigations include bounded YAML aliases, strict schemas, source-size limits in MCP, escaped SVG text/attributes, no author-supplied SVG/CSS, no network assets, explicit native-build allowlists, system fonts disabled, and a frozen lockfile. The CLI writes only caller-selected output paths; treat those paths with the caller's filesystem permissions.

TopoIR diagrams may expose infrastructure names and trust boundaries. The compiler is local-first, but users remain responsible for where source documents and generated artifacts are committed or shared.
