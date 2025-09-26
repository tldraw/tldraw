import { computed } from '@tldraw/state'
import {
	BaseRecord,
	RecordId,
	Store,
	StoreSchema,
	UnknownRecord,
	createMigrationIds,
	createMigrationSequence,
	createRecordMigrationSequence,
	createRecordType,
} from '@tldraw/store'
import { vi, type Mock } from 'vitest'
import { TLSyncClient, TLSyncErrorCloseEventReason } from '../lib/TLSyncClient'
import { RoomSnapshot, TLRoomSocket } from '../lib/TLSyncRoom'
import { getTlsyncProtocolVersion } from '../lib/protocol'
import { TestServer } from './TestServer'
import { TestSocketPair } from './TestSocketPair'

const actualProtocol = (await vi.importActual('../lib/protocol')) as any

vi.mock('../lib/protocol', async () => {
	const actual = (await vi.importActual('../lib/protocol')) as any
	return {
		...actual,
		getTlsyncProtocolVersion: vi.fn(actual.getTlsyncProtocolVersion),
	}
})

const mockGetTlsyncProtocolVersion = getTlsyncProtocolVersion as Mock

function mockSocket<R extends UnknownRecord>(): TLRoomSocket<R> {
	return {
		isOpen: true,
		sendMessage: vi.fn(),
		close: vi.fn(),
	}
}

// @ts-expect-error
global.requestAnimationFrame = (cb: () => any) => {
	cb()
}

const disposables: Array<() => void> = []

afterEach(() => {
	for (const dispose of disposables) {
		dispose()
	}
	disposables.length = 0
})

const UserVersions = createMigrationIds('com.tldraw.user', {
	ReplaceAgeWithBirthdate: 1,
} as const)

interface UserV1 extends BaseRecord<'user', RecordId<UserV1>> {
	name: string
	age: number
}
interface PresenceV1 extends BaseRecord<'presence', RecordId<PresenceV1>> {
	name: string
	age: number
}

const PresenceV1 = createRecordType<PresenceV1>('presence', {
	scope: 'presence',
	validator: { validate: (value) => value as PresenceV1 },
})

const UserV1 = createRecordType<UserV1>('user', {
	scope: 'document',
	validator: { validate: (value) => value as UserV1 },
})

interface UserV2 extends BaseRecord<'user', RecordId<UserV2>> {
	name: string
	birthdate: string | null
}

const userV2Migrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw.user',
	recordType: 'user',
	sequence: [
		{
			id: UserVersions.ReplaceAgeWithBirthdate,
			up({ age: _age, ...user }: any) {
				return {
					...user,
					birthdate: null,
				}
			},
			down({ birthdate: _birthdate, ...user }: any) {
				return {
					...user,
					age: 0,
				}
			},
		},
	],
})
const UserV2 = createRecordType<UserV2>('user', {
	scope: 'document',
	validator: { validate: (value) => value as UserV2 },
})

type RV1 = UserV1 | PresenceV1
type RV2 = UserV2 | PresenceV1

const userV1Migrations = createMigrationSequence({
	sequenceId: 'com.tldraw.user',
	sequence: [],
	retroactive: true,
})

const schemaV1 = StoreSchema.create<RV1>(
	{ user: UserV1, presence: PresenceV1 },
	{ migrations: [userV1Migrations] }
)

const schemaV2 = StoreSchema.create<RV2>(
	{ user: UserV2, presence: PresenceV1 },
	{
		migrations: [userV2Migrations],
	}
)

const schemaV3 = StoreSchema.create<RV2>(
	{ user: UserV2, presence: PresenceV1 },
	{
		migrations: [
			userV2Migrations,
			createMigrationSequence({
				sequenceId: 'com.tldraw.store',
				retroactive: true,
				sequence: [
					{
						id: 'com.tldraw.store/1',
						scope: 'store',
						up(store: any) {
							// remove any users called joe
							const result = Object.fromEntries(
								Object.entries(store).filter(
									([_, r]) => (r as any).typeName !== 'user' || (r as any).name !== 'joe'
								)
							)
							// add a user called steve
							const id = UserV2.createId('steve')
							result[id] = UserV2.create({
								id,
								name: 'steve',
								birthdate: '2022-02-02',
							})
							return result as any
						},
					},
				],
			}),
		],
	}
)

