import { atom, computed, Signal } from '@tldraw/state'
import { BaseRecord, createRecordType, RecordId, Store, StoreSchema } from '@tldraw/store'
import { vi } from 'vitest'
import { TLSyncClient } from '../lib/TLSyncClient'
import { TestServer } from './TestServer'
import { TestSocketPair } from './TestSocketPair'

vi.mock('@tldraw/utils', async () => {
	const actual = await vi.importActual('@tldraw/utils')
	return {
		...actual,
		fpsThrottle: vi.fn((fn) => fn),
	}
})

const disposables: Array<() => void> = []

afterEach(() => {
	for (const dispose of disposables) {
		dispose()
	}
	disposables.length = 0
})

interface User extends BaseRecord<'user', RecordId<User>> {
	name: string
	age: number
}

interface Presence extends BaseRecord<'presence', RecordId<Presence>> {
	name: string
	age: number
}

const Presence = createRecordType<Presence>('presence', {
	scope: 'presence',
	validator: { validate: (value) => value as Presence },
})

const User = createRecordType<User>('user', {
	scope: 'document',
	validator: { validate: (value) => value as User },
})

type R = User | Presence

const schema = StoreSchema.create<R>({ user: User, presence: Presence })

class TestInstance {
	server: TestServer<R>
	socketPair: TestSocketPair<R>
	client: TLSyncClient<R>

	hasLoaded = false

	constructor(presenceSignal: Signal<Presence | null>, presenceMode?: 'solo' | 'full') {
		this.server = new TestServer(schema)
		this.socketPair = new TestSocketPair('test_presence_mode', this.server)
		this.socketPair.connect()

		this.client = new TLSyncClient<R>({
			store: new Store({ schema, props: {} }),
			socket: this.socketPair.clientSocket,
			onLoad: () => {
				this.hasLoaded = true
			},
			onSyncError: vi.fn((reason) => {
				throw new Error('onSyncError: ' + reason)
			}),
			presence: presenceSignal,
			presenceMode: presenceMode ? computed('', () => presenceMode) : undefined,
		})

		disposables.push(() => {
			this.client.close()
		})
	}

	flush() {
		this.server.flushDebouncingMessages()

		while (this.socketPair.getNeedsFlushing()) {
			this.socketPair.flushClientSentEvents()
			this.socketPair.flushServerSentEvents()
		}
	}
}

test('presence is pushed on change when mode is full', () => {
	const presence = Presence.create({ name: 'bob', age: 10 })
	const presenceSignal = atom('', presence)

	const t = new TestInstance(presenceSignal, 'full')
	t.socketPair.connect()
	t.flush()

	const session = t.server.room.sessions.values().next().value
	expect(session).toBeDefined()
	expect(session?.presenceId).toBeDefined()
	expect(t.server.room.documents.get(session!.presenceId!)?.state).toMatchObject({
		name: 'bob',
		age: 10,
	})

	presenceSignal.set(Presence.create({ name: 'bob', age: 11 }))
	t.flush()
	expect(t.server.room.documents.get(session!.presenceId!)?.state).toMatchObject({
		name: 'bob',
		age: 11,
	})

	presenceSignal.set(Presence.create({ name: 'bob', age: 12 }))
	t.flush()
	expect(t.server.room.documents.get(session!.presenceId!)?.state).toMatchObject({
		name: 'bob',
		age: 12,
	})
})

test('presence is only pushed once on connect when mode is solo', () => {
	const presence = Presence.create({ name: 'bob', age: 10 })
	const presenceSignal = atom('', presence)

	const t = new TestInstance(presenceSignal, 'solo')
	t.socketPair.connect()
	t.flush()

	const session = t.server.room.sessions.values().next().value
	expect(session).toBeDefined()
	expect(session?.presenceId).toBeDefined()
	expect(t.server.room.documents.get(session!.presenceId!)?.state).toMatchObject({
		name: 'bob',
		age: 10,
	})

	presenceSignal.set(Presence.create({ name: 'bob', age: 11 }))
	t.flush()
	expect(t.server.room.documents.get(session!.presenceId!)?.state).not.toMatchObject({
		name: 'bob',
		age: 11,
	})

	presenceSignal.set(Presence.create({ name: 'bob', age: 12 }))
	t.flush()
	expect(t.server.room.documents.get(session!.presenceId!)?.state).not.toMatchObject({
		name: 'bob',
		age: 12,
	})
})
