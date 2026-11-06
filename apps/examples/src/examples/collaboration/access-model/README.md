---
title: Access model
component: ./AccessModelExample.tsx
category: collaboration
priority: 5
keywords:
  [
    permissions,
    access,
    readonly,
    sharing,
    roles,
    private,
    hidden,
    classroom,
    agents,
    comments,
    multiplayer,
    sync,
    TLSocketRoom,
  ]
multiplayer: true
---

One access model, enforced by the sync server and mirrored by the editor, for share links, classrooms, private pages, hidden cards, comments, and agents.

---

The example runs a `TLSocketRoom` in the page and connects one editor per person to it. Pick a scenario at the top, then act in each pane and watch the others.

An access model has resources (every record, in a tree: document, page, shape, child shape), verbs (`read`, `create`, `update`, `delete`, `comment`, `manage`, or your own), roles (named sets of verbs), and entries. An entry sits on one resource and allows, denies, or blocks verbs for a subject: anyone, a user, a group, or a relation such as "the owner of the record". The nearest level that decides wins.

The same model object goes to the server (`new TLSocketRoom({ access: model })`) and to the client (`useSync({ access: model })`). The server checks each push as a whole and sends each session only what it may read. The editor checks each local operation as a whole, and derives readonly mode and locked shapes from the model.
