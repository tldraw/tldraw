import {
	TLPersistentClientSocket,
	TLSocketClientSentEvent,
	TLSocketRoom,
	TLSocketServerSentEvent,
	WebSocketMinimal,
} from '@tldraw/sync-core'
import { PermissionChain, TLRecord } from 'tldraw'
import { ClassroomActor, ClassroomMeta } from './classroomPermissions'

type ClientSocket = TLPersistentClientSocket<
	TLSocketClientSentEvent<TLRecord>,
	TLSocketServerSentEvent<TLRecord>
>

/**
 * A sync server in the page, so that the demo can show the room's side of the chain with no
 * backend. Each editor talks to it through a pair of in-memory sockets.
 */
export function createInPageRoom(chain: PermissionChain<TLRecord, ClassroomActor>) {
	const room: TLSocketRoom<TLRecord, ClassroomMeta> = new TLSocketRoom<TLRecord, ClassroomMeta>({
		permissions: chain,
		// The read rules of a shape read its page. A page change does not change its shapes, so
		// re-run the reads when a page changes.
		onCommittedChanges: ({ diff }) => {
			const touchesPage = Object.values(diff.puts).some(
				(put) => (Array.isArray(put) ? put[1] : put).typeName === 'page'
			)
			if (touchesPage) room.refreshReads()
		},
	})

	function connect(sessionId: string, meta: ClassroomMeta): ClientSocket {
		const serverListeners: Record<string, Set<(event: any) => void>> = {
			message: new Set(),
			close: new Set(),
			error: new Set(),
		}
		const clientListeners = new Set<(msg: TLSocketServerSentEvent<TLRecord>) => void>()
		const statusListeners = new Set<(event: any) => void>()

		const serverSocket: WebSocketMinimal = {
			readyState: 1,
			send: (data) => {
				setTimeout(() => {
					const msg = JSON.parse(data)
					for (const listener of clientListeners) listener(msg)
				})
			},
			close: () => {
				serverSocket.readyState = 3
				client.connectionStatus = 'offline'
				for (const listener of statusListeners) listener({ status: 'offline' })
			},
			addEventListener: (type, listener) => serverListeners[type].add(listener),
			removeEventListener: (type, listener) => serverListeners[type].delete(listener),
		}

		const client: ClientSocket = {
			connectionStatus: 'offline',
			sendMessage: (msg) => {
				setTimeout(() => {
					for (const listener of serverListeners.message) listener({ data: JSON.stringify(msg) })
				})
			},
			onReceiveMessage: (cb) => {
				clientListeners.add(cb)
				return () => clientListeners.delete(cb)
			},
			onStatusChange: (cb) => {
				statusListeners.add(cb)
				return () => statusListeners.delete(cb)
			},
			restart: () => {},
			close: () => {
				for (const listener of serverListeners.close) listener({})
			},
		}

		room.handleSocketConnect({
			sessionId,
			socket: serverSocket,
			meta,
			isReadonly: meta.role === 'viewer',
			objectAccess: meta.role === 'viewer' ? 'read' : 'write',
		})
		setTimeout(() => {
			client.connectionStatus = 'online'
			for (const listener of statusListeners) listener({ status: 'online' })
		})
		return client
	}

	return { room, connect }
}
