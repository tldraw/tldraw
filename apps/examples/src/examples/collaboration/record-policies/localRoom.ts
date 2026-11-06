import { JsonChunkAssembler, TLSocketRoom, WebSocketMinimal } from '@tldraw/sync-core'
import { createTLSchema, TLRecord } from 'tldraw'
import { actorFor, classroomPolicies, Person } from './classroom'

// A sync server in the browser, so that the example shows server-side enforcement without a
// backend. A real app runs the same TLSocketRoom in a worker or a Node server.

const LATENCY_MS = 60

let room: TLSocketRoom<TLRecord, Person> | null = null

export function getRoom() {
	room ??= new TLSocketRoom<TLRecord, Person>({
		schema: createTLSchema({ policies: classroomPolicies }),
		getActor: ({ meta }) => actorFor(meta),
		log: { warn: (...args) => console.warn('[server]', ...args) },
	})
	return room
}

let nextSessionId = 0

// A pair of in-memory sockets: one side for the room, one side for `useSync({ connect })`.
export function connectToLocalRoom(person: Person) {
	const sessionId = `${person.id}-${nextSessionId++}`
	const roomListeners = { message: new Set<any>(), close: new Set<any>(), error: new Set<any>() }
	const clientListeners = new Set<(msg: any) => void>()
	const assembler = new JsonChunkAssembler()
	let isOpen = true

	const roomSide: WebSocketMinimal = {
		readyState: 1,
		addEventListener: (type, listener) => roomListeners[type].add(listener),
		removeEventListener: (type, listener) => roomListeners[type].delete(listener),
		send: (data) => {
			setTimeout(() => {
				if (!isOpen) return
				const result = assembler.handleMessage(data)
				if (result && 'data' in result)
					for (const listener of clientListeners) listener(result.data)
			}, LATENCY_MS)
		},
		close: () => {
			isOpen = false
		},
	}
	getRoom().handleSocketConnect({ sessionId, socket: roomSide, meta: person })

	return {
		connectionStatus: 'online' as const,
		sendMessage: (msg: object) => {
			setTimeout(() => {
				if (!isOpen) return
				for (const listener of roomListeners.message) listener({ data: JSON.stringify(msg) })
			}, LATENCY_MS)
		},
		onReceiveMessage: (cb: (msg: any) => void) => {
			clientListeners.add(cb)
			return () => clientListeners.delete(cb)
		},
		onStatusChange: () => () => {},
		restart: () => {},
		close: () => {
			isOpen = false
			for (const listener of roomListeners.close) listener({})
		},
	}
}
