---
title: Gravity sim (xkcd 2347)
component: ./XkcdDependencyExample.tsx
keywords: [physics, gravity, animation, fun, xkcd, rapier]
priority: 10
---

Rebuild the xkcd "Dependency" comic as geo shapes and drop it into a Rapier 2D physics simulation.

---

Each block in the comic is a geo shape with a matching Rapier rigid body. On every editor `tick` the world steps and awake bodies write their position and rotation back to their shapes with `editor.updateShapes`. Selected blocks become kinematic and follow the shape instead, so you can drag them; deleting a block removes its body and wakes the rest.

Try pulling out the red block near the bottom and watch everything collapse, just like in the [original comic](https://xkcd.com/2347/).
