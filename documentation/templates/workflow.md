---
title: Workflow template
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - workflow
  - flowchart
  - nodes
  - connections
  - template
---

The Workflow template demonstrates a node-based editor built on tldraw. It includes custom node shapes, ports, and an execution graph for running connected workflows.

## Quick start

```bash
npx create-tldraw my-app
# Select the Workflow template
cd my-app
npm install
npm run dev
```

## Key components

- Custom node shapes with input/output ports
- Connection bindings between nodes
- Execution graph that evaluates connected regions

## Key files

- templates/workflow/src/execution/ExecutionGraph.tsx - Execution engine
- templates/workflow/src/ports/Port.tsx - Port rendering and logic
- templates/workflow/src/components/WorkflowToolbar.tsx - Custom toolbar

## Related

- [Custom shapes](../guides/custom-shapes.md)
- [Custom bindings](../guides/custom-bindings.md)
