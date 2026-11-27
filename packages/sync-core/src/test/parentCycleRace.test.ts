import {
	Editor,
	TLRecord,
	TLShape,
	TLShapeId,
	TLStore,
	UserRecordType,
	computed,
	createPresenceStateDerivation,
	createShapeId,
	createTLSchema,
	createTLStore,
	createUserId,
} from 'tldraw'
import { vi } from 'vitest'
import { TLSyncClient } from '../lib/TLSyncClient'
import { FuzzEditor } from './FuzzEditor'
import { TestServer } from './TestServer'
import { TestSocketPair } from './TestSocketPair'

// Regression test for #6152: two clients each reparent a frame into the other before seeing the
// other's change. Each move is valid alone; merged, they form a parent cycle, and every client
// used to overflow the stack in Editor.visitDescendants while applying it.

vi.mock('@tldraw/editor/src/lib/editor/managers/TickManager/TickManager.ts', () => ({
	TickManager: class {
		start() {}
	},
}))
// @ts-expect-error
global.requestAnimationFrame = (cb: () => any) => cb()

const schema = createTLSchema()

class Peer {
	store: TLStore
	socketPair: TestSocketPair<TLRecord>
	client: TLSyncClient<TLRecord>
	editor!: Editor

	constructor(
		id: string,
		readonly server: TestServer<TLRecord>
	) {
		this.store = createTLStore({ schema, id })
		this.socketPair = new TestSocketPair(id, server)
		this.client = new TLSyncClient<TLRecord>({
			store: this.store,
			socket: this.socketPair.clientSocket,
			onSyncError: (reason) => {
				throw new Error('onSyncError:' + reason)
			},
			onLoad: () => {
				this.editor = new FuzzEditor(id, 0, this.store).editor
			},
			presence: createPresenceStateDerivation(
				computed('', () => UserRecordType.create({ id: createUserId(id), name: id, color: 'red' }))
			)(this.store),
		})
		this.socketPair.connect()
		disposables.push(() => this.client.close())
	}

	sendPending() {
		this.socketPair.flushClientSentEvents()
		this.server.flushDebouncingMessages()
	}

	receivePending() {
		this.socketPair.flushServerSentEvents()
	}

	sync() {
		while (this.socketPair.getNeedsFlushing()) {
			this.sendPending()
			this.receivePending()
		}
	}

	parentOf(id: TLShapeId) {
		return this.store.get(id)?.parentId
	}
}

const disposables: Array<() => void> = []
afterEach(() => {
	while (disposables.length) disposables.pop()!()
	vi.restoreAllMocks()
})

const f1 = createShapeId('f1')
const f2 = createShapeId('f2')

function setup() {
	const errorSpy = vi.spyOn(console, 'error')
	const server = new TestServer(schema)
	const a = new Peer('a', server)
	a.sync()
	const b = new Peer('b', server)
	b.sync()

	a.editor.createShapes([
		{ id: f1, type: 'frame', x: 0, y: 0, props: { w: 200, h: 200 } },
		{ id: f2, type: 'frame', x: 400, y: 0, props: { w: 200, h: 200 } },
	])
	a.sync()
	b.sync()
	const pageId = a.editor.getCurrentPageId()
	expect(b.parentOf(f2)).toBe(pageId)

	const serverParentOf = (id: TLShapeId) =>
		(server.storage.getSnapshot().documents.find((d) => d.state.id === id)?.state as TLShape)
			?.parentId
	const expectEveryoneToHave = (parents: Record<TLShapeId, string>) => {
		for (const parentOf of [serverParentOf, a.parentOf.bind(a), b.parentOf.bind(b)]) {
			for (const [id, parentId] of Object.entries(parents)) {
				expect(parentOf(id as TLShapeId)).toBe(parentId)
			}
		}
		expect(errorSpy).not.toHaveBeenCalled()
	}

	return { a, b, pageId, expectEveryoneToHave }
}

it('converges without a cycle when two clients nest frames in each other concurrently', () => {
	const { a, b, pageId, expectEveryoneToHave } = setup()

	a.editor.reparentShapes([f1], f2)
	b.editor.reparentShapes([f2], f1)

	// A's push reaches the server first; B's arrives before B has seen A's.
	a.sendPending()
	b.sendPending()
	a.receivePending()
	b.receivePending()
	a.sync()
	b.sync()

	expectEveryoneToHave({ [f1]: f2, [f2]: pageId })
})

it('applies a valid swap of nesting that arrives in one reconnect diff', () => {
	const { a, b, pageId, expectEveryoneToHave } = setup()
	a.editor.reparentShapes([f2], f1)
	a.sync()
	b.sync()

	b.socketPair.disconnect()
	a.editor.reparentShapes([f2], pageId)
	a.sync()
	a.editor.reparentShapes([f1], f2)
	a.sync()

	// The hydration diff can move f1 into f2 before it moves f2 out of f1.
	b.socketPair.connect()
	b.sync()

	expectEveryoneToHave({ [f1]: f2, [f2]: pageId })
})
