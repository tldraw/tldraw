# @tldraw/sync

The `@tldraw/sync` package provides React hooks and utilities for integrating real-time collaboration into your tldraw applications. Built on top of `@tldraw/sync-core`, it offers a developer-friendly API that enables multiplayer functionality with minimal configuration.

## 1. Introduction

Real-time collaboration transforms single-user drawing applications into shared creative spaces where multiple users can work together simultaneously. The sync package handles the complex coordination required for multiplayer experiences: synchronizing changes, managing user presence, handling network interruptions, and resolving conflicts.

You create collaborative tldraw applications using two main hooks:

- `useSync` - For production applications with custom servers
- `useSyncDemo` - For prototypes and demos using tldraw's hosted demo server

Both hooks return a store wrapped with connection status, allowing you to build responsive UIs that gracefully handle loading states, connection issues, and real-time updates.

## 2. Core Concepts

### Multiplayer Store State

The foundation of sync integration is the **RemoteTLStoreWithStatus**, an enhanced store wrapper that tracks both your drawing data and connection state:

```ts
import { useSync } from '@tldraw/sync'

function MyApp() {
  const store = useSync({
    uri: 'wss://myserver.com/sync/room-123',
    assets: myAssetStore,
    userInfo: { id: 'user-1', name: 'Alice', color: '#ff0000' }
  })

  // Store progresses through these states:
  if (store.status === 'loading') return <div>Connecting...</div>
  if (store.status === 'error') return <div>Connection failed: {store.error.message}</div>

  // store.status === 'synced-remote'
  return <Tldraw store={store.store} />
}
```

The store moves through three distinct states as it establishes and maintains connection:

1. **loading** - Initial connection and synchronization with the server
2. **synced-remote** - Successfully connected and actively synchronizing changes
3. **error** - Connection failed or a synchronization error occurred

### User Presence

**/User presence** encompasses the real-time information about other users in your collaborative session. This includes cursor positions, current selections, and any custom presence data you want to share. The `useSync` hook handles this automatically, but you can provide a custom `getUserPresence` function to send additional data.

```ts
const store = useSync({
	uri: wsUri,
	assets: myAssets,
})
```

The presence system automatically optimizes itself based on room occupancy, switching between 'solo' mode when you're alone and 'full' mode when collaborating with others.

### Asset Management

**Assets** are files like images, videos, and other media that users embed in their drawings. The sync package requires an asset store implementation that handles uploading files and resolving them for display:

```ts
const myAssetStore = {
	upload: async (asset, file) => {
		// Upload file to your storage service
		const url = await uploadToStorage(file)
		return { src: url }
	},

	resolve: (asset, context) => {
		// Return optimized URLs based on context
		// (screen DPI, network quality, display size)
		return getOptimizedUrl(asset.src, context)
	},
}
```

## 3. Basic Usage

### Quick Start with Demo Server

The fastest way to add collaboration to your application is using the demo server. This requires no backend setup and works immediately:

```ts
import { useSyncDemo } from '@tldraw/sync'
import { Tldraw } from 'tldraw'

function CollaborativeApp() {
  const store = useSyncDemo({
    roomId: 'my-prototype-room-123',
    userInfo: {
      id: 'user-' + Math.random(),
      name: 'Anonymous User',
      color: '#' + Math.floor(Math.random()*16777215).toString(16)
    }
  })

  if (store.status === 'loading') {
    return <div>Connecting to room...</div>
  }

  if (store.status === 'error') {
    return <div>Failed to connect: {store.error.message}</div>
  }

  return <Tldraw store={store.store} />
}
```

> Tip: The demo server is perfect for prototyping and testing, but data is automatically deleted after ~24 hours and rooms are publicly accessible to anyone with the room ID.

### Production Integration

For production applications, use `useSync` with your own WebSocket server:

