import { StoreSchema, UnknownRecord } from '@tldraw/store'
import { InMemorySyncStorage } from '../lib/InMemorySyncStorage'
import { TLObjectStoreAccess } from '../lib/protocol'
import { RoomSnapshot, TLSyncRoom } from '../lib/TLSyncRoom'
import { TestSocketPair } from './TestSocketPair'

type TestRoomOptions<R extends UnknownRecord> = Omit<
	ConstructorParameters<typeof TLSyncRoom<R, undefined>>[0],
	'schema' | 'storage'
>

export class TestServer<R extends UnknownRecord, P = unknown> {
	room: TLSyncRoom<R, undefined>
	storage: InMemorySyncStorage<R>
	constructor(schema: StoreSchema<R, P>, snapshot?: RoomSnapshot, roomOpts?: TestRoomOptions<R>) {
		// Use provided snapshot or create an empty one with the current schema
		this.storage = new InMemorySyncStorage<R>({
			snapshot: snapshot ?? {
				documents: [],
				clock: 0,
				documentClock: 0,
				schema: schema.serialize(),
			},
		})
		this.room = new TLSyncRoom<R, undefined>({ schema, storage: this.storage, ...roomOpts })
	}

	connect(
		socketPair: TestSocketPair<R>,
		opts?: { isReadonly?: boolean; objectAccess?: TLObjectStoreAccess }
	): void {
		this.room.handleNewSession({
			sessionId: socketPair.id,
			socket: socketPair.roomSocket,
			meta: undefined,
			isReadonly: opts?.isReadonly ?? false,
			objectAccess: opts?.objectAccess,
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
