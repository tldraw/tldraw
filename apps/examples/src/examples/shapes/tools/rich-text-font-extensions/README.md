---
title: Rich text with font options
component: ./RichTextFontExtension.tsx
priority: 20
keywords:
  [
    tiptap,
    rich text,
    font family,
    font size,
    text editor,
    custom fonts,
    textoptions,
    google fonts,
    fontface,
    addfontsfromnode,
    typography,
  ]
---

Add font family and font size selects to the rich text toolbar.

---

tldraw's rich text is built on TipTap, so it can use TipTap's `FontFamily` and `TextStyleKit` extensions plus a small custom `FontSize` extension. The extensions are passed through `options.text.tipTapConfig.extensions`, and a custom `RichTextToolbar` component adds two selects that run `setFontFamily` and `setFontSize`.

Fonts that aren't already on the page (Inter and Exo 2 from Google Fonts here) need two extra pieces: `options.text.addFontsFromNode` tells tldraw which `TLFontFace` a piece of text uses so it can load the font and embed it in exports, and `editor.fonts.requestFonts()` on mount preloads them so switching families doesn't flash.

Try creating a text shape, selecting some text, and picking a font or size from the toolbar.
