import type { NodeKind } from "@topoir/schema";
import type { SceneElement, SceneGroup } from "./scene.js";

interface IconDefinition {
  readonly paths: readonly string[];
  readonly circles?: readonly { readonly cx: number; readonly cy: number; readonly radius: number }[];
}

const generic: IconDefinition = {
  paths: ["M5 5h14v14H5z", "M9 9h6v6H9z"],
};

const icons: Readonly<Partial<Record<NodeKind, IconDefinition>>> = {
  client: { paths: ["M4 5h16v11H4z", "M8 20h8", "M12 16v4"] },
  service: { paths: ["M5 4h14v16H5z", "M8 8h8", "M8 12h8", "M8 16h5"] },
  api: { paths: ["M8 4 4 12l4 8", "M16 4l4 8-4 8", "m14 6-4 12"] },
  worker: { paths: ["M12 3v3", "M12 18v3", "M3 12h3", "M18 12h3", "M7 7l2 2", "M15 15l2 2", "M17 7l-2 2", "M9 15l-2 2", "M9 9h6v6H9z"] },
  database: { paths: ["M5 6c0-2 14-2 14 0v12c0 2-14 2-14 0z", "M5 6c0 2 14 2 14 0", "M5 12c0 2 14 2 14 0"] },
  cache: { paths: ["M4 7c0-2 16-2 16 0s-16 2-16 0", "M4 7v5c0 2 16 2 16 0V7", "M4 12v5c0 2 16 2 16 0v-5"] },
  queue: { paths: ["M6 6h12", "M6 12h12", "M6 18h12"], circles: [{ cx: 3, cy: 6, radius: 1 }, { cx: 3, cy: 12, radius: 1 }, { cx: 3, cy: 18, radius: 1 }] },
  stream: { paths: ["M4 7h9", "m10 4 4-4-4-4", "M20 17h-9", "m-1-4-4 4 4 4"] },
  "object-storage": { paths: ["M4 8h16v11H4z", "M8 8V5h8v3", "M8 12h8"] },
  filesystem: { paths: ["M3 6h7l2 3h9v10H3z"] },
  gateway: { paths: ["M5 4h14v16H5z", "M9 12h10", "m15 8 4 4-4 4"] },
  "load-balancer": { paths: ["M4 6h5", "M4 12h5", "M4 18h5", "M15 6h5", "M15 12h5", "M15 18h5", "M9 6v12", "M15 6v12", "M9 12h6"] },
  firewall: { paths: ["M4 5h16v14H4z", "M4 10h16", "M4 15h16", "M9 5v5", "M15 10v5", "M10 15v4"] },
  "identity-provider": { paths: ["M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6z", "M9 11h6", "M12 8v6"] },
  vm: { paths: ["M3 5h18v14H3z", "M7 9h4", "M7 13h7"] },
  container: { paths: ["M4 6h16v12H4z", "M8 6v12", "M16 6v12"] },
  pod: { paths: ["M12 3 4 8v8l8 5 8-5V8z", "M4 8l8 5 8-5", "M12 13v8"] },
  "kubernetes-service": { paths: ["M12 3 4 8v8l8 5 8-5V8z", "M8 12h8", "M12 8v8"] },
  function: { paths: ["M15 4h-3c-2 0-3 1-3 3v13", "M6 10h7", "m14 12 2 3 2-3"] },
  "cloud-service": { paths: ["M6 18h12a4 4 0 0 0 0-8 6 6 0 0 0-11-2 5 5 0 0 0-1 10z"] },
  "external-system": { paths: ["M5 5h14v14H5z", "m9 9 6 6", "m15 9-6 6"] },
};

export function iconScene(kind: NodeKind, x: number, y: number, size: number, color: string): SceneGroup {
  const definition = icons[kind] ?? generic;
  const scale = size / 24;
  const children: SceneElement[] = definition.paths.map((d) => ({
    type: "path",
    d,
    fill: "none",
    stroke: color,
    strokeWidth: 1.7 / scale,
    lineCap: "round",
    lineJoin: "round",
  }));
  for (const circle of definition.circles ?? []) {
    children.push({ type: "circle", ...circle, fill: color });
  }
  return {
    type: "group",
    className: "topoir-icon",
    transform: `translate(${number(x)} ${number(y)}) scale(${number(scale)})`,
    children,
  };
}

function number(value: number): string {
  return String(Math.round(value * 100) / 100);
}
