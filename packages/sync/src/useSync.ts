import { atom, transact } from '@tldraw/state'
import {
	ClientWebSocketAdapter,
	TLCustomMessageHandler,
	TLPersistentClientSocket,
	TLPresenceMode,
	TLRemoteSyncError,
	TLSocketClientSentEvent,
	TLSocketServerSentEvent,
	TLSyncClient,
	TLSyncErrorCloseEventReason,
} from '@tldraw/sync-core'
import { useEffect } from 'react'
import {
	Editor,
	InstancePresenceRecordType,
	TAB_ID,
	TLAssetStore,
	TLPresenceStateInfo,
	TLRecord,
	TLStore,
	TLStoreSchemaOptions,
	TLStoreWithStatus,
	TLUser,
	TLUserStore,
	UserRecordType,
	computed,
	createTLStore,
	createUserId,
	defaultUserPreferences,
	defaultUserStore,
	getDefaultUserPresence,
	getUserPreferences,
	uniqueId,
	useEvent,
	useReactiveEvent,
	useRefState,
	useTLSchemaFromUtils,
	useValue,
} from 'tldraw'

const MULTIPLAYER_EVENT_NAME = 'multiplayer.client'

const defaultCustomMessageHandler: TLCustomMessageHandler = () => {}

/**
 * A store wrapper specifically for remote collaboration that excludes local-only states.
 * This type represents a tldraw store that is synchronized with a remote multiplayer server.
 *
 * Unlike the base TLStoreWithStatus, this excludes 'synced-local' and 'not-synced' states
 * since remote stores are always either loading, connected to a server, or in an error state.
 *
 * @example
 * ```tsx
 * function MyCollaborativeApp() {
 *   const store: RemoteTLStoreWithStatus = useSync({
 *     uri: 'wss://myserver.com/sync/room-123',
 *     assets: myAssetStore
 *   })
 *
 *   if (store.status === 'loading') {
 *     return <div>Connecting to multiplayer session...</div>
 *   }
 *
 *   if (store.status === 'error') {
 *     return <div>Connection failed: {store.error.message}</div>
 *   }
 *
 *   // store.status === 'synced-remote'
 *   return <Tldraw store={store.store} />
 * }
 * ```
 *
 * @public
 */
export type RemoteTLStoreWithStatus = Exclude<
	TLStoreWithStatus,
	{ status: 'synced-local' } | { status: 'not-synced' }
>

/**
 * Creates a reactive store synchronized with a multiplayer server for real-time collaboration.
 *
 * This hook manages the complete lifecycle of a collaborative tldraw session, including
 * WebSocket connection establishment, state synchronization, user presence, and error handling.
 * The returned store can be passed directly to the Tldraw component to enable multiplayer features.
 *
 * The store progresses through multiple states:
 * - `loading`: Establishing connection and synchronizing initial state
 * - `synced-remote`: Successfully connected and actively synchronizing changes
 * - `error`: Connection failed or synchronization error occurred
 *
 * For optimal performance with media assets, provide an `assets` store that implements
 * external blob storage. Without this, large images and videos will be stored inline
 * as base64, causing performance issues during serialization.
 *
 * @param opts - Configuration options for multiplayer synchronization
 *   - `uri` - WebSocket server URI (string or async function returning URI)
 *   - `assets` - Asset store for blob storage (required for production use)
 *   - `users` - User store for identity, presence and attribution
 *   - `getUserPresence` - Optional function to customize presence data
 *   - `onCustomMessageReceived` - Handler for custom socket messages
 *   - `roomId` - Room identifier for analytics (internal use)
 *   - `onMount` - Callback when editor mounts (internal use)
 *   - `trackAnalyticsEvent` - Analytics event tracker (internal use)
 *
 * @returns A reactive store wrapper with connection status and synchronized store
 *
 * @example
 * ```tsx
 * // Basic multiplayer setup
 * function CollaborativeApp() {
 *   const store = useSync({
 *     uri: 'wss://myserver.com/sync/room-123',
 *     assets: myAssetStore,
 *     users: {
 *       getCurrentUser: () => ({ id: 'user-1', name: 'Alice', color: '#ff0000', meta: {} }),
 *     }
 *   })
 *
 *   if (store.status === 'loading') {
 *     return <div>Connecting to collaboration session...</div>
 *   }
 *
 *   if (store.status === 'error') {
 *     return <div>Failed to connect: {store.error.message}</div>
 *   }
 *
 *   return <Tldraw store={store.store} />
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Dynamic authentication with user store
 * function AuthenticatedApp() {
 *   const store = useSync({
 *     uri: async () => {
 *       const token = await getAuthToken()
 *       return `wss://myserver.com/sync/room-123?token=${token}`
 *     },
 *     assets: authenticatedAssetStore,
 *     users: myUserStore,
 *     getUserPresence: (store, user) => {
 *       return {
 *         userId: user.id,
 *         userName: user.name,
 *         cursor: getCurrentCursor(store)
 *       }
 *     }
 *   })
 *
 *   return <Tldraw store={store.store} />
 * }
 * ```
 *
 * @public
 */
