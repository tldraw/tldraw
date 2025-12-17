---
title: "@tldraw/sync"
created_at: 17/12/2024
updated_at: 17/12/2024
keywords:
  - sync
  - multiplayer
  - collaboration
  - real-time
  - websocket
  - presence
---

The `@tldraw/sync` package provides React hooks and high-level utilities for integrating real-time multiplayer collaboration into tldraw applications. It wraps the lower-level `@tldraw/sync-core` with a developer-friendly API designed for quick integration.

## Overview

This package makes multiplayer collaboration simple. With a single hook, you get:

- **Real-time synchronization** - Changes sync instantly across all connected clients
- **User presence** - See cursors, selections, and activity from other users
- **Connection management** - Automatic reconnection with error handling
- **Asset handling** - Integrated blob storage for images and videos
- **Demo server support** - Start prototyping immediately with hosted infrastructure

The package provides two main hooks:

- `useSync` - Full control for production deployments with your own server
- `useSyncDemo` - Quick setup using tldraw's hosted demo server

## Installation

```bash
npm install @tldraw/sync tldraw
```

The package requires `tldraw` as a peer dependency since it integrates with the tldraw store and editor.

## Quick start with demo server

The fastest way to try multiplayer is using the demo server:

```tsx
import { useSyncDemo } from '@tldraw/sync'
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

function App() {
  const store = useSyncDemo({
    roomId: 'my-company-demo-room',
    userInfo: {
      id: 'user-1',
      name: 'Alice',
      color: '#ff0000'
    }
  })

  return <Tldraw store={store} />
}
```

This connects to tldraw's demo server at `https://demo.tldraw.xyz`. All users with the same `roomId` will collaborate in real-time.

### Demo server limitations

The demo server is great for prototyping but has limitations:

- **Data retention** - All data is deleted after approximately 24 hours
- **Public access** - Anyone with the room ID can access the content
- **Upload restrictions** - File uploads are disabled on production tldraw domains
- **Rate limiting** - Built-in protection against abuse

For production applications, use your own server with the `useSync` hook.

## Production setup with useSync

For production deployments, connect to your own multiplayer server:

```tsx
import { useSync } from '@tldraw/sync'
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

function App() {
  const store = useSync({
    uri: 'wss://myserver.com/sync/room-123',
    assets: myAssetStore,
    userInfo: {
      id: 'user-1',
      name: 'Alice',
      color: '#ff0000'
    }
  })

  if (store.status === 'loading') {
    return <div>Connecting to collaboration session...</div>
  }

  if (store.status === 'error') {
    return <div>Connection failed: {store.error.message}</div>
  }

  return <Tldraw store={store.store} />
}
```

### Store status states

The returned store progresses through these states:

| Status | Description | Properties |
|--------|-------------|------------|
| `loading` | Establishing connection and syncing initial state | None |
| `synced-remote` | Connected and actively synchronizing | `store`, `connectionStatus` |
| `error` | Connection failed or sync error occurred | `error` |

The `synced-remote` state includes a `connectionStatus` property:

- `'online'` - Connected and syncing
- `'offline'` - Temporarily disconnected, will attempt reconnection

```tsx
if (store.status === 'synced-remote') {
  return (
    <>
      {store.connectionStatus === 'offline' && (
        <div>Reconnecting to server...</div>
      )}
      <Tldraw store={store.store} />
    </>
  )
}
```

## WebSocket URI configuration

The `uri` parameter accepts either a static string or a function that returns a URI:

```tsx
// Static URI
const store = useSync({
  uri: 'wss://myserver.com/sync/room-123',
  assets: myAssetStore
})
```

### Dynamic URIs for authentication

Use a function when you need dynamic values like authentication tokens:

```tsx
const store = useSync({
  uri: async () => {
    const token = await getAuthToken()
    return `wss://myserver.com/sync/room-123?token=${token}`
  },
  assets: myAssetStore
})
```

The function is called on each connection attempt, allowing token refresh and dynamic routing.

### Reserved query parameters

The sync system automatically adds these query parameters to your URI:

- `sessionId` - Browser tab identifier for multi-tab support
- `storeId` - Store instance identifier for reconnection handling

Do not include these parameters in your URI—they will cause errors.

## Asset management

Proper asset handling is critical for production multiplayer applications. Without an asset store, images and videos are stored inline as base64, causing severe performance issues.

### Creating an asset store

An asset store implements two methods:

```typescript
import { TLAssetStore } from 'tldraw'

