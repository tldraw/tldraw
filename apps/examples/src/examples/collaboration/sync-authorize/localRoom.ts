import { InMemorySyncStorage, TLPersistentClientSocket, TLSocketRoom } from '@tldraw/sync'
import { Authorize, TLRecord, createTLSchema } from 'tldraw'

/**
 * A sync room that runs in this page, so that one example can show several users at once. A
 * real app runs the same `TLSocketRoom` on a server, with the same `authorize` function.
 */
export function createLocalRoom<Actor>(opts: {
	authorize: Authorize<TLRecord, Actor>
	atomicPushes: boolean
}) {
	return new TLSocketRoom<TLRecord, Actor>({
		schema: createTLSchema(),
		storage: new InMemorySyncStorage<TLRecord>(),
		authorize: opts.authorize,
		atomicPushes: opts.atomicPushes,
	})
}

type Listener = (event: any) => void

/**
 * Connects a client to a local room through an in-memory pipe. Messages go through
 * `setTimeout`, so that each side handles them later, as it would over a network.
 */
export function connectLocal<Actor>(
	room: TLSocketRoom<TLRecord, Actor>,
	sessionId: string,
	actor: Actor
): TLPersistentClientSocket<any, any> {
	const serverListeners = new Map<string, Set<Listener>>()
	const clientMessageListeners = new Set<(msg: any) => void>()
	const statusListeners = new Set<(ev: any) => void>()
	let isOpen = true

	const serverSocket = {
		readyState: 1,
		send(data: string) {
			if (!isOpen) return
			setTimeout(() => {
				if (!isOpen) return
				const msg = JSON.parse(data)
				clientMessageListeners.forEach((cb) => cb(msg))
			})
		},
		close() {
			isOpen = false
			serverSocket.readyState = 3
			statusListeners.forEach((cb) => cb({ status: 'offline' }))
		},
		addEventListener(type: string, listener: Listener) {
			if (!serverListeners.has(type)) serverListeners.set(type, new Set())
			serverListeners.get(type)!.add(listener)
		},
		removeEventListener(type: string, listener: Listener) {
			serverListeners.get(type)?.delete(listener)
		},
	}

	room.handleSocketConnect({ sessionId, socket: serverSocket, meta: actor } as any)

	return {
		connectionStatus: 'online',
		sendMessage(msg) {
			if (!isOpen) return
			const data = JSON.stringify(msg)
			setTimeout(() => {
				if (!isOpen) return
				serverListeners.get('message')?.forEach((cb) => cb({ data }))
			})
		},
		onReceiveMessage(cb) {
			clientMessageListeners.add(cb)
			return () => clientMessageListeners.delete(cb)
		},
		onStatusChange(cb) {
			statusListeners.add(cb)
			return () => statusListeners.delete(cb)
		},
		restart() {},
		close() {
			if (!isOpen) return
			isOpen = false
			serverSocket.readyState = 3
			serverListeners.get('close')?.forEach((cb) => cb({}))
		},
	}
}