export function useSync(opts: UseSyncOptions & TLStoreSchemaOptions): RemoteTLStoreWithStatus {
	const [state, setState] = useRefState<{
		readyClient?: TLSyncClient<TLRecord, TLStore>
		error?: Error
	} | null>(null)
	const {
		uri,
		roomId = 'default',
		assets,
		users: _users,
		onMount,
		connect,
		trackAnalyticsEvent: track,
		getUserPresence: _getUserPresence,
		onCustomMessageReceived: _onCustomMessageReceived,
		...schemaOpts
	} = opts

	// This line will throw a type error if we add any new options to the useSync hook but we don't destructure them
	// This is required because otherwise the useTLSchemaFromUtils might return a new schema on every render if the newly-added option
	// is allowed to be unstable
	const __never__: never = 0 as any as keyof Omit<typeof schemaOpts, keyof TLStoreSchemaOptions>

	const schema = useTLSchemaFromUtils(schemaOpts)

	const getUserPresence = useReactiveEvent(
		(_getUserPresence ?? getDefaultUserPresence) as typeof getDefaultUserPresence
	)
	const onCustomMessageReceived = useEvent(_onCustomMessageReceived ?? defaultCustomMessageHandler)

	useEffect(() => {
		const storeId = uniqueId()

		const users: Required<TLUserStore> = _users
			? {
					getCurrentUser: _users.getCurrentUser,
					resolve:
						_users.resolve ??
						((userId) => {
							const current = _users.getCurrentUser()
							return current && current.id === createUserId(userId) ? current : null
						}),
				}
			: {
					getCurrentUser: defaultUserStore.getCurrentUser,
					resolve: (userId) => {
						const current = defaultUserStore.getCurrentUser()
						if (current && current.id === createUserId(userId)) return current
						const presences = store.query.records('instance_presence').get()
						const match = presences.find((p) => p.userId === userId)
						if (match) {
							return UserRecordType.create({
								id: createUserId(userId),
								name: match.userName,
								color: match.color,
							})
						}
						return null
					},
				}

		const currentUser = computed<TLUser>('currentUser', () => {
			const user = users.getCurrentUser()
			if (user) return user
			const prefs = getUserPreferences()
			return UserRecordType.create({
				id: createUserId(prefs.id),
				name: prefs.name ?? '',
				color: prefs.color ?? defaultUserPreferences.color,
			})
		})

		let socket: TLPersistentClientSocket<
			TLSocketClientSentEvent<TLRecord>,
			TLSocketServerSentEvent<TLRecord>
		>
		if (connect) {
			if (uri) {
				throw new Error('uri and connect cannot be used together')
			}

			socket = connect({
				sessionId: TAB_ID,
				storeId,
			}) as TLPersistentClientSocket<
				TLSocketClientSentEvent<TLRecord>,
				TLSocketServerSentEvent<TLRecord>
			>
		} else if (uri) {
			if (connect) {
				throw new Error('uri and connect cannot be used together')
			}

			socket = new ClientWebSocketAdapter(async () => {
				const uriString = typeof uri === 'string' ? uri : await uri()

				// set sessionId as a query param on the uri
				const withParams = new URL(uriString)
				if (withParams.searchParams.has('sessionId')) {
					throw new Error(
						'useSync. "sessionId" is a reserved query param name. Please use a different name'
					)
				}
				if (withParams.searchParams.has('storeId')) {
					throw new Error(
						'useSync. "storeId" is a reserved query param name. Please use a different name'
					)
				}

				withParams.searchParams.set('sessionId', TAB_ID)
				withParams.searchParams.set('storeId', storeId)
				return withParams.toString()
			})
		} else {
			throw new Error('uri or connect must be provided')
		}

		let didCancel = false

		function getConnectionStatus() {
			return socket.connectionStatus === 'error' ? 'offline' : socket.connectionStatus
		}
		const collaborationStatusSignal = atom('collaboration status', getConnectionStatus())
		const unsubscribeFromConnectionStatus = socket.onStatusChange(() => {
			collaborationStatusSignal.set(getConnectionStatus())
		})

		const syncMode = atom('sync mode', 'readwrite' as 'readonly' | 'readwrite')

		const store = createTLStore({
			id: storeId,
			schema,
			assets,
			users,
			onMount,
			collaboration: {
				status: collaborationStatusSignal,
				mode: syncMode,
			},
		})

		const presence = computed('instancePresence', () => {
			const presenceState = getUserPresence(store, currentUser.get())
			if (!presenceState) return null

			return InstancePresenceRecordType.create({
				...presenceState,
				id: InstancePresenceRecordType.createId(store.id),
			})
		})

		const otherUserPresences = store.query.ids('instance_presence', () => ({
			userId: { neq: currentUser.get().id },
		}))

		const presenceMode = computed<TLPresenceMode>('presenceMode', () => {
			if (otherUserPresences.get().size === 0) return 'solo'
			return 'full'
		})

		const client = new TLSyncClient<TLRecord, TLStore>({
			store,
			socket,
			didCancel: () => didCancel,
			onLoad(client) {
				track?.(MULTIPLAYER_EVENT_NAME, { name: 'load', roomId })
				setState({ readyClient: client })
			},
			onSyncError(reason) {
				console.error('sync error', reason)

				switch (reason) {
					case TLSyncErrorCloseEventReason.NOT_FOUND:
						track?.(MULTIPLAYER_EVENT_NAME, { name: 'room-not-found', roomId })
						break
					case TLSyncErrorCloseEventReason.FORBIDDEN:
						track?.(MULTIPLAYER_EVENT_NAME, { name: 'forbidden', roomId })
						break
					case TLSyncErrorCloseEventReason.NOT_AUTHENTICATED:
						track?.(MULTIPLAYER_EVENT_NAME, { name: 'not-authenticated', roomId })
						break
					case TLSyncErrorCloseEventReason.RATE_LIMITED:
						track?.(MULTIPLAYER_EVENT_NAME, { name: 'rate-limited', roomId })
						break
					default:
						track?.(MULTIPLAYER_EVENT_NAME, { name: 'sync-error:' + reason, roomId })
						break
				}

				setState({ error: new TLRemoteSyncError(reason) })
				socket.close()
			},
			onAfterConnect(_, { isReadonly }) {
				transact(() => {
					syncMode.set(isReadonly ? 'readonly' : 'readwrite')
					// if the server crashes and loses all data it can return an empty document
					// when it comes back up. This is a safety check to make sure that if something like
					// that happens, it won't render the app broken and require a restart. The user will
					// most likely lose all their changes though since they'll have been working with pages
					// that won't exist. There's certainly something we can do to make this better.
					// but the likelihood of this happening is very low and maybe not worth caring about beyond this.
					store.ensureStoreIsUsable()
				})
			},
			onCustomMessageReceived,
			presence,
			presenceMode,
		})

		return () => {
			didCancel = true
			unsubscribeFromConnectionStatus()
			client.close()
			socket.close()
		}
	}, [
		assets,
		onMount,
		connect,
		_users,
		roomId,
		schema,
		setState,
		track,
		uri,
		getUserPresence,
		onCustomMessageReceived,
	])

	return useValue<RemoteTLStoreWithStatus>(
		'remote synced store',
		() => {
			if (!state) return { status: 'loading' }
			if (state.error) return { status: 'error', error: state.error }
			if (!state.readyClient) return { status: 'loading' }
			const connectionStatus = state.readyClient.socket.connectionStatus
			return {
				status: 'synced-remote',
				connectionStatus: connectionStatus === 'error' ? 'offline' : connectionStatus,
				store: state.readyClient.store,
			}
		},
		[state]
	)
}

