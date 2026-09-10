---
title: Pasting Mermaid code as shapes
component: ./MermaidPasting.tsx
priority: 10
keywords: [mermaid, diagram, paste, external content]
---

Paste Mermaid source onto the canvas and get native tldraw shapes.

---

A custom `text` external content handler (`editor.registerExternalContentHandler`) checks whether pasted text looks like a Mermaid diagram. If it does, `createMermaidDiagram` from `@tldraw/mermaid` turns it into geo shapes, arrows, and text; otherwise the default text handler runs.

Flowcharts, state diagrams, sequence diagrams, and mind maps become native shapes. Other diagram types are rendered by Mermaid to SVG and pasted as an image, with a toast to say so.

Try copying this and pasting it onto the canvas:

```
graph TD
    A[Start] --> B{Is it correct?}
    B -- Yes --> C[Display diagram]
    B -- No --> D[Edit code]
    D --> B
    C --> E[End]
```
