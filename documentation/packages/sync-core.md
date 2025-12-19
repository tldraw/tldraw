---
title: '@tldraw/sync-core'
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - sync
  - collaboration
  - multiplayer
  - websocket
  - real-time
---

## Overview

`@tldraw/sync-core` provides the protocol and runtime for real-time collaboration. It manages WebSocket sessions, diffs, and presence without any React dependencies.

## Basic usage

```typescript
import { TLSyncClient } from '@tldraw/sync-core'

const client = new TLSyncClient({
	store,
	socket: websocketAdapter,
	onSyncError: (error) => console.error(error),
})

client.connect()
```

## Key concepts

- Server-authoritative sync
- Diff-based updates (put, patch, remove)
- Presence and connection state

## Key files

- packages/sync-core/src/index.ts - Package entry
- packages/sync-core/src/lib/TLSyncClient.ts - Client implementation
- packages/sync-core/src/lib/protocol.ts - Wire protocol types
- packages/sync-core/src/lib/diff.ts - Diff utilities

## Related

- [@tldraw/sync](./sync.md)
- [Multiplayer architecture](../architecture/multiplayer.md)
