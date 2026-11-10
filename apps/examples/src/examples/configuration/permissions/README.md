---
title: Permissions
component: ./PermissionsExample.tsx
priority: 2
keywords:
  [
    permissions,
    can,
    canChangeRecord,
    policy,
    grant,
    roles,
    disable ui,
    create,
    update,
    delete,
    pages,
  ]
---

Give a user some permissions and not others, and have the editor and its UI follow.

---

The editor asks two questions. `can(permission)` is asked by the UI, by name, when it has no record to ask about: should the new page button be live? `canChangeRecord(change)` is asked inside editor methods like `createShapes` and `deletePage`, with the actual change. `createPermissionPolicy` from `@tldraw/permissions` answers both from one list of granted permissions, so they can't disagree.

The permissions are `tl:shape:create`, `tl:shape:update`, `tl:shape:delete`, `tl:page:create`, `tl:page:update` and `tl:page:delete`. A trailing `:*` covers a prefix, so `tl:shape:*` grants all three shape permissions.

Use the checkboxes to take permissions away. Controls the user can't use are disabled rather than hidden. The list here lives in an atom, so the UI updates as it changes. In an app it would usually come from a record the server syncs to the client, with the server refusing the same changes.

This only shapes the editor's behaviour. It doesn't enforce anything: a server has to do that.
