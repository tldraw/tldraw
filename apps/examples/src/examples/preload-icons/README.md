---
title: Preload icons
component: ./PreloadIconsExample.tsx
category: basic
---

You can ask the browser to preload icons before showing the editor.

---

The tldraw library relies on many icons. Like all images, these normally aren't loaded until they appear on screen. The `Tldraw` component "soft loads" all of these icons when the editor first mounts, ensuring that icons in menus don't "pop in" later when the menu first opens.

If you want to avoid _all_ icon pop-in and have the browser preload all icons (even if they haven't appeared on the screen yet), you can use the approach in this example.
