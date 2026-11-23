---
title: Permissions on the client only
component: ./PermissionsClientOnlyExample.tsx
priority: 20
keywords: [permissions, capabilities, checkDiff, owner, read only]
---

Let each user change only the shapes they created, with a diff check and capability checks and no server.

---

The diff check, `checkDiff`, runs on every operation. It rejects an operation that changes or deletes a shape that another user owns, and the editor reverts the whole operation and emits `'rejected'`.

The capability checks tell the UI what the user can do before they try. Select a shape that another user owns: the default UI shows no handles, disables the style panel and the delete action, and does not start a drag. `checkCapability('edit-shape')` reads the selection, so it changes when the selection changes.

Without a server, nothing stops a user who changes the code in their browser. Run the same `checkDiff` in your room to enforce it.
