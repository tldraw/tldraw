import { computed } from '@tldraw/state'
import {
	BaseRecord,
	RecordId,
	RecordsDiff,
	Store,
	StoreSchema,
	createRecordType,
} from '@tldraw/store'
import { isEqual } from '@tldraw/utils'
import { afterEach, describe, expect, it } from 'vitest'
import { ValueOpType } from '../lib/diff'
import { TLPushRequest } from '../lib/protocol'
import { TLSyncClient } from '../lib/TLSyncClient'
import { TestServer } from './TestServer'
import { TestSocketPair } from './TestSocketPair'

// These tests pin two invariants of TLSyncClient.rebase that hold *emergently* — they fall out of
// the tldraw Store's mergeRemoteChanges / history squashing rather than being asserted anywhere.
// They only manifest on STAGGERED commit acks: when the client has several pending (unacked) pushes
// and the server commits them one at a time, each ack triggering its own rebase() while the later
// pushes are still in flight.
//
// Invariant 1 — a staggered commit ack emits no net change to store listeners. rebase() rewinds the
// speculative changes, applies the committed push, then re-applies the still-pending pushes, all
// inside a single store.mergeRemoteChanges. The rewind and re-apply must cancel, so a listener
// registered before the ack observes no net document change (either no history entry, or a
// net-zero 'remote' entry whose before/after are value-equal), while the store still holds the full
// optimistic state.
//
// Invariant 2 — after such an ack, speculativeChanges must span *from the committed (server-acked)
// state*, not from a mid-flight state. reverseRecordsDiff(speculativeChanges) is used as the rewind
// on the next incoming message; if its `from` were a mid-flight state, base-relative ops (string
// Append ops, per-index array patches — see diffArray in ../lib/diff.ts) would be applied to the
// wrong base and silently corrupt records, because the apply guards skip mismatched appends rather
// than erroring. To exercise those base-relative ops, every change here is append-shaped.
//
// Harness: a real TestServer / TestSocketPair (as in TLSyncRoom.test.ts). Because the throttles are
// pass-through under NODE_ENV=test, every store change, push, and rebase runs synchronously — no
// fake timers needed. We deliver each client push to the server individually so the server emits one
// push_result at a time, letting us drive genuinely staggered acks.

interface TestDoc extends BaseRecord<'doc', RecordId<TestDoc>> {
	text: string
	items: number[]
}
const TestDocType = createRecordType<TestDoc>('doc', {
	scope: 'document',
	validator: { validate: (value) => value as TestDoc },
})

interface TestPresence extends BaseRecord<'presence', RecordId<TestPresence>> {
	name: string
}
const TestPresenceType = createRecordType<TestPresence>('presence', {
	scope: 'presence',
	validator: { validate: (value) => value as TestPresence },
})

const testSchema = StoreSchema.create<TestDoc | TestPresence>({
	doc: TestDocType,
	presence: TestPresenceType,
})

type R = TestDoc | TestPresence

interface Instance {
	server: TestServer<R>
	socketPair: TestSocketPair<R>
	client: TLSyncClient<R>
	store: Store<R>
	docId: RecordId<TestDoc>
}

const disposables: Array<() => void> = []
afterEach(() => {
	while (disposables.length) disposables.pop()!()
})

/**
 * Stand up a connected client + server whose single confirmed (server-acked) document is `doc0`.
 * Pre-seeding the server means the connect hydration installs `doc0` as a synced record, so the
 * subsequent appends are updates against a known server base rather than fresh creations.
 */
function makeInstance(doc0: TestDoc): Instance {
	const server = new TestServer<R>(testSchema, {
		documents: [{ state: doc0, lastChangedClock: 0 }],
		clock: 0,
		documentClock: 0,
		schema: testSchema.serialize(),
	})
	const socketPair = new TestSocketPair<R>('rebase-test', server)
	socketPair.connect()

	const store = new Store<R>({ schema: testSchema, props: {} })
	const client = new TLSyncClient<R>({
		store,
		socket: socketPair.clientSocket,
		presence: computed('presence', () => null),
		onLoad: () => {},
		onSyncError: (reason) => {
			throw new Error(`unexpected sync error: ${reason}`)
		},
	})
	disposables.push(() => client.close())

	// complete the connect handshake (no pushes are in flight yet, so this only hydrates)
	while (socketPair.getNeedsFlushing()) {
		socketPair.flushClientSentEvents()
		socketPair.flushServerSentEvents()
	}
	expect(store.get(doc0.id)).toEqual(doc0)

	return { server, socketPair, client, store, docId: doc0.id }
}