const myAssetStore: TLAssetStore = {
  // Upload new assets
  upload: async (asset, file) => {
    const url = await uploadToCloudStorage(file)
    return { src: url }
  },

  // Resolve asset URLs for display
  resolve: (asset, context) => {
    // Return optimized URL based on context
    return getOptimizedUrl(asset.src, context)
  }
}
```

### Upload implementation

The `upload` method receives the asset metadata and file blob:

```typescript
upload: async (asset, file) => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('https://mycdn.com/upload', {
    method: 'POST',
    body: formData,
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })

  const { url } = await response.json()
  return { src: url }
}
```

### Resolution with optimization

The `resolve` method can return different URLs based on display context:

```typescript
resolve: (asset, context) => {
  if (asset.type !== 'image') return asset.props.src

  // Optimize based on screen scale and DPI
  const width = Math.ceil(
    asset.props.w * context.steppedScreenScale * context.dpr
  )

  // Return URL with optimization parameters
  return `${asset.props.src}?w=${width}&q=80`
}
```

The context provides:

- `steppedScreenScale` - Current zoom level (quantized to reduce cache misses)
- `dpr` - Device pixel ratio
- `networkEffectiveType` - Network speed estimate (`'slow-2g'` | `'2g'` | `'3g'` | `'4g'`)
- `shouldResolveToOriginal` - Whether to skip optimization (e.g., for printing)

### Demo server asset store

The demo server includes an asset store with automatic optimization:

```tsx
const store = useSyncDemo({
  roomId: 'my-room',
  // Asset store is automatically provided
})
```

Images are:
- Uploaded to `https://demo.tldraw.xyz/uploads/`
- Optimized through `https://images.tldraw.xyz`
- Automatically resized based on display context
- Only optimized if file size exceeds 1.5MB

## User presence

The presence system synchronizes user cursors, selections, and activity across clients.

### Basic presence configuration

```tsx
const store = useSync({
  uri: wsUri,
  assets: myAssetStore,
  userInfo: {
    id: 'user-123',
    name: 'Alice',
    color: '#ff0000'
  }
})
```

The `userInfo` appears in other users' UI:
- **name** - Displayed in cursor tooltip
- **color** - Used for cursor and selection highlighting
- **id** - Uniquely identifies the user (should be stable across sessions)

### Reactive user information

User information can be a reactive signal that updates automatically:

```tsx
import { atom } from '@tldraw/state'

function App() {
  const currentUser = atom('user', {
    id: 'user-1',
    name: 'Alice',
    color: '#ff0000'
  })

  const store = useSync({
    uri: wsUri,
    assets: myAssetStore,
    userInfo: currentUser
  })

  // Update user info - changes sync automatically
  const handleNameChange = (newName: string) => {
    currentUser.set({ ...currentUser.get(), name: newName })
  }

  return <Tldraw store={store.store} />
}
```

### Custom presence data

Customize what presence information is synchronized:

```tsx
const store = useSync({
  uri: wsUri,
  assets: myAssetStore,
  userInfo: myUserInfo,
  getUserPresence: (store, user) => {
    // Return custom presence state
    return {
      userId: user.id,
      userName: user.name,
      cursor: getCurrentCursor(store),
      selectedShapeIds: store.getSelectedShapeIds(),
      brush: store.getBrush(),
      // Add custom fields
      currentTool: store.getCurrentToolId(),
      isTyping: store.getIsInEditingMode(),
      viewportBounds: store.getViewportPageBounds()
    }
  }
})
```

Return `null` to temporarily hide your presence from other users.

### Presence modes

The system automatically switches between presence modes based on room occupancy:

- `'solo'` - You're alone in the room (presence sync disabled for performance)
- `'full'` - Other users present (presence fully synchronized)

This optimization reduces network traffic when you're working alone.

## Error handling

The sync system provides comprehensive error handling with specific error types.

### Handling connection errors

```tsx
const store = useSync({
  uri: wsUri,
  assets: myAssetStore
})

if (store.status === 'error') {
  const error = store.error

  // Check for specific sync errors
  if (error instanceof TLRemoteSyncError) {
    switch (error.reason) {
      case TLSyncErrorCloseEventReason.NOT_FOUND:
        return <div>Room not found</div>
      case TLSyncErrorCloseEventReason.FORBIDDEN:
        return <div>You don't have access to this room</div>
      case TLSyncErrorCloseEventReason.NOT_AUTHENTICATED:
        return <div>Please log in to continue</div>
      case TLSyncErrorCloseEventReason.RATE_LIMITED:
        return <div>Too many requests. Please try again later.</div>
      default:
        return <div>Connection error: {error.message}</div>
    }
  }

  return <div>An error occurred: {error.message}</div>
}
```