```ts
import { useSync } from '@tldraw/sync'
import { Tldraw } from 'tldraw'

function ProductionApp() {
  const store = useSync({
    uri: 'wss://myserver.com/sync/project-collaboration-session',
    userInfo: getCurrentUser(), // Your user system integration
    assets: productionAssetStore, // Your asset storage integration
  })

  return (
    <div>
      {store.status === 'loading' && <LoadingSpinner />}
      {store.status === 'error' && <ErrorMessage error={store.error} />}
      {store.status === 'synced-remote' && (
        <>
          <ConnectionIndicator status={store.connectionStatus} />
          <Tldraw store={store.store} />
        </>
      )}
    </div>
  )
}
```

## 4. Advanced Configuration

### Dynamic Connection URIs

You can provide connection URIs dynamically, which is essential for authentication and room-specific routing:

```ts
const store = useSync({
	uri: async () => {
		const token = await getAuthToken()
		const roomId = getCurrentRoomId()
		return `wss://myserver.com/sync/${roomId}?token=${token}`
	},
	assets: authenticatedAssetStore,
	userInfo: userSignal, // Can be a reactive signal that updates
})
```

When the URI function is async, the sync system waits for it to resolve before attempting connection. This ensures your authentication flow completes before establishing the WebSocket connection.

### Reactive User Information

User information can be static or reactive. Using reactive signals allows the presence system to automatically update when user details change:

```ts
import { atom } from '@tldraw/state'

const currentUser = atom('currentUser', {
	id: 'user-123',
	name: 'Alice',
	color: '#ff0000',
})

const store = useSync({
	uri: wsUri,
	assets: myAssets,
	userInfo: currentUser, // Reactive signal
})

// Later, when user updates their profile:
currentUser.set({
	id: 'user-123',
	name: 'Alice Cooper', // Updated name
	color: '#00ff00', // New color
})
// Presence automatically updates for all connected users
```

### Custom Presence Data

The `getUserPresence` function allows you to include custom presence information beyond the standard cursor and selection data. The function receives the `store` and the current `user` info. It should return an object that conforms to the `TLPresenceStateInfo` type.

Note that the `store` object passed to this function is a `TLStore` instance, and does not have an `editor` property. To access editor-specific state like the current tool or cursor position, you will need to find a way to access the `Editor` instance from your component.

```ts
const store = useSync({
	uri: wsUri,
	assets: myAssets,
	getUserPresence: (store, user) => {
		// This function is called whenever the store changes.
		// You can use it to derive presence information from the store.
		// To get information like cursor position, you may need to
		// find a way to access your <Tldraw /> component's editor instance.

		return {
			userId: user.id,
			userName: user.name,
			// ... and other properties from TLPresenceStateInfo
		}
	},
})
```

### Asset Store Implementation

A complete asset store handles both uploading new files and resolving existing assets for optimal display:

```ts
const productionAssetStore = {
	upload: async (asset, file) => {
		// Generate unique filename
		const filename = `${Date.now()}-${file.name}`

		// Upload to your storage service
		const formData = new FormData()
		formData.append('file', file)
		formData.append('filename', filename)

		const response = await fetch('/api/upload', {
			method: 'POST',
			body: formData,
			headers: {
				Authorization: `Bearer ${await getAuthToken()}`,
			},
		})

		const { url } = await response.json()
		return { src: url }
	},

	resolve: (asset, context) => {
		const baseUrl = asset.src

		// Return different resolutions based on context
		if (context.shouldResolveToOriginal) {
			return baseUrl // Full quality for printing/export
		}

		// Optimize based on display size and screen density
		const targetWidth = Math.ceil(context.screenScale * context.imageSize.w)
		const targetHeight = Math.ceil(context.screenScale * context.imageSize.h)

		return `${baseUrl}?w=${targetWidth}&h=${targetHeight}&q=${context.networkQuality}`
	},
}
```

## 5. Connection Management

### Understanding Connection States

The sync system provides granular connection status information to help you build responsive UIs:

```ts
function ConnectionAwareApp() {
  const store = useSync({ /* ... */ })

  if (store.status === 'loading') {
    return <div>Establishing connection...</div>
  }

  if (store.status === 'error') {
    return (
      <div>
        <h3>Connection Error</h3>
        <p>{store.error.message}</p>
        <button onClick={() => window.location.reload()}>
          Retry Connection
        </button>
      </div>
    )
  }

  // store.status === 'synced-remote'
  return (
    <div>
      <NetworkIndicator status={store.connectionStatus} />
      <Tldraw store={store.store} />
    </div>
  )
}

