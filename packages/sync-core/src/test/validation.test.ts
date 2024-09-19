import { computed } from '@tldraw/state'
import { RecordId, Store, StoreSchema, UnknownRecord, createRecordType } from '@tldraw/store'
import { TLSyncClient } from '../lib/TLSyncClient'
import { RecordOpType } from '../lib/diff'
import { TestServer } from './TestServer'
import { TestSocketPair } from './TestSocketPair'

// @ts-expect-error
global.requestAnimationFrame = (cb: () => any) => {
	cb()
}

interface Book {
	typeName: 'book'
	id: RecordId<Book>
	title: string
}
const Book = createRecordType<Book>('book', {
	scope: 'document',
	validator: {
		validate: (record: unknown): Book => {
			if (typeof record !== 'object' || record === null) {
				throw new Error('Expected object')
			}
			if (!('title' in record)) {
				throw new Error('Expected title')
			}
			if (typeof record.title !== 'string') {
				throw new Error('Expected title to be a string')
			}
			return record as Book
		},
	},
})
const BookWithoutValidator = createRecordType<Book>('book', {
	scope: 'document',
	validator: { validate: (record) => record as Book },
})
type Presence = UnknownRecord & { typeName: 'presence' }
const presenceType = createRecordType<Presence>('presence', {
	scope: 'presence',
	validator: { validate: (record) => record as Presence },
})

const schema = StoreSchema.create<Book | Presence>({ book: Book, presence: presenceType })
const schemaWithoutValidator = StoreSchema.create<Book | Presence>({
	book: BookWithoutValidator,
	presence: presenceType,
})

const disposables: Array<() => void> = []
afterEach(() => {
	for (const dispose of disposables) {
		dispose()
	}
	disposables.length = 0
})

async function makeTestInstance() {
	const server = new TestServer(schema)
	const socketPair = new TestSocketPair('test', server)
	socketPair.connect()

	const flush = async () => {
		await Promise.resolve()
		while (socketPair.getNeedsFlushing()) {
			socketPair.flushClientSentEvents()
			socketPair.flushServerSentEvents()
		}
	}
	const onSyncError = jest.fn()
	const client = await new Promise<TLSyncClient<Book | Presence>>((resolve, reject) => {
		const client = new TLSyncClient({
			store: new Store<Book | Presence, unknown>({ schema: schemaWithoutValidator, props: {} }),
			socket: socketPair.clientSocket as any,
			onLoad: resolve,
			onLoadError: reject,
			onSyncError,
			presence: computed('', () => null),
		})
		disposables.push(() => client.close())
		flush()
	})

	return {
		server,
		socketPair,
		client,
		flush,
		onSyncError,
	}
}

it('rejects invalid put operations that create a new document', async () => {
	const { client, flush, onSyncError, server } = await makeTestInstance()

	const prevServerDocs = server.room.getSnapshot().documents

	client.store.put([
		{
			typeName: 'book',
			id: Book.createId('1'),
			// @ts-expect-error - deliberate invalid data
			title: 123 as string,
		},
	])
	await flush()

	expect(onSyncError).toHaveBeenCalledTimes(1)
	expect(onSyncError).toHaveBeenLastCalledWith('invalidRecord')
	expect(server.room.getSnapshot().documents).toStrictEqual(prevServerDocs)
})

it('rejects invalid put operations that replace an existing document', async () => {
	const { client, flush, onSyncError, server } = await makeTestInstance()

	let prevServerDocs = server.room.getSnapshot().documents
	const book: Book = { typeName: 'book', id: Book.createId('1'), title: 'Annihilation' }
	client.store.put([book])
	await flush()

	expect(onSyncError).toHaveBeenCalledTimes(0)
	expect(server.room.getSnapshot().documents).not.toStrictEqual(prevServerDocs)
	prevServerDocs = server.room.getSnapshot().documents

	client.socket.sendMessage({
		type: 'push',
		// @ts-expect-error clientClock is private
		clientClock: client.clientClock++,
		diff: {
			[book.id]: [
				RecordOpType.Put,
				{
					...book,
					// @ts-expect-error - deliberate invalid data
					title: 123 as string,
				},
			],
		},
	})
	await flush()

	expect(onSyncError).toHaveBeenCalledTimes(1)
	expect(onSyncError).toHaveBeenLastCalledWith('invalidRecord')
	expect(server.room.getSnapshot().documents).toStrictEqual(prevServerDocs)
})

it('rejects invalid update operations', async () => {
	const { client, flush, onSyncError, server } = await makeTestInstance()

	let prevServerDocs = server.room.getSnapshot().documents

	// create the book
	client.store.put([
		{
			typeName: 'book',
			id: Book.createId('1'),
			title: 'The silence of the girls',
		},
	])
	await flush()

	expect(onSyncError).toHaveBeenCalledTimes(0)
	expect(server.room.getSnapshot().documents).not.toStrictEqual(prevServerDocs)
	prevServerDocs = server.room.getSnapshot().documents

	// update the title to be wrong
	client.store.put([
		{
			typeName: 'book',
			id: Book.createId('1'),
			// @ts-expect-error - deliberate invalid data
			title: 123 as string,
		},
	])
	await flush()
	expect(onSyncError).toHaveBeenCalledTimes(1)
	expect(onSyncError).toHaveBeenLastCalledWith('invalidRecord')
	expect(server.room.getSnapshot().documents).toStrictEqual(prevServerDocs)
})
