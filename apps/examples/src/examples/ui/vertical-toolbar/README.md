---
title: Vertical toolbar
component: ./VerticalToolbarExample.tsx
keywords: [vertical toolbar, toolbar orientation, DefaultToolbar, components override, layout]
---

Move the toolbar from the bottom of the screen to a vertical strip on the left.

---

`DefaultToolbar` takes an `orientation` prop. Override the `Toolbar` slot with a component that renders `<DefaultToolbar orientation="vertical" />` and the toolbar, its groups, and its overflow menu all switch to a vertical layout. To also change which tools appear, pass children to `DefaultToolbar` (see the [toolbar groups](https://tldraw.dev/examples/toolbar-groups) example).
