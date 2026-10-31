---
title: Logo turtle graphics
component: ./LogoTurtleExample.tsx
keywords: [logo, turtle, programming, interpreter, education, overlay, line shape, jslogo]
priority: 11
---

A Logo interpreter whose turtle draws tldraw shapes.

---

Write Logo in the panel and press Run (or Cmd/Ctrl+Enter) to set the turtle loose on the canvas. The example programs come from [jslogo](https://www.calormen.com/jslogo/), and the interpreter covers the common core of the language: procedures with optional inputs, dynamic scope, recursion, `repeat`, `for`, `foreach`, `if`/`ifelse`, list and word operations, multiple turtles, and labels.

The turtle and the stroke it's in the middle of drawing are rendered by an `OverlayUtil`, so animation doesn't flood the store with updates. Each finished stroke becomes a line shape and each label becomes a text shape, snapped to the nearest color in tldraw's palette. Once a program finishes, everything it drew can be selected, restyled, and moved, and a single undo removes the whole run.
