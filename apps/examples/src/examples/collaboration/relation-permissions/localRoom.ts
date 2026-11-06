import {
	DEFAULT_INITIAL_SNAPSHOT,
	InMemoryTupleStore,
	TLPersistentClientSocket,
	TLRelationCeiling,
	TLRelationContext,
	TLRelationSchema,
	TLRelationTuple,
	TLRelationsClient,
	TLSocketClientSentEvent,
	TLSocketRoom,
	TLSocketServerSentEvent,
	TLSocketStatusListener,
	TLSyncClient,
	WebSocketMinimal,
	createRelationRoomAccess,
	resolveRelationContext,
} from '@tldraw/sync'
import {
	Atom,
	TLRecord,
	TLStore,
	TLUserId,
	UserRecordType,
	atom,
	commentSchemaRecords,
	computed,
	createPresenceStateDerivation,
	createTLSchema,
	createTLStore,
	createUserId,
	relationSchemaRecords,
} from 'tldraw'

export const schema = createTLSchema({
	records: { ...relationSchemaRecords, ...commentSchemaRecords },
})

/** Simulated network delay, so that a rejected write is visible before it rolls back. */
const LATENCY = 60

export interface Identity {
	/** The signed-in user, or a link or agent subject for anonymous sessions. */
	actor: string
	/** Subjects from capability tokens, such as `link:one-page`. */
	extraSubjects?: string[]
	ceilings?: TLRelationCeiling[]
}

export interface LocalClient {
	name: string
	store: TLStore
	relations: TLRelationsClient<TLRecord>
	status: Atom<'connecting' | 'ready' | 'forbidden'>
	/** Run `fn` with the client guard off, as a modified client would. The server still checks. */
	forge(fn: () => void): void
	close(): void
}

/**
 * A sync room running in the browser, with the relation access layer, a server-side tuple store,
 * and clients connected through in-memory sockets. This is what a server does, minus the network.
 */
export class LocalRoom {
	readonly tuples: InMemoryTupleStore
	readonly room: TLSocketRoom<TLRecord, void>
	readonly log = atom<string[]>('server log', [])
	private readonly identities = new Map<string, Identity>()
	private readonly versions = new Map<string, number>()
	private readonly disposers: Array<() => void> = []

	constructor(
		readonly relationSchema: TLRelationSchema,
		readonly root: string,
		tuples: TLRelationTuple[]
	) {
		this.tuples = new InMemoryTupleStore(tuples)
		this.room = new TLSocketRoom<TLRecord, void>({
			schema,
			initialSnapshot: DEFAULT_INITIAL_SNAPSHOT,
			access: createRelationRoomAccess(relationSchema),
			log: {
				warn: (...args: any[]) => {
					if (String(args[0]).startsWith('access denied')) {
						this.addLog(`denied ${args[1]} from ${args[3]}; push discarded`)
					}
				},
			},
		})
		// a host's job: when a grant above the room changes, re-resolve every session and push it
		this.disposers.push(
			this.tuples.onChange(({ tuple, op }) => {
				this.addLog(
					`${op === 'write' ? 'grant' : 'revoke'} ${tuple.object}#${tuple.relation}@${tuple.subject}`
				)
				for (const { sessionId } of this.room.getSessions()) {
					// resolutions can finish out of order; only the latest one may apply
					const version = (this.versions.get(sessionId) ?? 0) + 1
					this.versions.set(sessionId, version)
					this.resolve(sessionId).then((ctx) => {
						if (this.versions.get(sessionId) === version)
							this.room.updateSessionAccess(sessionId, ctx)
					})
				}
			})
		)
	}

	private addLog(line: string) {
		this.log.update((lines) => [line, ...lines].slice(0, 30))
	}

	private resolve(name: string): Promise<TLRelationContext> {
		const id = this.identities.get(name)!
		return resolveRelationContext({
			schema: this.relationSchema,
			store: this.tuples,
			root: this.root,
			actor: id.actor,
			extraSubjects: id.extraSubjects,
			ceilings: id.ceilings,
		})
	}

	async join(name: string, identity: Identity, color: string): Promise<LocalClient> {
		this.identities.set(name, identity)
		const ctx = await this.resolve(name)

		// The editor writes the current user's record. The schema lets only that user update it, so a
		// token session (a link or an agent acting for someone) writes none.
		const userRecord =
			identity.actor.startsWith('user:') && !identity.extraSubjects
				? UserRecordType.create({ id: identity.actor as TLUserId, name, color })
				: null
		const store = createTLStore({
			schema,
			id: name,
			users: { currentUser: computed('current user', () => userRecord) },
		})
		const relations = new TLRelationsClient(store, this.relationSchema)
		let removeGuard = relations.install()
		const status = atom<'connecting' | 'ready' | 'forbidden'>('status', 'connecting')

		let toClient: ((msg: TLSocketServerSentEvent<TLRecord>) => void) | null = null
		let onStatus: TLSocketStatusListener | null = null
		const clientSocket: TLPersistentClientSocket<
			TLSocketClientSentEvent<TLRecord>,
			TLSocketServerSentEvent<TLRecord>
		> = {
			connectionStatus: 'online',
			onStatusChange: (cb) => {
				onStatus = cb
				return () => (onStatus = null)
			},
			onReceiveMessage: (cb) => {
				toClient = cb
				return () => (toClient = null)
			},
			sendMessage: () => {},
			restart: () => {},
			close: () => {},
		}
		// the server end of the socket, as a WebSocket would present it to TLSocketRoom
		const listeners = new Map<string, (event: any) => void>()
		const serverSocket: WebSocketMinimal = {
			readyState: 1,
			addEventListener: (type, listener) => listeners.set(type, listener),
			removeEventListener: (type) => listeners.delete(type),
			send: (data) => {
				const msg = JSON.parse(data)
				setTimeout(() => toClient?.(msg), LATENCY)
			},
			close: (_code, reason) => {
				setTimeout(() => onStatus?.({ status: 'error', reason: reason ?? 'closed' }), LATENCY)
			},
		}
		clientSocket.sendMessage = (msg) => {
			const data = JSON.stringify(msg)
			setTimeout(() => listeners.get('message')?.({ data }), LATENCY)
		}

		this.room.handleSocketConnect({ sessionId: name, socket: serverSocket, access: ctx })

		const user = UserRecordType.create({ id: createUserId(name), name, color })
		const client = new TLSyncClient<TLRecord>({
			store,
			socket: clientSocket,
			presenceMode: atom('presence mode', 'full' as const),
			presence: createPresenceStateDerivation(computed('user', () => user))(store),
			onAccessChange: (access) => relations.setContext(access),
			onLoad: () => status.set('ready'),
			onSyncError: (reason) => {
				if (reason === 'FORBIDDEN') status.set('forbidden')
			},
		})

		return {
			name,
			store,
			relations,
			status,
			forge: (fn) => {
				removeGuard()
				try {
					fn()
				} finally {
					removeGuard = relations.install()
				}
			},
			close: () => {
				removeGuard()
				client.close()
				this.room.handleSocketClose(name)
			},
		}
	}

	dispose() {
		this.disposers.forEach((d) => d())
		this.room.close()
	}
}
