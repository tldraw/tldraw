import { TLPersistentClientSocket, TLSocketStatusChangeEvent, useSync } from '@tldraw/sync'
import { useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import {
	AssetRecordType,
	getHashForString,
	TLAssetStore,
	TLBookmarkAsset,
	Tldraw,
	TLRecord,
	uniqueId,
} from 'tldraw'

const WORKER_URL = `http://localhost:5858`

// In this example, the room ID is hard-coded. You can set this however you like though.
const roomId = 'test-room'

function App() {
	// Create a store connected to multiplayer.
	const store = useSync({
		// We need a connection to the server:
		connect: useCallback((query) => {
			const socket = io(WORKER_URL, {
				query: { ...query, roomId },
			})
			return socketIoToTldrawSocket(socket)
		}, []),
		// ...and how to handle static assets like images & videos
		assets: multiplayerAssets,
	})

	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<Tldraw
				// we can pass the connected store into the Tldraw component which will handle
				// loading states & enable multiplayer UX like cursors & a presence menu
				store={store}
				onMount={(editor) => {
					// @ts-expect-error
					window.editor = editor
					// when the editor is ready, we need to register out bookmark unfurling service
					editor.registerExternalAssetHandler('url', unfurlBookmarkUrl)
				}}
			/>
		</div>
	)
}

// Helper function to convert Socket.IO to TLPersistentClientSocket
function socketIoToTldrawSocket(ioSocket: Socket): TLPersistentClientSocket<TLRecord> {
	const statusChangeListeners = new Set<(event: TLSocketStatusChangeEvent) => void>()
	const tldrawSocket: TLPersistentClientSocket<TLRecord> = {
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
			statusChangeListeners.add(callback)
			return () => {
				statusChangeListeners.delete(callback)
			}
		},

		restart: () => {
			console.log('🔄 Restarting Socket.IO connection...')
			ioSocket.disconnect()
			ioSocket.connect()
		},

		close: () => {
			ioSocket.off('connect', connectHandler)
			ioSocket.off('disconnect', disconnectHandler)
			ioSocket.off('connect_error', errorHandler)
			clearTimeout(initialStatusTimeout)
			ioSocket.disconnect()
		},
	}

	// Map Socket.IO events to TLPersistentClientSocket status
	const connectHandler = () => {
		tldrawSocket.connectionStatus = 'online'
		statusChangeListeners.forEach((cb) => cb({ status: 'online' }))
	}

	const disconnectHandler = () => {
		tldrawSocket.connectionStatus = 'offline'
		statusChangeListeners.forEach((cb) => cb({ status: 'offline' }))
	}

	const errorHandler = (error: any) => {
		tldrawSocket.connectionStatus = 'error'
		statusChangeListeners.forEach((cb) =>
			cb({
				status: 'error',
				reason: error.message || 'Connection error',
			})
		)
	}

	ioSocket.on('connect', connectHandler)
	ioSocket.on('disconnect', disconnectHandler)
	ioSocket.on('connect_error', errorHandler)

	// Set initial status
	const initialStatusTimeout = setTimeout(() => {
		if (ioSocket.connected) {
			tldrawSocket.connectionStatus = 'online'
			statusChangeListeners.forEach((cb) => cb({ status: 'online' }))
		}
	}, 0)

	return tldrawSocket
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
