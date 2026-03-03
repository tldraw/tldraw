---
title: Shape with attribution
component: ./ShapeWithAttributionExample.tsx
priority: 8
keywords: [attribution, tlmeta, createdBy, updatedBy, custom shape, identity]
---

A custom shape that displays who created and last edited it.

---

Every shape in tldraw has a `tlmeta` field containing attribution metadata: `createdBy`, `updatedBy`, `createdAt`, and `updatedAt`. This example creates a custom sticky-note-style shape that renders this attribution data directly in the shape body.

Use `editor.getAttributionDisplayName(userId)` inside your `ShapeUtil.component` to resolve user IDs into display names.

