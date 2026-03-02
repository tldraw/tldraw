---
title: 3D portals
component: ./ThreeDPortalsExample.tsx
category: use-cases
priority: 6
keywords: [3d, portal, depth, spatial, drag-and-drop, perspective]
---

Flat 2D shapes as spatial shortcuts into a 3D scene — drag objects into portals to place them at specific depths.

---

Draw a rectangle (or any geo shape) to create a portal. The shape's color determines its depth in 3D space: blue is nearest, green is mid-range, red is farthest. Create smaller shapes and drag them into a portal — the object spirals through and appears floating at that depth. The 3D effect comes from perspective scaling, ambient depth particles, and gentle drift animations.
