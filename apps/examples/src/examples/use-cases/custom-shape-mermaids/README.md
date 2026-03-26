---
title: Mermaid sequential pipeline with custom shapes
component: ./CustomShapeMermaids.tsx
priority: 10
keywords: [mermaid, diagram, custom, pipeline, workflow]
---

Paste a linear Mermaid flowchart, run a simulated CI-style pipeline on the nodes, and retry failed steps from the canvas.

---

This example demonstrates how to use custom shapes with Mermaid diagrams via the `@tldraw/mermaid` API: pass `blueprintRender.mapNodeToRenderSpec` to return a `MermaidBlueprintNodeRenderSpec` (here, the custom `flowchart-util` type plus parser-derived `pipelineStepIndex` props).
