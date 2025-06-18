---
title: Prevent multi-shape selection
component: ./PreventMultiShapeSelectionExample.tsx
category: events
priority: 3
keywords: [selection, editor, instance, state]
---

This example demonstrates how to prevent users from selecting multiple shapes at once in tldraw.

---

You can prevent multiple shape selection by registering a before-change handler for the `instance_page_state` type. This handler intercepts selection changes and ensures only one shape can be selected at a time.
