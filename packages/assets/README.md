# @topoir/assets

Offline SVG inventory and safe local asset discovery for TopoIR.

```ts
import { AssetRegistry, discoverAssets } from '@topoir/assets';
const builtins = new AssetRegistry();
builtins.search('postgres', 5); // metadata only
const { registry, diagnostics } = await discoverAssets('./topoir-assets');
registry.resolve('custom:payment-api'); // dimensions, embedded data URI, SHA-256
```

Pinned Devicon, Lucide and Kubernetes resource collections are installed as dependencies. No runtime downloads. Local SVG, PNG, JPEG and WebP are supported; optional `assets.yaml` supplies aliases, descriptions and license metadata. SVG accepts a passive shape subset, not arbitrary HTML/CSS/scripts. Read `NOTICE.md` for artwork licensing and trademark limitations. TopoIR's code is MIT; third-party artwork retains its own terms.
