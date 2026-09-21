---
title: Easter egg styles
component: ./EasterEggStylesExample.tsx
priority: 5
keywords:
  [easter egg, white, color, fill, lined-fill, label, scale, hidden styles, keyboard shortcuts]
---

Set style values that are hidden or hard to find in the default style panel.

---

Several style values are valid on shapes but are not prominent in the default UI. Some have keyboard shortcuts; all can be set through the shape's props:

- **White** color (`Alt+T`), which the color picker leaves out
- **Fill** (`Alt+F`), a solid fill in the shape's full color, and **lined fill** (`Alt+Shift+F`), a slightly lighter solid variant, both in the fill picker's overflow dropdown
- **Label color**, a separate color for a shape's label text, with no picker at all
- **Scale**, a multiplier for stroke width and text size that the "Dynamic size" preference sets automatically

The example creates one shape for each. Try selecting a shape and pressing the shortcuts to see the styles change.