/**
 * Configuration options for the {@link useSync} hook to establish multiplayer collaboration.
 *
 * This interface defines the required and optional settings for connecting to a multiplayer
 * server, managing user presence, handling assets, and customizing the collaboration experience.
 *
 * @example
 * ```tsx
 * const syncOptions: UseSyncOptions = {
 *   uri: 'wss://myserver.com/sync/room-123',
 *   assets: myAssetStore,
 *   users: {
 *     getCurrentUser: () => ({ id: 'user-1', name: 'Alice', color: '#ff0000', meta: {} }),
 *   },
 *   getUserPresence: (store, user) => ({
 *     userId: user.id,
 *     userName: user.name,
 *     cursor: getCursorPosition()
 *   })
 * }
 * ```
 *
 * @public
 */
export interface UseSyncOptionsBase {
	/**
	 * Asset store implementation for handling file uploads and storage.
	 *
	 * Required for production applications to handle images, videos, and other
	 * media efficiently. Without an asset store, files are stored inline as
	 * base64, which causes performance issues with large files.
	 *
	 * The asset store must implement upload (for new files) and resolve
	 * (for displaying existing files) methods. For prototyping, you can use
	 * {@link @tldraw/editor#inlineBase64AssetStore} but this is not recommended for production.
	 *
	 * @example
	 * ```ts
	 * const myAssetStore: TLAssetStore = {
	 *   upload: async (asset, file) => {
	 *     const url = await uploadToCloudStorage(file)
	 *     return { src: url }
	 *   },
	 *   resolve: (asset, context) => {
	 *     return getOptimizedUrl(asset.src, context)
	 *   }
	 * }
	 * ```
	 */
	assets: TLAssetStore

