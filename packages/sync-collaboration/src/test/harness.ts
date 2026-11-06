import { atom } from '@tldraw/state'
import type { UnknownRecord } from '@tldraw/store'
import {
	getTlsyncProtocolVersion,
	TLCommandActor,
	TLCommandSet,
	TLPushRequest,
	TLSocketRoom,
	TLSyncClient,
	type TLPersistentClientSocket,
	type WebSocketMinimal,
} from '@tldraw/sync-core'
import { commentSchemaRecords, createTLSchema, type TLRecord, type TLStore } from '@tldraw/tlschema'
import {
	createTLStore,
	defaultAddFontsFromNode,
	defaultBindingUtils,
	defaultShapeUtils,
	defaultTools,
	Editor,
	tipTapDefaultExtensions,
} from 'tldraw'

export const schema = createTLSchema({ records: commentSchemaRecords })

/**
 * A room and its clients in one process. Messages queue until `flush()`, so a test can look at
 * the optimistic state before the server answers.
 */
export class LocalRoom {
	readonly room: TLSocketRoom<TLRecord, void>
	private queue: (() => void)[] = []
	readonly peers = new Map<string, Peer>()

	constructor(readonly commands: TLCommandSet<UnknownRecord>) {
		this.room = new TLSocketRoom<TLRecord, void>({
			schema,
			commands: commands as TLCommandSet<any>,
			log: { warn: () => {}, error: console.error },
		})
	}

	connect(sessionId: string, actor: TLCommandActor): Peer {
		const peer = new Peer(this, sessionId, actor)
		this.peers.set(sessionId, peer)
		return peer
	}

	/**
	 * A session with no client, for pushes that a modified client could send. It returns the
	 * server's answers to its pushes.
	 */
	forger(sessionId: string, actor: TLCommandActor) {
		const answers: any[] = []
		this.room.handleSocketConnect({
			sessionId,
			actor,
			socket: { readyState: 1, send: (data) => answers.push(JSON.parse(data)), close: () => {} },
		})
		let clock = 0
		const send = (msg: object) =>
			this.enqueue(() => this.room.handleSocketMessage(sessionId, JSON.stringify(msg)))
		send({
			type: 'connect',
			connectRequestId: 'forger',
			lastServerClock: 0,
			protocolVersion: getTlsyncProtocolVersion(),
			schema: schema.serialize(),
		})
		return {
			answers,
			push: (push: Omit<TLPushRequest<TLRecord>, 'type' | 'clientClock'>) =>
				send({ type: 'push', clientClock: clock++, ...push }),
			lastResult: () =>
				answers
					.flatMap((a) => (a.type === 'data' ? a.data : [a]))
					.reverse()
					.find((a) => a.type === 'push_result'),
		}
	}

	/** @internal */
	enqueue(fn: () => void) {
		this.queue.push(fn)
	}

	log: any[] = []
	flush() {
		for (let i = 0; i < 1000; i++) {
			const inner = (this.room as any).room
			for (const sessionId of inner.sessions.keys()) inner._flushDataMessages(sessionId)
			if (this.queue.length === 0) return
			const queue = this.queue.splice(0)
			for (const fn of queue) fn()
		}
		throw new Error('flush did not settle: ' + JSON.stringify(this.log.slice(-6), null, 1))
	}
}

export class Peer {
	readonly store: TLStore
	readonly client: TLSyncClient<TLRecord, TLStore>
	readonly rejections: string[] = []
	readonly mode = atom<'readonly' | 'readwrite'>('mode', 'readwrite')
	private _editor: Editor | null = null
	private listeners = new Set<(msg: any) => void>()

	constructor(
		private readonly local: LocalRoom,
		readonly sessionId: string,
		actor: TLCommandActor
	) {
		const serverSocket: WebSocketMinimal = {
			readyState: 1,
			send: (data) =>
				local.enqueue(() => {
					local.log.push([sessionId, 'down', data.slice(0, 300)])
					this.listeners.forEach((l) => l(JSON.parse(data)))
				}),
			close: () => {},
		}
		local.room.handleSocketConnect({ sessionId, socket: serverSocket, actor })

		const clientSocket: TLPersistentClientSocket<any, any> = {
			connectionStatus: 'online',
			sendMessage: (msg) =>
				local.enqueue(() => {
					local.log.push([sessionId, 'up', JSON.stringify(msg).slice(0, 300)])
					local.room.handleSocketMessage(sessionId, JSON.stringify(msg))
				}),
			onReceiveMessage: (cb) => {
				this.listeners.add(cb)
				return () => this.listeners.delete(cb)
			},
			onStatusChange: () => () => {},
			restart: () => {},
			close: () => {},
		}

		this.store = createTLStore({
			schema,
			id: sessionId,
			collaboration: { status: atom('status', 'online'), mode: this.mode },
		})
		this.client = new TLSyncClient<TLRecord, TLStore>({
			store: this.store,
			socket: clientSocket,
			presence: atom('presence', null),
			commands: local.commands as TLCommandSet<any>,
			onLoad: () => {},
			onSyncError: (reason) => {
				throw new Error('sync error: ' + reason)
			},
			onPushRejected: ({ reason }) => this.rejections.push(reason),
			// as useSync does: the editor is read-only when the actor has no edit lane
			onActorChange: ({ isReadonly }) => this.mode.set(isReadonly ? 'readonly' : 'readwrite'),
		})
	}

	/** An editor on this peer's store, made after the first sync, as useSync does. */
	get editor() {
		if (!this._editor) {
			this._editor = new Editor({
				shapeUtils: defaultShapeUtils,
				bindingUtils: defaultBindingUtils,
				tools: defaultTools,
				initialState: 'select',
				store: this.store,
				getContainer: () => document.createElement('div'),
				options: {
					text: {
						addFontsFromNode: defaultAddFontsFromNode,
						tipTapConfig: { extensions: tipTapDefaultExtensions },
					},
				},
			})
		}
		return this._editor
	}

	run(name: string, args: unknown) {
		return this.client.runCommand(name, args)
	}

	get<T extends TLRecord>(id: T['id']): T | undefined {
		return this.store.get(id) as T | undefined
	}

	serverGet(id: string) {
		return this.local.room.getRecord(id)
	}
}
