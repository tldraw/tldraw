---
title: Keyboard math input
component: ./KeyboardMathInputExample.tsx
category: shapes/tools
priority: 3
keywords:
  [
    custom shape,
    shapeutil,
    katex,
    math,
    latex,
    equation,
    shorthand,
    editing state,
    custom tool,
    toolbar,
    auto-size,
  ]
---

Type math equations with a plain keyboard, using a custom shape rendered with KaTeX.

---

This example adds a math equation shape that behaves like a text shape. Pick the math tool from the toolbar (or press M), click the canvas, and type shorthand: `1/2` becomes a fraction, `sqrt(2)` a radical, `x^2` a superscript, `pi` the symbol, and so on. A preview bubble above the shape renders the equation live as you type. Press Enter or Escape (or click away) and the equation renders in place of what you typed. Double-click any equation to edit its shorthand again.

The shape stores the shorthand exactly as typed. A small translator (`shorthand.ts`) rewrites it into LaTeX, which is rendered with [KaTeX](https://katex.org). Raw LaTeX commands pass through the translator untouched, so `\frac{a}{b}` works too.
