---
title: Pasting Mermaid code as shapes
component: ./MermaidPasting.tsx
priority: 10
keywords: [mermaid, diagram]
---

Paste mermaid diagrams!

---

This example shows how to handle the pasting of mermaid diagrams into the
canvas.

Supported diagrams:

- Flowcharts
- State
- Sequence
- Mindmap

Example:

```
graph TD
    A[Start] --> B{Is it correct LALA?}
    B -- Yes --> C[Display Diagram]
    B -- No --> D[Edit Code]
    D --> B
    C --> E[End]
```
