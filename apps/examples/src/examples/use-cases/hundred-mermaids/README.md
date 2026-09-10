---
title: Hundreds of Mermaid diagrams
component: ./MermaidDiagramsExample.tsx
priority: 10
keywords: [mermaid, diagram]
---

Convert over a hundred Mermaid flowcharts, state diagrams, mind maps, and sequence diagrams into native tldraw shapes.

---

`createMermaidDiagram` from `@tldraw/mermaid` parses Mermaid source and creates ordinary tldraw shapes (geo shapes, arrows with bindings, text) at a given position. This example runs it over a large set of diagram definitions from `mermaids.ts` and lays the results out in rows by diagram type.

Next to each native version it also places Mermaid's own SVG rendering as an image shape, scaled to the same height, so you can compare the two side by side.

Click the button in the top panel and wait: the panel hides while generating and comes back with the final count. Both libraries are imported lazily on first click.
