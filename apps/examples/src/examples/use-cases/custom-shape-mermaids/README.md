---
title: Mermaid sequential pipeline with custom shapes
component: ./CustomShapeMermaids.tsx
priority: 10
keywords: [mermaid, diagram, custom, pipeline, workflow]
---

Paste a Mermaid **flowchart** or **graph**, run a simulated CI-style **DAG** on the nodes (merge = wait for all parents), and retry failed steps from the canvas.

---

This example accepts **flowchart / graph** source only (validated before import). It uses `@tldraw/mermaid` with `blueprintRender.mapNodeToRenderSpec` so vertices become custom `flowchart-util` shapes with `mermaidNodeId`. After import, **edges** must form a **DAG** (no cycles). Step **schedule** follows **AND-join** semantics: a node runs when all its predecessors have **passed**. **Step badges** are **Kahn layers** (same layer = same badge number). The graph is read from **tldraw arrow bindings** (`extractFlowchartPipelineFromEditor`), not from parsing edge syntax in the text box.
