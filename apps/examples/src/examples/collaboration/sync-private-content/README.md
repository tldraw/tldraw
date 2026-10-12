---
title: Multiplayer sync with private content
component: ./SyncPrivateContentExample.tsx
priority: 4
keywords:
  [
    multiplayer,
    sync,
    private,
    visibility,
    getShapeVisibility,
    permissions,
    ownership,
    meta,
    side effects,
    registerBeforeCreateHandler,
  ]
multiplayer: true
---

Hide shapes from other users in a multiplayer session with `getShapeVisibility` and shape meta.

---

A store side effect stamps every new shape with the creator's id and a `private` flag, and `getShapeVisibility` hides shapes whose flag is set unless you own them. The shapes still sync; they're just not rendered for anyone else. Selecting your own private shapes offers to make them public.

Open the example in two tabs, turn on private mode in one, and draw. Note this is client-side visibility only, not access control: a private shape is still in every client's store.
