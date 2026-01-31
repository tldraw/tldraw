---
title: Reduced motion preferences
component: ./ReducedMotionExample.tsx
category: configuration
priority: 1
keywords:
  [
    accessibility,
    a11y,
    reduced motion,
    animation,
    prefers-reduced-motion,
    useprefersreducedmotion,
    animationspeed,
    user preferences,
    custom shape,
    css animation,
    vestibular,
  ]
---

Respecting user motion preferences in custom shapes.

---

This example demonstrates how to build custom shapes that respect the user's reduced motion preferences using the `usePrefersReducedMotion()` hook.

The hook checks both the user's tldraw preference (`animationSpeed: 0`) and the OS-level `prefers-reduced-motion` setting. When reduced motion is preferred, animations are replaced with static alternatives.

The example includes:

- A custom shape with animated and static variants
- A toggle button to switch between animation modes
- CSS animations controlled by the motion preference

This is particularly important for accessibility, ensuring users with vestibular disorders or motion sensitivities can use your application comfortably.