class TestInstance {
	server: TestServer<RV2>
	oldSocketPair: TestSocketPair<RV2>
	newSocketPair: TestSocketPair<RV2>
	oldClient: TLSyncClient<RV1>
	newClient: TLSyncClient<RV2>

	hasLoaded = false

	constructor(snapshot?: RoomSnapshot, oldSchema = schemaV1, newSchema = schemaV2) {
		this.server = new TestServer(newSchema, snapshot)
		this.oldSocketPair = new TestSocketPair('test_upgrade_old', this.server)
		this.newSocketPair = new TestSocketPair('test_upgrade_new', this.server)

		this.oldClient = new TLSyncClient<RV1>({
			store: new Store({ schema: oldSchema, props: {} }),
			socket: this.oldSocketPair.clientSocket as any,
			onLoad: () => {
				this.hasLoaded = true
			},
			onSyncError: vi.fn((reason) => {
				throw new Error('onSyncError: ' + reason)
			}),
			presence: computed('', () => null),
		})

		this.newClient = new TLSyncClient<RV2>({
			store: new Store({ schema: newSchema, props: {} }),
			socket: this.newSocketPair.clientSocket,
			onLoad: () => {
				this.hasLoaded = true
			},
			onSyncError: vi.fn((reason) => {
				throw new Error('onSyncError: ' + reason)
			}),
			presence: computed('', () => null),
		})

		disposables.push(() => {
			this.oldClient.close()
			this.newClient.close()
		})
	}

	flush() {
		this.server.flushDebouncingMessages()

		while (this.oldSocketPair.getNeedsFlushing() || this.newSocketPair.getNeedsFlushing()) {
			this.oldSocketPair.flushClientSentEvents()
			this.oldSocketPair.flushServerSentEvents()
			this.newSocketPair.flushClientSentEvents()
			this.newSocketPair.flushServerSentEvents()
		}
	}
}

test('the server can handle receiving v1 stuff from the client', () => {
	const t = new TestInstance()
	t.oldSocketPair.connect()
	t.newSocketPair.connect()

	const user = UserV1.create({ name: 'bob', age: 10 })
	t.flush()
	t.oldClient.store.put([user])
	t.flush()

	expect(t.server.room.documents.get(user.id)?.state).toMatchObject({
		name: 'bob',
		birthdate: null,
	})
	expect(t.server.room.documents.get(user.id)?.state).not.toMatchObject({
		name: 'bob',
		age: 10,
	})

	expect(t.newClient.store.get(user.id as any)).toMatchObject({
		name: 'bob',
		birthdate: null,
	})
	expect(t.newClient.store.get(user.id as any)).not.toMatchObject({ name: 'bob', age: 10 })
})

test('the server can send v2 stuff to the v1 client', () => {
	const t = new TestInstance()
	t.oldSocketPair.connect()
	t.newSocketPair.connect()

	const user = UserV2.create({ name: 'bob', birthdate: '2022-01-09' })
	t.flush()
	t.newClient.store.put([user])
	t.flush()

	expect(t.server.room.documents.get(user.id)?.state).toMatchObject({
		name: 'bob',
		birthdate: '2022-01-09',
	})

	expect(t.oldClient.store.get(user.id as any)).toMatchObject({
		name: 'bob',
		age: 0,
	})
	expect(t.oldClient.store.get(user.id as any)).not.toMatchObject({
		name: 'bob',
		birthdate: '2022-01-09',
	})
})

test('the server will run schema migrations on a snapshot', () => {
	const bob = UserV1.create({ name: 'bob', age: 10 })
	// joe will be deleted
	const joe = UserV1.create({ name: 'joe', age: 10 })
	const t = new TestInstance(
		{
			documents: [
				{ state: bob, lastChangedClock: 5 },
				{ state: joe, lastChangedClock: 5 },
			],
			clock: 10,
			schema: schemaV1.serialize(),
			tombstones: {},
		},
		schemaV1,
		schemaV3
	)

	expect(t.server.room.documents.get(bob.id)?.state).toMatchObject({
		name: 'bob',
		birthdate: null,
	})
	expect(t.server.room.documents.get(joe.id)).toBeUndefined()

	// there should be someone named steve
	const snapshot = t.server.room.getSnapshot()
	expect(snapshot.documents.find((u: any) => u.state.name === 'steve')).toBeDefined()
})