function NetworkIndicator({ status }) {
  if (status === 'offline') {
    return <div className="warning">Working offline - changes will sync when reconnected</div>
  }

  if (status === 'online') {
    return <div className="success">Connected and syncing</div>
  }

  return null
}
```

The connection status operates independently of the sync status. Even when `store.status` is 'synced-remote', the `connectionStatus` can be 'offline' if network connectivity is lost, allowing the application to continue working locally.

### Automatic Reconnection

The sync system handles network interruptions gracefully with automatic reconnection and state recovery:

```ts
// No additional code needed - reconnection is automatic
const store = useSync({
	uri: 'wss://myserver.com/sync/room-123',
	assets: myAssets,
	userInfo: currentUser,
})

// The system automatically:
// 1. Detects network disconnection
// 2. Queues local changes while offline
// 3. Attempts reconnection with exponential backoff
// 4. Reconciles state when connection is restored
// 5. Handles conflicts between local and server changes
```

### Error Handling and Recovery

Different types of connection errors require different handling strategies:

```ts
function ErrorHandlingApp() {
  const store = useSync({ /* ... */ })

  if (store.status === 'error') {
    const error = store.error

    // Check specific error types for appropriate responses
    if (error.reason === 'NOT_FOUND') {
      return <div>Room not found. Please check the room ID.</div>
    }

    if (error.reason === 'FORBIDDEN') {
      return <div>Access denied. Please check your permissions.</div>
    }

    if (error.reason === 'NOT_AUTHENTICATED') {
      return <div>Authentication required. <button onClick={login}>Login</button></div>
    }

    if (error.reason === 'RATE_LIMITED') {
      return <div>Too many requests. Please wait before retrying.</div>
    }

    // Generic network or server error
    return (
      <div>
        <h3>Connection Error</h3>
        <p>Unable to connect to collaboration server.</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    )
  }

  return <Tldraw store={store.store} />
}
```

## 6. Debugging

### Understanding Connection Behavior

The sync package provides several tools for understanding and debugging connection behavior in your application.

#### Connection Status Monitoring

You can monitor connection events by logging the status changes:

```ts
import { useEffect } from 'react'

function DebuggableApp() {
  const store = useSync({
    uri: 'wss://myserver.com/sync/room-123',
    assets: myAssets,
    userInfo: currentUser,
    trackAnalyticsEvent: (name, data) => {
      console.log('Sync Event:', name, data)
    }
  })

  useEffect(() => {
    console.log('Store status changed:', store.status)

    if (store.status === 'synced-remote') {
      console.log('Connection status:', store.connectionStatus)
    }
  }, [store.status, store.status === 'synced-remote' ? store.connectionStatus : null])

  return <Tldraw store={store.store} />
}
```

This will log events like:

```
Sync Event: room-not-found { roomId: "room-123" }
Sync Event: connected { isReadonly: false }
Store status changed: synced-remote
Connection status: online
```

#### Network Quality Detection

The demo asset store includes network quality detection that affects image resolution:

```ts
// In the demo environment, you can observe network adaptation:
const store = useSyncDemo({
	roomId: 'debug-room',
	userInfo: currentUser,
})

// Images automatically adjust quality based on:
// - Connection speed (detected from WebSocket latency)
// - Screen pixel density
// - Actual display size
// - File size thresholds
```

#### Presence System Debugging

You can debug presence updates by monitoring presence mode changes:

```ts
import { getDefaultUserPresence } from 'tldraw'

function PresenceDebuggingApp() {
  const store = useSync({
    uri: wsUri,
    assets: myAssets,
    getUserPresence: (store, user) => {
      // See the "Custom Presence Data" section for details
      // on how to implement this function.
      const presence = getDefaultUserPresence(store, user)
      console.log('Updating presence:', presence)
      return presence
    },
  })

  useEffect(() => {
    if (store.status === 'synced-remote') {
      // Monitor presence mode changes
      const unsubscribe = store.store.listen(() => {
        const presences = store.store.allRecords().filter(r => r.typeName === 'instance_presence')
        console.log('Active users:', presences.length)
        console.log('Presence mode:', presences.length > 1 ? 'collaborative' : 'solo')
      })

      return unsubscribe
    }
  }, [store])

  return <Tldraw store={store.store} />
}
```

#### Common Connection Issues

**WebSocket Connection Failures**

If connections consistently fail, verify the WebSocket URL format:

```ts
// ✅ Correct formats:
'wss://myserver.com/sync'
'wss://myserver.com/sync/room-123'
'ws://localhost:3001/sync' // Development only

