---
title: Plain text shapes
component: ./PlainTextShapesExample.tsx
category: shapes/tools
priority: 500
keywords: [plain, text, custom, shapes, label, textarea]
---

Custom shapes with plain text editing support.

---

This example demonstrates how to create custom shapes with plain text editing capabilities using PlainTextLabel, PlainTextArea, and useEditablePlainText. These components provide a simpler alternative to rich text when you only need basic text input and display.

The example includes:
- A custom note shape that uses plain text
- A custom label shape for simple text labels
- Plain text components recreated from the tldraw v3 source
- Text editing with keyboard shortcuts and focus management

These plain text utilities were removed from the main tldraw package in v4.0, but you can use this example as a starting point for implementing plain text functionality in your own custom shapes.