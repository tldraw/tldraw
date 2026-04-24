---
title: Overlay theme colors
component: ./OverlayThemeColorsExample.tsx
priority: 3
keywords: [theme, overlay, brush, selection, snap, laser, color]
---

Restyle the brush, selection, snap lines, and laser with theme colors.

---

Canvas overlays read their colors from the active theme. Overriding `brushFill`, `brushStroke`, `selectionFill`, `selectionStroke`, `selectedContrast`, `snap`, and `laser` on the theme restyles every built-in overlay in one place — no subclassing needed. This example swaps all of them for a magenta palette.
