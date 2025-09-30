import { atom, computed, transact } from '@tldraw/state'
import {
	TLSyncClient,
	TLSyncErrorCloseEventReason,
	type TLPersistentClientSocket,
	type TLPresenceMode,
} from '@tldraw/sync-core'
import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import {
	AssetRecordType,
	createTLStore,
	getDefaultUserPresence,
	getHashForString,
	InstancePresenceRecordType,
	TAB_ID,
	TLAssetStore,
	TLBookmarkAsset,
	Tldraw,
	TLRecord,
	TLStore,
	uniqueId,
	type TLStoreWithStatus,
} from 'tldraw'
import { ClientToServerMessage, ServerToClientMessage } from '../server/server'

const WORKER_URL = `http://localhost:5858`
const roomId = 'test-room'

function App() {
	const [storeWithStatus, setStoreWithStatus] = useState<TLStoreWithStatus | null>(null)

	useEffect(() => {
		// Generate unique identifiers
		const storeId = uniqueId()

		// User preferences (in real app, this would come from your auth system)
		const userPreferences = {
			id: 'user-' + uniqueId(),
			name: 'User ' + Math.floor(Math.random() * 1000),
			color: '#' + Math.floor(Math.random() * 16777215).toString(16),
		}

		const ioSocket: Socket<ServerToClientMessage, ClientToServerMessage> = io(WORKER_URL, {
			query: {
				sessionId: TAB_ID,
				storeId: storeId,
				roomId: roomId,
			},
		})

		const socket: TLPersistentClientSocket<TLRecord> = {
			connectionStatus: 'offline',

			sendMessage: (message) => {
				console.log('📤 Sending:', message)
				ioSocket.emit('tldraw-message', JSON.stringify(message))
			},

			onReceiveMessage: (callback) => {
				// Listen for tldraw sync protocol messages
				const handler = (message: any) => {
					console.log('📥 Received:', message)
					callback(message)
				}

				ioSocket.on('tldraw-message', handler)

				// Return cleanup function
				return () => {
					ioSocket.off('tldraw-message', handler)
				}
			},

			onStatusChange: (callback) => {
				// Map Socket.IO events to TLPersistentClientSocket status
				const connectHandler = () => {
					;(socket as any).connectionStatus = 'online'
					callback({ status: 'online' })
				}

				const disconnectHandler = () => {
					;(socket as any).connectionStatus = 'offline'
					callback({ status: 'offline' })
				}

				const errorHandler = (error: any) => {
					;(socket as any).connectionStatus = 'error'
					callback({
						status: 'error',
						reason: error.message || 'Connection error',
					})
				}

				ioSocket.on('connect', connectHandler)
				ioSocket.on('disconnect', disconnectHandler)
				ioSocket.on('connect_error', errorHandler)

				// Set initial status
				if (ioSocket.connected) {
					;(socket as any).connectionStatus = 'online'
					setTimeout(() => callback({ status: 'online' }), 0)
				}

				// Return cleanup function
				return () => {
					ioSocket.off('connect', connectHandler)
					ioSocket.off('disconnect', disconnectHandler)
					ioSocket.off('connect_error', errorHandler)
				}
			},

			restart: () => {
				console.log('🔄 Restarting Socket.IO connection...')
				ioSocket.disconnect()
				ioSocket.connect()
			},
		}

		// Track connection status for collaboration UX
		const collaborationStatus = computed('collaboration status', () =>
			socket.connectionStatus === 'error' ? 'offline' : socket.connectionStatus
		)

		// Track read/write mode
		const syncMode = atom('sync mode', 'readwrite' as 'readonly' | 'readwrite')

		// Create the store with collaboration status
		const store = createTLStore({
			id: storeId,
			assets: multiplayerAssets,
			collaboration: {
				status: collaborationStatus,
				mode: syncMode,
			},
		})

		// Create presence signal using tldraw's built-in logic
		const presence = computed('instancePresence', () => {
			const presenceState = getDefaultUserPresence(store, userPreferences)
			if (!presenceState) return null

			return InstancePresenceRecordType.create({
				...presenceState,
				id: InstancePresenceRecordType.createId(store.id),
			})
		})

		// Track other users for presence mode
		const otherUserPresences = store.query.ids('instance_presence', () => ({
			userId: { neq: userPreferences.id },
		}))

		const presenceMode = computed<TLPresenceMode>('presenceMode', () => {
			if (otherUserPresences.get().size === 0) return 'solo'
			return 'full'
		})

		// Track cancellation state
		let didCancel = false

		// Create the sync client (mirrors useSync implementation)
		const client = new TLSyncClient<TLRecord, TLStore>({
			store,
			socket,
			presence,
			presenceMode,
			didCancel: () => didCancel,

			onLoad: (_client) => {
				console.log('✅ Custom sync client loaded and ready')
				// Set the store as ready
				setStoreWithStatus({
					store,
					status: 'synced-remote',
					connectionStatus: 'online',
				})
			},

			onSyncError: (reason) => {
				console.error('❌ Custom sync error:', reason)

				// Handle specific error types
				switch (reason) {
					case TLSyncErrorCloseEventReason.NOT_FOUND:
						console.error('Room not found')
						break
					case TLSyncErrorCloseEventReason.FORBIDDEN:
						console.error('Access forbidden')
						break
					case TLSyncErrorCloseEventReason.NOT_AUTHENTICATED:
						console.error('Authentication required')
						break
					case TLSyncErrorCloseEventReason.RATE_LIMITED:
						console.error('Rate limited - too many requests')
						break
					case TLSyncErrorCloseEventReason.ROOM_FULL:
						console.error('Room is full')
						break
					default:
						console.error('Unknown sync error:', reason)
				}

				// Set error state
				setStoreWithStatus({
					status: 'error',
					error: new Error(reason),
				})
			},

			onAfterConnect: (_client, { isReadonly }) => {
				console.log('🔄 Custom client connected to room', { isReadonly })

				// Update sync mode and ensure store is usable
				transact(() => {
					syncMode.set(isReadonly ? 'readonly' : 'readwrite')
					store.ensureStoreIsUsable()
				})
			},

			// Optional: Handle custom messages
			onCustomMessageReceived: (message) => {
				console.log('📨 Custom message received:', message)
				// Process your custom server messages here
			},
		})

		// Cleanup function
		const cleanup = () => {
			console.log('🧹 Cleaning up custom sync client')
			didCancel = true
			client.close()
			ioSocket.disconnect()
		}

		// Set initial loading state
		setStoreWithStatus({
			status: 'loading',
		})

		// Cleanup on unmount
		return cleanup
	}, [])

	// Show loading state
	if (!storeWithStatus) {
		return (
			<div
				style={{
					position: 'fixed',
					inset: 0,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					fontSize: '18px',
					color: '#666',
				}}
			>
				Initializing custom sync client...
			</div>
		)
	}

	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<div
				style={{
					position: 'absolute',
					top: 10,
					left: 10,
					zIndex: 1000,
					background: 'rgba(0,0,0,0.8)',
					color: 'white',
					padding: '8px 12px',
					borderRadius: '4px',
					fontSize: '12px',
					fontFamily: 'monospace',
				}}
			>
				Custom TLSyncClient • Status: {storeWithStatus.status}
				{storeWithStatus.status === 'synced-remote' &&
					` • Connection: ${storeWithStatus.connectionStatus}`}
			</div>

			<Tldraw
				// Pass the store created with custom TLSyncClient
				store={storeWithStatus}
				onMount={(editor) => {
					// @ts-expect-error
					window.editor = editor
					editor.registerExternalAssetHandler('url', unfurlBookmarkUrl)
					console.log('🎨 Tldraw editor mounted with custom sync client')
				}}
			/>
		</div>
	)
}

