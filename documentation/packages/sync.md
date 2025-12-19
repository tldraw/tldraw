---
title: '@tldraw/sync'
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - sync
  - multiplayer
  - collaboration
  - real-time
  - websocket
  - presence
---

## Overview

`@tldraw/sync` provides React hooks for multiplayer collaboration. It wraps `@tldraw/sync-core` and returns a Store that stays in sync with other clients.

## Basic usage

```tsx
import { Tldraw } from 'tldraw'
import { useSync } from '@tldraw/sync'

function App() {
	const store = useSync({ uri: 'wss://your-sync-server/room/my-room' })
	return <Tldraw store={store} />
}
```

For quick demos, use the hosted demo server:

```tsx
import { useSyncDemo } from '@tldraw/sync'

const store = useSyncDemo({ roomId: 'demo-room' })
```

## Key files

- packages/sync/src/index.ts - Package entry
- packages/sync/src/lib/useSync.tsx - useSync hook
- packages/sync/src/lib/useSyncDemo.tsx - useSyncDemo hook

## Related

- [@tldraw/sync-core](./sync-core.md)
- [Multiplayer architecture](../architecture/multiplayer.md)
