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
import { TLSyncClient } from '../lib/TLSyncClient'
import { RoomSnapshot, TLRoomSocket } from '../lib/TLSyncRoom'
import { RecordOpType, ValueOpType } from '../lib/diff'
import {
	TLIncompatibilityReason,
	TLSocketServerSentEvent,
	getTlsyncProtocolVersion,
} from '../lib/protocol'
import { TestServer } from './TestServer'
import { TestSocketPair } from './TestSocketPair'

const actualProtocol = jest.requireActual('../lib/protocol')

jest.mock('../lib/protocol', () => {
	const actual = jest.requireActual('../lib/protocol')
	return {
		...actual,
		getTlsyncProtocolVersion: jest.fn(actual.getTlsyncProtocolVersion),
	}
})

const mockGetTlsyncProtocolVersion = getTlsyncProtocolVersion as jest.Mock

function mockSocket<R extends UnknownRecord>(): TLRoomSocket<R> {
	return {
		isOpen: true,
		sendMessage: jest.fn(),
		close() {
			// noop
		},
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
			onLoadError: (e) => {
				throw new Error('onLoadError', e)
			},
			onSyncError: jest.fn((reason) => {
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
			onLoadError: (e) => {
				throw new Error('onLoadError', e)
			},
			onSyncError: jest.fn((reason) => {
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

	expect(t.server.room.state.get().documents[user.id].state).toMatchObject({
		name: 'bob',
		birthdate: null,
	})
	expect(t.server.room.state.get().documents[user.id].state).not.toMatchObject({
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

	expect(t.server.room.state.get().documents[user.id].state).toMatchObject({
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

	expect(t.server.room.state.get().documents[bob.id].state).toMatchObject({
		name: 'bob',
		birthdate: null,
	})
	expect(t.server.room.state.get().documents[joe.id]).toBeUndefined()

	// there should be someone named steve
	const snapshot = t.server.room.getSnapshot()
	expect(snapshot.documents.find((u: any) => u.state.name === 'steve')).toBeDefined()
})

test('clients will receive updates from a snapshot migration upon connection', () => {
	const t = new TestInstance()
	t.oldSocketPair.connect()
	t.newSocketPair.connect()

	const bob = UserV2.create({ name: 'bob', birthdate: '2022-01-09' })
	const joe = UserV2.create({ name: 'joe', birthdate: '2022-01-09' })
	t.flush()
	t.newClient.store.put([bob, joe])
	t.flush()

	const snapshot = t.server.room.getSnapshot()

	t.oldSocketPair.disconnect()
	t.newSocketPair.disconnect()

	const newServer = new TestServer(schemaV3, snapshot)

	const newClientSocketPair = new TestSocketPair('test_upgrade__brand_new', newServer)

	// need to set these two things to get the message through
	newClientSocketPair.callbacks['onReceiveMessage'] = jest.fn()
	newClientSocketPair.clientSocket.connectionStatus = 'online'

	const id = 'test_upgrade_brand_new'
	const newClientSocket = mockSocket()
	newServer.room.handleNewSession(id, newClientSocket)
	newServer.room.handleMessage(id, {
		type: 'connect',
		connectRequestId: 'test',
		lastServerClock: snapshot.clock,
		protocolVersion: getTlsyncProtocolVersion(),
		schema: schemaV3.serialize(),
	})

	expect((newClientSocket.sendMessage as jest.Mock).mock.calls[0][0]).toMatchObject({
		// we should have added steve and deleted joe
		diff: {
			[joe.id]: [RecordOpType.Remove],
			['user:steve']: [RecordOpType.Put, { name: 'steve', birthdate: '2022-02-02' }],
		},
	})
})

test('out-of-date clients will receive incompatibility errors', () => {
	const v3server = new TestServer(schemaV3)

	const id = 'test_upgrade_v2'
	const socket = mockSocket()

	v3server.room.handleNewSession(id, socket)
	v3server.room.handleMessage(id, {
		type: 'connect',
		connectRequestId: 'test',
		lastServerClock: 0,
		protocolVersion: getTlsyncProtocolVersion(),
		schema: schemaV2.serialize(),
	})

	expect(socket.sendMessage).toHaveBeenCalledWith({
		type: 'incompatibility_error',
		reason: TLIncompatibilityReason.ClientTooOld,
	})
})

test('clients using an out-of-date protocol will receive compatibility errors', () => {
	const actualVersion = getTlsyncProtocolVersion()
	mockGetTlsyncProtocolVersion.mockReturnValue(actualVersion + 1)
	try {
		const v2server = new TestServer(schemaV2)

		const id = 'test_upgrade_v3'
		const socket = mockSocket()

		v2server.room.handleNewSession(id, socket)
		v2server.room.handleMessage(id, {
			type: 'connect',
			connectRequestId: 'test',
			lastServerClock: 0,
			protocolVersion: actualVersion,
			schema: schemaV2.serialize(),
		})

		expect(socket.sendMessage).toHaveBeenCalledWith({
			type: 'incompatibility_error',
			reason: TLIncompatibilityReason.ClientTooOld,
		})
	} finally {
		mockGetTlsyncProtocolVersion.mockReset()
		mockGetTlsyncProtocolVersion.mockImplementation(actualProtocol.getTlsyncProtocolVersion)
	}
})

// this can be deleted when the protocol gets to v7
test('v5 special case should allow connections', () => {
	const actualVersion = getTlsyncProtocolVersion()
	if (actualVersion > 6) return

	const v2server = new TestServer(schemaV2)

	const id = 'test_upgrade_v3'
	const socket = mockSocket()

	v2server.room.handleNewSession(id, socket)
	v2server.room.handleMessage(id, {
		type: 'connect',
		connectRequestId: 'test',
		lastServerClock: 0,
		protocolVersion: 5,
		schema: schemaV2.serialize(),
	})

	expect(socket.sendMessage).toHaveBeenCalledWith({
		connectRequestId: 'test',
		diff: {},
		hydrationType: 'wipe_all',
		protocolVersion: 6,
		schema: {
			schemaVersion: 2,
			sequences: {
				'com.tldraw.user': 1,
			},
		},
		serverClock: 1,
		type: 'connect',
	})
})

test('clients using a too-new protocol will receive compatibility errors', () => {
	const v2server = new TestServer(schemaV2)

	const id = 'test_upgrade_v3'
	const socket = mockSocket()

	v2server.room.handleNewSession(id, socket)
	v2server.room.handleMessage(id, {
		type: 'connect',
		connectRequestId: 'test',
		lastServerClock: 0,
		protocolVersion: getTlsyncProtocolVersion() + 1,
		schema: schemaV2.serialize(),
	})

	expect(socket.sendMessage).toHaveBeenCalledWith({
		type: 'incompatibility_error',
		reason: TLIncompatibilityReason.ServerTooOld,
	})
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

	v1Server.room.handleNewSession(v2_id, v2_socket as any)
	v1Server.room.handleMessage(v2_id as any, {
		type: 'connect',
		connectRequestId: 'test',
		lastServerClock: 10,
		protocolVersion: getTlsyncProtocolVersion(),
		schema: schemaV2.serialize(),
	})

	expect(v2_socket.sendMessage).toHaveBeenCalledWith({
		type: 'incompatibility_error',
		// this should really be 'serverTooOld' but our schema format is a bit too loose to
		// accurately determine that now.
		reason: 'clientTooOld',
	})
})

describe('when the client is too old', () => {
	function setup() {
		const steve = UserV2.create({
			id: UserV2.createId('steve'),
			name: 'steve',
			birthdate: null,
		})
		const jeff = UserV2.create({ id: UserV2.createId('jeff'), name: 'jeff', birthdate: null })
		const annie = UserV2.create({
			id: UserV2.createId('annie'),
			name: 'annie',
			birthdate: null,
		})
		const v2Server = new TestServer(schemaV2, {
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

		const v2Id = 'test_upgrade_v2'
		const v2Socket = mockSocket<RV2>()

		const v2SendMessage = v2Socket.sendMessage as jest.Mock

		const v1Id = 'test_upgrade_v1'
		const v1Socket = mockSocket<RV1>()

		const v1SendMessage = v1Socket.sendMessage as jest.Mock

		v2Server.room.handleNewSession(v1Id, v1Socket as any)
		v2Server.room.handleMessage(v1Id, {
			type: 'connect',
			connectRequestId: 'test',
			lastServerClock: 10,
			protocolVersion: getTlsyncProtocolVersion(),
			schema: schemaV1.serialize(),
		})

		v2Server.room.handleNewSession(v2Id, v2Socket)
		v2Server.room.handleMessage(v2Id, {
			type: 'connect',
			connectRequestId: 'test',
			lastServerClock: 10,
			protocolVersion: getTlsyncProtocolVersion(),
			schema: schemaV2.serialize(),
		})

		expect(v2SendMessage).toHaveBeenCalledWith({
			type: 'connect',
			connectRequestId: 'test',
			hydrationType: 'wipe_presence',
			diff: {},
			protocolVersion: getTlsyncProtocolVersion(),
			schema: schemaV2.serialize(),
			serverClock: 10,
		} satisfies TLSocketServerSentEvent<RV2>)

		expect(v1SendMessage).toHaveBeenCalledWith({
			type: 'connect',
			connectRequestId: 'test',
			hydrationType: 'wipe_presence',
			diff: {},
			protocolVersion: getTlsyncProtocolVersion(),
			schema: schemaV2.serialize(),
			serverClock: 10,
		} satisfies TLSocketServerSentEvent<RV2>)

		v2SendMessage.mockClear()
		v1SendMessage.mockClear()

		return {
			v2Server,
			v2Id,
			v1Id,
			v2SendMessage,
			v1SendMessage,
			steve,
			jeff,
			annie,
		}
	}

	let data: ReturnType<typeof setup>

	beforeEach(() => {
		data = setup()
	})

	it('allows deletions from v1 client', () => {
		data.v2Server.room.handleMessage(data.v2Id, {
			type: 'push',
			clientClock: 1,
			diff: {
				[data.steve.id]: [RecordOpType.Remove],
			},
		})

		expect(data.v2SendMessage).toHaveBeenCalledWith({
			type: 'data',
			data: [
				{
					type: 'push_result',
					action: 'commit',
					clientClock: 1,
					serverClock: 11,
				},
			],
		} satisfies TLSocketServerSentEvent<RV2>)
	})

	it('can handle patches from older clients', () => {
		data.v2Server.room.handleMessage(data.v1Id, {
			type: 'push',
			clientClock: 1,
			diff: {
				[data.steve.id]: [RecordOpType.Patch, { name: [ValueOpType.Put, 'Jeff'] }],
			},
		})

		expect(data.v1SendMessage).toHaveBeenCalledWith({
			type: 'data',
			data: [
				{
					type: 'push_result',
					action: 'commit',
					clientClock: 1,
					serverClock: 11,
				},
			],
		} satisfies TLSocketServerSentEvent<RV2>)

		expect(data.v2SendMessage).toHaveBeenCalledWith({
			type: 'data',
			data: [
				{
					type: 'patch',
					diff: {
						[data.steve.id]: [
							RecordOpType.Patch,
							{
								name: [ValueOpType.Put, 'Jeff'],
							},
						],
					},
					serverClock: 11,
				},
			],
		} satisfies TLSocketServerSentEvent<RV2>)
	})
})

describe('when the client is the same version', () => {
	function setup() {
		const steve = UserV2.create({
			id: UserV2.createId('steve'),
			name: 'steve',
			birthdate: null,
		})
		const v2Server = new TestServer(schemaV2, {
			clock: 10,
			documents: [
				{
					state: steve,
					lastChangedClock: 10,
				},
			],
			schema: schemaV2.serialize(),
			tombstones: {},
		})

		const aId = 'v2ClientA'
		const aSocket = mockSocket<RV2>()

		const bId = 'v2ClientB'
		const bSocket = mockSocket<RV2>()

		v2Server.room.handleNewSession(aId, aSocket)
		v2Server.room.handleMessage(aId, {
			type: 'connect',
			connectRequestId: 'test',
			lastServerClock: 10,
			protocolVersion: getTlsyncProtocolVersion(),
			schema: JSON.parse(JSON.stringify(schemaV2.serialize())),
		})

		v2Server.room.handleNewSession(bId, bSocket)
		v2Server.room.handleMessage(bId, {
			type: 'connect',
			connectRequestId: 'test',
			lastServerClock: 10,
			protocolVersion: getTlsyncProtocolVersion(),
			schema: JSON.parse(JSON.stringify(schemaV2.serialize())),
		})

		expect(aSocket.sendMessage).toHaveBeenCalledWith({
			type: 'connect',
			connectRequestId: 'test',
			hydrationType: 'wipe_presence',
			diff: {},
			protocolVersion: getTlsyncProtocolVersion(),
			schema: schemaV2.serialize(),
			serverClock: 10,
		} satisfies TLSocketServerSentEvent<RV2>)

		expect(bSocket.sendMessage).toHaveBeenCalledWith({
			type: 'connect',
			connectRequestId: 'test',
			hydrationType: 'wipe_presence',
			diff: {},
			protocolVersion: getTlsyncProtocolVersion(),
			schema: schemaV2.serialize(),
			serverClock: 10,
		} satisfies TLSocketServerSentEvent<RV2>)
		;(aSocket.sendMessage as jest.Mock).mockClear()
		;(bSocket.sendMessage as jest.Mock).mockClear()

		return {
			v2Server,
			aId,
			bId,
			v2ClientASendMessage: aSocket.sendMessage as jest.Mock,
			v2ClientBSendMessage: bSocket.sendMessage as jest.Mock,
			steve,
		}
	}

	let data: ReturnType<typeof setup>

	beforeEach(() => {
		data = setup()
	})

	it('sends minimal patches', () => {
		data.v2Server.room.handleMessage(data.aId, {
			type: 'push',
			clientClock: 1,
			diff: {
				[data.steve.id]: [RecordOpType.Patch, { name: [ValueOpType.Put, 'Jeff'] }],
			},
		})

		expect(data.v2ClientASendMessage).toHaveBeenCalledWith({
			type: 'data',
			data: [
				{
					type: 'push_result',
					action: 'commit',
					clientClock: 1,
					serverClock: 11,
				},
			],
		} satisfies TLSocketServerSentEvent<RV2>)

		expect(data.v2ClientBSendMessage).toHaveBeenCalledWith({
			type: 'data',
			data: [
				{
					type: 'patch',
					diff: {
						[data.steve.id]: [
							RecordOpType.Patch,
							{
								name: [ValueOpType.Put, 'Jeff'],
							},
						],
					},
					serverClock: 11,
				},
			],
		} satisfies TLSocketServerSentEvent<RV2>)
	})
})