### Error reason codes

The following error codes are available from `TLSyncErrorCloseEventReason`:

| Code | Description |
|------|-------------|
| `NOT_FOUND` | Room doesn't exist |
| `FORBIDDEN` | User lacks permission to access room |
| `NOT_AUTHENTICATED` | Authentication required but not provided |
| `RATE_LIMITED` | Too many requests from this client |
| `CLIENT_TOO_OLD` | Client protocol version is outdated |
| `SERVER_TOO_OLD` | Server protocol version is outdated |

### Automatic reconnection

The sync client automatically attempts reconnection when the connection drops:

```tsx
const store = useSync({
  uri: wsUri,
  assets: myAssetStore
})

// During reconnection, status stays 'synced-remote' but connectionStatus changes
if (store.status === 'synced-remote') {
  if (store.connectionStatus === 'offline') {
    // Show reconnection indicator
    return (
      <>
        <div className="reconnecting-banner">
          Reconnecting to server...
        </div>
        <Tldraw store={store.store} />
      </>
    )
  }

  // Normal connected state
  return <Tldraw store={store.store} />
}
```

Local changes made during disconnection are queued and synchronized when connection is restored.

## Custom messages

Beyond standard shape and presence synchronization, you can send custom messages between clients.

### Receiving custom messages

```tsx
const store = useSync({
  uri: wsUri,
  assets: myAssetStore,
  onCustomMessageReceived: (data) => {
    if (data.type === 'chat') {
      displayChatMessage(data.message, data.userId)
    } else if (data.type === 'notification') {
      showNotification(data.text)
    }
  }
})
```

### Sending custom messages

Access the sync client through the store to send messages:

```tsx
function MyComponent() {
  const editor = useEditor()

  const sendChatMessage = (message: string) => {
    // Get the sync client from the store
    const syncClient = editor.store.syncClient

    if (syncClient) {
      syncClient.sendMessage({
        type: 'chat',
        message,
        userId: myUserId,
        timestamp: Date.now()
      })
    }
  }

  return <ChatInput onSend={sendChatMessage} />
}
```

Custom messages are broadcast to all connected clients in the room.

## Integration with tldraw editor

Once the store is synchronized, integrate it with the tldraw editor component.

### Basic integration

```tsx
const store = useSync({
  uri: wsUri,
  assets: myAssetStore
})

if (store.status === 'synced-remote') {
  return <Tldraw store={store.store} />
}
```

### With user preferences

Synchronize the `userInfo` with the tldraw user preferences for a consistent experience:

```tsx
import { atom } from '@tldraw/state'

function App() {
  const userPreferences = atom('user-prefs', {
    id: 'user-1',
    name: 'Alice',
    color: '#ff0000'
  })

  const store = useSync({
    uri: wsUri,
    assets: myAssetStore,
    userInfo: userPreferences
  })

  if (store.status === 'synced-remote') {
    return (
      <Tldraw
        store={store.store}
        userPreferences={userPreferences}
      />
    )
  }

  return <div>Loading...</div>
}
```

This ensures the user's name and color are consistent between the multiplayer presence system and the tldraw UI.

### Custom shapes and tools

The sync system works seamlessly with custom shapes and tools:

```tsx
const store = useSync({
  uri: wsUri,
  assets: myAssetStore,
  shapeUtils: [MyCustomShapeUtil],
  bindingUtils: [MyCustomBindingUtil]
})

if (store.status === 'synced-remote') {
  return (
    <Tldraw
      store={store.store}
      tools={[MyCustomTool]}
    />
  )
}
```

Custom shapes sync automatically once both clients have the same shape utilities registered.

## Schema synchronization

The server and all clients must use compatible schemas. The sync protocol includes schema version checking.

### Version mismatches

If schemas don't match, the connection fails with an error:

```tsx
if (store.status === 'error') {
  if (store.error.reason === TLSyncErrorCloseEventReason.CLIENT_TOO_OLD) {
    return (
      <div>
        Your client is out of date.
        Please refresh the page to get the latest version.
      </div>
    )
  }
}
```

### Schema migrations

Use the migration system to evolve your schema over time:

