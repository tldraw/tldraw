import { atom, createRecordType, Store, StoreSchema, UnknownRecord } from 'tldraw'
import { TLSyncClient } from '../lib/TLSyncClient'
import { TestServer } from './TestServer'
import { TestSocketPair } from './TestSocketPair'

type Presence = UnknownRecord & { typeName: 'presence' }
const presenceType = createRecordType<Presence>('presence', {
	scope: 'presence',
	validator: { validate: (record) => record as Presence },
})
const schema = StoreSchema.create<Presence>({ presence: presenceType })

describe('custom messages', () => {
	it('sends a message to a client', async () => {
		const store = new Store({ schema, props: {} })

		const sessionId = 'test-session-1'
		const server = new TestServer(schema)
		const socketPair = new TestSocketPair(sessionId, server)
		socketPair.connect()

		const onCustomMessageReceived = vi.fn()
		new TLSyncClient({
			store,
			socket: socketPair.clientSocket,
			onCustomMessageReceived,
			onLoad: vi.fn(),
			onSyncError: vi.fn(),
			presence: atom('', null),
		})
		await socketPair.flushAllEvents()
		server.room.sendCustomMessage(sessionId, 'hello world')
		await socketPair.flushAllEvents()
		expect(onCustomMessageReceived.mock.lastCall).toEqual(['hello world'])
	})
})
