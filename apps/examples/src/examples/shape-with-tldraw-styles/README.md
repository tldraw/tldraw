---
title: Using tldraw styles
component: ./ShapeWithTldrawStylesExample.tsx
category: shapes/tools
priority: 1
---

Using the tldraw style panel with your custom shapes

---

The default tldraw UI will display UI for the styles of your selection or your current tool. For example, when you have two shapes selected that both have the tldraw's "size" style, the size selector will be displayed. If all of your selected shapes have the same value for this style, that value will be shown as selected in the panel. If they have different values, the panel will show the value as "mixed".

You can use tldraw's Styles API to create your own styles that behave in the same way, though you'll also need to create a custom UI for your style.

Alternatively, you can use tldraw's default styles in your own shapes. This example shows how to do that.
