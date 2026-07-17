---
title: Ligne claire world
component: ./LigneClaireWorldExample.tsx
keywords:
  [
    make real,
    3d,
    three.js,
    react three fiber,
    r3f,
    world,
    plan,
    footprint,
    extrude,
    ligne claire,
    reactive,
    derived,
  ]
priority: 3
---

Draw a top-down plan and watch it rise into a live ligne-claire 3D world.

---

The tldraw page is a floor plan: every geo shape you draw is a building footprint. The panel in the corner renders those footprints as an extruded, flat-shaded, black-lined 3D world — and because the world is a pure derived view of the canvas, moving, resizing, or recolouring a shape updates the world in place. Multiplayer and persistence come for free: only the shapes are state.

How it works:

- **getFootprints** reads every geo shape's live page-space outline via `getShapeGeometry` and `getShapePageTransform`. A rectangle becomes a rectangular building, an ellipse a round tower, a triangle a wedge.
- **World3d** builds one `THREE.ExtrudeGeometry` per footprint, tips it up so the outline lies on the ground, and shades it with `meshToonMaterial` plus a black `<Edges>` overlay for the ligne-claire linework.
- **WorldPanel** wraps the read in `useValue`, so the whole scene recomputes reactively whenever any shape changes — no manual subscriptions, no stored 3D state.

Tag a shape with `meta.storeys` to make it taller. Everything else about the world falls out of the 2D shapes on the canvas.
