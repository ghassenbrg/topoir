# Bundled artwork

TopoIR's asset registry includes the unmodified SVG bodies from the pinned npm distributions `@iconify-json/devicon@1.2.65` and `@iconify-json/lucide@1.2.134`. They are runtime dependencies installed for offline use. Each inventory record includes its collection, source and license. Keep the dependencies' license notices when redistributing.

Devicon: MIT, Copyright (c) 2015 konpa and contributors. Source: https://github.com/devicons/devicon. License: https://github.com/devicons/devicon/blob/master/LICENSE. Logos identify third-party technologies. The collection license does not grant trademark rights or endorsement. Follow each brand's usage policy; do not use a technology mark as your own product identity.

Lucide: ISC, Copyright (c) 2026 Lucide Icons and Contributors; inherited Feather artwork retains MIT, Copyright (c) 2013-present Cole Bemis. Source and full notices: https://github.com/lucide-icons/lucide/blob/main/LICENSE.

Iconify's JSON packaging preserves upstream vector artwork; source: https://github.com/iconify/icon-sets. Collection versions are pinned in package.json and the workspace lockfile.

Kubernetes resource icons: `@iconify-json/k8s@1.2.0`, 38 icons, Copyright The Kubernetes Authors. Upstream explicitly offers Apache-2.0 or CC-BY-4.0 at https://github.com/kubernetes/community/tree/main/icons; TopoIR uses Apache-2.0. The full Apache license is included in `licenses/Apache-2.0.txt`. Iconify normalizes SVG serialization. Kubernetes trademark rights remain with The Linux Foundation. These resource icons include Pods, Services, Deployments, Ingress, ConfigMaps, Secrets, Namespaces, worker nodes and other resources.

Full MIT/ISC permission and warranty notices are included in the compiled asset registry and embedded in generated SVG metadata and PNG iTXt chunks when those collections are used. Apache notices are similarly embedded. Preserve this metadata or accompanying license notices when redistributing extracted artwork.

AWS, Azure and Google Cloud service artwork is not included as an unrestricted icon collection. Semantic aliases resolve to generic Lucide primitives and are explicitly described as generic fallbacks. Users may add provider-native assets under the provider's applicable terms. See ../../docs/visual-quality-plan.md for the research and inclusion policy.
