---
title: Customize Mermaid diagrams
component: ./CustomShapeMermaids.tsx
priority: 10
keywords: [mermaid, diagram, custom, pipeline, workflow]
---

You can change the nodes and vertices in a Mermaid diagram for custom rendering and use for interactive diagramming.

---

This example accepts **flowchart / graph** source only (validated before import). It uses `@tldraw/mermaid` with `blueprintRender.mapNodeToRenderSpec` so vertices become custom `flowchart-util` shapes with `mermaidNodeId`. After import, **edges** must form a **DAG** (no cycles). Step **schedule** follows **AND-join** semantics: a node runs when all its predecessors have **passed**. **Step badges** are **Kahn layers** (same layer = same badge number). The graph is read from **tldraw arrow bindings** (`extractFlowchartPipelineFromEditor`), not from parsing edge syntax in the text box.

Use **Copy as Mermaid** (`editorToFlowchartMermaid`) to serialize the current canvas — `flowchart-util` shapes plus arrow bindings — back into a `flowchart LR` source string and put it on the clipboard. Shapes you add on the canvas without a `mermaidNodeId` get a generated `n#` id so edits round-trip.

Here we animate a CI/CD pipeline with random failures which you can trigger retries for.
