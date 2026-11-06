import { TLRuleUser, TLRulesDefinition } from '@tldraw/rules'
import { InMemorySyncStorage, TLPersistentClientSocket, TLSocketRoom } from '@tldraw/sync-core'
import {
	Editor,
	TLRecord,
	TLStoreSnapshot,
	createTLStore,
	defaultAddFontsFromNode,
	defaultBindingUtils,
	defaultShapeUtils,
	tipTapDefaultExtensions,
} from 'tldraw'

/**
 * A real sync room, running in the browser. Each pane connects to it over an in-memory socket, so
 * the panes behave like separate people on separate machines: every write goes through the room,
 * the room checks it against the rules, and each pane receives only what its read rules allow.
 */
export class LocalRoom {
	readonly room: TLSocketRoom<TLRecord, void>
	private readonly storage: InMemorySyncStorage<TLRecord>
	private nextSession = 0

	constructor(snapshot: TLStoreSnapshot, rules: TLRulesDefinition) {
		this.storage = new InMemorySyncStorage<TLRecord>({
			snapshot: {
				documents: Object.values(snapshot.store).map((state) => ({ state, lastChangedClock: 0 })),
				clock: 0,
				documentClock: 0,
				schema: snapshot.schema,
			},
		})
		this.room = new TLSocketRoom<TLRecord, void>({ storage: this.storage, rules })
	}

	/** Every document record the room holds, for showing what each pane was and was not sent. */
	records(): TLRecord[] {
		return this.storage.getSnapshot().documents.map((d) => d.state as TLRecord)
	}

	/** Connect a new session as `user`. Returns its id and a socket for `useSync({ connect })`. */
	connect(user: TLRuleUser): { sessionId: string; socket: TLPersistentClientSocket } {
		const sessionId = `pane-${++this.nextSession}`
		const room = this.room
		const toClient = new Set<(msg: any) => void>()
		const status = new Set<(e: any) => void>()
		const serverListeners: Record<string, Set<(e: any) => void>> = {
			message: new Set(),
			close: new Set(),
			error: new Set(),
		}
		const later = (fn: () => void) => setTimeout(fn, 0)

		const serverSocket = {
			readyState: 1,
			addEventListener(type: string, l: (e: any) => void) {
				serverListeners[type]?.add(l)
			},
			removeEventListener(type: string, l: (e: any) => void) {
				serverListeners[type]?.delete(l)
			},
			send(data: string) {
				later(() => toClient.forEach((l) => l(JSON.parse(data))))
			},
			close() {
				serverSocket.readyState = 3
				clientSocket.connectionStatus = 'offline'
				status.forEach((l) => l({ status: 'offline' }))
			},
		}

		const clientSocket: TLPersistentClientSocket<any, any> = {
			connectionStatus: 'offline',
			sendMessage(msg) {
				const data = JSON.stringify(msg)
				later(() => {
					if (serverSocket.readyState === 1) room.handleSocketMessage(sessionId, data)
				})
			},
			onReceiveMessage(cb) {
				toClient.add(cb)
				return () => toClient.delete(cb)
			},
			onStatusChange(cb) {
				status.add(cb)
				return () => status.delete(cb)
			},
			restart() {},
			close() {
				serverSocket.readyState = 3
				room.handleSocketClose(sessionId)
			},
		}

		room.handleSocketConnect({ sessionId, socket: serverSocket, user })
		later(() => {
			clientSocket.connectionStatus = 'online'
			status.forEach((l) => l({ status: 'online' }))
		})
		return { sessionId, socket: clientSocket }
	}

	close() {
		this.room.close()
	}
}

/** Build a starting document with a throwaway editor, so seed shapes get valid default props. */
export function seedSnapshot(seed: (editor: Editor) => void): TLStoreSnapshot {
	const store = createTLStore({ shapeUtils: defaultShapeUtils, bindingUtils: defaultBindingUtils })
	const container = document.createElement('div')
	const editor = new Editor({
		store,
		shapeUtils: defaultShapeUtils,
		bindingUtils: defaultBindingUtils,
		tools: [],
		getContainer: () => container,
		options: {
			text: {
				addFontsFromNode: defaultAddFontsFromNode,
				tipTapConfig: { extensions: tipTapDefaultExtensions },
			},
		},
	})
	seed(editor)
	const snapshot = store.getStoreSnapshot()
	editor.dispose()
	return snapshot
}
