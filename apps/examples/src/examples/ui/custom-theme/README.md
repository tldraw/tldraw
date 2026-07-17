---
title: Custom theme
component: ./CustomThemeExample.tsx
priority: 0.6
keywords: [theme, brand, custom, colors, dark mode, light mode, palette]
---

Register a custom named theme and switch between themes.

---

You can register themes beyond `light` and `dark` by passing a `themes` prop with additional entries. Use the `initialTheme` prop to set the initial theme; switch at runtime via `editor.setCurrentTheme()`. This example adds a "my-brand" theme with custom colors and provides buttons to switch between all three themes.
