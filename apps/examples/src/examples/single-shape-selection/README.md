---
title: Single Shape Selection
component: ./SingleShapeSelectionExample.tsx
category: editor-api
priority: 0
keywords: [selection, editor, instance, state]
---

Prevent selection of multiple shapes in tldraw.

---

You can prevent multiple shape selection by registering a before-change handler for the `instance_page_state` type. This handler intercepts selection changes and ensures only one shape can be selected at a time.