test('out-of-date clients will receive incompatibility errors', () => {
	const v3server = new TestServer(schemaV3)

	const id = 'test_upgrade_v2'
	const socket = mockSocket()

	v3server.room.handleNewSession({ sessionId: id, socket, meta: undefined, isReadonly: false })
	v3server.room.handleMessage(id, {
		type: 'connect',
		connectRequestId: 'test',
		lastServerClock: 0,
		protocolVersion: getTlsyncProtocolVersion(),
		schema: schemaV2.serialize(),
	})

	expect(socket.close).toHaveBeenCalledWith(4099, TLSyncErrorCloseEventReason.CLIENT_TOO_OLD)
})

test('clients using an out-of-date protocol will receive compatibility errors', () => {
	const actualVersion = getTlsyncProtocolVersion()
	mockGetTlsyncProtocolVersion.mockReturnValue(actualVersion + 1)
	try {
		const v2server = new TestServer(schemaV2)

		const id = 'test_upgrade_v3'
		const socket = mockSocket()

		v2server.room.handleNewSession({ sessionId: id, socket, meta: undefined, isReadonly: false })
		v2server.room.handleMessage(id, {
			type: 'connect',
			connectRequestId: 'test',
			lastServerClock: 0,
			protocolVersion: actualVersion,
			schema: schemaV2.serialize(),
		})

		expect(socket.close).toHaveBeenCalledWith(4099, TLSyncErrorCloseEventReason.CLIENT_TOO_OLD)
	} finally {
		mockGetTlsyncProtocolVersion.mockReset()
		mockGetTlsyncProtocolVersion.mockImplementation(actualProtocol.getTlsyncProtocolVersion)
	}
})

test('clients using a too-new protocol will receive compatibility errors', () => {
	const v2server = new TestServer(schemaV2)

	const id = 'test_upgrade_v3'
	const socket = mockSocket()

	v2server.room.handleNewSession({ sessionId: id, socket, meta: undefined, isReadonly: false })
	v2server.room.handleMessage(id, {
		type: 'connect',
		connectRequestId: 'test',
		lastServerClock: 0,
		protocolVersion: getTlsyncProtocolVersion() + 1,
		schema: schemaV2.serialize(),
	})

	expect(socket.close).toHaveBeenCalledWith(4099, TLSyncErrorCloseEventReason.SERVER_TOO_OLD)
})

test('when the client is too new it cannot connect', () => {
	const steve = UserV1.create({ id: UserV1.createId('steve'), name: 'steve', age: 23 })
	const jeff = UserV1.create({ id: UserV1.createId('jeff'), name: 'jeff', age: 23 })
	const annie = UserV1.create({ id: UserV1.createId('annie'), name: 'annie', age: 23 })
	const v1Server = new TestServer(schemaV1, {
		clock: 10,
		documents: [
			{
				state: steve,
				lastChangedClock: 10,
			},
			{
				state: jeff,
				lastChangedClock: 10,
			},
			{
				state: annie,
				lastChangedClock: 10,
			},
		],
		schema: schemaV1.serialize(),
		tombstones: {},
	})

	const v2_id = 'test_upgrade_v2'
	const v2_socket = mockSocket<RV2>()

	v1Server.room.handleNewSession({
		sessionId: v2_id,
		socket: v2_socket as any,
		meta: undefined,
		isReadonly: false,
	})
	v1Server.room.handleMessage(v2_id as any, {
		type: 'connect',
		connectRequestId: 'test',
		lastServerClock: 10,
		protocolVersion: getTlsyncProtocolVersion(),
		schema: schemaV2.serialize(),
	})

	expect(v2_socket.close).toHaveBeenCalledWith(
		4099,
		// this should really be 'serverTooOld' but our schema format is a bit too loose to
		// accurately determine that now.
		TLSyncErrorCloseEventReason.CLIENT_TOO_OLD
	)
})
