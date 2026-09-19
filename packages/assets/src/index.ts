import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { readdir, readFile, realpath, stat } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import sharp from "sharp";
import { parseDocument } from "yaml";
export { artworkLicenses } from "./licenses.js";

export interface AssetInfo {
  readonly id: string;
  readonly name: string;
  readonly aliases: readonly string[];
  readonly description: string;
  readonly width: number;
  readonly height: number;
  readonly mediaType: string;
  readonly source: string;
  readonly license: string;
  readonly collection: string;
}

export interface ResolvedAsset extends AssetInfo {
  readonly dataUri: string;
  readonly sha256: string;
}

interface IconSet {
  width?: number;
  height?: number;
  icons: Record<string, { body: string; width?: number; height?: number }>;
}

const require = createRequire(import.meta.url);
const sets: Record<string, IconSet> = {
  devicon: require("@iconify-json/devicon/icons.json") as IconSet,
  lucide: require("@iconify-json/lucide/icons.json") as IconSet,
  k8s: require("@iconify-json/k8s/icons.json") as IconSet,
};
const aliases: Record<string, string> = {
  k8s: "devicon:kubernetes", kubernetes: "devicon:kubernetes", postgres: "devicon:postgresql",
  "node.js": "devicon:nodejs", node: "devicon:nodejs", vue: "devicon:vuejs", kafka: "devicon:apachekafka",
  vault: "devicon:vault", "aws lambda": "lucide:zap", "aws:lambda": "lucide:zap",
  "aws s3": "lucide:archive", "aws:s3": "lucide:archive", "aws ec2": "lucide:server",
  "aws eks": "devicon:kubernetes", "azure aks": "devicon:kubernetes", "gcp gke": "devicon:kubernetes",
  "azure functions": "lucide:zap", "gcp cloud run": "lucide:container", "gcp cloud sql": "lucide:database",
  "aws rds": "lucide:database", "aws dynamodb": "lucide:database", "aws sqs": "lucide:list-ordered",
  "aws cloudfront": "lucide:globe", "aws route53": "lucide:network", "aws vpc": "lucide:network",
  "azure storage": "lucide:archive", "azure sql": "lucide:database", "azure vnet": "lucide:network",
  "gcp pubsub": "lucide:radio-tower", "gcp storage": "lucide:archive", "gcp bigquery": "lucide:database-search",
  pod: "k8s:pod", pods: "k8s:pod", deployment: "k8s:deployment", deployments: "k8s:deployment",
  ingress: "k8s:ingress", configmap: "k8s:configmap", secret: "k8s:secret", secrets: "k8s:secret",
  namespace: "k8s:namespace", "kubernetes node": "k8s:worker-node", "kubernetes-service": "k8s:service",
  keycloak: "lucide:fingerprint-pattern", traefik: "lucide:waypoints", opensearch: "lucide:search", seaweedfs: "lucide:hard-drive",
  client: "lucide:monitor", user: "lucide:user-round", users: "lucide:users-round", mobile: "lucide:smartphone",
  browser: "lucide:panels-top-left", service: "lucide:app-window", api: "lucide:braces", worker: "lucide:cog",
  database: "lucide:database", cache: "lucide:layers", queue: "lucide:list-ordered", stream: "lucide:radio-tower",
  "object-storage": "lucide:archive", storage: "lucide:archive", filesystem: "lucide:folder",
  gateway: "lucide:waypoints", "load-balancer": "lucide:git-fork", firewall: "lucide:brick-wall-shield",
  "identity-provider": "lucide:fingerprint-pattern", authentication: "lucide:fingerprint-pattern", security: "lucide:shield-check",
  observability: "lucide:activity", server: "lucide:server", vm: "lucide:server", container: "lucide:container",
  function: "lucide:zap", "cloud-service": "lucide:cloud", "external-system": "lucide:external-link",
  generic: "lucide:component", network: "lucide:network", region: "lucide:map-pin", zone: "lucide:map-pin",
};

