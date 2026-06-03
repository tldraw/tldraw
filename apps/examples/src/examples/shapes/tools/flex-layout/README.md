---
title: Flex layout shape
component: ./FlexLayoutExample.tsx
category: shapes/tools
priority: 2
keywords: [custom shape, flexbox, layout, frame, children, BaseFrameLikeShapeUtil]
---

A custom frame-like shape that lays out children with CSS flexbox.

---

This example shows a custom shape that can contain child shapes and arrange them with the browser's flexbox layout engine. The only editable layout option is the direction: horizontal or vertical.

The layout shape grows and shrinks to fit its children. Because it extends `BaseFrameLikeShapeUtil`, dragging a shape over the layout reparents it into the layout while it is hovering, just like a frame. On pointer-up, the example finalizes the child order, resizes the layout, and positions every child according to the current flex direction.

Dragging an existing child out of the layout shows an exit line. If the child is dropped over empty page space, it is reparented back to the page and the layout resizes around its remaining children.
