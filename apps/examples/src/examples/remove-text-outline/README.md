---
title: Remove text outline
component: ./RemoveTextOutlineExample.tsx
category: configuration
priority: 32
keywords: [css, text, outline, styles]
---

Remove the editor's default text outline by overriding the `--tl-text-outline` CSS variable.

---

Wrap the editor in a custom class and set `--tl-text-outline: none` inside the accompanying CSS file. Because the variable is inherited, every text shape you create renders without the white outline, which is useful for dark backgrounds or when you want the text color to stand on its own.


