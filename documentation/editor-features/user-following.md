---
title: User following
created_at: 12/20/2024
updated_at: 12/20/2024
keywords:
  - follow
  - collaboration
  - viewport
  - presence
  - multiplayer
---

The user following system allows users to follow a collaborator's viewport in real-time multiplayer sessions. When following, the camera automatically tracks the followed user's view, including page changes and zoom level. The system handles follow chains (A follows B who follows C) and provides smooth interpolation toward the target viewport.

## Key files

- packages/editor/src/lib/editor/Editor.ts - startFollowingUser, stopFollowingUser, zoomToUser methods

## Related

- [Camera system](./camera-system.md)
- [Sync](../packages/sync.md)
