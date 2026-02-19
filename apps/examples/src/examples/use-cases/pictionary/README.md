---
title: Permissions spike — Pictionary
component: ./PictionaryExample.tsx
priority: 2
keywords:
  [
    permissions,
    spike,
    multiplayer,
    collaboration,
    custom shape,
    side effects,
    role-based,
    viewer,
    secret,
    TLPermissionsPlugin,
  ]
multiplayer: true
---

A three-player Pictionary game that spikes role-based and viewer-dependent permissions.

---

This example is a **permissions spike** — a proof-of-concept for how granular, per-user shape permissions could be integrated into the tldraw SDK.

Three players share the same canvas in real time. One player is the **drawer**; the others are **guessers**. The SDK enforces:

- The **drawer** has full drawing permissions — they can create, move, and delete their own shapes.
- **Guessers** have zero permissions — they can only pan the canvas (hand tool); any shapes they attempt to create are immediately removed.
- The **word card** is visible only to the drawer — it renders `null` for guessers, making it completely invisible to them.
- The word card is **immutable** during a round — even the drawer cannot edit it through normal user actions. The host updates it via `mergeRemoteChanges` between rounds.

The word card's per-viewer rendering demonstrates how a single shape can present different content to different users based on their role, using a React context (`PictionaryCtx`) that is updated per panel.
