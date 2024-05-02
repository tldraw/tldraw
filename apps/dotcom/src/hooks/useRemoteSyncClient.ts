import {
	TLCloseEventCode,
	TLIncompatibilityReason,
	TLPersistentClientSocketStatus,
	TLSyncClient,
	schema,
} from '@tldraw/tlsync'
import { useEffect, useState } from 'react'
import {
	TAB_ID,
	TLRecord,
	TLStore,
	TLStoreWithStatus,
	computed,
	createPresenceStateDerivation,
	defaultUserPreferences,
	getUserPreferences,
	useTLStore,
	useValue,
} from 'tldraw'
import { ClientWebSocketAdapter } from '../utils/remote-sync/ClientWebSocketAdapter'
import { RemoteSyncError, UseSyncClientConfig } from '../utils/remote-sync/remote-sync'
import { trackAnalyticsEvent } from '../utils/trackAnalyticsEvent'

const MULTIPLAYER_EVENT_NAME = 'multiplayer.client'

/** @public */
export type RemoteTLStoreWithStatus = Exclude<
	TLStoreWithStatus,
	{ status: 'synced-local' } | { status: 'not-synced' }
>

/** @public */
export function useRemoteSyncClient(opts: UseSyncClientConfig): RemoteTLStoreWithStatus {
	const [state, setState] = useState<{
		readyClient?: TLSyncClient<TLRecord, TLStore>
		error?: Error
	} | null>(null)
	const { uri, roomId = 'default', userPreferences: prefs } = opts

	const store = useTLStore({ schema })

	const error: NonNullable<typeof state>['error'] = state?.error ?? undefined

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
				trackAnalyticsEvent(MULTIPLAYER_EVENT_NAME, { name: 'room-not-found', roomId })
				setState({ error: new RemoteSyncError(TLIncompatibilityReason.RoomNotFound) })
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
				trackAnalyticsEvent(MULTIPLAYER_EVENT_NAME, { name: 'load', roomId })
				setState({ readyClient: client })
			},
			onLoadError(err) {
				trackAnalyticsEvent(MULTIPLAYER_EVENT_NAME, { name: 'load-error', roomId })
				console.error(err)
				setState({ error: err })
			},
			onSyncError(reason) {
				trackAnalyticsEvent(MULTIPLAYER_EVENT_NAME, { name: 'sync-error', roomId, reason })
				setState({ error: new RemoteSyncError(reason) })
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
	}, [prefs, roomId, store, uri, error])

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
