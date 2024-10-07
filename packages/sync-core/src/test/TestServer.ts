import { StoreSchema, UnknownRecord } from '@tldraw/store'
import { RoomSnapshot, TLSyncRoom } from '../lib/TLSyncRoom'
import { TestSocketPair } from './TestSocketPair'

export class TestServer<R extends UnknownRecord, P = unknown> {
	room: TLSyncRoom<R, undefined>
	constructor(schema: StoreSchema<R, P>, snapshot?: RoomSnapshot) {
		this.room = new TLSyncRoom<R, undefined>({ schema, snapshot })
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
