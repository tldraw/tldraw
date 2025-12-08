import { StoreSchema, UnknownRecord } from '@tldraw/store'
import { InMemorySyncStorage } from '../lib/InMemorySyncStorage'
import { RoomSnapshot, TLSyncRoom } from '../lib/TLSyncRoom'
import { TestSocketPair } from './TestSocketPair'

export class TestServer<R extends UnknownRecord, P = unknown> {
	room: TLSyncRoom<R, undefined>
	storage: InMemorySyncStorage<R>
	constructor(schema: StoreSchema<R, P>, snapshot?: RoomSnapshot) {
		// Use provided snapshot or create an empty one with the current schema
		this.storage = new InMemorySyncStorage<R>({
			snapshot: snapshot ?? {
				documents: [],
				clock: 0,
				documentClock: 0,
				schema: schema.serialize(),
			},
		})
		this.room = new TLSyncRoom<R, undefined>({ schema, storage: this.storage })
	}

	connect(socketPair: TestSocketPair<R>): void {
		this.room.handleNewSession({
			sessionId: socketPair.id,
			socket: socketPair.roomSocket,
			meta: undefined,
			isReadonly: false,
		})

		socketPair.clientSocket.connectionStatus = 'online'
		socketPair.didReceiveFromClient = (msg) => {
			this.room.handleMessage(socketPair.id, msg)
		}
		socketPair.clientDisconnected = () => {
			this.room.handleClose(socketPair.id)
		}

		socketPair.callbacks.onStatusChange?.({ status: 'online' })
	}

	flushDebouncingMessages() {
		for (const sessionId of this.room.sessions.keys()) {
			this.room._flushDataMessages(sessionId)
		}
	}
}