function getQueuedPushes(inst: Instance): TLPushRequest<R>[] {
	return inst.socketPair.clientSentEventQueue.filter(
		(m): m is TLPushRequest<R> => m.type === 'push'
	)
}

function pendingPushCount(inst: Instance): number {
	return (inst.client as any).pendingPushRequests.length
}

function speculativeChanges(inst: Instance): RecordsDiff<R> {
	return (inst.client as any).speculativeChanges
}

/**
 * Deliver exactly one queued client push to the server, then hand the server's resulting
 * push_result(s) back to the client — driving a single rebase() while the later pushes stay
 * pending. Returns the push_results the client received. flushDebouncingMessages resets the
 * server's data-message debounce so each push_result is emitted immediately in its own message.
 */
function ackNextPush(inst: Instance) {
	const { server, socketPair } = inst
	server.flushDebouncingMessages()

	const clientMsg = socketPair.clientSentEventQueue.shift()
	if (!clientMsg || clientMsg.type !== 'push') {
		throw new Error(`expected a queued push, got ${clientMsg?.type ?? 'nothing'}`)
	}
	socketPair.didReceiveFromClient!(clientMsg)

	server.flushDebouncingMessages()
	const serverMsgs = socketPair.serverSentEventQueue.splice(0)
	for (const msg of serverMsgs) socketPair.callbacks.onReceiveMessage!(msg)

	const results: any[] = []
	for (const msg of serverMsgs) {
		if (msg.type === 'data') {
			for (const d of msg.data) if (d.type === 'push_result') results.push(d)
		}
	}
	return results
}

/** True when a diff represents no net change: no adds, no removes, and every update is value-equal. */
function isNetZero(diff: RecordsDiff<R>): boolean {
	if (Object.keys(diff.added).length > 0) return false
	if (Object.keys(diff.removed).length > 0) return false
	return Object.values(diff.updated).every(([from, to]) => isEqual(from, to))
}

