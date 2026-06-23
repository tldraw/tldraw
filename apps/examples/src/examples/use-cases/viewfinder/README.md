---
title: Viewfinder
component: ./ViewfinderExample.tsx
category: use-cases
priority: 5
keywords: [game, camera, zoom, search, hidden object, where's wally]
---

A hidden-object game played entirely with the camera: pan and zoom to frame the one creature wearing a red cap inside the viewfinder.

---

The whole game is two rules. Every creature in the crowd wanders idly; one of them — Wally — flees from the centre of your screen once you get close. You win by framing Wally inside the fixed viewfinder while zoomed in far enough to resolve him.

Because everything is drawn at a fixed page size, zoom is literally resolving power: from far out the crowd is a field of identical specks, and only as you zoom in do the faces and Wally's tiny red cap become large enough to read. But zoomed in you can only see a handful of creatures at once — so the loop is the tension between searching wide and resolving close, while a shy target keeps slipping toward the edges of your view.

The crowd lives in page space and is drawn on a single `OverlayUtil` canvas layer that re-renders each tick. The viewfinder and HUD are plain screen-fixed DOM rendered as children of `<Tldraw>`. A headless component owns the simulation loop (`editor.on('tick', ...)`) and the win check, converting the screen-centre to a page-space focus point each frame.
