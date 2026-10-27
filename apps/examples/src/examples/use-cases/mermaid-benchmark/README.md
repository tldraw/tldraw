---
title: Benchmark Mermaid pasting
component: ./MermaidBenchmarkExample.tsx
priority: 12
keywords: [mermaid, pele, benchmark, performance, paste]
---

Measure how long pasting Mermaid takes, and compare pele's layout engine with mermaid's, in your own browser and network.

---

`@tldraw/mermaid` lays diagrams out with [pele](https://pele.run). This page shows two things:

- **Layout engine, pele vs mermaid.** Both engines lay out the same diagrams as SVG, without creating tldraw shapes, so the numbers compare like for like. The first load is each engine's download and start-up plus one diagram, measured once per page load; reload the page to measure it again. Downloads are what the network actually transferred, and say "cached" when the browser served the code from its cache.
- **Pasting into tldraw with pele.** What a whole paste costs, from text to tldraw shapes. There is no mermaid column, because `@tldraw/mermaid` no longer runs on mermaid.

Warm numbers are the median per diagram over every diagram in the "Hundreds of Mermaid diagrams" example.
