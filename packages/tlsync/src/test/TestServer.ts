import { StoreSchema, UnknownRecord } from '@tldraw/store'
import { RoomSnapshot, TLSyncRoom } from '../lib/TLSyncRoom'
import { TestSocketPair } from './TestSocketPair'

export class TestServer<R extends UnknownRecord, P = unknown> {
	room: TLSyncRoom<R>
	constructor(schema: StoreSchema<R, P>, snapshot?: RoomSnapshot) {
		this.room = new TLSyncRoom<R>(schema, snapshot)
	}

	connect(socketPair: TestSocketPair<R>): void {
		this.room.handleNewSession(socketPair.id, socketPair.roomSocket)

		socketPair.clientSocket.connectionStatus = 'online'
		socketPair.didReceiveFromClient = (msg) => {
			this.room.handleMessage(socketPair.id, msg)
		}
		socketPair.clientDisconnected = () => {
			this.room.handleClose(socketPair.id)
		}

		socketPair.callbacks.onStatusChange?.('online')
	}

	flushDebouncingMessages() {
		for (const sessionKey of this.room.sessions.keys()) {
			this.room._flushDataMessages(sessionKey)
		}
	}
}
