---
title: Rich text with custom extension and toolbar
component: ./RichTextCustomExtension.tsx
priority: 20
keywords:
  [
    tiptap,
    rich text,
    custom extension,
    text editor,
    mark,
    toolbar button,
    textoptions,
    wavy text,
    text effects,
    defaultrichtexttoolbar,
  ]
---

Add a custom TipTap mark and a toolbar button that toggles it.

---

tldraw's rich text is built on TipTap, so you can extend it with any TipTap extension. This example adds a `wavy` mark that renders a wavy underline, passes it in through `options.text.tipTapConfig.extensions` (spread `tipTapDefaultExtensions` first so tldraw's defaults stay in place), and overrides the `RichTextToolbar` component to add a button that runs the mark's `toggleWavy` command.

Try creating a text shape, selecting some text, and clicking the 〰️ button in the toolbar.
