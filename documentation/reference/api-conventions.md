---
title: API conventions
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - api
  - conventions
  - naming
  - patterns
  - style
---

## Overview

This reference lists the naming and API patterns used across tldraw packages.

## Naming conventions

- Types and IDs use the `TL` prefix (`TLShape`, `TLShapeId`).
- Shape utilities end in `ShapeUtil` and binding utilities end in `BindingUtil`.
- Tools and states use descriptive `StateNode` names.

## Method patterns

Editor APIs follow consistent verbs:

```typescript
editor.getShape(id)
editor.setCurrentTool('draw')
editor.createShape({ type: 'geo', x: 0, y: 0, props: {} })
editor.updateShape({ id, props: { color: 'red' } })
```

## Signals

Signal variables are often prefixed with `$` to indicate reactivity.

## Key files

- packages/editor/src/lib/editor/Editor.ts - Editor API surface
- packages/tlschema/src/records/ - Record naming

## Related

- [Glossary](./glossary.md)
- [Reactive state](../architecture/reactive-state.md)
