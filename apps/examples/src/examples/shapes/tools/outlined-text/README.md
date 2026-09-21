---
title: Outlined text
component: ./OutlinedTextExample.tsx
priority: 21
keywords:
  [
    tiptap,
    text styling,
    text stroke,
    custom extension,
    rich text toolbar,
    mark,
    css styling,
    text effects,
  ]
---

Add an outlined text style with a custom TipTap mark and toolbar button.

---

The `Outline` mark wraps selected text in a `<span class="outlined">`, and a few lines of CSS (`-webkit-text-stroke`) draw the outline. The mark is passed to the text editor through `options.text.tipTapConfig.extensions`, and a custom `RichTextToolbar` component adds a button that runs the mark's `toggleOutline` command.

Try creating a text shape, selecting some text, and clicking the ⬜ button in the toolbar. See the "Rich text with custom extension and toolbar" example for the same pattern with a wavy underline.
