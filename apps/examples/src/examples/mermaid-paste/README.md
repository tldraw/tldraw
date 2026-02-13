---
title: Mermaid diagram paste
component: ./MermaidPasteExample.tsx
category: use-cases
priority: 100
keywords:
  [
    mermaid,
    diagrams,
    paste,
    flowchart,
    sequence diagram,
    class diagram,
    state diagram,
    er diagram,
    external content,
    handler,
  ]
---

Paste Mermaid diagram code and have it automatically render as native tldraw shapes.

---

This example demonstrates how to register a custom external content handler to intercept text paste events and detect Mermaid diagram code. When Mermaid code is detected, it parses the diagram structure and creates native tldraw shapes (geo shapes for nodes, arrows with bindings for relationships) that can be individually selected, moved, and edited.

## Supported diagram types

**Flowcharts**
```
flowchart LR
  A[Start] --> B{Decision}
  B -->|Yes| C[End]
```

**Sequence diagrams**
```
sequenceDiagram
  Alice->>Bob: Hello Bob
  Bob-->>Alice: Hi Alice
```

**Class diagrams**
```
classDiagram
  Animal <|-- Dog
  Animal : +name string
  Animal : +makeSound()
```

**State diagrams**
```
stateDiagram-v2
  [*] --> Still
  Still --> Moving
  Moving --> [*]
```

**ER diagrams**
```
erDiagram
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ LINE-ITEM : contains
```

**Gantt charts (SVG)**
```
gantt
  title A Gantt Diagram
  section Section
  A task :a1, 2024-01-01, 30d
  Another task :after a1, 20d
```

**Pie charts (SVG)**
```
pie
  title Pets
  "Dogs" : 386
  "Cats" : 85
  "Rats" : 15
```

**Journey maps (SVG)**
```
journey
  title My working day
  section Go to work
    Make tea: 5: Me
    Go upstairs: 3: Me
```

## How it works

**Native shapes (fully editable):**
- Flowcharts, sequence diagrams, class diagrams, state diagrams, and ER diagrams are parsed and rendered as native tldraw shapes
- Each element can be individually selected, moved, resized, and edited
- Arrows use bindings to stay connected to shapes

**SVG fallback (for other diagram types):**
- Other diagram types (gantt, pie, journey, gitGraph, mindmap, timeline, etc.) are rendered as SVG images using mermaid-js
- These appear as single image shapes that can be moved and resized
- Not editable at the shape level, but can be deleted and re-pasted

The handler supports both code blocks with ` ```mermaid ` fences and plain diagram code starting with diagram type keywords.
