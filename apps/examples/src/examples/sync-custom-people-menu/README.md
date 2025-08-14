---
title: Multiplayer sync with custom people menu
component: ./SyncCustomPeopleMenuExample.tsx
category: collaboration
priority: 3
keywords: [multiplayer, sync, collaboration, custom shape, presence, people, ui, facepile]
multiplayer: true
---

A custom multiplay people menu / facepile that displays connected collaborators.

---

This example demonstrates how to build a custom people menu (also known as a facepile) that shows information about all connected users in a multiplayer session. The custom component replaces the default SharePanel and displays:

- Your own user information with color indicator
- A list of other connected users with their names, colors, and cursor positions
- Real-time updates as users join and leave the session

This is useful when you want to create a more detailed or custom-styled presence indicator than the default tldraw UI provides. The example shows how to access user presence data, track peer connections, and build a reactive UI that updates as the collaboration state changes.
