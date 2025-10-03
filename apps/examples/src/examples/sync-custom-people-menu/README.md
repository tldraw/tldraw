---
title: Multiplayer sync with custom people menu
component: ./SyncCustomPeopleMenuExample.tsx
category: collaboration
priority: 3
keywords: [multiplayer, sync, collaboration, custom shape, presence, people, ui, facepile]
multiplayer: true
---

A custom multiplayer people menu / facepile that displays connected collaborators.

---

This example demonstrates how to build a custom people menu (or facepile) that shows information about all users in a multiplayer session.

This is useful when you want to create a more detailed or custom-styled presence indicator than the default tldraw provides. This example shows user's names, ids, colors, and cursor position, all information provided in the `TLInstancePresence` returned by `editor.getCollaborators()`.
