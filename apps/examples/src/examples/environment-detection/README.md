---
title: Environment detection with tlenv and tlenvReactive
component: ./EnvironmentDetectionExample.tsx
category: configuration
priority: 2
keywords:
  [
    tlenv,
    tlenvreactive,
    platform detection,
    browser,
    iscoarsepointer,
    touch,
    mobile,
    adaptive ui,
    usevalue,
  ]
---

Detect platform, browser, and input device type.

---

This example demonstrates tldraw's environment detection APIs for building platform-aware and device-adaptive interfaces:

**Static detection (tlenv):**

- Platform detection (macOS, Windows, iOS, Android)
- Browser detection (Safari, Firefox, Chrome)
- Platform-specific keyboard shortcuts (Cmd vs Ctrl)

**Reactive detection (tlenvReactive with useValue):**

- Pointer type detection (coarse/fine) - can change mid-session on hybrid devices
- Real-time updates when switching between touch and mouse input

The example shows practical usage like adapting button sizes based on pointer type - larger touch targets (48px) for coarse pointers (touch) and smaller targets (32px) for fine pointers (mouse/trackpad).

Use `tlenv` for static properties that don't change during the session, and `tlenvReactive` with the `useValue` hook for properties that can change reactively, especially `isCoarsePointer` on touchscreen laptops.
