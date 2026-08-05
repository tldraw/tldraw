---
title: Comment brand gallery
component: ./CommentBrandGalleryExample.tsx
priority: 10
keywords:
  [comments, commenting, styling, theming, branding, custom styles, css tokens, restyle, png]
---

Style the commenting UI to look like eighteen different products, from one set of components.

---

Comments in tldraw don't come with a fixed look. Every pin, thread panel, composer, and reaction pill the commenting UI draws is a `tlui-cmt-*` class driven by CSS tokens, so the same components can pass for a dark keyboard-first SaaS tool, a newspaper, a drafting table, or an 8-bit arcade. This example renders one conversation in eighteen such styles to show the range.

A style here is mostly data: a map of custom properties (see `themes.ts`) that redefines the panel color, text colors, radii, and shadows, plus a handful of `--brand-*` tokens for fonts, borders, gradients, and pin shapes. Because it's all CSS, one theme applies equally to the standalone presentational components and to the live canvas layer.

The gallery view shows every style side by side — each tile is a working mockup whose copy, names, and reactions you can edit before exporting it as a transparent-background PNG. The live canvas view is the full commenting experience with the same styles: place comments, reply, react, mention anyone, and switch looks while a thread is open.
