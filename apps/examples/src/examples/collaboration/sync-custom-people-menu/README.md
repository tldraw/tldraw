---
title: Multiplayer sync with custom people menu
component: ./SyncCustomPeopleMenuExample.tsx
priority: 3
keywords:
  [
    multiplayer,
    collaboration,
    presence,
    facepile,
    people menu,
    getcollaborators,
    tlinstancepresence,
    cursor position,
    custom ui,
  ]
multiplayer: true
---

Build a custom people menu that lists connected collaborators and their cursor positions.

---

Replace the `SharePanel` slot with your own component and read `editor.getCollaborators()` inside `useValue`. Each entry is a `TLInstancePresence` record with the collaborator's name, color, cursor, camera, and selection, so you can render a richer or differently styled presence indicator than the default facepile.

Open the example in two tabs to see the other user appear in the list.
