import {
	ClientWebSocketAdapter,
	TLCloseEventCode,
	TLIncompatibilityReason,
	TLPersistentClientSocketStatus,
	TLRemoteSyncError,
	TLSyncClient,
} from '@tldraw/sync-core'
import { useEffect } from 'react'
import {
	Editor,
	Signal,
	TAB_ID,
	TLAssetStore,
	TLRecord,
	TLStore,
	TLStoreSchemaOptions,
	TLStoreWithStatus,
	TLUserPreferences,
	computed,
	createPresenceStateDerivation,
	createTLStore,
	defaultUserPreferences,
	getUserPreferences,
	uniqueId,
	useRefState,
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
 * useMultiplayerSync creates a store that is synced with a multiplayer server.
 *
 * The store can be passed directly into the `<Tldraw />` component to enable multiplayer features.
 * It will handle loading states, and enable multiplayer UX like cursors & a presence menu.
 *
 * To enable external blob storage, you should also pass in an `assets` object that implements the `TLAssetStore` interface.
 * If you don't do this, adding large images and videos to rooms will cause performance issues at serialization boundaries.
 *
 * @param opts - Options for the multiplayer sync store. See {@link UseMultiplayerSyncOptions} and {@link tldraw#TLStoreSchemaOptions}.
 *
 * @public
 */
export function useMultiplayerSync(
	opts: UseMultiplayerSyncOptions & TLStoreSchemaOptions
): RemoteTLStoreWithStatus {
	const [state, setState] = useRefState<{
		readyClient?: TLSyncClient<TLRecord, TLStore>
		error?: Error
	} | null>(null)
	const {
		uri,
		roomId = 'default',
		userPreferences: prefs,
		assets,
		onEditorMount,
		trackAnalyticsEvent: track,
		...schemaOpts
	} = opts

	const schema = useTLSchemaFromUtils(schemaOpts)

	useEffect(() => {
		const storeId = uniqueId()

		const userPreferences = computed<{ id: string; color: string; name: string }>(
			'userPreferences',
			() => {
				const user = prefs?.get() ?? getUserPreferences()
				return {
					id: user.id,
					color: user.color ?? defaultUserPreferences.color,
					name: user.name ?? defaultUserPreferences.name,
				}
			}
		)

		const socket = new ClientWebSocketAdapter(async () => {
			// set sessionId as a query param on the uri
			const withParams = new URL(uri)
			withParams.searchParams.set('sessionId', TAB_ID)
			withParams.searchParams.set('storeId', storeId)
			return withParams.toString()
		})

		socket.onStatusChange((val: TLPersistentClientSocketStatus, closeCode?: number) => {
			if (val === 'error' && closeCode === TLCloseEventCode.NOT_FOUND) {
				track?.(MULTIPLAYER_EVENT_NAME, { name: 'room-not-found', roomId })
				setState({ error: new TLRemoteSyncError(TLIncompatibilityReason.RoomNotFound) })
				client.close()
				socket.close()
				return
			}
		})

		let didCancel = false

		const store = createTLStore({
			id: storeId,
			schema,
			assets,
			onEditorMount,
			multiplayerStatus: computed('multiplayer status', () =>
				socket.connectionStatus === 'error' ? 'offline' : socket.connectionStatus
			),
		})

		const client = new TLSyncClient({
			store,
			socket,
			didCancel: () => didCancel,
			onLoad(client) {
				track?.(MULTIPLAYER_EVENT_NAME, { name: 'load', roomId })
				setState({ readyClient: client })
			},
			onLoadError(err) {
				track?.(MULTIPLAYER_EVENT_NAME, { name: 'load-error', roomId })
				console.error(err)
				setState({ error: err })
			},
			onSyncError(reason) {
				track?.(MULTIPLAYER_EVENT_NAME, { name: 'sync-error', roomId, reason })
				setState({ error: new TLRemoteSyncError(reason) })
			},
			onAfterConnect() {
				// if the server crashes and loses all data it can return an empty document
				// when it comes back up. This is a safety check to make sure that if something like
				// that happens, it won't render the app broken and require a restart. The user will
				// most likely lose all their changes though since they'll have been working with pages
				// that won't exist. There's certainly something we can do to make this better.
				// but the likelihood of this happening is very low and maybe not worth caring about beyond this.
				store.ensureStoreIsUsable()
			},
			presence: createPresenceStateDerivation(userPreferences)(store),
		})

		return () => {
			didCancel = true
			client.close()
			socket.close()
			setState(null)
		}
	}, [assets, onEditorMount, prefs, roomId, schema, setState, track, uri])

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
 * Options for the {@link useMultiplayerSync} hook.
 * @public
 */
export interface UseMultiplayerSyncOptions {
	/**
	 * The URI of the multiplayer server. This must include the protocol, e.g. `wss://server.example.com` or `http://localhost:5858`.
	 */
	uri: string
	/**
	 * The user information. If not provided, a default implementation based on localStorage is used.
	 */
	userPreferences?: Signal<TLUserPreferences>
	/**
	 * The asset store for blob storage. See {@link tldraw#TLAssetStore}.
	 * If not provided assets will be stored as base64 strings in the document, which can cause performance issues at serialization boundaries.
	 */
	assets?: Partial<TLAssetStore>
	/**
	 * Called when the editor is mounted. Can be used to configure the editor, e.g. registering external asset handlers.
	 */
	onEditorMount?: (editor: Editor) => void

	/** @internal used for analytics only, we should refactor this away */
	roomId?: string
	/** @internal */
	trackAnalyticsEvent?(name: string, data: { [key: string]: any }): void
}
