---
title: Locked shapes
component: ./LockedShapesExample.tsx
priority: 3
keywords:
  [
    lock,
    unlock,
    locked,
    islocked,
    ignoreshapelock,
    template,
    background,
    togglelock,
    editor.run,
    programmatic,
    read-only,
  ]
related: [readonly, permissions, permissions-2, prevent-shape-change, api]
---

Lock shapes to prevent user editing, and use `ignoreShapeLock` to modify them programmatically.

---

- **Locked template** — The blue shapes are locked on mount. Try dragging them!
- **Scatter/Reset** — Uses `editor.run({ ignoreShapeLock: true })` to move locked shapes
