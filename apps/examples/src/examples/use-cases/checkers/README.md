---
title: Permissions — checkers
component: ./CheckersExample.tsx
priority: 1
keywords:
  [
    permissions,
    multiplayer,
    collaboration,
    custom shape,
    side effects,
    turn-based,
    ownership,
    king,
    TLPermissionsManager,
  ]
multiplayer: true
---

A two-player checkers game demonstrating ownership + turn-based permissions.

---

Two players share the same canvas in real time. `TLPermissionsManager` enforces the following rules:

- Players may only **move or delete their own pieces** — not the opponent's.
- Players can only act on **their turn** (enforced via a turn ref that the rules read at call time).
- The board itself is **immutable** — no player can select, move, or delete it.
- Double-clicking your own piece on your turn opens an **inline editor** to label it "King" (king promotion).

Turn-based enforcement is implemented via the `onBeforeAction` lifecycle hook, keeping the declarative rules focused on ownership and board immutability.
