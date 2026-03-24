---
title: Mermaid sequential pipeline with custom shapes
component: ./CustomShapeMermaids.tsx
priority: 10
keywords: [mermaid, diagram, custom, pipeline, workflow]
---

Paste a linear Mermaid flowchart, run a simulated CI-style pipeline on the nodes, and retry failed steps from the canvas.

---

This example demonstrate how users can leverage custom shapes with mermaid diagrams
using the API of the @tldraw/mermaid package.

In this example, you'll learn how to create custom shapes and use them in lieu 
of flowchart node using the node mapper function but also how to even go deeper 
by providing your own `createShape` to the blueprint renderer!
