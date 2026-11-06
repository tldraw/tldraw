---
title: Sync permissions
component: ./SyncPermissionsExample.tsx
priority: 5
keywords:
  [
    multiplayer,
    sync,
    permissions,
    access control,
    canWrite,
    canRead,
    beforeWrite,
    beforeRead,
    writeRejection,
    objectAccess,
    isReadonly,
    TLSocketRoom,
  ]
multiplayer: true
---

Sixteen permission use cases, each solved with the sync server's public primitives, with two or three users side by side.

---

The example runs a real `TLSocketRoom` in the browser. Only the WebSocket between the room and each editor is fake. Each editor connects as a different user with its own session.

The policy for each use case is a small access layer in app code (`access.ts`):

- What a user gets at connect time: `isReadonly`, `objectAccess`, and `meta` in `handleSocketConnect`. A change to these closes the user's session, so the client reconnects with the new options.
- Who may write what: `canWrite`, with a rule that returns `true` or the reason for a denial. The same rules run in each client as store side-effect vetoes, so a user isn't shown an edit that the server would undo. Turn off "Client checks" to see the server undo it.
- Who may see what: `canRead`, and `beforeRead` hooks for masked or replaced copies.
- Stamping and auditing: `beforeWrite` hooks, combined with `composeBeforeWrite`.
- What a rejection takes with it: `writeRejection`.

Each scene says what to try, what you should see, and where the primitives fall short. Open a scene directly with `?scene=<id>`, for example `?scene=poker`.
