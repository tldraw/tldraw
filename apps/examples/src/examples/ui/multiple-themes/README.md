---
title: Multiple themes
component: ./MultipleThemesExample.tsx
priority: 0.6
keywords: [theme, themes, brand, custom, module augmentation, TLThemes, switch, setcurrenttheme]
---

Register several named themes and switch between them at runtime.

---

Themes are keyed by id in the `TLThemes` interface. Augment that interface with your theme ids so `editor.setCurrentTheme()` is type-checked, build each theme by cloning `DEFAULT_THEME` and overriding the colors you care about, and pass them to `<Tldraw>` through the `themes` prop. Switch at runtime with `editor.setCurrentTheme(id)`; `editor.getCurrentThemeId()` is reactive.

Try clicking the theme buttons at the top left. The blue rectangle and violet note recolor because those palette entries differ between the themes.