```tsx
import { createMigrationIds, createMigrationSequence } from '@tldraw/store'

const versions = createMigrationIds('com.myapp.shape', {
  AddNewField: 1,
  RenameField: 2
})

const migrations = createMigrationSequence({
  sequenceId: 'com.myapp.shape',
  sequence: [
    {
      id: versions.AddNewField,
      scope: 'record',
      filter: (r) => r.typeName === 'myShape',
      up: (shape) => ({ ...shape, newField: 'default' })
    }
  ]
})

const store = useSync({
  uri: wsUri,
  assets: myAssetStore,
  shapeUtils: [MyShapeUtil],
  // Migrations run automatically on load
  migrations: [migrations]
})
```

Both the server and all clients must include the same migrations for compatibility.

## Common patterns

### Room routing

Create separate rooms for different documents:

```tsx
function DocumentEditor({ documentId }: { documentId: string }) {
  const store = useSync({
    uri: `wss://myserver.com/sync/${documentId}`,
    assets: myAssetStore,
    roomId: documentId
  })

  return store.status === 'synced-remote' ? (
    <Tldraw store={store.store} />
  ) : (
    <LoadingSpinner />
  )
}
```

### Authentication with tokens

Refresh authentication tokens on reconnection:

```tsx
const store = useSync({
  uri: async () => {
    // Refresh token before each connection
    const token = await refreshAuthToken()
    return `wss://myserver.com/sync/room-123?token=${token}`
  },
  assets: myAssetStore
})
```

### Read-only mode

The server can mark connections as read-only:

```tsx
function ReadOnlyViewer() {
  const store = useSync({
    uri: 'wss://myserver.com/sync/room-123?readonly=true',
    assets: myAssetStore
  })

  if (store.status === 'synced-remote') {
    // The store automatically enforces read-only based on server state
    return <Tldraw store={store.store} />
  }

  return <div>Loading...</div>
}
```

The editor automatically disables editing tools when in read-only mode.

### Offline persistence

Combine multiplayer sync with local persistence:

```tsx
import { useLocalSyncClient } from 'tldraw'

function App() {
  // Set up local persistence
  const localStore = useLocalSyncClient({
    persistenceKey: 'my-document'
  })

  // Add multiplayer sync
  const syncedStore = useSync({
    uri: wsUri,
    assets: myAssetStore
  })

  // Use synced store when available, fall back to local
  const store = syncedStore.status === 'synced-remote'
    ? syncedStore.store
    : localStore

  return <Tldraw store={store} />
}
```

This provides offline-first behavior with multiplayer when online.

## Performance considerations

### Connection optimization

The sync system is optimized for performance:

- **Batched updates** - Multiple changes sent together to reduce overhead
- **Diff compression** - Only actual changes are transmitted, not full state
- **Presence throttling** - Cursor updates are rate-limited to prevent flooding
- **Selective sync** - Only document-scoped records sync by default

### Asset optimization

Large assets can impact performance. The demo server asset store demonstrates best practices:

```typescript
resolve: (asset, context) => {
  // Only optimize images above 1.5MB
  if (asset.props.fileSize < 1024 * 1024 * 1.5) {
    return asset.props.src
  }

  // Adjust quality for slow networks
  const networkCompensation =
    context.networkEffectiveType === '4g' ? 1 : 0.5

  // Calculate optimal width
  const width = Math.ceil(
    Math.min(
      asset.props.w * context.steppedScreenScale *
      networkCompensation * context.dpr,
      asset.props.w
    )
  )

  return `${imageWorkerUrl}?src=${asset.props.src}&w=${width}`
}
```

### Memory management

The sync client properly cleans up resources:

- Connections are automatically closed when components unmount
- Subscriptions are unsubscribed on cleanup
- References are released to prevent memory leaks

Ensure you use the hooks inside React components so cleanup happens automatically.

## Key files

- packages/sync/src/useSync.ts - Main production sync hook
- packages/sync/src/useSyncDemo.ts - Demo server integration hook
- packages/sync-core/src/lib/TLSyncClient.ts - Core sync client implementation
- packages/sync-core/src/lib/ClientWebSocketAdapter.ts - WebSocket connection adapter
- packages/sync-core/src/lib/TLRemoteSyncError.ts - Sync error types
- packages/sync-core/src/lib/protocol.ts - WebSocket protocol definitions
- packages/sync/CONTEXT.md - Comprehensive package documentation

## Related

- [@tldraw/sync-core](./sync-core.md) - Lower-level sync primitives
- [@tldraw/editor](./editor.md) - Editor integration points
- [@tldraw/store](./store.md) - Underlying reactive store
- [Multiplayer guide](../guides/multiplayer.md) - Complete multiplayer setup guide
- [Server setup](../guides/server-setup.md) - Setting up your own sync server
- [Asset handling](../guides/asset-handling.md) - Asset storage strategies
