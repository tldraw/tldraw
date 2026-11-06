import { JsonChunkAssembler, TLSocketRoom, WebSocketMinimal } from '@tldraw/sync-core'
import {
	DocumentRecordType,
	PageRecordType,
	TLDOCUMENT_ID,
	TLRecord,
	ZERO_INDEX_KEY,
	createTLSchemaFromUtils,
} from 'tldraw'
import { Person, Scenario, actorFor, schemaOptionsFor } from './scenario'

// A sync server in the browser, so that the example shows server-side enforcement without a
// backend. A real app runs the same TLSocketRoom in a worker or a Node server.

const LATENCY_MS = 60

const rooms = new Map<string, TLSocketRoom<TLRecord, Person>>()

function getRoom(scenario: Scenario) {
	let room = rooms.get(scenario.id)
	if (!room) {
		const schema = createTLSchemaFromUtils(schemaOptionsFor(scenario))
		room = new TLSocketRoom<TLRecord, Person>({
			schema,
			// The room starts with a document and a page, so that no client has to create them.
			initialSnapshot: {
				documents: [
					DocumentRecordType.create({ id: TLDOCUMENT_ID }),
					PageRecordType.create({
						id: PageRecordType.createId('page'),
						name: 'Page 1',
						index: ZERO_INDEX_KEY,
					}),
				].map((state) => ({ state, lastChangedClock: 0 })),
				clock: 0,
				documentClock: 0,
				schema: schema.serialize(),
			},
			// Asked on every push, so an access change applies without a reconnect.
			getActor: ({ meta }) => actorFor(meta),
			log: { warn: (...args) => console.warn('[server]', ...args) },
		})
		rooms.set(scenario.id, room)
	}
	return room
}

let nextSessionId = 0

// A pair of in-memory sockets: one side for the room, one side for `useSync({ connect })`.
export function connectToLocalRoom(scenario: Scenario, person: Person) {
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
	getRoom(scenario).handleSocketConnect({ sessionId, socket: roomSide, meta: person })

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
