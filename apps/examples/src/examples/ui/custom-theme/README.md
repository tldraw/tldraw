---
title: Custom theme
component: ./CustomThemeExample.tsx
priority: 0.6
keywords: [theme, brand, custom, colors, fonts, dark mode, light mode, palette, updatetheme]
---

Add custom colors and fonts to the theme, remove built-in ones, and adjust theme values at runtime.

---

Pass a `themes` prop to `<Tldraw>` to replace the default theme. This example adds a "pink" color and two custom fonts (a bundled pixel font and a remote Google Font), removes the "light-\*" colors and the serif font, and adds translations so the style panel shows readable names. Custom color and font names are declared to TypeScript via module augmentation of `TLThemeDefaultColors`, `TLThemeFonts`, and `TLRemovedDefaultThemeColors`.

The sliders in the bottom right change the theme's `fontSize`, `lineHeight`, and `strokeWidth` at runtime with `editor.updateTheme()`. Draw some shapes and drag the stroke width slider to see them update. To register additional named themes and switch between them, see the multiple themes example.
