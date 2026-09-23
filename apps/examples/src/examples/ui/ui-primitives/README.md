---
title: UI primitives
component: ./UiPrimitivesExample.tsx
priority: 1
keywords: [button, dropdown, select, input, slider, popover, icon, tooltip, menu, ui]
---

Tour the UI primitives tldraw exports for building panels, menus, and dialogs that match its look.

---

Everything in tldraw's default UI is built from a small set of exported primitives, and you can use the same ones in your own components. This example renders them all in an `OnTheCanvas` panel so you can zoom in and inspect them:

- `TldrawUiButton` with `TldrawUiButtonLabel` and `TldrawUiButtonIcon`, in its normal, primary, danger, icon, and menu types
- `TldrawUiDropdownMenu*` for menus with groups, checkbox items, and submenus
- `TldrawUiSelect*` for a select control, with and without item icons
- `TldrawUiInput` and `TldrawUiSlider`
- `TldrawUiPopover*` for floating content
- `TldrawUiIcon` for every icon in `iconTypes`
- `TldrawUiTooltip` and `TldrawUiKbd`

The primitives read tldraw's UI context and CSS variables, so they must be rendered inside `<Tldraw />` (in a `components` slot or as children) and they follow the editor's light or dark mode automatically.
