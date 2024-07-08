import {
	ClientWebSocketAdapter,
	TLCloseEventCode,
	TLIncompatibilityReason,
	TLPersistentClientSocketStatus,
	TLRemoteSyncError,
	TLSyncClient,
	schema,
} from '@tldraw/sync'
import { useEffect, useState } from 'react'
import {
	Editor,
	Signal,
	TAB_ID,
	TLAssetStore,
	TLRecord,
	TLStore,
	TLStoreWithStatus,
	TLUserPreferences,
	computed,
	createPresenceStateDerivation,
	defaultUserPreferences,
	getUserPreferences,
	useTLStore,
	useValue,
} from 'tldraw'

const MULTIPLAYER_EVENT_NAME = 'multiplayer.client'

/** @public */
export type RemoteTLStoreWithStatus = Exclude<
	TLStoreWithStatus,
	{ status: 'synced-local' } | { status: 'not-synced' }
>

/** @public */
export function useMultiplayerSync(opts: UseMultiplayerSyncOptions): RemoteTLStoreWithStatus {
	const [state, setState] = useState<{
		readyClient?: TLSyncClient<TLRecord, TLStore>
		error?: Error
	} | null>(null)
	const { uri, roomId = 'default', userPreferences: prefs, assets, onMountEditor } = opts

	const store = useTLStore({ schema, assets, onMountEditor })

	const error: NonNullable<typeof state>['error'] = state?.error ?? undefined
	const track = opts.trackAnalyticsEvent

	useEffect(() => {
		if (error) return

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
			// set sessionKey as a query param on the uri
			const withParams = new URL(uri)
			withParams.searchParams.set('sessionKey', TAB_ID)
			withParams.searchParams.set('storeId', store.id)
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
		}
	}, [prefs, roomId, store, uri, error, track])

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

/** @public */
export interface UseMultiplayerSyncOptions {
	uri: string
	roomId?: string
	userPreferences?: Signal<TLUserPreferences>
	/* @internal */
	trackAnalyticsEvent?(name: string, data: { [key: string]: any }): void
	assets?: Partial<TLAssetStore>
	onMountEditor?: (editor: Editor) => void
}
