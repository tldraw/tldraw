import {
	TLPersistentClientSocket,
	TLSocketClientSentEvent,
	TLSocketRoom,
	TLSocketServerSentEvent,
	TLSyncErrorCloseEventCode,
	WebSocketMinimal,
} from '@tldraw/sync-core'
import { PermissionChain, TLRecord, TLSchema } from 'tldraw'
import { ClassroomActor, ClassroomMeta } from './classroomPermissions'

type ClientSocket = TLPersistentClientSocket<
	TLSocketClientSentEvent<TLRecord>,
	TLSocketServerSentEvent<TLRecord>
>

/**
 * A sync server in the page, so that the demo can show the room's side of the chain with no
 * backend. Each editor talks to it through a pair of in-memory sockets.
 */
export function createInPageRoom({
	chain,
	schema,
	onDenied,
}: {
	chain: PermissionChain<TLRecord, ClassroomActor>
	schema: TLSchema
	/** Called for each write that the room denies, so the demo can show the server's side. */
	onDenied(message: string): void
}) {
	const room: TLSocketRoom<TLRecord, ClassroomMeta> = new TLSocketRoom<TLRecord, ClassroomMeta>({
		schema,
		permissions: chain,
		log: {
			warn: (...args: unknown[]) => {
				// 'permission chain denied a write', type, id, reason, 'session:', sessionId
				if (args[0] !== 'permission chain denied a write') return
				const [, type, id, reason, , sessionId] = args
				onDenied(`${sessionId}: ${reason} (${type} ${id})`)
			},
		},
		// The read rules of a shape read its page. A page change does not change its shapes, so
		// re-run the reads when a page changes. The document's meta decides who may open the room
		// (file read control), so re-run them when it changes too.
		onCommittedChanges: ({ diff }) => {
			const touchesPage = Object.values(diff.puts).some((put) => {
				const typeName = (Array.isArray(put) ? put[1] : put).typeName
				return typeName === 'page' || typeName === 'document'
			})
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
			close: (code?: number, reason?: string) => {
				serverSocket.readyState = 3
				// A rejection from the room (for example FORBIDDEN from `room.open`) is an error the
				// client shows, like a WebSocket closed with this code.
				const event =
					code === TLSyncErrorCloseEventCode && reason
						? ({ status: 'error', reason } as const)
						: ({ status: 'offline' } as const)
				setTimeout(() => {
					client.connectionStatus = event.status
					for (const listener of statusListeners) listener(event)
				})
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
			// A link guest's role can change while connected, so its lane stays open.
			isReadonly: meta.role === 'viewer' && !meta.viaLink,
			objectAccess: meta.role === 'viewer' && !meta.viaLink ? 'read' : 'write',
		})
		setTimeout(() => {
			client.connectionStatus = 'online'
			for (const listener of statusListeners) listener({ status: 'online' })
		})
		return client
	}

	return { room, connect }
}
