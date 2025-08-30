---
title: Custom Color Picker
component: ./CustomColorPickerExample.tsx
category: ui
priority: 1
keywords: [colors, styles, picker, custom, palette, color picker]
---

Replace the default color enum picker with a native HTML color picker that allows any color.

---

This example demonstrates how to create a custom ColorStyleUtil that accepts arbitrary hex colors instead of being limited to the default color enumeration. It shows how to:

- Create a custom ColorStyleUtil that works with hex colors
- Replace the default color picker UI with a native HTML color input
- Integrate the custom color system with tldraw's shape utilities

The custom implementation allows users to pick any color using their browser's native color picker, giving complete freedom over color choices while maintaining compatibility with all existing shape types.