describe('TLSyncClient staggered rebase invariants', () => {
	it('invariant 1: a staggered commit ack for an in-flight push emits no net document change', () => {
		const inst = makeInstance(TestDocType.create({ text: '', items: [] }))
		const { store, docId } = inst

		// three sequential appends to the same record — three in-flight pushes
		store.update(docId, (d) => ({ ...d, text: d.text + 'A' }))
		store.update(docId, (d) => ({ ...d, text: d.text + 'B' }))
		store.update(docId, (d) => ({ ...d, text: d.text + 'C' }))

		const pushes = getQueuedPushes(inst)
		expect(pushes.map((p) => p.clientClock)).toEqual([0, 1, 2])
		// the pushes carry base-relative Append ops (not base-independent Puts)
		expect(pushes[0].diff![docId][0]).toBe('patch')
		expect((pushes[0].diff![docId][1] as any).text).toEqual([ValueOpType.Append, 'A', 0])
		expect(pendingPushCount(inst)).toBe(3)

		const before = store.get(docId)
		expect((before as TestDoc).text).toBe('ABC')

		// register a listener AFTER the optimistic state is in place, then commit only the first push
		const received: Array<{ changes: RecordsDiff<R>; source: string }> = []
		const unlisten = store.listen((entry) => received.push(entry as any), {
			scope: 'document',
			source: 'all',
		})

		const results = ackNextPush(inst)
		expect(results).toHaveLength(1)
		expect(results[0]).toMatchObject({ type: 'push_result', clientClock: 0, action: 'commit' })

		// (a) the ack produced no net change for listeners — any entry seen is a net-zero remote entry
		for (const entry of received) {
			expect(entry.source).toBe('remote')
			expect(isNetZero(entry.changes)).toBe(true)
		}
		// (b) the store still holds the full optimistic state after all three local changes
		expect(store.get(docId)).toEqual(before)
		expect((store.get(docId) as TestDoc).text).toBe('ABC')
		// the ack drained exactly one pending push; the other two remain in flight
		expect(pendingPushCount(inst)).toBe(2)

		unlisten()
	})

	it('invariant 2: after a staggered commit, speculativeChanges spans from the committed state, not a mid-flight one', () => {
		const inst = makeInstance(TestDocType.create({ text: '', items: [] }))
		const { store, docId } = inst

		store.update(docId, (d) => ({ ...d, text: d.text + 'A' }))
		store.update(docId, (d) => ({ ...d, text: d.text + 'B' }))
		store.update(docId, (d) => ({ ...d, text: d.text + 'C' }))
		expect((store.get(docId) as TestDoc).text).toBe('ABC')

		// commit push 1 only (the other two stay pending)
		expect(ackNextPush(inst).map((r) => (r as any).action)).toEqual(['commit'])
		expect(pendingPushCount(inst)).toBe(2)

		// speculativeChanges must now be the squash of the two REMAINING pushes, with `from` equal to
		// the committed (server-acked) state — the state after push 1 ('A'), NOT after push 2 ('AB').
		const spec1 = speculativeChanges(inst)
		expect((spec1.updated[docId][0] as TestDoc).text).toBe('A')
		expect((spec1.updated[docId][1] as TestDoc).text).toBe('ABC')
		// the optimistic state is untouched by the ack
		expect((store.get(docId) as TestDoc).text).toBe('ABC')

		// commit push 2: `from` advances to the new committed state ('AB'), still base-correct
		expect(ackNextPush(inst).map((r) => (r as any).action)).toEqual(['commit'])
		expect(pendingPushCount(inst)).toBe(1)
		const spec2 = speculativeChanges(inst)
		expect((spec2.updated[docId][0] as TestDoc).text).toBe('AB')
		expect((spec2.updated[docId][1] as TestDoc).text).toBe('ABC')
		expect((store.get(docId) as TestDoc).text).toBe('ABC')

		// commit push 3: nothing pending, so speculativeChanges is empty and the value has converged
		expect(ackNextPush(inst).map((r) => (r as any).action)).toEqual(['commit'])
		expect(pendingPushCount(inst)).toBe(0)
		expect(speculativeChanges(inst).updated[docId]).toBeUndefined()
		expect((store.get(docId) as TestDoc).text).toBe('ABC')

		// the server converged to the exact final value across the staggered commits
		const serverDoc = inst.server.storage.getSnapshot().documents.find((d) => d.state.id === docId)
			?.state as TestDoc
		expect(serverDoc.text).toBe('ABC')
	})

	it('invariant 2: base-relative array appends converge across staggered commit acks', () => {
		const inst = makeInstance(TestDocType.create({ text: '', items: [] }))
		const { store, docId } = inst

		store.update(docId, (d) => ({ ...d, items: [...d.items, 1] }))
		store.update(docId, (d) => ({ ...d, items: [...d.items, 2] }))
		store.update(docId, (d) => ({ ...d, items: [...d.items, 3] }))
		expect((store.get(docId) as TestDoc).items).toEqual([1, 2, 3])

		// the array pushes carry base-relative Append ops (offset-relative to the diff base)
		const pushes = getQueuedPushes(inst)
		expect((pushes[0].diff![docId][1] as any).items).toEqual([ValueOpType.Append, [1], 0])
		expect((pushes[1].diff![docId][1] as any).items).toEqual([ValueOpType.Append, [2], 1])

		// commit push 1: `from` of the remaining speculative diff is the committed array state [1]
		expect(ackNextPush(inst).map((r) => (r as any).action)).toEqual(['commit'])
		const spec1 = speculativeChanges(inst)
		expect((spec1.updated[docId][0] as TestDoc).items).toEqual([1])
		expect((spec1.updated[docId][1] as TestDoc).items).toEqual([1, 2, 3])
		expect((store.get(docId) as TestDoc).items).toEqual([1, 2, 3])

		// commit the rest, one staggered ack at a time; base-relative appends stay aligned
		expect(ackNextPush(inst).map((r) => (r as any).action)).toEqual(['commit'])
		expect((store.get(docId) as TestDoc).items).toEqual([1, 2, 3])
		expect(ackNextPush(inst).map((r) => (r as any).action)).toEqual(['commit'])
		expect(pendingPushCount(inst)).toBe(0)
		expect((store.get(docId) as TestDoc).items).toEqual([1, 2, 3])

		const serverDoc = inst.server.storage.getSnapshot().documents.find((d) => d.state.id === docId)
			?.state as TestDoc
		expect(serverDoc.items).toEqual([1, 2, 3])
	})
})
