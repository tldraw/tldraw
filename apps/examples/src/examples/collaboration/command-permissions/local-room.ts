import {
	TLSocketRoom,
	TLSyncClient,
	type TLCommandActor,
	type TLPersistentClientSocket,
	type UseSyncConnectFn,
} from '@tldraw/sync'
import { atom, createTLStore, type TLRecord, type TLStore } from 'tldraw'
import { classroomCommands, schema } from './classroom'

// A sync server that runs in the page, so the example needs no backend. Every message waits
// LATENCY_MS, so you can see a command apply at once on its own client and reach the others later.
const LATENCY_MS = 150

export class LocalRoom {
	readonly room = new TLSocketRoom<TLRecord, void>({ schema, commands: classroomCommands })

	/** A `connect` function for `useSync`: each call opens a session with this actor. */
	connectAs(sessionId: string, actor: TLCommandActor): UseSyncConnectFn {
		return () => this.openSocket(sessionId, actor)
	}

	/** A session with no editor, for the agent. */
	headlessClient(sessionId: string, actor: TLCommandActor) {
		const store = createTLStore({ schema })
		return new TLSyncClient<TLRecord, TLStore>({
			store,
			socket: this.openSocket(sessionId, actor),
			presence: atom('presence', null),
			commands: classroomCommands,
			onLoad: () => {},
			onSyncError: () => {},
		})
	}

	private openSocket(sessionId: string, actor: TLCommandActor) {
		const listeners = new Set<(msg: any) => void>()
		let open = true
		const later = (fn: () => void) => setTimeout(() => open && fn(), LATENCY_MS)

		this.room.handleSocketConnect({
			sessionId,
			actor,
			socket: {
				readyState: 1,
				send: (data) => later(() => listeners.forEach((l) => l(JSON.parse(data)))),
				close: () => {},
			},
		})

		const socket: TLPersistentClientSocket<any, any> = {
			connectionStatus: 'online',
			sendMessage: (msg) =>
				later(() => this.room.handleSocketMessage(sessionId, JSON.stringify(msg))),
			onReceiveMessage: (cb) => {
				listeners.add(cb)
				return () => listeners.delete(cb)
			},
			onStatusChange: () => () => {},
			restart: () => {},
			close: () => {
				open = false
				this.room.handleSocketClose(sessionId)
			},
		}
		return socket
	}
}
