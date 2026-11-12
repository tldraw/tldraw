import { computed } from '@tldraw/state'
import { BaseRecord, RecordId, Store, StoreSchema, createRecordType } from '@tldraw/store'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NetworkDiff, RecordOpType, ValueOpType } from '../lib/diff'
import { TLPushRequest, TLSocketServerSentEvent } from '../lib/protocol'
import { TLSyncClient, TLSyncClientRefusal } from '../lib/TLSyncClient'
import { TLSyncRule, perRecord } from '../lib/TLSyncRoom'
import { TestServer } from './TestServer'
import { TestSocketPair } from './TestSocketPair'

interface Doc extends BaseRecord<'doc', RecordId<Doc>> {
	value: number
	parent?: RecordId<Doc>
}
const DocType = createRecordType<Doc>('doc', {
	scope: 'document',
	validator: { validate: (value) => value as Doc },
})
const schema = StoreSchema.create<Doc>({ doc: DocType })

const a = DocType.createId('a')
const b = DocType.createId('b')
const c = DocType.createId('c')
const doc = (id: RecordId<Doc>, value: number, parent?: RecordId<Doc>): Doc =>
	parent ? { id, typeName: 'doc', value, parent } : { id, typeName: 'doc', value }

const tooBig: TLSyncRule<Doc, undefined> = perRecord((change) =>
	change.record.value > 100 ? 'too big' : null
)

const disposables: Array<() => void> = []
afterEach(() => {
	while (disposables.length) disposables.pop()!()
})

function makeServer(documents: Doc[], authorize: TLSyncRule<Doc, undefined> = tooBig) {
	return new TestServer<Doc>(
		schema,
		{
			documents: documents.map((state) => ({ state, lastChangedClock: 0 })),
			clock: 0,
			documentClock: 0,
			schema: schema.serialize(),
		},
		{ authorize }
	)
}

