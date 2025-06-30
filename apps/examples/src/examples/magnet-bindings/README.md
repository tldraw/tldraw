---
title: Magnet bindings
component: ./MagnetExample.tsx
category: shapes/tools
keywords: [bindings, attach, magnet, stick, follow]
priority: 11
---

Magnet shapes that stick to other shapes and follow them around using custom bindings.

---

This example demonstrates how to create custom bindings by implementing a "magnet" system. Magnet shapes will stick to other shapes when dropped on them and automatically follow when the target shape is moved, rotated, or resized. When the target shape is deleted, the magnet is deleted too.

The example shows:

- **Custom binding type definition** with anchor points and offsets
- **Complete BindingUtil implementation** with lifecycle methods
- **Coordinate transformations** between different spaces (page, shape, parent)
- **Binding creation and cleanup** when shapes are moved or deleted
- **Integration patterns** for combining custom shapes with custom bindings