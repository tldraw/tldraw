---
title: Change default styles
component: ./ChangingDefaultStyleExample.tsx
priority: 0.5
keywords: [styles, default style, style props, size, color, dash, fill, setdefaultvalue]
---

Change the default value of a style prop with `setDefaultValue`.

---

Every style prop has a built-in default value: new shapes use `m` for size, `black` for color, and so on. Call `setDefaultValue` on the style prop to change it. In this example the size style defaults to `s`, so newly created shapes are small.

Call `setDefaultValue` at module level, before any editor is created, so the change applies everywhere the style is used.
