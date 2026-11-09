import { computed } from '@tldraw/state'
import { BaseRecord, RecordId, Store, StoreSchema, createRecordType } from '@tldraw/store'
import { afterEach, describe, expect, it } from 'vitest'
import { TLSyncClient, TLSyncClientRefusal } from '../lib/TLSyncClient'
import { perRecord } from '../lib/TLSyncRoom'
import { TestServer } from './TestServer'
import { TestSocketPair } from './TestSocketPair'

interface Doc extends BaseRecord<'doc', RecordId<Doc>> {
	value: number
}
const DocType = createRecordType<Doc>('doc', {
	scope: 'document',
	validator: { validate: (value) => value as Doc },
})
const schema = StoreSchema.create<Doc>({ doc: DocType })

const disposables: Array<() => void> = []
afterEach(() => {
	while (disposables.length) disposables.pop()!()
})

function setup(doc: Doc) {
	const server = new TestServer<Doc>(
		schema,
		{
			documents: [{ state: doc, lastChangedClock: 0 }],
			clock: 0,
			documentClock: 0,
			schema: schema.serialize(),
		},
		{ authorize: perRecord((change) => (change.record.value > 100 ? 'too big' : null)) }
	)
	const socketPair = new TestSocketPair<Doc>('refused-test', server)
	socketPair.connect()
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
	while (socketPair.getNeedsFlushing()) {
		socketPair.flushClientSentEvents()
		socketPair.flushServerSentEvents()
	}
	return { server, socketPair, store, refusals }
}

function settle({ server, socketPair }: ReturnType<typeof setup>) {
	while (socketPair.getNeedsFlushing()) {
		socketPair.flushClientSentEvents()
		server.flushDebouncingMessages()
		socketPair.flushServerSentEvents()
	}
}

const id = DocType.createId('a')

describe('refusal carries the refused changes', () => {
	it("reports an update as [server version, the user's version]", () => {
		const inst = setup({ id, typeName: 'doc', value: 1 })
		inst.store.put([{ id, typeName: 'doc', value: 200 }])
		settle(inst)

		expect(inst.store.get(id)!.value).toBe(1)
		expect(inst.refusals).toEqual([
			{
				reason: 'too big',
				ids: [id],
				changes: {
					added: {},
					updated: {
						[id]: [
							{ id, typeName: 'doc', value: 1 },
							{ id, typeName: 'doc', value: 200 },
						],
					},
					removed: {},
				},
			},
		])
	})

	it('reports a create as added', () => {
		const inst = setup({ id, typeName: 'doc', value: 1 })
		const created = DocType.createId('b')
		inst.store.put([{ id: created, typeName: 'doc', value: 500 }])
		settle(inst)
		expect(inst.refusals[0].changes).toEqual({
			added: { [created]: { id: created, typeName: 'doc', value: 500 } },
			updated: {},
			removed: {},
		})
	})

	it('reports nothing for an accepted push', () => {
		const inst = setup({ id, typeName: 'doc', value: 1 })
		inst.store.put([{ id, typeName: 'doc', value: 2 }])
		settle(inst)
		expect(inst.refusals).toEqual([])
	})
})
