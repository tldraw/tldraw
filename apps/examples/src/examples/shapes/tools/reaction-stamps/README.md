---
title: Reaction stamps
component: ./ReactionStampsExample.tsx
category: shapes/tools
priority: 10
keywords: [reactions, emoji, stamp, custom shape, style prop, meta]
---

Stamp emoji reactions on the canvas with a custom shape and tool.

---

A reaction is a custom shape: it zooms with the canvas, participates in z-order, and can
be selected, moved, and resized like any other shape. The stamp tool stays active so you
can click to place several reactions in a row, and the emoji is a custom style prop — the
style panel shows the emoji options while the tool is active, exactly like color for the
draw tool. Each stamp records who placed it in the shape's meta.
