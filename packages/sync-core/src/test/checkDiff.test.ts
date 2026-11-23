import { computed } from '@tldraw/state'
import { BaseRecord, RecordId, Store, StoreSchema, createRecordType } from '@tldraw/store'
import { TLCheckDiff, TLCheckRejection } from '@tldraw/tlschema'
import { afterEach, describe, expect, it } from 'vitest'
import { TLSyncClient } from '../lib/TLSyncClient'
import { TestServer } from './TestServer'
import { TestSocketPair } from './TestSocketPair'

interface Doc extends BaseRecord<'doc', RecordId<Doc>> {
	owner: string
	text: string
}
const DocType = createRecordType<Doc>('doc', {
	scope: 'document',
	validator: { validate: (value) => value as Doc },
})
const schema = StoreSchema.create<Doc>({ doc: DocType })

const disposables: (() => void)[] = []
afterEach(() => {
	while (disposables.length) disposables.pop()!()
})

const aliceDoc = DocType.create({ id: DocType.createId('alice'), owner: 'alice', text: '' })

function setup(checkDiff: TLCheckDiff<Doc>, userId = 'bob') {
	const server = new TestServer<Doc>(
		schema,
		{
			documents: [{ state: aliceDoc, lastChangedClock: 0 }],
			clock: 0,
			documentClock: 0,
			schema: schema.serialize(),
		},
		{ checkDiff }
	)
	const socketPair = new TestSocketPair<Doc>('session-1', server)
	server.connect(socketPair, { userId })

	const store = new Store<Doc>({ schema, props: {} })
	const rejections: TLCheckRejection[] = []
	const client = new TLSyncClient<Doc>({
		store,
		socket: socketPair.clientSocket,
		presence: computed('presence', () => null),
		onLoad: () => {},
		onSyncError: (reason) => {
			throw new Error(`unexpected sync error: ${reason}`)
		},
		onPushRejected: (rejection) => rejections.push(rejection),
	})
	disposables.push(() => client.close())

	const flush = () => {
		while (socketPair.getNeedsFlushing()) {
			server.flushDebouncingMessages()
			socketPair.flushClientSentEvents()
			server.flushDebouncingMessages()
			socketPair.flushServerSentEvents()
		}
	}
	flush()
	return { server, store, rejections, flush }
}

// only the owner may change a doc
const ownerOnly: TLCheckDiff<Doc> = (diff, { userId, get }) => {
	for (const [from] of Object.values(diff.updated)) {
		if (from.owner !== userId) {
			return { reason: 'not yours' }
		}
	}
	for (const doc of Object.values(diff.removed)) {
		if (get(doc.id)?.owner !== userId) {
			return { reason: 'not yours' }
		}
	}
	return null
}

describe('checkDiff in the room', () => {
	it('stores an allowed push', () => {
		const { server, store, flush } = setup(ownerOnly)
		const bobDoc = DocType.create({ id: DocType.createId('bob'), owner: 'bob', text: 'hi' })
		store.put([bobDoc])
		flush()
		expect(server.storage.documents.get(bobDoc.id)?.state).toEqual(bobDoc)
	})

	it('rejects the whole push, reverts it on the client, and tells the client why', () => {
		const { server, store, rejections, flush } = setup(ownerOnly)
		const bobDoc = DocType.create({ id: DocType.createId('bob'), owner: 'bob', text: 'hi' })
		store.put([bobDoc, { ...aliceDoc, text: 'changed by bob' }])
		flush()

		expect(server.storage.documents.get(bobDoc.id)).toBeUndefined()
		expect(server.storage.documents.get(aliceDoc.id)?.state).toEqual(aliceDoc)
		expect(store.get(bobDoc.id)).toBeUndefined()
		expect(store.get(aliceDoc.id)).toEqual(aliceDoc)
		expect(rejections).toEqual([{ reason: 'not yours' }])
	})

	it('passes the session, the user, and get reads storage before the push', () => {
		const seen: unknown[] = []
		const { store, flush } = setup((diff, { sessionId, userId, get }) => {
			seen.push({ sessionId, userId, before: get(aliceDoc.id)?.text })
		}, 'alice')
		store.put([{ ...aliceDoc, text: 'new' }])
		flush()
		expect(seen).toEqual([{ sessionId: 'session-1', userId: 'alice', before: '' }])
	})

	it('rejects with reason error when the check throws', () => {
		const { server, store, rejections, flush } = setup(() => {
			throw new Error('boom')
		})
		store.put([{ ...aliceDoc, text: 'new' }])
		flush()
		expect(server.storage.documents.get(aliceDoc.id)?.state).toEqual(aliceDoc)
		expect(rejections).toEqual([{ reason: 'error' }])
	})
})
