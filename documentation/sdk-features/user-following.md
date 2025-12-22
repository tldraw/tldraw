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
status: published
date: 12/20/2024
order: 32
---

The user following system allows users to track a collaborator's viewport in real-time multiplayer sessions. When following, the local camera automatically moves to match the followed user's view, including page changes and zoom level. The system handles follow chains where multiple users follow each other transitively (A follows B who follows C), and provides smooth viewport interpolation that continuously adjusts the camera toward the target user's position on each frame tick.

Following integrates with the presence system to track collaborator state, the camera system to control viewport movement, and the tick system to perform continuous updates. The system automatically stops following when users manually interact with the canvas or when the followed user is no longer available.

## How it works

### Follow mechanism

When `startFollowingUser()` is called, the editor stores the target user ID in `followingUserId` on the instance state. The system sets up two separate reactive processes: one monitors the followed user's page changes and switches pages when they navigate, and another runs on every frame tick to interpolate the camera toward the target viewport.

The frame tick handler calculates the difference between the current viewport and the target viewport, then applies smooth interpolation using the user's animation speed preference. This creates an ease-out effect where the camera moves quickly at first, then slows as it approaches the target position. Once the viewport difference drops below the `followChaseViewportSnap` threshold (default 2 pixels), the system locks onto the target and stops interpolating until the target moves again.

### Viewport calculation

The system calculates the target viewport by reading the followed user's camera state and screen bounds from their presence record. It constructs the followed user's viewport in page space, then resizes the local viewport to contain the target viewport while maintaining the local screen's aspect ratio. This ensures the followed user's entire view is visible regardless of different screen sizes or aspect ratios between collaborators.

The interpolation uses linear interpolation (`lerp`) on viewport bounds rather than camera values directly, which produces more natural movement when zoom levels differ significantly. The interpolation factor is clamped between 0.1 and 0.8 based on the animation speed preference, preventing both overly sluggish and overly aggressive following behavior.

### Page synchronization

Page changes are handled separately from camera movement. A reactive effect watches the followed user's `currentPageId` and immediately switches pages when it changes. The page switch uses a direct store update rather than `setCurrentPage()` to avoid triggering the automatic follow-stopping behavior that normally occurs on manual page changes.

When switching pages to follow a user, the system sets the `_isLockedOnFollowingUser` flag to prevent the camera interpolation from running until the page switch completes. This avoids jarring camera movements during page transitions.

## API methods

### startFollowingUser

Begins following a user's viewport. The method accepts a user ID and sets up frame tick handlers to track the user's camera and page.

```typescript
editor.startFollowingUser('user-abc-123')
```

The system automatically stops following any previously followed user before starting the new follow. If the target user's presence is not found, the method returns early without starting follow mode.

### stopFollowingUser

Stops following the current user and returns control to the local user. This commits the current camera position to the store and clears the `followingUserId` from instance state.

```typescript
editor.stopFollowingUser()
```

Following automatically stops when the user manually interacts with the canvas through panning, zooming, or selecting shapes. Page changes also trigger automatic follow stopping unless initiated by the follow system itself.

### zoomToUser

Instantly moves the camera to a user's cursor position without entering follow mode. This provides a one-time navigation to a collaborator's location.

```typescript
editor.zoomToUser('user-abc-123')
editor.zoomToUser('user-abc-123', { animation: { duration: 200 } })
```

If already following someone, `zoomToUser()` stops following first. The method switches pages if necessary, centers the camera on the user's cursor, and briefly highlights the user's cursor for visual feedback. The highlight automatically clears after the `collaboratorIdleTimeoutMs` duration.

## Follow chains

When user A follows user B who is following user C, user A should follow user C directly rather than B's view of C. The `_getFollowingPresence()` method implements this by traversing the follow chain until it finds a user who isn't following anyone else.

The traversal maintains a visited set to prevent infinite loops if users accidentally create a circular follow chain. If a cycle is detected, the method returns the last valid presence before the cycle. This ensures the system remains stable even with invalid follow configurations.

```typescript
// A follows B follows C
// A's camera tracks C's viewport, not B's viewport
editor.startFollowingUser('user-b')
// Internally resolves to user-c's presence if user-b is following user-c
```

The follow chain resolution runs on every frame tick, so changes in the chain (like B stopping following C) immediately affect A's target viewport without requiring A to restart following.

## UI integration

### FollowingIndicator

The `DefaultFollowingIndicator` component displays a colored border around the canvas when the user is following someone. The component reads `followingUserId` from instance state and fetches the corresponding presence record to get the user's color.

```typescript
export function DefaultFollowingIndicator() {
  const editor = useEditor()
  const followingUserId = useValue('follow', () => editor.getInstanceState().followingUserId, [
    editor,
  ])
  if (!followingUserId) return null
  return <FollowingIndicatorInner userId={followingUserId} />
}
```

The indicator is rendered as a div with class `tlui-following-indicator` and a border colored to match the followed user's presence color. Applications can override this component through the UI customization system to change the appearance or add additional information like the followed user's name.

### Follow state detection

Applications can detect when the user is following someone by checking `editor.getInstanceState().followingUserId`. This enables UI elements like a "Stop following" button or status indicators showing who the user is currently following.

The presence records available through `editor.getCollaborators()` include each user's `followingUserId`, allowing applications to visualize the entire follow graph and show which users are following whom.

## Key files

- packages/editor/src/lib/editor/Editor.ts - startFollowingUser, stopFollowingUser, zoomToUser, \_getFollowingPresence, getViewportPageBoundsForFollowing methods
- packages/tlschema/src/records/TLInstance.ts - followingUserId and highlightedUserIds fields on instance state
- packages/tlschema/src/records/TLPresence.ts - followingUserId, camera, and screenBounds fields on presence records
- packages/tldraw/src/lib/ui/components/DefaultFollowingIndicator.tsx - Default UI component showing follow state
- packages/editor/src/lib/options.ts - followChaseViewportSnap configuration option

## Related

- [Camera system](./camera-system.md)
- [Sync](../packages/sync.md)
- [Animation](./animation.md)
