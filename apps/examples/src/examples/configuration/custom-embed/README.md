---
title: Custom embeds
component: ./CustomEmbedExample.tsx
priority: 2
keywords:
  [
    embed,
    iframe,
    CustomEmbedDefinition,
    DEFAULT_EMBED_DEFINITIONS,
    toEmbedUrl,
    fromEmbedUrl,
    jsfiddle,
    url parsing,
  ]
---

Add a custom embed provider and remove some of the built-in ones.

---

tldraw recognizes URLs from many services out of the box and turns them into embed shapes. This example configures `EmbedShapeUtil` with its own list of `embedDefinitions`: two of the defaults (tldraw and YouTube) plus a new `CustomEmbedDefinition` for JSFiddle.

A definition pairs `hostnames` with `toEmbedUrl` and `fromEmbedUrl` functions that convert between the page URL and the iframe URL. Custom definitions also need an `icon`, which shows in the embed dialog.

Try clicking "Insert embed" in the top panel: only tldraw, YouTube, and JSFiddle are listed. Pasting a JSFiddle URL like `https://jsfiddle.net/user/abc123/1/embedded/` onto the canvas also creates an embed.

For sandbox permissions and other per-definition options, see the embed permissions example.
