---
title: Easter egg styles
component: ./EasterEggStylesExample.tsx
category: editor-api
priority: 5
keywords:
  [easter egg, white color, fill, lined-fill, labelcolor, scale, hidden styles, keyboard shortcuts]
---

Use tldraw's collection of easter egg styles programmatically.

---

tldraw includes several "easter egg" styles that aren't visible in the default UI but can be accessed through keyboard shortcuts or set programmatically. These styles include:

- **White** (`Option+T`): A white color option for shapes
- **Fill** (`Option+F`) - An alternative solid fill variant
- **Lined fill** (`Option+Shift+F`) - A lined fill pattern variant
- **Label color** - A separate color property for text labels on shapes, independent from the shape's main color
- **Scale** - A scale property for shapes, independent from the shape's size, available via the **Dynamic size** preference

This example programmatically creates shapes demonstrating each of these easter egg styles. While these styles aren't publicly exposed in the default UI, they can be useful for specific use cases or when you need more control over styling.
