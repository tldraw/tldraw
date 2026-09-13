---
title: Contextual style panel
component: ./ContextualStylePanelExample.tsx
priority: 2
keywords: [style panel, contextual toolbar, infrontofthecanvas, selection, floating ui, styles]
---

Replace the built-in style panel with style controls of your own.

---

The style panel is a component slot like any other. Switch off the built-in one and you can build your own style controls and put them wherever your app needs them.

This example moves them onto the canvas. The controls appear in a toolbar that floats above the selected shapes, within reach of what you're editing, instead of docked in the top right corner.

The toolbar shows only the styles that belong to what you've selected, so it's two controls wide for a highlighter and eight for an arrow. Nothing here checks the shape type: a shape supports a style when its props schema says so, and `editor.getSharedStyles()` returns the styles every selected shape has in common. Select a line and a text shape together and you're left with color and size.

The same rule covers custom shapes. Declare `color: DefaultColorStyle` in your shape's props and the color picker appears with no extra wiring.

The toolbar leaves out the opacity slider, which is the one control in the docked panel that isn't a style prop.
