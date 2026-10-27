---
title: Benchmark Mermaid pasting
component: ./MermaidBenchmarkExample.tsx
priority: 12
keywords: [mermaid, pele, benchmark, performance, paste]
---

Measure how long pasting Mermaid takes, and compare pele's layout engine with mermaid's, in your own browser and network.

---

`@tldraw/mermaid` lays diagrams out with [pele](https://pele.run). This page times the same paths a paste goes through:

- **First load** downloads the code a first paste needs. It is measured once per page load, so reload the page to measure it again. Byte counts are what the network actually transferred, and are zero when the browser served the code from its cache.
- **Warm** runs repeat every diagram from the "Hundreds of Mermaid diagrams" example and report the median per diagram type.

For each, the full paste (pele, from text to tldraw shapes) sits next to an engine-only comparison: pele and mermaid each laying the same diagram out as an SVG, without creating any shapes.
