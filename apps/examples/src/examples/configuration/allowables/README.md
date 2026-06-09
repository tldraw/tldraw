---
title: Allowables
component: ./AllowablesExample.tsx
category: configuration
priority: 2
keywords:
  [
    permissions,
    allowables,
    allow,
    rules,
    roles,
    access control,
    protected shapes,
    view only,
    readonly,
  ]
---

Use allowables to control what a user may do in the editor.

---

The editor's `allow` manager holds named sets of rules, called allowables, that gate
what the user can do: `changeDocument`, `changeShape`, `deleteShape`, `switchPage`,
`undoRedo`, and more. Editor methods, tools, and the default UI all consult these
allowables, so adding a rule disables the matching menu items and shortcuts, makes
tools skip protected shapes, and blocks the editor methods themselves.

This example uses rules to model three roles. Editors can do anything. Commenters can
draw and edit, except for shapes marked as protected in their `meta`. Viewers cannot
change the document at all and are pinned to the first page.

Rules are advisory: they shape the local user experience, but they are not a security
boundary. In a multiplayer app, the server must enforce real permissions.