// ❌ Common mistakes:
'https://myserver.com/sync' // Wrong protocol
'wss://myserver.com/sync/' // Trailing slash may cause issues
'myserver.com/sync' // Missing protocol
```

**Authentication Token Issues**

When using token authentication, ensure tokens remain valid throughout the session:

```ts
const store = useSync({
	uri: async () => {
		const token = await refreshTokenIfNeeded() // Ensure token is fresh
		return `wss://myserver.com/sync?token=${token}`
	},
	assets: myAssets,
	userInfo: currentUser,
})
```

**Asset Upload Problems**

Asset upload failures often relate to CORS configuration or authentication:

```ts
const debugAssetStore = {
	upload: async (asset, file) => {
		console.log('Uploading asset:', {
			name: file.name,
			size: file.size,
			type: file.type,
		})

		try {
			const result = await uploadToServer(file)
			console.log('Upload successful:', result)
			return result
		} catch (error) {
			console.error('Upload failed:', error)
			throw error
		}
	},

	resolve: (asset, context) => {
		console.log('Resolving asset:', asset.src, 'with context:', context)
		return asset.src
	},
}
```

## 7. Integration with Authentication

### Token-Based Authentication

Most production applications require authentication. The sync package supports token-based auth through dynamic URI generation:

```ts
import { useAuth } from './auth-system'

function AuthenticatedApp() {
  const { user, getToken } = useAuth()

  const store = useSync({
    uri: async () => {
      if (!user) throw new Error('Not authenticated')

      const token = await getToken()
      return `wss://myserver.com/sync/room-123?token=${token}&userId=${user.id}`
    },
    userInfo: {
      id: user.id,
      name: user.displayName,
      color: user.preferredColor
    },
    assets: createAuthenticatedAssetStore(getToken),
  })

  if (!user) {
    return <LoginPrompt />
  }

  return <Tldraw store={store.store} />
}
```

### Session Management

Handle authentication state changes gracefully by recreating the sync connection:

```ts
function SessionManagedApp() {
  const { user, sessionId } = useAuth()

  // Recreate sync connection when session changes
  const store = useSync({
    uri: `wss://myserver.com/sync?session=${sessionId}`,
    userInfo: user ? {
      id: user.id,
      name: user.name,
      color: user.color
    } : null,
    assets: myAssetStore,
  })

  // Handle logout
  const handleLogout = () => {
    // Sync connection will automatically clean up
    // when component unmounts or deps change
    logout()
  }

  return (
    <div>
      {user && <button onClick={handleLogout}>Logout</button>}
      <Tldraw store={store.store} />
    </div>
  )
}
```

### Role-Based Permissions

Integrate with permission systems by handling readonly mode:

```ts
function PermissionAwareApp() {
  const store = useSync({
    uri: wsUri,
    assets: myAssets,
    userInfo: currentUser,
  })

  if (store.status === 'synced-remote') {
    // Server can set readonly mode based on user permissions
    const isReadonly = store.store.collaboration?.mode === 'readonly'

    if (isReadonly) {
      return (
        <div>
          <div className="notice">You have view-only access to this room</div>
          <Tldraw store={store.store} />
        </div>
      )
    }
  }

  return <Tldraw store={store.store} />
}
```

The sync system automatically handles permission enforcement when the server sets readonly mode, preventing local changes from being applied or synchronized.

This comprehensive guide covers the essential concepts, practical implementation patterns, and advanced features of the `@tldraw/sync` package. The reactive nature of the sync system, combined with robust error handling and flexible configuration options, enables you to build reliable collaborative experiences that gracefully handle the complexities of real-time multiplayer interaction.
