import { Editor, TLGeoShape, createShapeId } from '@tldraw/editor'
import {
	TLSocketRoom,
	TLSocketServerSentEvent,
	TLSocketStatusListener,
	WebSocketMinimal,
} from '@tldraw/sync-core'
import { TLRecord, createTLSchema } from '@tldraw/tlschema'
import { uniqueId } from '@tldraw/utils'
import { afterEach, describe, expect, it } from 'vitest'
import { connectHeadlessEditor } from './connectHeadlessEditor'
import { createHeadlessEditor } from './createHeadlessEditor'
import { TLHeadlessClientSocket } from './NodeWebSocketAdapter'

// An in-process bridge between the client socket interface and a real TLSocketRoom: the full
// sync protocol runs, with messages passed on microtasks instead of a network. This exercises
// everything except the websocket transport itself (covered in adapter.test.ts).
class BridgeSocket implements TLHeadlessClientSocket {
	connectionStatus: 'online' | 'offline' | 'error' = 'offline'
	private messageListeners = new Set<(msg: TLSocketServerSentEvent<TLRecord>) => void>()
	private statusListeners = new Set<TLSocketStatusListener>()
	private serverListeners = {
		message: new Set<(event: any) => void>(),
		close: new Set<(event: any) => void>(),
		error: new Set<(event: any) => void>(),
	}
	readonly sessionId = uniqueId()

	connectTo(room: TLSocketRoom<TLRecord, void>) {
		const serverSocket: WebSocketMinimal = {
			readyState: 1, // OPEN
			send: (data: string) => {
				queueMicrotask(() => {
					if (this.connectionStatus !== 'online') return
					this.messageListeners.forEach((cb) => cb(JSON.parse(data)))
				})
			},
			close: () => {
				// the room hanging up drops the client offline
				this.goOffline()
			},
			addEventListener: (type, listener) => {
				this.serverListeners[type].add(listener)
			},
			removeEventListener: (type, listener) => {
				this.serverListeners[type].delete(listener)
			},
		}
		room.handleSocketConnect({ sessionId: this.sessionId, socket: serverSocket })
		this.connectionStatus = 'online'
		this.statusListeners.forEach((cb) => cb({ status: 'online' }))
	}

	goOffline() {
		if (this.connectionStatus === 'offline') return
		this.connectionStatus = 'offline'
		this.statusListeners.forEach((cb) => cb({ status: 'offline' }))
	}

	sendMessage(msg: object) {
		if (this.connectionStatus !== 'online') return
		queueMicrotask(() => {
			this.serverListeners.message.forEach((cb) => cb({ data: JSON.stringify(msg) }))
		})
	}

	onReceiveMessage(cb: (msg: TLSocketServerSentEvent<TLRecord>) => void) {
		this.messageListeners.add(cb)
		return () => void this.messageListeners.delete(cb)
	}

	onStatusChange(cb: TLSocketStatusListener) {
		this.statusListeners.add(cb)
		return () => void this.statusListeners.delete(cb)
	}

	restart() {
		// not needed by these tests
	}

	close() {
		this.serverListeners.close.forEach((cb) => cb({}))
		this.goOffline()
	}
}

async function waitFor(predicate: () => boolean, timeoutMs = 3000) {
	const start = Date.now()
	while (!predicate()) {
		if (Date.now() - start > timeoutMs) throw new Error('waitFor: condition not met in time')
		await new Promise((resolve) => setTimeout(resolve, 10))
	}
}

const cleanups: Array<() => void> = []
afterEach(() => {
	for (const cleanup of cleanups.splice(0)) cleanup()
})

function setup() {
	const room = new TLSocketRoom<TLRecord, void>({ schema: createTLSchema() })
	cleanups.push(() => room.close())
	return room
}

function makeEditor() {
	// Register disposal at creation, not at connect: an editor built before a failing
	// connect() must still be cleaned up.
	const editor = createHeadlessEditor()
	cleanups.push(() => editor.dispose())
	return editor
}

async function connect(room: TLSocketRoom<TLRecord, void>, editor: Editor) {
	const socket = new BridgeSocket()
	const connectionPromise = connectHeadlessEditor(editor, { socket })
	socket.connectTo(room)
	const connection = await connectionPromise
	cleanups.push(() => connection.close())
	return connection
}

describe('connectHeadlessEditor', () => {
	it('syncs changes live between two editors', async () => {
		const room = setup()
		const editorA = makeEditor()
		const editorB = makeEditor()
		await connect(room, editorA)
		await connect(room, editorB)

		const id = createShapeId()
		editorA.createShape<TLGeoShape>({ id, type: 'geo', x: 50, y: 60, props: { w: 200, h: 100 } })

		await waitFor(() => !!editorB.getShape(id))
		expect(editorB.getShapePageBounds(id)).toEqual(editorA.getShapePageBounds(id))
	})

	it('hydrates a late joiner from the room, repairing instance references', async () => {
		const room = setup()
		const editorA = makeEditor()
		const connectionA = await connect(room, editorA)
		const id = createShapeId()
		editorA.createShape<TLGeoShape>({ id, type: 'geo', x: 0, y: 0, props: { w: 10, h: 10 } })
		await connectionA.flush()

		const editorB = makeEditor()
		await connect(room, editorB)
		expect(editorB.getShape(id)).toBeDefined()
		// Hydration replaces the document wholesale; the instance's currentPageId must have been
		// repaired to point at a page that actually exists in the room's document.
		expect(editorB.getPage(editorB.getCurrentPageId())).toBeDefined()
	})

	it('flush() resolves only once changes are on the server', async () => {
		const room = setup()
		const editor = makeEditor()
		const connection = await connect(room, editor)

		const id = createShapeId()
		editor.createShape<TLGeoShape>({ id, type: 'geo', x: 1, y: 2, props: { w: 30, h: 40 } })
		await connection.flush()

		const snapshot = room.storage.getSnapshot!()
		const doc = snapshot.documents.find((d) => d.state.id === id)
		expect(doc).toBeDefined()
		expect(doc!.state).toMatchObject({ x: 1, y: 2 })
	})

	it('flush() fails fast on a closed connection', async () => {
		const room = setup()
		const editor = makeEditor()
		const connection = await connect(room, editor)
		connection.close()

		const start = Date.now()
		await expect(connection.flush()).rejects.toThrow(/closed/)
		expect(Date.now() - start).toBeLessThan(1000)
	})

	it('rejects when the room never loads within connectTimeout', async () => {
		const editor = makeEditor()
		cleanups.push(() => editor.dispose())
		const socket = new BridgeSocket() // never connected to a room
		await expect(connectHeadlessEditor(editor, { socket, connectTimeout: 200 })).rejects.toThrow(
			/could not connect/
		)
	})
})