// How does our server handle assets like images and videos?
const multiplayerAssets: TLAssetStore = {
	// to upload an asset, we prefix it with a unique id, POST it to our worker, and return the URL
	async upload(_asset, file) {
		const id = uniqueId()

		const objectName = `${id}-${file.name}`
		const url = `${WORKER_URL}/uploads/${encodeURIComponent(objectName)}`

		const response = await fetch(url, {
			method: 'PUT',
			body: file,
		})

		if (!response.ok) {
			throw new Error(`Failed to upload asset: ${response.statusText}`)
		}

		return { src: url }
	},
	// to retrieve an asset, we can just use the same URL. you could customize this to add extra
	// auth, or to serve optimized versions / sizes of the asset.
	resolve(asset) {
		return asset.props.src
	},
}

// How does our server handle bookmark unfurling?
async function unfurlBookmarkUrl({ url }: { url: string }): Promise<TLBookmarkAsset> {
	const asset: TLBookmarkAsset = {
		id: AssetRecordType.createId(getHashForString(url)),
		typeName: 'asset',
		type: 'bookmark',
		meta: {},
		props: {
			src: url,
			description: '',
			image: '',
			favicon: '',
			title: '',
		},
	}

	try {
		const response = await fetch(`${WORKER_URL}/unfurl?url=${encodeURIComponent(url)}`)
		const data = await response.json()

		asset.props.description = data?.description ?? ''
		asset.props.image = data?.image ?? ''
		asset.props.favicon = data?.favicon ?? ''
		asset.props.title = data?.title ?? ''
	} catch (e) {
		console.error(e)
	}

	return asset
}

export default App
