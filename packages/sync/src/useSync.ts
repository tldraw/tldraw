import { atom, isSignal, transact } from '@tldraw/state'
import { useAtom } from '@tldraw/state-react'
import {
	ClientWebSocketAdapter,
	TLRemoteSyncError,
	TLSyncClient,
	TLSyncErrorCloseEventReason,
} from '@tldraw/sync-core'
import { useEffect } from 'react'
import {
	Editor,
	InstancePresenceRecordType,
	Signal,
	TAB_ID,
	TLAssetStore,
	TLPresenceStateInfo,
	TLPresenceUserInfo,
	TLRecord,
	TLStore,
	TLStoreSchemaOptions,
	TLStoreWithStatus,
	computed,
	createTLStore,
	defaultUserPreferences,
	getDefaultUserPresence,
	getUserPreferences,
	uniqueId,
	useReactiveEvent,
	useRefState,
	useShallowObjectIdentity,
	useTLSchemaFromUtils,
	useValue,
} from 'tldraw'

const MULTIPLAYER_EVENT_NAME = 'multiplayer.client'

/** @public */
export type RemoteTLStoreWithStatus = Exclude<
	TLStoreWithStatus,
	{ status: 'synced-local' } | { status: 'not-synced' }
>

/**
 * useSync creates a store that is synced with a multiplayer server.
 *
 * The store can be passed directly into the `<Tldraw />` component to enable multiplayer features.
 * It will handle loading states, and enable multiplayer UX like user cursors and following.
 *
 * To enable external blob storage, you should also pass in an `assets` object that implements the {@link tldraw#TLAssetStore} interface.
 * If you don't do this, adding large images and videos to rooms will cause performance issues at serialization boundaries.
 *
 * @example
 * ```tsx
 * function MyApp() {
 *     const store = useSync({
 *         uri: 'wss://myapp.com/sync/my-test-room',
 *         assets: myAssetStore
 *     })
 *     return <Tldraw store={store} />
 * }
 *
 * ```
 * @param opts - Options for the multiplayer sync store. See {@link UseSyncOptions} and {@link tldraw#TLStoreSchemaOptions}.
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
		onMount,
		trackAnalyticsEvent: track,
		userInfo,
		getUserPresence: _getUserPresence,
		...schemaOpts
	} = opts

	// This line will throw a type error if we add any new options to the useSync hook but we don't destructure them
	// This is required because otherwise the useTLSchemaFromUtils might return a new schema on every render if the newly-added option
	// is allowed to be unstable (e.g. userInfo)
	const __never__: never = 0 as any as keyof Omit<typeof schemaOpts, keyof TLStoreSchemaOptions>

	const schema = useTLSchemaFromUtils(schemaOpts)

	const prefs = useShallowObjectIdentity(userInfo)
	const getUserPresence = useReactiveEvent(_getUserPresence ?? getDefaultUserPresence)

	const userAtom = useAtom<TLPresenceUserInfo | Signal<TLPresenceUserInfo> | undefined>(
		'userAtom',
		prefs
	)

	useEffect(() => {
		userAtom.set(prefs)
	}, [prefs, userAtom])

	useEffect(() => {
		const storeId = uniqueId()

		const userPreferences = computed<{ id: string; color: string; name: string }>(
			'userPreferences',
			() => {
				const userStuff = userAtom.get()
				const user = (isSignal(userStuff) ? userStuff.get() : userStuff) ?? getUserPreferences()
				return {
					id: user.id,
					color: user.color ?? defaultUserPreferences.color,
					name: user.name ?? defaultUserPreferences.name,
				}
			}
		)

		const socket = new ClientWebSocketAdapter(async () => {
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

		let didCancel = false

		const collaborationStatusSignal = computed('collaboration status', () =>
			socket.connectionStatus === 'error' ? 'offline' : socket.connectionStatus
		)

		const syncMode = atom('sync mode', 'readwrite' as 'readonly' | 'readwrite')

		const store = createTLStore({
			id: storeId,
			schema,
			assets,
			onMount,
			collaboration: {
				status: collaborationStatusSignal,
				mode: syncMode,
			},
		})

		const presence = computed('instancePresence', () => {
			const presenceState = getUserPresence(store, userPreferences.get())
			if (!presenceState) return null

			return InstancePresenceRecordType.create({
				...presenceState,
				id: InstancePresenceRecordType.createId(store.id),
			})
		})

		const client = new TLSyncClient({
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
			presence,
		})

		return () => {
			didCancel = true
			client.close()
			socket.close()
			setState(null)
		}
	}, [assets, onMount, userAtom, roomId, schema, setState, track, uri, getUserPresence])

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
 * Options for the {@link useSync} hook.
 * @public
 */
export interface UseSyncOptions {
	/**
	 * The URI of the multiplayer server. This must include the protocol,
	 *
	 *   e.g. `wss://server.example.com/my-room` or `ws://localhost:5858/my-room`.
	 *
	 * Note that the protocol can also be `https` or `http` and it will upgrade to a websocket
	 * connection.
	 *
	 * Optionally, you can pass a function which will be called each time a connection is
	 * established to get the URI. This is useful if you need to include e.g. a short-lived session
	 * token for authentication.
	 */
	uri: string | (() => string | Promise<string>)
	/**
	 * A signal that contains the user information needed for multiplayer features.
	 * This should be synchronized with the `userPreferences` configuration for the main `<Tldraw />` component.
	 * If not provided, a default implementation based on localStorage will be used.
	 */
	userInfo?: TLPresenceUserInfo | Signal<TLPresenceUserInfo>
	/**
	 * The asset store for blob storage. See {@link tldraw#TLAssetStore}.
	 *
	 * If you don't have time to implement blob storage and just want to get started, you can use the inline base64 asset store. {@link tldraw#inlineBase64AssetStore}
	 * Note that storing base64 blobs inline in JSON is very inefficient and will cause performance issues quickly with large images and videos.
	 */
	assets: TLAssetStore

	/** @internal */
	onMount?(editor: Editor): void
	/** @internal used for analytics only, we should refactor this away */
	roomId?: string
	/** @internal */
	trackAnalyticsEvent?(name: string, data: { [key: string]: any }): void

	/**
	 * A reactive function that returns a {@link @tldraw/tlschema#TLInstancePresence} object. The
	 * result of this function will be synchronized across all clients to display presence
	 * indicators such as cursors. See {@link @tldraw/tlschema#getDefaultUserPresence} for
	 * the default implementation of this function.
	 */
	getUserPresence?(store: TLStore, user: TLPresenceUserInfo): TLPresenceStateInfo | null
}
