---
title: Permissions 2
component: ./PermissionsExample2.tsx
category: events
priority: 5
keywords: [constraints, bounds, side effects, permissions, clamping]
---

A second example of how to use side effect APIs to constrain shape movement within a bounding box.

---

This example demonstrates how to use tldraw's side effect APIs to enforce permissions or
constraints on shapes. We create a rectangle that can be dragged around, but its movement
is constrained to stay within an invisible container using the `registerBeforeChangeHandler`
side effect. This pattern is useful for implementing permission systems, bounded regions,
or any scenario where you need to restrict where shapes can be positioned.
