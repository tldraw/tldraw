---
title: Inset editor (fixed sizes)
component: ./InlineExample.tsx
priority: 0
keywords: [inline, embedded, fixed size, width, height, responsive, multiple editors]
---

See how the default UI adapts when the `Tldraw` component is given a fixed width and height.

---

The `Tldraw` component fills whatever container it's placed in. This example renders the same document (via a shared `persistenceKey`) in five containers of different fixed sizes, so you can see how the default toolbar, menus, and panels rearrange themselves as the available space shrinks.

For guidance on focus handling and UI trimming when embedding several editors in a page, see the [Inset editor (common practices)](https://tldraw.dev/examples/inline-behavior) example.
