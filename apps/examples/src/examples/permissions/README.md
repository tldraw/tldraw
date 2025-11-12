---
title: Permissions
component: ./PermissionsExample.tsx
category: events
priority: 5
keywords: [constraints, bounds, side effects, permissions, clamping]
---

Use side effect APIs to constrain shape movement within a bounding box.

---

This example demonstrates how to use tldraw's side effect APIs to enforce permissions or
constraints on shapes. Try dragging the rectangle around - its movement is constrained to
stay within the dashed container using the `registerBeforeChangeHandler` side effect.
This pattern is useful for implementing permission systems, bounded regions, or any scenario
where you need to restrict where shapes can be positioned.
