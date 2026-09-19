# Icons, fonts, and asset licensing

## Built-in icons

The offline registry ships 3,021 SVG entries via pinned dependencies: Devicon 1.2.65 (1,058), Lucide 1.2.134 (1,925), and Kubernetes resource icons 1.2.0 (38). Counts describe the pinned inventory, not a promise about future upstream versions. Original generic TopoIR vectors remain a final fallback.

Resolution order: `visual.asset` → explicit `icon` → `technology` → semantic kind. Aliases such as `postgres`, `k8s`, `pod`, `configmap` and `aws lambda` are supported. Generic aliases explicitly return generic-symbol metadata; `aws lambda` is a Lucide symbol, not an AWS service logo. Search returns IDs, names, aliases, descriptions, dimensions, media type, source and license, without image bodies. Resolved assets include embedded data and SHA-256.

Devicon uses MIT with third-party trademark restrictions; Lucide uses ISC with retained MIT notices for inherited Feather icons; Kubernetes offers Apache-2.0 or CC-BY-4.0 and TopoIR selects Apache-2.0. These are collection licenses, not brand endorsement or unrestricted trademark grants. See the full [artwork notice](../packages/assets/NOTICE.md) and [research/inclusion policy](visual-quality-plan.md). Relevant license notices are embedded in SVG metadata and PNG iTXt chunks. Keep them or provide equivalent accompanying notices when redistributing artwork.

Provider-native AWS/Azure/GCP service packs are not bundled wholesale. Some provider/company logos appear in Devicon under its collection terms; this does not mean the provider's complete architecture catalog is cleared. Users must review applicable terms for supplied artwork.

## Custom assets

```sh
topoir assets search payments --assets ./topoir-assets --json
topoir render architecture.topoir.yaml --assets ./topoir-assets --output architecture.svg
```

Discovery recursively reads SVG, PNG, JPG/JPEG and WebP from the explicitly configured directory. Optional `assets.yaml`:

```yaml
assets:
  payment-api:
    file: payment api.svg
    aliases: [payments, payment backend]
    description: Internal payment processing service
    license: Company-owned artwork; internal use
```

Reference it with `visual: { shape: image, asset: 'custom:payment-api' }`. Without metadata, relative filenames form inventory IDs. Use `visual.asset` for filenames containing spaces/subdirectories; it accepts inventory references without the stricter `icon` syntax. An explicit missing custom asset is an error; an unknown technology/icon warns and falls back to the semantic kind. Image dimensions influence component measurement before layout, with aspect-preserving scaling into a bounded image box. Raster inputs normalize to PNG with orientation applied; exports are self-contained.

Try `examples/custom-assets/portal.topoir.yaml` with `--assets examples/custom-assets/assets`. SDK callers can use `discoverAssets`, `AssetRegistry`, or `compile(source, { assetDirectory })`. MCP inventory is configured by the operator with `TOPOIR_ASSETS`, not arbitrary agent-provided filesystem paths.

## Font

The renderer depends on the DejaVu Sans TrueType files distributed by `dejavu-fonts-ttf`. They are loaded explicitly for PNG and embedded in SVG so system fonts cannot change measurement or output. DejaVu fonts use their upstream permissive font license; review the dependency's `LICENSE` and `README-dejavu-fonts.md` in a packaged installation.

## Safety

The SVG importer accepts passive vector shapes, local gradients/clips/masks and local references. It rejects scripts, event handlers, CSS/style blocks, text elements, external references, entities and doctypes. Convert text to vector outlines if needed. Discovery ignores symlinks/hidden files, checks real-path containment, limits inventories to 2,000 supported files, files to 10 MiB, SVG elements to 20,000, dimensions to 16,384 and raster decoding to 16 million pixels. These guards are not a complete sandbox: untrusted inventories should be processed in a resource-limited worker/container. The low-level `AssetRegistry.add` API is a trusted embedding API; use discovery for untrusted files. Custom license metadata is user-provided, not a legal determination by TopoIR.