function key(value: string): string { return value.normalize("NFKC").toLowerCase().trim().replaceAll(/[_\s-]+/g, " "); }
function hash(bytes: Uint8Array | string): string { return createHash("sha256").update(bytes).digest("hex"); }
function uri(bytes: Uint8Array | string, mediaType: string): string { return `data:${mediaType};base64,${Buffer.from(bytes).toString("base64")}`; }

/** Deterministic, offline registry. Discovery metadata never includes large image bodies. */
export class AssetRegistry {
  private readonly metadata = new Map<string, AssetInfo>();
  private readonly lookup = new Map<string, string>();
  private readonly custom = new Map<string, ResolvedAsset>();

  public constructor() {
    for (const [collection, set] of Object.entries(sets)) {
      for (const [name, icon] of Object.entries(set.icons).sort(([a], [b]) => a.localeCompare(b, "en"))) {
        const id = `${collection}:${name}`;
        this.metadata.set(id, {
          id, name: name.replaceAll("-", " "), aliases: Object.entries(aliases).filter(([, value]) => value === id).map(([alias]) => alias),
          description: collection === "devicon" ? `${name} technology logo; third-party trademark` : collection === "k8s" ? `${name} Kubernetes resource icon` : `${name} generic symbol (not provider-native artwork)`,
          width: icon.width ?? set.width ?? 24, height: icon.height ?? set.height ?? 24,
          mediaType: "image/svg+xml", collection,
          source: collection === "devicon" ? "https://github.com/devicons/devicon" : collection === "k8s" ? "https://github.com/kubernetes/community/tree/main/icons" : "https://github.com/lucide-icons/lucide",
          license: collection === "devicon" ? "MIT; third-party trademarks" : collection === "k8s" ? "Apache-2.0; Kubernetes Authors" : "ISC; inherited Feather icons MIT",
        });
        this.lookup.set(key(id), id);
        if (!this.lookup.has(key(name))) this.lookup.set(key(name), id);
      }
    }
    for (const [alias, id] of Object.entries(aliases)) {
      if (!this.metadata.has(id)) throw new Error(`Built-in alias ${alias} targets unavailable artwork ${id}.`);
      this.lookup.set(key(alias), id);
    }
  }

  public search(query = "", limit = 50): readonly AssetInfo[] {
    const terms = key(query).split(" ").filter(Boolean);
    const exact = this.lookup.get(key(query));
    return [...this.metadata.values()]
      .filter((asset) => terms.every((term) => key([asset.id, asset.name, asset.description, ...asset.aliases].join(" ")).includes(term)))
      .sort((a, b) => Number(b.id === exact) - Number(a.id === exact) || a.id.localeCompare(b.id, "en"))
      .slice(0, Math.max(0, Math.min(5000, limit)));
  }

  public get size(): number { return this.metadata.size; }

  public resolve(reference: string, color = "#334155"): ResolvedAsset | undefined {
    const id = this.lookup.get(key(reference));
    if (id === undefined) return undefined;
    const custom = this.custom.get(id);
    if (custom !== undefined) return custom;
    const metadata = this.metadata.get(id)!;
    const name = id.slice(id.indexOf(":") + 1);
    const body = sets[metadata.collection]?.icons[name]?.body;
    if (body === undefined) return undefined;
    const safeColor = /^#[\da-f]{6}$/i.test(color) ? color : "#334155";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${metadata.width} ${metadata.height}" width="${metadata.width}" height="${metadata.height}" color="${safeColor}">${body}</svg>`;
    return { ...metadata, dataUri: uri(svg, metadata.mediaType), sha256: hash(svg) };
  }

  public add(asset: ResolvedAsset): void {
    if (!asset.id.startsWith("custom:")) throw new Error("Local assets must use the custom: namespace.");
    if (this.metadata.has(asset.id)) throw new Error(`Duplicate asset ${asset.id}.`);
    const names = [asset.id, asset.name, ...asset.aliases];
    for (const name of names) {
      const previous = this.lookup.get(key(name));
      if (previous?.startsWith("custom:") && previous !== asset.id) throw new Error(`Ambiguous custom asset alias ${name}.`);
    }
    const { dataUri: _dataUri, sha256: _sha256, ...info } = asset;
    this.metadata.set(asset.id, info);
    this.custom.set(asset.id, asset);
    for (const name of names) this.lookup.set(key(name), asset.id);
  }
}

