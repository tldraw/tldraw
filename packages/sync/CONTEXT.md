# Sync Package Context

## Overview

The `@tldraw/sync` package provides React hooks and high-level utilities for integrating tldraw's real-time collaboration features into React applications. It builds on `@tldraw/sync-core` to offer a developer-friendly API for multiplayer functionality with minimal configuration.

## Architecture

### Primary Hooks

#### `useSync` - Production Multiplayer Hook

The main hook for production multiplayer integration:

```typescript
function useSync(options: UseSyncOptions & TLStoreSchemaOptions): RemoteTLStoreWithStatus

interface UseSyncOptions {
	uri: string | (() => string | Promise<string>) // WebSocket server URI
	userInfo?: TLPresenceUserInfo | Signal<TLPresenceUserInfo> // User identity
	assets: TLAssetStore // Blob storage implementation
	roomId?: string // Room identifier for analytics
	trackAnalyticsEvent?: (name: string, data: any) => void // Analytics callback
	getUserPresence?: (store: TLStore, user: TLPresenceUserInfo) => TLPresenceStateInfo | null
}
```

#### `useSyncDemo` - Demo Server Integration

Simplified hook for quick prototyping with tldraw's demo server:

```typescript
function useSyncDemo(options: UseSyncDemoOptions & TLStoreSchemaOptions): RemoteTLStoreWithStatus

interface UseSyncDemoOptions {
	roomId: string // Unique room identifier
	userInfo?: TLPresenceUserInfo | Signal<TLPresenceUserInfo>
	host?: string // Demo server URL override
	getUserPresence?: (store: TLStore, user: TLPresenceUserInfo) => TLPresenceStateInfo | null
}
```

### Store Integration

#### `RemoteTLStoreWithStatus` - Multiplayer Store State

Enhanced store wrapper with connection status:

```typescript
type RemoteTLStoreWithStatus =
	| { status: 'loading' } // Initial connection
	| { status: 'error'; error: Error } // Connection/sync errors
	| {
			status: 'synced-remote' // Connected and syncing
			connectionStatus: 'online' | 'offline' // Network state
			store: TLStore // Synchronized store
	  }
```

Status progression:

1. **loading**: Establishing connection, performing initial sync
2. **synced-remote**: Successfully connected and synchronized
3. **error**: Connection failed or sync error occurred

### Connection Management

#### WebSocket Connection Lifecycle

Comprehensive connection state management:

**Connection Establishment:**

```typescript
// 1. Create WebSocket adapter
const socket = new ClientWebSocketAdapter(async () => {
	const uriString = typeof uri === 'string' ? uri : await uri()
	const url = new URL(uriString)
	url.searchParams.set('sessionId', TAB_ID) // Browser tab identification
	url.searchParams.set('storeId', storeId) // Store instance identification
	return url.toString()
})

// 2. Initialize TLSyncClient with reactive integration
const client = new TLSyncClient({
	store,
	socket,
	didCancel: () => cancelled, // Cleanup detection
	onLoad: (client) => setState({ readyClient: client }),
	onSyncError: (reason) => handleSyncError(reason),
	onAfterConnect: (_, { isReadonly }) => updatePermissions(isReadonly),
	presence,
	presenceMode,
})
```

#### Error Handling and Recovery

Comprehensive error handling with user feedback:

```typescript
// Sync error categorization and analytics
onSyncError(reason) {
  switch (reason) {
    case TLSyncErrorCloseEventReason.NOT_FOUND:
      track('room-not-found')
      break
    case TLSyncErrorCloseEventReason.FORBIDDEN:
      track('forbidden')
      break
    case TLSyncErrorCloseEventReason.NOT_AUTHENTICATED:
      track('not-authenticated')
      break
    case TLSyncErrorCloseEventReason.RATE_LIMITED:
      track('rate-limited')
      break
  }
  setState({ error: new TLRemoteSyncError(reason) })
}
```

### Presence System

#### User Presence Management

Real-time user cursor and selection synchronization:

```typescript
// User information computation
const userPreferences = computed('userPreferences', () => {
	const user = getUserInfo() ?? getUserPreferences()
	return {
		id: user.id,
		color: user.color ?? defaultUserPreferences.color,
		name: user.name ?? defaultUserPreferences.name,
	}
})

// Presence state generation
const presence = computed('instancePresence', () => {
	const presenceState = getUserPresence(store, userPreferences.get())
	if (!presenceState) return null

	return InstancePresenceRecordType.create({
		...presenceState,
		id: InstancePresenceRecordType.createId(store.id),
	})
})
```

#### Presence Modes

Dynamic presence behavior based on room occupancy:

```typescript
const presenceMode = computed<TLPresenceMode>('presenceMode', () => {
	if (otherUserPresences.get().size === 0) return 'solo'
	return 'full'
})

// Affects:
// - Cursor visibility
// - Selection indicators
// - Performance optimizations
```

### Asset Management

#### Demo Asset Store

Integrated blob storage for demo environments:

```typescript
function createDemoAssetStore(host: string): TLAssetStore {
	return {
		// Upload to demo server
		upload: async (asset, file) => {
			const objectName = `${uniqueId()}-${file.name}`.replace(/\W/g, '-')
			const url = `${host}/uploads/${objectName}`
			await fetch(url, { method: 'POST', body: file })
			return { src: url }
		},

		// Intelligent image optimization
		resolve: (asset, context) => {
			// Automatic image resizing based on:
			// - Screen DPI and scale
			// - Network connection quality
			// - Image size thresholds
			// - Animation/vector type detection
		},
	}
}
```

#### Asset Resolution Strategy

Smart image optimization for performance:

