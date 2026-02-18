---
title: Hex color picker
component: ./HexColorPickerExample.tsx
category: ui
priority: 1
keywords: [color, hex, picker, style, override, palette, custom, props]
---

Replace the default color palette with a hex color picker.

---

This example demonstrates how to replace tldraw's default color palette with a custom hex color picker. Instead of storing colors using tldraw's predefined color styles, we store the actual hex value in `shape.props.$color` (a custom $ prop) and use `getShapeStyleOverrides` to apply it at render time.

Custom $ props (props prefixed with `$`) can be added to any shape without modifying the shape's schema. They're passed through validation automatically and provide a clean way to extend shapes with custom data.

This pattern is useful when you want to give users full control over colors rather than limiting them to a predefined palette.
