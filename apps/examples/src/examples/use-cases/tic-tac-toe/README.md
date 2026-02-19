---
title: Permissions spike — tic-tac-toe
component: ./TicTacToeExample.tsx
priority: 0
keywords:
  [
    permissions,
    spike,
    multiplayer,
    collaboration,
    custom shape,
    side effects,
    read-only,
    enterprise,
    security,
    TLPermissionsPlugin,
  ]
multiplayer: true
---

A two-player tic-tac-toe game that spikes per-user, per-shape permissions.

---

This example is a **permissions spike** — a proof-of-concept for how granular, per-user shape permissions could be integrated into the tldraw SDK.

Two players share the same canvas in real time. The SDK enforces the following rules for each player:

- **Player X** may only create `ttt-xbox` (✕) shapes.
- **Player O** may only create `ttt-ocircle` (○) shapes.
- Players may **move or delete their own pieces** but cannot resize, rotate, or otherwise edit them.
- Players **cannot interact with the opponent's pieces** — selecting, moving, or deleting them is blocked.
- Players **cannot touch the board** (the four `ttt-board-line` shapes that form the grid).

The core abstraction is `TLPermissionsPlugin`, a class that installs store side-effects to enforce rules at the data layer, and exposes helper methods so the UI can disable or hide unavailable actions.

See `TLPermissionsPlugin.ts` for the full design discussion, including known limitations and how this would extend to server-side enforcement in a sync architecture.
