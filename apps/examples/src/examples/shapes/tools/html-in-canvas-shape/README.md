---
title: HTML in canvas (experimental)
component: ./HtmlInCanvasShapeExample.tsx
priority: 10
keywords: [experimental, drawElementImage, canvas, html, export, layoutsubtree]
---

A custom shape rendered with the experimental `ctx.drawElementImage()` browser API, plus an opt-in export path that uses the same API to capture shapes to PNG.

---

This example explores the [HTML-in-Canvas](https://html-in-canvas.dev/) API: `<canvas layoutsubtree>` + `ctx.drawElementImage()` + the `paint` event. It rasterizes a live, styled, accessible HTML subtree into a `<canvas>` while the source elements still participate in layout and hit testing — so the button inside the shape stays clickable.

## Browser support

`drawElementImage()` is currently shipping in **Chrome 146+ / Brave Stable**, behind a flag:

- Open `chrome://flags/#canvas-draw-element` (or `brave://flags/#canvas-draw-element`).
- Set it to **Enabled** and relaunch.

Safari and Firefox do not implement the API today. The example detects support at runtime and falls back to rendering the styled HTML directly without `drawElementImage()`, so the demo is still visible.

## What this example demonstrates

- A custom shape util whose `component()` returns a `<canvas layoutsubtree>` wrapping rich HTML (gradient, emoji animation, interactive button). When supported, the rendered output you see is rasterized from HTML into the canvas every paint cycle.
- The button inside the shape is still clickable while in editing mode — `layoutsubtree` keeps the source DOM live for hit testing.
- An opt-in `exportShapesViaDrawElementImage(editor, shapeIds, options)` helper, exported from the editor, that captures all shapes on the page to PNG by cloning their live DOM into an offscreen `<canvas layoutsubtree>` and rasterizing it. The share panel exposes this side-by-side with the standard `editor.toImage()` path so the two outputs can be compared.

## Why this is interesting for tldraw

Two long-standing export limitations are bounded by what the `<foreignObject>` fallback can serialize:

- **Embed shapes** (`EmbedShapeUtil`) render iframes for YouTube, Figma, Gists, etc. They have no `toSvg()`, so PNG exports today produce a blank box.
- **Video shapes** export the first frame only — current playback state is lost.

`drawElementImage()` rasterizes the live DOM, which in principle solves both. In practice the most useful target — cross-origin iframes — cannot be rasterized at all because of the same-origin security model that already taints canvases when cross-origin content is drawn. So the real `EmbedShape` is **not** unlocked by this API today. Same-origin iframes, `<video>` elements, and custom HTML shapes are.

## Limitations of this experiment

- **Chromium-only**, behind a flag. Not usable in production.
- The export helper works only on shapes currently mounted in the DOM. tldraw culls off-screen shapes, so anything outside the viewport is skipped (and reported back to the caller). The standard `editor.toImage()` path does not have this limitation.
- The export helper ignores shape rotation. CSS transforms on cloned elements are not auto-applied by `drawElementImage()`; positions are computed manually and rotation handling is left for a future iteration.
- The export helper does not embed fonts. Cloned shape DOM relies on the editor's existing stylesheets to remain in scope, so the offscreen host is appended inside `editor.getContainer()`.
- Cross-origin iframes will rasterize as blank or be skipped by the API.

## Files

- `HtmlInCanvasShapeUtil.tsx` — the custom shape util with a feature-detected `<canvas layoutsubtree>` render path.
- `HtmlInCanvasShapeExample.tsx` — wires the shape into `<Tldraw>` and adds the share-panel export buttons.

The SDK helpers used here live at:

- `packages/editor/src/lib/exports/drawElementImageSupport.ts`
- `packages/editor/src/lib/exports/exportShapesViaDrawElementImage.ts`
