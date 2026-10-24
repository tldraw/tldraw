import { computed } from '@tldraw/state'
import { BaseRecord, RecordId, Store, StoreSchema, createRecordType } from '@tldraw/store'
import { afterEach, describe, expect, it } from 'vitest'
import { TLSyncClient } from '../lib/TLSyncClient'
import { TestServer } from './TestServer'
import { TestSocketPair } from './TestSocketPair'

// Characterizes the root cause behind the reparent "offshot" bug (follow-up to the reverted #9581 /
// issue #9567).
//
// A shape's `x/y` is relative to its `parentId`. A gulp (drop into a frame) is *semantically*
// atomic: change parentId AND re-express the coordinates in the new parent's space, together. But
// over the wire a record change is transmitted and merged field-by-field (see applyObjectDiff in
// ../lib/diff.ts, and TLSyncRoom.patchDocument). So when two clients touch the same shape at once,
// the merge can keep `parentId` from one client and `x` from the other — the coordinate ends up in
// the wrong frame of reference, and the shape renders far away ("offshot").
//
// This is inherent to the sync layer's last-writer-wins-per-field merge: it converges every client
// to the same record, but that record can be incoherent. Rather than change the wire protocol, we
// restore coherence one level up, in the editor: after a remote merge the editor re-runs its drop
// geometry and kicks any shape that no longer overlaps its parent back onto the page (see the
// "reconciling remote reparents" tests in packages/tldraw/src/test/frames.test.ts). This test pins
// the merge behavior that reconciliation is there to clean up.
//
// We model the smallest thing that has the bug: a `doc` with `parent` (a string, standing in for
// parentId) and `x` (its parent-local coordinate). frame origin is 200 on the page, so:
//   absolute page position = parent === 'frame' ? 200 + x : x

interface TestDoc extends BaseRecord<'doc', RecordId<TestDoc>> {
	parent: 'page' | 'frame'
	x: number
}
const TestDocType = createRecordType<TestDoc>('doc', {
	scope: 'document',
	validator: { validate: (value) => value as TestDoc },
})
const testSchema = StoreSchema.create<TestDoc>({ doc: TestDocType })
type R = TestDoc

const FRAME_ORIGIN = 200
function pagePosition(doc: TestDoc): number {
	return doc.parent === 'frame' ? FRAME_ORIGIN + doc.x : doc.x
}

interface Client {
	socketPair: TestSocketPair<R>
	client: TLSyncClient<R>
	store: Store<R>
}

const disposables: Array<() => void> = []
afterEach(() => {
	while (disposables.length) disposables.pop()!()
})

function makeServer(doc0: TestDoc) {
	return new TestServer<R>(testSchema, {
		documents: [{ state: doc0, lastChangedClock: 0 }],
		clock: 0,
		documentClock: 0,
		schema: testSchema.serialize(),
	})
}

function makeClient(server: TestServer<R>, id: string, doc0: TestDoc): Client {
	const socketPair = new TestSocketPair<R>(id, server)
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

	// complete the connect handshake (hydrate doc0 from the server)
	while (socketPair.getNeedsFlushing()) {
		socketPair.flushClientSentEvents()
		socketPair.flushServerSentEvents()
	}
	expect(store.get(doc0.id)).toEqual(doc0)

	return { socketPair, client, store }
}

/** Pump both clients <-> server until nothing is left to deliver. */
function flushAll(server: TestServer<R>, clients: Client[]) {
	let guard = 0
	const needsFlushing = () => clients.some((c) => c.socketPair.getNeedsFlushing())
	while (needsFlushing()) {
		for (const c of clients) c.socketPair.flushClientSentEvents()
		server.flushDebouncingMessages()
		for (const c of clients) c.socketPair.flushServerSentEvents()
		if (guard++ > 200) throw new Error('flushAll did not settle')
	}
}

describe('reparent coordinate desync (field-level merge characterization)', () => {
	it('field-level merge keeps parentId from one client and x from the other', () => {
		const docId = TestDocType.createId('shape')
		// the shape starts on the page at page-x = 500
		const doc0 = TestDocType.create({ id: docId, parent: 'page', x: 500 })

		const server = makeServer(doc0)
		const A = makeClient(server, 'clientA', doc0) // the "gulper"
		const B = makeClient(server, 'clientB', doc0) // the "mover"

		// Concurrently, before either has seen the other's change:
		// A gulps the shape into the frame. It stays visually put: page-x 500 -> frame-local 300.
		A.store.update(docId, (d) => ({ ...d, parent: 'frame', x: 500 - FRAME_ORIGIN }))
		// B drags the shape along the page to page-x = 600. B never touches parent (stays 'page'),
		// so B's push is an x-only patch.
		B.store.update(docId, (d) => ({ ...d, x: 600 }))

		// Deliver A's gulp to the server first, then B's move (staggered, as they would race).
		A.socketPair.flushClientSentEvents()
		server.flushDebouncingMessages()
		B.socketPair.flushClientSentEvents()
		flushAll(server, [A, B])

		const finalA = A.store.get(docId)!
		const finalB = B.store.get(docId)!
		const serverDoc = server.storage.getSnapshot().documents.find((d) => d.state.id === docId)!
			.state as TestDoc

		// Everyone converges to the same record...
		expect(finalA).toEqual(finalB)
		expect(finalA).toEqual(serverDoc)

		// ...but that record is an incoherent mix: parentId from A, x from B. Neither client's
		// intended (parent, x) pair survived.
		expect(serverDoc.parent).toBe('frame') // A's write won on parent
		expect(serverDoc.x).toBe(600) // B's write won on x

		expect(serverDoc).not.toEqual({ ...doc0, parent: 'frame', x: 300 }) // not A's intent
		expect(serverDoc).not.toEqual({ ...doc0, parent: 'page', x: 600 }) // not B's intent

		// The merged record is offshot: B meant page-x 600, but it renders at 200 + 600 = 800. In a
		// real editor this is exactly the state the post-merge reconciliation detects and repairs
		// (the shape no longer overlaps its frame, so it's kicked back onto the page).
		expect(pagePosition(serverDoc)).toBe(FRAME_ORIGIN + 600)
		expect(pagePosition(serverDoc)).not.toBe(600)
	})
})
