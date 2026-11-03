---
title: Shape previews
component: ./ShapePreviewsExample.tsx
priority: 4
keywords: [preview, thumbnail, toPreviewSvg, PreviewCard, PreviewImage, svg export, theme]
---

Control how a custom shape looks in a preview export, a stored thumbnail that follows the viewer's theme.

---

`editor.getSvgString(ids, { preview: true })` exports a preview: colours become CSS variables, so the preview follows the theme of whoever views it, and fonts aren't embedded. Shapes are drawn the way a normal export draws them unless their shape util has `toPreviewSvg`.

The clock in this example shows live HTML, which a stored preview can't hold, so its `toPreviewSvg` returns a `PreviewCard` instead. The panel in the top right shows the page's preview: switch between light and dark mode and it follows.
