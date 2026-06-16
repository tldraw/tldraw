---
title: Doc editor
component: ./DocEditorExample.tsx
category: use-cases
priority: 2
keywords:
  [
    doc,
    docx,
    word,
    document,
    annotation,
    mammoth,
    custom shape,
    export,
    pdf,
    toSvg,
    camera constraints,
  ]
---

Upload a Word (.docx) document, annotate it, and export the result.

---

This is a document annotator built with tldraw, in the same spirit as the PDF editor example. It converts an uploaded `.docx` file to HTML with [mammoth](https://github.com/mwilliamson/mammoth.js), renders that HTML as a locked background "page" using a custom shape, and lets you draw, type, and add shapes on top.

A few things worth highlighting:

- The document is a custom shape whose `component` renders the converted HTML. It implements `toSvg` so the document shows up in exports — a custom shape that renders HTML exports as an empty box without it. The `toSvg` output wraps the HTML in a `<foreignObject>` with the `tl-export-embed-styles` class so tldraw inlines the page's styles and images during export.
- `cameraOptions` constraints keep the camera focused on the page, and an overlay dims the area around it.
- Export flattens the page and its annotations into an image with `editor.toImage`, then places it onto a PDF page with `pdf-lib`.

Only the modern `.docx` format is supported; the older binary `.doc` format can't be parsed in the browser, so convert those to `.docx` first. Pagination is simplified to a single continuous page rather than fixed pages.
