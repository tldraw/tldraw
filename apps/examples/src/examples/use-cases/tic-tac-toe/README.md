---
title: Permissions — tic-tac-toe
component: ./TicTacToeExample.tsx
priority: 0
keywords:
  [
    permissions,
    multiplayer,
    collaboration,
    custom shape,
    side effects,
    read-only,
    enterprise,
    security,
    TLPermissionsManager,
  ]
multiplayer: true
---

A two-player tic-tac-toe game demonstrating per-user, per-shape permissions.

---

Two players share the same canvas in real time. `TLPermissionsManager` enforces the following rules for each player:

- **Player X** may only create `ttt-xbox` (✕) shapes.
- **Player O** may only create `ttt-ocircle` (○) shapes.
- Players may **move or delete their own pieces** but cannot resize, rotate, or otherwise edit them.
- Players **cannot interact with the opponent's pieces** — selecting, moving, or deleting them is blocked.
- Players **cannot touch the board** (the four `ttt-board-line` shapes that form the grid).

The core abstraction is `TLPermissionsManager`, a centralized permissions system with declarative rules, lifecycle hooks, and convenience methods for UI integration.

See `../permissions/TLPermissionsManager.ts` for the full design, including core activities, visibility permissions, and server-side enforcement via `createServerPermissionsFilter`.
