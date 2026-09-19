# @topoir/sdk

Programmatic end-to-end TopoIR compiler.

```ts
import { TopoIRCompiler } from "@topoir/sdk";

const result = await new TopoIRCompiler().compile(source, {
  source: "architecture.topoir.yaml",
  view: "overview",
  format: "svg",
});
```

`result` contains diagnostics, normalized/model stages, geometry, artifacts, hashes, and a stable manifest.