describe('the room judges a push one operation at a time', () => {
	function setup(documents: Doc[], authorize?: TLSyncRule<Doc, undefined>) {
		const server = makeServer(documents, authorize)
		const socketPair = new TestSocketPair<Doc>('ops-room-test', server)
		socketPair.connect()
		const received: TLSocketServerSentEvent<Doc>[] = []
		socketPair.callbacks.onReceiveMessage = (msg) => received.push(msg)
		socketPair.clientSocket.sendMessage({
			type: 'connect',
			connectRequestId: 'connect',
			lastServerClock: 0,
			protocolVersion: 8,
			schema: schema.serialize(),
		})
		socketPair.flushClientSentEvents()
		socketPair.flushServerSentEvents()
		const connect = received.shift()
		const push = (request: Pick<TLPushRequest<Doc>, 'diff' | 'ops'>) => {
			socketPair.clientSocket.sendMessage({ type: 'push', clientClock: 1, ...request })
			socketPair.flushClientSentEvents()
			server.flushDebouncingMessages()
			socketPair.flushServerSentEvents()
			return received
				.flatMap((m) => (m.type === 'data' ? m.data : [m]))
				.filter((m) => m.type === 'push_result')
				.at(-1)
		}
		const stored = () =>
			Object.fromEntries(server.storage.getSnapshot().documents.map((d) => [d.state.id, d.state]))
		return { connect, push, stored }
	}

	const put = (record: Doc): NetworkDiff<Doc> => ({ [record.id]: [RecordOpType.Put, record] })
	const setValue = (id: RecordId<Doc>, value: number): NetworkDiff<Doc> => ({
		[id]: [RecordOpType.Patch, { value: [ValueOpType.Put, value] }],
	})

	it('says on connect that it accepts ops', () => {
		expect(setup([]).connect).toMatchObject({ type: 'connect', acceptsOps: true })
	})

	it('stores every operation when the rule allows them all', () => {
		const { push, stored } = setup([doc(a, 1)])
		const result = push({ ops: [setValue(a, 2), put(doc(b, 5)), setValue(a, 3)] })

		expect(result).toMatchObject({ action: 'commit' })
		expect(result).not.toHaveProperty('refused')
		expect(result).not.toHaveProperty('refusedFrom')
		expect(stored()).toEqual({ [a]: doc(a, 3), [b]: doc(b, 5) })
	})

	it('stores the operations before a refused one, and refuses it and the rest', () => {
		const { push, stored } = setup([doc(a, 1)])
		const result = push({
			ops: [put(doc(b, 5)), put(doc(c, 500)), setValue(a, 2), setValue(b, 6)],
		})

		expect(result).toMatchObject({
			action: 'commit',
			refusedFrom: 1,
			refused: { reason: 'too big', ids: [c] },
		})
		// b went in as the first operation left it; the two operations after c were not judged
		expect(stored()).toEqual({ [a]: doc(a, 1), [b]: doc(b, 5) })
	})

	it('discards the push when the first operation is refused', () => {
		const { push, stored } = setup([doc(a, 1)])
		const result = push({ ops: [put(doc(c, 500)), setValue(a, 2)] })

		expect(result).toMatchObject({
			action: 'discard',
			refusedFrom: 0,
			refused: { reason: 'too big', ids: [c] },
		})
		expect(stored()).toEqual({ [a]: doc(a, 1) })
	})

	it('shows the rule the document as the operations ahead of it left it', () => {
		const seen: Array<{ before: Doc | undefined; after: Doc | undefined }> = []
		const { push, stored } = setup([], ({ changes, before, after }) => {
			for (const change of changes) {
				const id = (change.next ?? change.prev).id
				// a doc may only be created under a parent that exists
				const parent = change.next?.parent
				if (parent && !after(parent)) return { reason: 'no parent', ids: [id] }
				seen.push({ before: before(id), after: after(id) })
			}
			return null
		})
		const result = push({ ops: [put(doc(a, 1)), put(doc(b, 2, a)), setValue(a, 3)] })

		expect(result).toMatchObject({ action: 'commit' })
		expect(seen).toEqual([
			{ before: undefined, after: doc(a, 1) },
			{ before: undefined, after: doc(b, 2, a) },
			{ before: doc(a, 1), after: doc(a, 3) },
		])
		expect(stored()).toEqual({ [a]: doc(a, 3), [b]: doc(b, 2, a) })
	})

	it('refuses an operation that builds on a refused one', () => {
		const { push, stored } = setup([])
		// b hangs off c, which is refused: b must not be stored without it
		const result = push({ ops: [put(doc(c, 500)), put(doc(b, 2, c))] })

		expect(result).toMatchObject({ action: 'discard', refusedFrom: 0 })
		expect(stored()).toEqual({})
	})

	it('stores nothing for a record created and deleted in the same push', () => {
		const { push, stored } = setup([doc(a, 1)])
		const result = push({ ops: [put(doc(b, 5)), { [b]: [RecordOpType.Remove] }] })

		expect(result).toMatchObject({ action: 'discard' })
		expect(result).not.toHaveProperty('refused')
		expect(stored()).toEqual({ [a]: doc(a, 1) })
	})

	it('sends back what it stored when an operation did not go in as sent', () => {
		const { push, stored } = setup([doc(a, 1)])
		// a put over a stored record is stored as a patch
		const result = push({ ops: [put(doc(a, 2)), put(doc(c, 500))] })

		expect(result).toMatchObject({
			action: { rebaseWithDiff: setValue(a, 2) },
			refusedFrom: 1,
			refused: { reason: 'too big', ids: [c] },
		})
		expect(stored()).toEqual({ [a]: doc(a, 2) })
	})

	it('still refuses a push that sends one diff as a whole', () => {
		const { push, stored } = setup([doc(a, 1)])
		const result = push({ diff: { ...setValue(a, 2), ...put(doc(c, 500)) } })

		expect(result).toMatchObject({ action: 'discard', refused: { reason: 'too big', ids: [c] } })
		expect(result).not.toHaveProperty('refusedFrom')
		expect(stored()).toEqual({ [a]: doc(a, 1) })
	})
})