export interface AssetInventory { readonly registry: AssetRegistry; readonly diagnostics: readonly { code: string; severity: "error"; message: string; source: string }[] }

/** Imports only files beneath the explicitly supplied directory; no network access. */
export async function discoverAssets(directory: string, registry = new AssetRegistry()): Promise<AssetInventory> {
  const diagnostics: { code: string; severity: "error"; message: string; source: string }[] = [];
  const root = await realpath(directory);
  const files: string[] = [];
  async function walk(folder: string): Promise<void> {
    for (const entry of (await readdir(folder, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name, "en"))) {
      if (entry.name.startsWith(".") || entry.isSymbolicLink()) continue;
      const path = resolve(folder, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (/\.(svg|png|jpe?g|webp)$/i.test(entry.name)) files.push(path);
      if (files.length > 2000) throw new Error("Asset inventory exceeds 2000 files.");
    }
  }
  await walk(root);
  const metadataPath = resolve(root, "assets.yaml");
  let entries: Record<string, { file: string; aliases?: string[]; description?: string; license?: string }> = {};
  let metadataSource: string | undefined;
  try { metadataSource = await readFile(metadataPath, "utf8"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  try {
    const parsed = parseDocument(metadataSource ?? "assets: {}", { uniqueKeys: true });
    if (parsed.errors.length) throw parsed.errors[0];
    const value = parsed.toJS({ maxAliasCount: 20 }) as { assets?: typeof entries };
    if (value === null || typeof value !== "object" || value.assets === null || typeof value.assets !== "object" || Array.isArray(value.assets)) throw new Error("Expected an assets mapping in assets.yaml.");
    entries = value.assets ?? {};
    for (const [id, entry] of Object.entries(entries)) {
      if (!/^[\w.-]+$/.test(id) || !entry || typeof entry.file !== "string" || (entry.aliases !== undefined && (!Array.isArray(entry.aliases) || entry.aliases.some((alias) => typeof alias !== "string"))) || (entry.description !== undefined && typeof entry.description !== "string") || (entry.license !== undefined && typeof entry.license !== "string")) throw new Error(`Invalid metadata for ${id}.`);
      const path = await realpath(resolve(root, entry.file));
      if (!isInside(root, path)) throw new Error(`Asset ${id} escapes its configured directory.`);
      if (!files.includes(path)) throw new Error(`Asset ${id} does not reference a discovered supported file.`);
    }
  } catch (error) {
    diagnostics.push({ code: "TOP320_ASSET_METADATA_INVALID", severity: "error", message: String(error), source: metadataPath });
    return { registry, diagnostics };
  }
  for (const file of files) {
    try {
      const actual = await realpath(file);
      if (!isInside(root, actual)) throw new Error("Asset escapes configured directory.");
      if ((await stat(actual)).size > 10 * 1024 * 1024) throw new Error("Asset exceeds 10 MiB.");
      const bytes = await readFile(actual);
      const descriptor = Object.entries(entries).find(([, entry]) => resolve(root, entry.file) === file);
      const relativeName = relative(root, file).split(sep).join("/");
      const name = relativeName.replace(/\.[^.]+$/, "");
      const id = `custom:${descriptor?.[0] ?? name.replaceAll(/[^\w./-]/g, "-")}`;
      let content: Buffer | string = bytes;
      let width: number;
      let height: number;
      let mediaType: string;
      if (extname(file).toLowerCase() === ".svg") {
        const svg = safeSvg(bytes.toString("utf8"));
        content = svg.content; width = svg.width; height = svg.height; mediaType = "image/svg+xml";
      } else {
        const converted = await sharp(bytes, { limitInputPixels: 16_000_000, animated: false }).rotate().png().toBuffer({ resolveWithObject: true });
        content = converted.data; width = converted.info.width; height = converted.info.height; mediaType = "image/png";
      }
      registry.add({ id, name, aliases: descriptor?.[1].aliases ?? [], description: descriptor?.[1].description ?? name,
        width, height, mediaType, source: relativeName, license: descriptor?.[1].license ?? "User-provided; rights not asserted by TopoIR",
        collection: "custom", dataUri: uri(content, mediaType), sha256: hash(content) });
    } catch (error) {
      diagnostics.push({ code: "TOP321_ASSET_INVALID", severity: "error", message: error instanceof Error ? error.message : String(error), source: file });
    }
  }
  return { registry, diagnostics };
}

function isInside(root: string, path: string): boolean { const rel = relative(root, path); return rel !== ".." && !rel.startsWith(`..${sep}`) && !rel.startsWith(sep); }

/** Strict passive SVG subset. Rejects scripts, CSS, external resources and XML entities. */
export function safeSvg(source: string): { content: string; width: number; height: number } {
  if (/<!DOCTYPE|<!ENTITY|<\?/i.test(source.replace(/^\s*<\?xml[^?]*\?>/, ""))) throw new Error("SVG cannot contain entities, a doctype or processing instructions.");
  const document = new DOMParser({ onError: (level, message) => { if (level !== "warning") throw new Error(message); } }).parseFromString(source, "image/svg+xml");
  const root = document.documentElement;
  if (!root || root.tagName !== "svg") throw new Error("Asset must be an SVG document.");
  const elements = new Set(["svg", "g", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "defs", "linearGradient", "radialGradient", "stop", "clipPath", "mask", "title", "desc", "use"]);
  const attributes = new Set(["xmlns", "xmlns:xlink", "id", "viewBox", "width", "height", "x", "y", "x1", "x2", "y1", "y2", "cx", "cy", "r", "rx", "ry", "fx", "fy", "d", "points", "fill", "fill-rule", "fill-opacity", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit", "stroke-dasharray", "stroke-dashoffset", "stroke-opacity", "opacity", "transform", "gradientTransform", "gradientUnits", "offset", "stop-color", "stop-opacity", "clip-path", "clip-rule", "mask", "maskUnits", "maskContentUnits", "color", "preserveAspectRatio", "href", "xlink:href", "version"]);
  const all = document.getElementsByTagName("*");
  if (all.length > 20000) throw new Error("SVG exceeds element limit.");
  for (let index = 0; index < all.length; index++) {
    const element = all.item(index)!;
    if (!elements.has(element.tagName)) throw new Error(`Unsupported SVG element ${element.tagName}. Use passive vector shapes.`);
    for (let at = 0; at < element.attributes.length; at++) {
      const attr = element.attributes.item(at)!;
      if (!attributes.has(attr.name)) throw new Error(`Unsupported SVG attribute ${attr.name}.`);
      if ((attr.name === "href" || attr.name === "xlink:href") && !/^#[\w.-]+$/.test(attr.value)) throw new Error("External SVG references are not allowed.");
      if (/url\s*\(/i.test(attr.value) && !/^url\(#[\w.-]+\)$/.test(attr.value)) throw new Error("Only local fragment paint references are allowed.");
    }
  }
  const box = root.getAttribute("viewBox")?.trim().split(/[\s,]+/).map(Number);
  if (box && (box.length !== 4 || box.some((value) => !Number.isFinite(value)))) throw new Error("SVG viewBox needs four finite numbers.");
  const width = box?.[2] ?? Number(root.getAttribute("width")?.replace(/px$/, ""));
  const height = box?.[3] ?? Number(root.getAttribute("height")?.replace(/px$/, ""));
  if (![width, height].every((value) => Number.isFinite(value) && value > 0 && value <= 16384)) throw new Error("SVG needs finite positive dimensions or viewBox (maximum 16384). ");
  root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  return { content: new XMLSerializer().serializeToString(document), width, height };
}
