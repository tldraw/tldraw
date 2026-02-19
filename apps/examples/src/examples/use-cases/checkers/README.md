---
title: Permissions spike — checkers
component: ./CheckersExample.tsx
priority: 1
keywords:
  [
    permissions,
    spike,
    multiplayer,
    collaboration,
    custom shape,
    side effects,
    turn-based,
    ownership,
    king,
    TLPermissionsPlugin,
  ]
multiplayer: true
---

A two-player checkers game that spikes ownership + turn-based permissions.

---

This example is a **permissions spike** — a proof-of-concept for how granular, per-user shape permissions could be integrated into the tldraw SDK.

Two players share the same canvas in real time. The SDK enforces the following rules:

- Players may only **move or delete their own pieces** — not the opponent's.
- Players can only act on **their turn** (enforced via a turn ref that the rules read at call time).
- The board itself is **immutable** — no player can select, move, or delete it.
- Double-clicking your own piece on your turn opens an **inline editor** to label it "King" (king promotion).

The core abstraction is `TLPermissionsPlugin` (shared with the tic-tac-toe example), which installs store side-effects to enforce rules at the data layer.