	/**
	 * User store for identity, presence and attribution.
	 *
	 * Provides `getCurrentUser()` for the current user's identity (used for
	 * both presence broadcasting and shape attribution) and optionally
	 * `resolve(userId)` for looking up other users by ID. If not provided,
	 * a default implementation backed by localStorage user preferences is
	 * used, with `resolve` falling back to presence records in the store.
	 */
	users?: TLUserStore

	/**
	 * Handler for receiving custom messages sent through the multiplayer connection.
	 *
	 * Use this to implement custom communication channels between clients beyond
	 * the standard shape and presence synchronization. Messages are sent using
	 * the TLSyncClient's sendMessage method.
	 *
	 * @param data - The custom message data received from another client
	 *
	 * @example
	 * ```ts
	 * onCustomMessageReceived: (data) => {
	 *   if (data.type === 'chat') {
	 *     displayChatMessage(data.message, data.userId)
	 *   }
	 * }
	 * ```
	 */
	onCustomMessageReceived?(data: any): void

	/** @internal */
	onMount?(editor: Editor): void
	/** @internal used for analytics only, we should refactor this away */
	roomId?: string
	/** @internal */
	trackAnalyticsEvent?(name: string, data: { [key: string]: any }): void

	/**
	 * A reactive function that returns a {@link @tldraw/tlschema#TLInstancePresence} object.
	 *
	 * This function is called reactively whenever the store state changes and
	 * determines what presence information to broadcast to other clients. The
	 * result is synchronized across all connected clients for displaying cursors,
	 * selections, and other collaborative indicators.
	 *
	 * If not provided, uses the default implementation which includes standard
	 * cursor position and selection state. Custom implementations allow you to
	 * add additional presence data like current tool, view state, or custom status.
	 *
	 * See {@link @tldraw/tlschema#getDefaultUserPresence} for
	 * the default implementation of this function.
	 *
	 * @param store - The current TLStore
	 * @param user - The current user information
	 * @returns Presence state to broadcast to other clients, or null to hide presence
	 *
	 * @example
	 * ```ts
	 * getUserPresence: (store, user) => {
	 *   return {
	 *     userId: user.id,
	 *     userName: user.name,
	 *     cursor: { x: 100, y: 200 },
	 *     currentTool: 'select',
	 *     isActive: true
	 *   }
	 * }
	 * ```
	 */
	getUserPresence?(store: TLStore, user: TLUser): TLPresenceStateInfo | null
}

/** @public */
export interface UseSyncOptionsWithUri extends UseSyncOptionsBase {
	/**
	 * The WebSocket URI of the multiplayer server for real-time synchronization.
	 *
	 * Must include the protocol (wss:// for secure, ws:// for local development).
	 * HTTP/HTTPS URLs will be automatically upgraded to WebSocket connections.
	 *
	 * Can be a static string or a function that returns a URI (useful for dynamic
	 * authentication tokens or room routing). The function is called on each
	 * connection attempt, allowing for token refresh and dynamic routing.
	 *
	 * Reserved query parameters `sessionId` and `storeId` are automatically added
	 * by the sync system and should not be included in your URI.
	 *
	 * @example
	 * ```ts
	 * // Static URI
	 * uri: 'wss://myserver.com/sync/room-123'
	 *
	 * // Dynamic URI with authentication
	 * uri: async () => {
	 *   const token = await getAuthToken()
	 *   return `wss://myserver.com/sync/room-123?token=${token}`
	 * }
	 * ```
	 */
	uri: string | (() => string | Promise<string>)
	connect?: never
}

/** @public */
export interface UseSyncOptionsWithConnectFn extends UseSyncOptionsBase {
	/**
	 * Create a connection to the server. Mostly you should use {@link UseSyncOptionsWithUri.uri}
	 * instead, but this is useful if you want to use a custom transport to connect to the server,
	 * instead of our default websocket-based transport.
	 */
	connect: UseSyncConnectFn
	uri?: never
}

/** @public */
export type UseSyncConnectFn = (query: {
	sessionId: string
	storeId: string
}) => TLPersistentClientSocket

/**
 * Options for the {@link useSync} hook.
 * @public
 */
export type UseSyncOptions = UseSyncOptionsWithUri | UseSyncOptionsWithConnectFn
