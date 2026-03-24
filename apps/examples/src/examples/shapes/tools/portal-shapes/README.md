---
title: Portal shapes
component: ./PortalShapesExample.tsx
category: shapes/tools
priority: 6
keywords: [frame, portal, isFrameLike, reparent, drag]
---

Custom frame-like shapes that teleport children between each other, inspired by Portal.

---

This example shows how to use `isFrameLike` to create custom shapes that behave like frames — they accept children via drag-and-drop and clip their contents. Two portal shapes (blue and orange) are linked: dragging a shape into one teleports it into the other.
