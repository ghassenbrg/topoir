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

`composition`: `topology`, `layers` (downward by default), `sequence`, `swimlanes`, or `comparison`. `audience`: `engineering`, `executive`, or `presentation` (advisory). `focus` references nodes; `story` is an ordered list of edge IDs. References must exist. Keep referenced items in the selected view. Story controls emphasis/numbering, not a hard placement constraint yet. Sequence chronology comes from edge `step`, then `order`, then stable ID.

Node `visual` supports `shape` (`auto`, `card`, `icon`, `cylinder`, `stack`, `pill`, `diamond`, `image`), `emphasis` (`primary`, `secondary`, `muted`), `status` (`normal`, `success`, `failure`, `warning`), a text `badge`, integer `replicas`, and an inventory `asset` reference. Replicas are a visual summary, not expanded independently addressable nodes. Edges support the same emphasis/status vocabulary and integer `step`.

Available themes: `technical-clean`, `cloud-architecture`, `executive`, `dark-engineering`, `blueprint`, `whiteboard`, `minimal`. They affect component shape, dimensions, icon treatment, typography, connector radius, boundary treatment and palette. Composition remains an independent choice. Whiteboard is an initial grammar, not full illustrated sketch rendering; isometric, insets, arbitrary decorative regions and mixed-language subregions are not implemented.

## Versioning

`v1alpha1` may receive breaking migrations before 1.0. The compiler rejects unknown API versions. Future schema versions will have explicit migration commands and tests; existing versions will not silently change meaning.
