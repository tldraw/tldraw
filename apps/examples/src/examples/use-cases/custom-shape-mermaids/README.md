---
title: Customize Mermaid diagrams
component: ./CustomShapeMermaids.tsx
priority: 10
keywords: [mermaid, diagram, custom, pipeline, workflow]
---

Import a Mermaid flowchart as custom shapes and run it as an animated CI/CD pipeline.

---

`createMermaidDiagram` from `@tldraw/mermaid` accepts a `blueprintRender.mapNodeToRenderSpec` callback that decides which shape each parsed node becomes. This example maps every flowchart vertex to a custom `flowchart-util` shape and stores the Mermaid node id in the shape's props.

After the import, the pipeline graph is rebuilt from the arrows and arrow bindings on the canvas (`extractFlowchartPipelineFromEditor`), not from the Mermaid text. The graph must be a DAG. Steps are scheduled with AND-join semantics: a node runs once all of its predecessors have passed, and the "Step n" badges are Kahn layers, so nodes in the same layer share a number.

Try it: paste a `flowchart` or `graph` diagram, click "Apply workflow", then "Run pipeline". Steps fail at random; click "Retry" on a failed shape to resume from there. Only flowchart and graph diagrams are accepted, and pipeline status lives in a shared atom in memory, not in the store.
