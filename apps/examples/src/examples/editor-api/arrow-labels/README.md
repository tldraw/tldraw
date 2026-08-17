---
title: Arrow labels
component: ./ArrowLabelsExample.tsx
priority: 2
keywords:
  [
    arrow,
    label,
    richText,
    toRichText,
    labelPosition,
    labelColor,
    font,
    annotation,
    text,
    bend,
    curved,
  ]
---

Create arrows with text labels and control their position, color, and font.

---

Arrow labels live in the arrow shape's `richText` prop; pass `toRichText('...')` when creating the shape. The example lays out a grid of arrows showing `labelPosition` (a fraction from 0 at the start to 1 at the end), `labelColor` (independent of the arrow's `color`), each `font` option, and a label on a curved arrow made with `bend`.

Try selecting an arrow and dragging its label along the arrow, or double-click a label to edit the text.