- **Network-Aware**: Adjusts quality based on connection speed
- **Scale-Aware**: Resizes based on actual display size
- **Type-Aware**: Handles animated/vector images appropriately
- **Size-Threshold**: Only optimizes images above 1.5MB

### Connection Reliability

#### Automatic Reconnection

Built-in reconnection management:

```typescript
// Connection status tracking
const collaborationStatusSignal = computed('collaboration status', () =>
	socket.connectionStatus === 'error' ? 'offline' : socket.connectionStatus
)

// Graceful degradation
store = createTLStore({
	collaboration: {
		status: collaborationStatusSignal,
		mode: syncMode, // readonly/readwrite based on server state
	},
})
```

#### State Recovery

Robust recovery from connection issues:

- **Optimistic Updates**: Local changes applied immediately
- **Server Reconciliation**: Re-sync with server state on reconnect
- **Conflict Resolution**: Handle overlapping changes gracefully
- **Store Validation**: Ensure store remains usable after reconnection

## Demo Server Integration

### Hosted Demo Environment

Pre-configured integration with tldraw's demo infrastructure:

- **Demo Server**: `https://demo.tldraw.xyz` for WebSocket connections
- **Image Worker**: `https://images.tldraw.xyz` for image optimization
- **Bookmark Unfurling**: `${host}/bookmarks/unfurl` for URL metadata

### Asset Processing Pipeline

Integrated asset handling for demo environments:

```typescript
// Automatic bookmark creation from URLs
editor.registerExternalAssetHandler('url', async ({ url }) => {
	return await createAssetFromUrlUsingDemoServer(host, url)
})

// Generates bookmark assets with:
// - Title, description, favicon from meta tags
// - Image preview from og:image
// - Fallback to basic bookmark on errors
```

### Security and Limitations

Demo server considerations:

- **Data Retention**: Demo data deleted after ~24 hours
- **Public Access**: Anyone with room ID can access content
- **Upload Restrictions**: File uploads disabled on production demo domains
- **Rate Limiting**: Built-in protection against abuse

## Integration Patterns

### Basic Multiplayer Setup

```typescript
function MultiplayerApp() {
  const store = useSync({
    uri: 'wss://myserver.com/sync/room-123',
    assets: myAssetStore,
    userInfo: { id: 'user-1', name: 'Alice', color: '#ff0000' }
  })

  if (store.status === 'loading') return <Loading />
  if (store.status === 'error') return <Error error={store.error} />

  return <Tldraw store={store.store} />
}
```

### Demo/Prototype Setup

```typescript
function DemoApp() {
  const store = useSyncDemo({
    roomId: 'my-company-test-room-123',
    userInfo: myUserSignal
  })

  return <Tldraw store={store} />
}
```

### Custom Presence Implementation

```typescript
const store = useSync({
	uri: wsUri,
	assets: myAssets,
	getUserPresence: (store, user) => ({
		userId: user.id,
		userName: user.name,
		cursor: { x: mouseX, y: mouseY },
		selectedShapeIds: store.selectedShapeIds,
		brush: store.brush,
		// Custom presence data
		currentTool: store.currentTool,
		isTyping: store.isInEditingMode,
	}),
})
```

### Authentication Integration

```typescript
const store = useSync({
	uri: async () => {
		const token = await getAuthToken()
		return `wss://myserver.com/sync/room-123?token=${token}`
	},
	assets: authenticatedAssetStore,
	onMount: (editor) => {
		// Setup authenticated external content handlers
		setupAuthenticatedHandlers(editor)
	},
})
```

## Performance Considerations

### Connection Optimization

- **Batched Updates**: Multiple changes sent together
- **Diff Compression**: Only send actual changes, not full state
- **Presence Throttling**: Limit cursor update frequency
- **Selective Sync**: Only sync relevant data

### Memory Management

- **Automatic Cleanup**: Proper disposal of connections and resources
- **Weak References**: Prevent memory leaks in long-running sessions
- **State Pruning**: Remove unnecessary historical data

### Network Efficiency

- **Binary Protocol**: Efficient message encoding
- **Compression**: Optional compression for large updates
- **Connection Pooling**: Reuse connections where possible

## Error Recovery

### Network Issues

- **Offline Detection**: Graceful handling of network loss
- **Automatic Retry**: Progressive backoff for reconnection
- **State Buffering**: Queue changes during disconnection
- **Conflict Resolution**: Handle changes made while offline

### Server Issues

- **Server Errors**: Proper handling of server-side failures
- **Schema Mismatches**: Handle version incompatibilities
- **Rate Limiting**: Respect server-imposed limits
- **Graceful Degradation**: Fall back to local-only mode when needed

## Dependencies

### Core Dependencies

- **@tldraw/sync-core**: Core synchronization infrastructure
- **@tldraw/state-react**: React integration for reactive state
- **tldraw**: Main tldraw package for store and editor integration

### Peer Dependencies

- **React**: React hooks and lifecycle integration
- **WebSocket**: Browser or Node.js WebSocket implementation

## Key Benefits

### Developer Experience

- **Simple API**: Single hook for full multiplayer functionality
- **Flexible Configuration**: Support for custom servers and asset stores
- **Great Defaults**: Demo server for instant prototyping
- **TypeScript Support**: Full type safety throughout

### Real-Time Features

- **Live Collaboration**: Multiple users editing simultaneously
- **Presence Indicators**: See other users' cursors and selections
- **Instant Updates**: Changes appear immediately across all clients
- **Conflict Resolution**: Intelligent handling of simultaneous edits

### Production Ready

- **Reliability**: Robust error handling and recovery
- **Scalability**: Efficient protocols for large rooms
- **Security**: Authentication and authorization support
- **Observability**: Analytics and monitoring integration
