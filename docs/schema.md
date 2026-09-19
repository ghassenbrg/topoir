# TopoIR v1alpha1 authoring model

The canonical contract is [`packages/schema/schema/topoir.schema.json`](../packages/schema/schema/topoir.schema.json). Print the installed version with `topoir schema`.

## Document

```yaml
apiVersion: topoir.dev/v1alpha1
kind: Architecture
metadata:
  name: stable-machine-name
  title: Human title
model: {}
views: []
```

`metadata.name` and every entity ID use letters, digits, `_`, `.`, and `-`, beginning with a letter. IDs are document-wide unique across groups, nodes, edges, flows, and annotations. All objects are strict; use a namespaced `x-*` key only for metadata that TopoIR may safely ignore.

## Groups

Groups form one arbitrary-depth containment tree through `parent`. Supported semantic kinds include system/environment/cloud/region/zone/network/VPC/subnet/Kubernetes cluster/namespace/deployment/security boundary/external zone/logical group.

`layout.mode` may be `auto`, `layered`, `row`, `column`, `grid`, or `pack`. It is a semantic constraint rather than a coordinate. `direction`, `columns`, and `gap` are optional hints.

## Nodes and ports

Initial node kinds cover clients, services/APIs/workers, databases/caches/queues/streams/storage, gateways/load balancers/firewalls/identity providers, VMs/containers/pods/Kubernetes services/functions/cloud services/external systems, and generic components.

`group` selects containment. `technology` is a normalized product hint such as `postgresql` or `redis`; `icon` is an explicit `pack:name` reference. Ports are local to a node and may specify north/east/south/west/auto plus input/output/bidirectional semantics.

## Edges and flows

Edges always connect node IDs. Relationship kinds include request/response/read/write/publish/consume/replicate/authenticate/authorize/stream/sync/async/control/data/dependency/network.

Use `sourcePort` and `targetPort` only for ports declared by those endpoints. `direction` controls arrows (`forward`, `back`, `both`, `none`). `style` may be solid/dashed/dotted.

Flows group relationships into a legend and may supply one semantic color/style. Prefer meaningful flows such as user traffic, identity, asynchronous events, or replication rather than arbitrary decoration.

## Annotations

Notes, warnings, and callouts contain text and may anchor to a group, node, or edge ID. They participate in layout as obstacles. Anchoring influences proximity; it is not a manual position.

## Views

One model may declare many views. `include`/`exclude` selectors accept group, node, edge, and tag lists. Selecting a group includes descendants and contained nodes. Visible nodes bring their ancestor groups. An edge is visible when both endpoints are visible, unless excluded. Only flows referenced by visible edges remain.

A view controls title/description, theme, legend visibility, direction, aspect target, and compact/normal/relaxed spacing. If a caller omits `--view`, `overview` wins when present.

## Design intent and visual grammar

```yaml
views:
  - id: incident
    theme: dark-engineering
    design:
      composition: topology
      audience: engineering
      takeaway: A shared producer fault exhausted every request thread.
      focus: [producer, request-pool]
      story: [incoming, exhaust, timeout]
      optimize: true
```

`composition`: `topology`, `layers` (downward by default), `architecture`, `sequence`, `swimlanes`, `comparison`, or `architecture-map`. `audience`: `engineering`, `executive`, or `presentation` (advisory). `focus` references nodes; `story` is an ordered list of edge IDs. References must exist. Keep referenced items in the selected view. Story controls emphasis/numbering, not a hard placement constraint yet. Sequence chronology comes from edge `step`, then `order`, then stable ID.

Node `visual` supports `shape` (`auto`, `card`, `icon`, `cylinder`, `stack`, `pill`, `diamond`, `image`), `emphasis` (`primary`, `secondary`, `muted`), `status` (`normal`, `success`, `failure`, `warning`), a text `badge` (48 characters), integer `replicas`, and inventory artwork. Replicas are a visual summary, not expanded independently addressable nodes. Edges support the same emphasis/status vocabulary and integer `step`.

### Component artwork

`visual.asset` names one inventory entry. `visual.assets` names an ordered list of up to six asset roles — for example a platform marker plus the component's own logo — and when it is present it is the complete list for that component, so a separate `visual.asset` is reported as overridden (`TOP323_ASSET_OVERRIDDEN`) rather than silently dropped. When neither is given, one asset is resolved from `icon`, then `technology`, then the semantic kind. Up to five roles are drawn side by side and every drawn role is attributed in the export metadata.

### The `architecture` composition

`architecture` is the compiler's own banded composition, and the one to reach for when a view should read as an architecture wall diagram. Each container — the canvas and every boundary — is solved as its own small problem, bottom-up, so a boundary is placed as one measured block and always reads as a contiguous region. Inside a container, items are assigned to layers along the view direction from the relationships between them, then ordered into bands across it.

The container's own `layout.mode` chooses how it arranges its members: `column` and `row` keep them in one fixed lane in the declared sequence, `grid` uses fixed columns, and anything else lays them out in layers. Within a layer an explicit `order` is honoured exactly; unranked siblings are placed by the barycenter of what they connect to and then by ID.

Unlike the graph-backend families, this one supports explicit ports, attaches each connector to the compartment it is drawn against, distributes connectors that share a component side into separate lanes and corridors, and evaluates a bounded set of spacing and lane strategies, keeping the best by measured quality.

### Internal route compartments

`visual.portLabels: inside` draws a component's declared `ports` as labeled compartments inside the component — a gateway's route table, not an infrastructure boundary. Each compartment is measured before layout, the connector that names the port through `sourcePort`/`targetPort` is pinned to that compartment's own edge, and the renderer draws the same measured rectangle, so the visible route table and the attachment geometry cannot drift apart. Compartments widen the component rather than clipping a long route label. Compartments are supported by `topology`, `layers` and `architecture`. Explicit ports remain unsupported in the experimental `sequence`, `swimlanes`, `comparison` and `architecture-map` families, which report `TOP402_COMPOSITION_PORT_UNSUPPORTED` instead of ignoring them.

### Sibling order

`order` is available on groups, nodes, ports, edges, flows and annotations. Explicitly ranked siblings come first in their declared rank; unranked siblings follow in stable ID order. An absent `order` means "unranked", not `order: 0`. Rank is a deterministic input to layout, not a coordinate: in the `topology` and `layers` families the layout engine may still reorder items within a layer to reduce crossings.

Available themes: `technical-clean`, `cloud-architecture`, `executive`, `dark-engineering`, `blueprint`, `whiteboard`, `minimal`. They affect component shape, dimensions, icon treatment, typography, connector radius, boundary treatment and palette. Composition remains an independent choice. Whiteboard is an initial grammar, not full illustrated sketch rendering; isometric, insets, arbitrary decorative regions and mixed-language subregions are not implemented.

## Versioning

`v1alpha1` may receive breaking migrations before 1.0. The compiler rejects unknown API versions. Future schema versions will have explicit migration commands and tests; existing versions will not silently change meaning.
