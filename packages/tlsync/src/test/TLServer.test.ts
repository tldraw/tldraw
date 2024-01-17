import { TLRecord, createTLStore, defaultShapeUtils } from '@tldraw/tldraw'
import { type WebSocket } from 'ws'
import { RoomSessionState } from '../lib/RoomSession'
import { DBLoadResult, TLServer } from '../lib/TLServer'
import { chunk } from '../lib/chunk'
import { RecordOpType } from '../lib/diff'
import { TLSYNC_PROTOCOL_VERSION, TLSocketClientSentEvent } from '../lib/protocol'
import { RoomState } from '../lib/server-types'

// Because we are using jsdom in this package, jest tries to load the 'browser' version of the ws library
// which doesn't do anything except throw an error. So we need to sneakily load the node version of ws.
const wsPath = require.resolve('ws').replace('/browser.js', '/index.js')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ws = require(wsPath) as typeof import('ws')

const PORT = 23473

const disposables: (() => void)[] = []

class TLServerTestImpl extends TLServer {
	wsServer = new ws.Server({ port: PORT })
	async close() {
		await new Promise((resolve) => {
			this.wsServer.close((err) => {
				if (err) {
					console.error(err)
				}
				resolve(err)
			})
		})
	}
	async createSocketPair() {
		const connectionPromise = new Promise<WebSocket>((resolve) => {
			this.wsServer.on('connection', resolve)
		})

		const client = new ws.WebSocket('ws://localhost:' + PORT)
		disposables.push(() => {
			client.close()
		})
		const openPromise = new Promise((resolve) => {
			client.on('open', resolve)
		})

		const server = await connectionPromise
		disposables.push(() => {
			server.close()
		})
		await openPromise

		return {
			client,
			server,
		}
	}
	override async loadFromDatabase?(_roomId: string): Promise<DBLoadResult> {
		return { type: 'room_not_found' }
	}
	override async persistToDatabase?(_roomId: string): Promise<void> {
		return
	}
	override logEvent(_event: any): void {
		return
	}
	roomState: RoomState | undefined = undefined
	override getRoomForPersistenceKey(_persistenceKey: string): RoomState | undefined {
		return this.roomState
	}
	override setRoomState(_persistenceKey: string, roomState: RoomState): void {
		this.roomState = roomState
	}
	override deleteRoomState(_persistenceKey: string): void {
		this.roomState = undefined
	}
}
type UnpackPromise<T> = T extends Promise<infer U> ? U : T

const schema = createTLStore({ shapeUtils: defaultShapeUtils }).schema.serialize()

let server: TLServerTestImpl
let sockets: UnpackPromise<ReturnType<typeof server.createSocketPair>>
beforeEach(async () => {
	server = new TLServerTestImpl()
	sockets = await server.createSocketPair()
	expect(sockets.client.readyState).toBe(ws.OPEN)
	expect(sockets.server.readyState).toBe(ws.OPEN)
})

const openConnection = async () => {
	await server.handleConnection({
		persistenceKey: 'test-persistence-key',
		sessionKey: 'test-session-key',
		socket: sockets.server,
		storeId: 'test-store-id',
	})
}

afterEach(async () => {
	disposables.forEach((d) => d())
	disposables.length = 0
	await server.close()
})

describe('TLServer', () => {
	it('accepts new connections', async () => {
		await openConnection()

		expect(server.roomState).not.toBeUndefined()
		expect(server.roomState?.persistenceKey).toBe('test-persistence-key')
		expect(server.roomState?.room.sessions.size).toBe(1)
		expect(server.roomState?.room.sessions.get('test-session-key')?.state).toBe(
			RoomSessionState.AWAITING_CONNECT_MESSAGE
		)
	})

	it('allows requests to be chunked', async () => {
		await openConnection()

		const connectMsg: TLSocketClientSentEvent<TLRecord> = {
			type: 'connect',
			lastServerClock: 0,
			connectRequestId: 'test-connect-request-id',
			protocolVersion: TLSYNC_PROTOCOL_VERSION,
			schema,
		}

		const chunks = chunk(JSON.stringify(connectMsg), 200)
		expect(chunks.length).toBeGreaterThan(1)

		const onClientMessage = jest.fn()
		const receivedPromise = new Promise((resolve) => {
			onClientMessage.mockImplementationOnce(resolve)
		})

		sockets.client.on('message', onClientMessage)

		expect(server.roomState?.room.sessions.get('test-session-key')?.state).toBe(
			RoomSessionState.AWAITING_CONNECT_MESSAGE
		)

		for (const chunk of chunks) {
			sockets.client.send(chunk)
		}

		await receivedPromise

		expect(server.roomState?.room.sessions.get('test-session-key')?.state).toBe(
			RoomSessionState.CONNECTED
		)

		expect(onClientMessage).toHaveBeenCalledTimes(1)
		expect(JSON.parse(onClientMessage.mock.calls[0][0])).toMatchObject({
			connectRequestId: 'test-connect-request-id',
			hydrationType: 'wipe_all',
			diff: {
				'document:document': [
					RecordOpType.Put,
					{
						/* ... */
					},
				],
			},
		})
	})
})