describe('the client sends its operations apart', () => {
	let rafCallbacks: FrameRequestCallback[]

	// With frames stubbed, a push waits for the throttle, so operations collect the way they do in
	// a browser.
	beforeEach(() => {
		vi.useFakeTimers()
		vi.setSystemTime(0)
		// @ts-expect-error - testing flag
		globalThis.__FORCE_RAF_IN_TESTS__ = true
		rafCallbacks = []
		vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
			rafCallbacks.push(callback)
			return rafCallbacks.length
		})
		vi.stubGlobal('cancelAnimationFrame', () => {})
	})
	afterEach(() => {
		// @ts-expect-error - testing flag
		delete globalThis.__FORCE_RAF_IN_TESTS__
		vi.unstubAllGlobals()
		vi.useRealTimers()
	})

	function flushFrames() {
		for (let i = 0; i < 10 && rafCallbacks.length > 0; i++) {
			vi.advanceTimersByTime(100)
			const callbacks = rafCallbacks.splice(0, rafCallbacks.length)
			for (const callback of callbacks) callback(performance.now())
		}
	}

	function setup(documents: Doc[], opts: { roomAcceptsOps?: boolean } = {}) {
		const server = makeServer(documents)
		const socketPair = new TestSocketPair<Doc>('ops-client-test', server)
		socketPair.connect()
		const pushes: TLPushRequest<Doc>[] = []
		const sendMessage = socketPair.clientSocket.sendMessage
		socketPair.clientSocket.sendMessage = (msg) => {
			if (msg.type === 'push') pushes.push(structuredClone(msg))
			sendMessage(msg)
		}
		if (opts.roomAcceptsOps === false) {
			// an older room: its connect reply doesn't mention ops
			const sendToClient = socketPair.roomSocket.sendMessage
			socketPair.roomSocket.sendMessage = (msg) => {
				if (msg.type === 'connect') delete msg.acceptsOps
				sendToClient(msg)
			}
		}
		const store = new Store<Doc>({ schema, props: {} })
		const refusals: TLSyncClientRefusal<Doc>[] = []
		const client = new TLSyncClient<Doc>({
			store,
			socket: socketPair.clientSocket,
			presence: computed('presence', () => null),
			onLoad: () => {},
			onSyncError: (reason) => {
				throw new Error(`unexpected sync error: ${reason}`)
			},
			onPushRefused: (refusal) => refusals.push(refusal),
		})
		disposables.push(() => client.close())
		const settle = () => {
			for (let i = 0; i < 20; i++) {
				flushFrames()
				socketPair.flushClientSentEvents()
				server.flushDebouncingMessages()
				socketPair.flushServerSentEvents()
			}
		}
		settle()
		const stored = () =>
			Object.fromEntries(server.storage.getSnapshot().documents.map((d) => [d.state.id, d.state]))
		return { store, pushes, refusals, settle, stored }
	}

	it('sends one diff per operation in a single push', () => {
		const { store, pushes, settle, stored } = setup([doc(a, 1)])
		store.put([doc(a, 2)])
		store.put([doc(b, 5)])
		settle()

		expect(pushes).toHaveLength(1)
		expect(pushes[0].diff).toBeUndefined()
		expect(pushes[0].ops).toEqual([
			{ [a]: [RecordOpType.Patch, { value: [ValueOpType.Put, 2] }] },
			{ [b]: [RecordOpType.Put, doc(b, 5)] },
		])
		expect(stored()).toEqual({ [a]: doc(a, 2), [b]: doc(b, 5) })
	})

	it('keeps the operations the room stored and reverts the refused ones', () => {
		const { store, pushes, refusals, settle, stored } = setup([doc(a, 1)])
		store.put([doc(b, 5)])
		store.put([doc(c, 500)])
		store.put([doc(a, 2)])
		settle()

		expect(pushes).toHaveLength(1)
		expect(pushes[0].ops).toHaveLength(3)
		expect(store.get(b)).toEqual(doc(b, 5))
		expect(store.get(c)).toBeUndefined()
		expect(store.get(a)).toEqual(doc(a, 1))
		expect(stored()).toEqual({ [a]: doc(a, 1), [b]: doc(b, 5) })
		expect(refusals).toEqual([
			{
				reason: 'too big',
				ids: [c],
				changes: {
					added: { [c]: doc(c, 500) },
					updated: { [a]: [doc(a, 1), doc(a, 2)] },
					removed: {},
				},
			},
		])
	})

	it('sends several store calls made in one checked unit as one operation', () => {
		const { store, pushes, settle } = setup([doc(a, 1)])
		store.checkAsOneOperation(() => {
			store.put([doc(b, 5)])
			store.put([doc(c, 6)])
		})
		store.put([doc(a, 2)])
		settle()

		expect(pushes).toHaveLength(1)
		expect(pushes[0].ops).toEqual([
			{ [b]: [RecordOpType.Put, doc(b, 5)], [c]: [RecordOpType.Put, doc(c, 6)] },
			{ [a]: [RecordOpType.Patch, { value: [ValueOpType.Put, 2] }] },
		])
	})

	it('joins operations that only update the same records, like the steps of a drag', () => {
		const { store, pushes, settle, stored } = setup([doc(a, 1)])
		for (const value of [2, 3, 4]) store.put([doc(a, value)])
		settle()

		expect(pushes).toHaveLength(1)
		expect(pushes[0].ops).toBeUndefined()
		expect(pushes[0].diff).toEqual({ [a]: [RecordOpType.Patch, { value: [ValueOpType.Put, 4] }] })
		expect(stored()).toEqual({ [a]: doc(a, 4) })
	})

	it('sends one squashed diff to a room that does not accept ops', () => {
		const { store, pushes, refusals, settle } = setup([doc(a, 1)], { roomAcceptsOps: false })
		store.put([doc(b, 5)])
		store.put([doc(c, 500)])
		settle()

		expect(pushes).toHaveLength(1)
		expect(pushes[0].ops).toBeUndefined()
		expect(Object.keys(pushes[0].diff!)).toEqual([b, c])
		// the room refuses the push whole, so b goes too
		expect(store.get(b)).toBeUndefined()
		expect(refusals).toHaveLength(1)
	})
})
