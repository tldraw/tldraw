---
title: Comment brand gallery
component: ./CommentBrandGalleryExample.tsx
priority: 10
keywords:
  [comments, commenting, theming, branding, custom styles, css, export, png, white label, gallery]
---

Restyle the commenting UI into eighteen different brands and export each as a transparent PNG.

---

Every piece of the commenting UI is a `tlui-cmt-*` class driven by tldraw's CSS tokens, which makes a brand mostly a token block: redefine the panel color, text colors, radii, and marker shadows under a `[data-comment-theme]` attribute and the pins, threads, composer, and reactions all follow. A few extra rules per brand cover fonts, borders, gradients, and pin shapes.

The gallery renders the same thread once per brand using the SDK's presentational components — no store or editor behind the tiles — and each tile is a working mockup: the copy and author names are editable in place (avatars update to match), and reaction pills toggle on click. Export any tile (or all of them) as a transparent-background PNG.

The live canvas tab is the real commenting experience with the same themes applied: place comments, reply, react, mention anyone by typing any name after `@`, and switch brands while a thread is open. The open thread exports too.
