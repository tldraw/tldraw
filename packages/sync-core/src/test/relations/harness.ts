import { atom, computed } from '@tldraw/state'
import {
	Editor,
	TLRecord,
	TLShape,
	TLStore,
	TLUserId,
	UserRecordType,
	commentSchemaRecords,
	createPresenceStateDerivation,
	createTLSchema,
	createTLStore,
	createUserId,
	defaultAddFontsFromNode,
	defaultBindingUtils,
	defaultShapeUtils,
	defaultTools,
	relationSchemaRecords,
	tipTapDefaultExtensions,
} from 'tldraw'
import { TLSocketServerSentEvent } from '../../lib/protocol'
import { TLRelationsClient } from '../../lib/relations/client'
import { defaultRelationSchema } from '../../lib/relations/defaultSchema'
import { TLRelationCeiling, TLRelationContext } from '../../lib/relations/evaluate'
import { createRelationRoomAccess } from '../../lib/relations/roomAccess'
import { TLRelationSchema } from '../../lib/relations/schema'
import { verifyCapabilityToken } from '../../lib/relations/tokens'
import {
	InMemoryTupleStore,
	TLRelationTuple,
	resolveRelationContext,
} from '../../lib/relations/tupleStore'
import { TLSyncClient } from '../../lib/TLSyncClient'
import { TestServer } from '../TestServer'
import { TestSocketPair } from '../TestSocketPair'

export const ROOT = 'file:lesson'
export const TOKEN_SECRET = 'test-secret'

export const schema = createTLSchema({
	records: { ...relationSchemaRecords, ...commentSchemaRecords },
})

export interface Peer {
	name: string
	store: TLStore
	client: TLSyncClient<TLRecord>
	relations: TLRelationsClient<TLRecord>
	editor: Editor | null
	pair: TestSocketPair<TLRecord>
	errors: string[]
	/** Server messages the client received, for assertions on discards. */
	received: TLSocketServerSentEvent<TLRecord>[]
	/** The editor, which exists only if the peer can read a page. */
	ed(): Editor
	shapeIds(): string[]
	has(id: string): boolean
	/** Act as a modified client: make writes with the local guard off, so only the server checks. */
	forge(fn: () => void): void
}

interface PeerIdentity {
	actor: string | null
	extraSubjects?: string[]
	ceilings?: TLRelationCeiling[]
}

/**
 * A room with the relation access layer, a server-side tuple store, and real tldraw editors
 * connected over the sync protocol. Grants written to the tuple store are pushed to every session
 * live, as a host would do.
 */
export class RelationsHarness {
	readonly tuples: InMemoryTupleStore
	readonly server: TestServer<TLRecord>
	readonly peers: Peer[] = []
	private readonly identities = new Map<string, PeerIdentity>()
	private pending: Promise<unknown>[] = []

	constructor(
		tuples: TLRelationTuple[],
		readonly relationSchema: TLRelationSchema = defaultRelationSchema
	) {
		this.tuples = new InMemoryTupleStore(tuples)
		this.server = new TestServer(schema, undefined, {
			access: createRelationRoomAccess(relationSchema),
		})
		// the host's job: when a grant above the room changes, re-resolve every session
		this.tuples.onChange(() => {
			for (const peer of this.peers) {
				this.pending.push(
					this.resolve(peer.name).then((ctx) => {
						this.server.accessBySession.set(peer.name, ctx)
						this.server.room.updateSessionAccess(peer.name, ctx)
					})
				)
			}
		})
	}

	private resolve(name: string): Promise<TLRelationContext> {
		const id = this.identities.get(name)!
		return resolveRelationContext({
			schema: this.relationSchema,
			store: this.tuples,
			root: ROOT,
			actor: id.actor,
			extraSubjects: id.extraSubjects,
			ceilings: id.ceilings,
		})
	}

	/** Connect as a user (`user:ann`), or as an anonymous visitor with `null`. */
	async connect(name: string, identity: PeerIdentity | string | null): Promise<Peer> {
		const id: PeerIdentity =
			typeof identity === 'string' || identity === null ? { actor: identity } : identity
		this.identities.set(name, id)
		const ctx = await this.resolve(name)
		this.server.accessBySession.set(name, ctx)
		return this.addPeer(name)
	}

	/** Connect with a capability token, as a server would after verifying it. */
	async connectWithToken(name: string, token: string, user: string | null = null) {
		const cap = await verifyCapabilityToken(token, TOKEN_SECRET)
		if (!cap) throw new Error('invalid token')
		const actor = cap.actingFor ?? user
		return this.connect(name, {
			actor: actor ?? cap.subject,
			extraSubjects: [cap.subject],
			ceilings: [...(cap.ceilings ?? [])],
		})
	}

	private async addPeer(name: string): Promise<Peer> {
		// the editor writes the current user's record, which only that user may do: the current
		// user is the actor, or nobody for a token session
		const id = this.identities.get(name)!
		const userRecord =
			id.actor?.startsWith('user:') && !id.extraSubjects
				? UserRecordType.create({ id: id.actor as TLUserId, name })
				: null
		const store = createTLStore({
			schema,
			id: name,
			users: { currentUser: computed('current user', () => userRecord) },
		})
		const relations = new TLRelationsClient(store, this.relationSchema)
		let removeGuard = relations.install()
		const pair = new TestSocketPair<TLRecord>(name, this.server)
		const received: TLSocketServerSentEvent<TLRecord>[] = []
		const onReceive = pair.flushServerSentEvents.bind(pair)
		pair.flushServerSentEvents = () => {
			received.push(...pair.serverSentEventQueue)
			onReceive()
		}
		const errors: string[] = []
		const peer: Peer = {
			name,
			store,
			relations,
			editor: null,
			pair,
			errors,
			received,
			client: null as any,
			ed() {
				if (!peer.editor) throw new Error(`${name} has no editor`)
				return peer.editor
			},
			shapeIds() {
				return store
					.allRecords()
					.filter((r) => r.typeName === 'shape')
					.map((r) => r.id)
					.sort()
			},
			has(id: string) {
				return store.has(id as any)
			},
			forge(fn: () => void) {
				removeGuard()
				try {
					fn()
					store._flushHistory()
				} finally {
					removeGuard = relations.install()
				}
			},
		}
		peer.client = new TLSyncClient<TLRecord>({
			store,
			socket: pair.clientSocket,
			onSyncError: (reason) => errors.push(reason),
			onAccessChange: (access) => relations.setContext(access),
			onLoad: () => {
				// an editor needs a page; a session that can read none gets only the store
				if (store.allRecords().some((r) => r.typeName === 'page')) {
					peer.editor = createEditor(store, relations)
				}
			},
			presenceMode: atom('presence mode', 'full' as const),
			presence: createPresenceStateDerivation(
				computed('', () => UserRecordType.create({ id: createUserId(name), name, color: 'red' }))
			)(store),
		})
		pair.connect()
		this.peers.push(peer)
		await this.flush()
		return peer
	}

	async grant(object: string, relation: string, subject: string) {
		await this.tuples.write({ object, relation, subject })
		await this.flush()
	}

	async revoke(object: string, relation: string, subject: string) {
		await this.tuples.delete({ object, relation, subject })
		await this.flush()
	}

	async flush() {
		for (let i = 0; i < 50; i++) {
			await Promise.all(this.pending)
			this.pending = []
			await Promise.resolve()
			for (const p of this.peers) p.store._flushHistory()
			this.server.flushDebouncingMessages()
			let any = false
			for (const p of this.peers) {
				if (p.pair.getNeedsFlushing()) {
					any = true
					p.pair.flushClientSentEvents()
					p.pair.flushServerSentEvents()
				}
			}
			if (!any && this.pending.length === 0) return
		}
		throw new Error('flush did not settle')
	}

	close() {
		for (const p of this.peers) {
			p.editor?.dispose()
			p.client.close()
		}
	}
}

function createEditor(store: TLStore, relations: TLRelationsClient<TLRecord>) {
	return new Editor({
		shapeUtils: defaultShapeUtils,
		bindingUtils: defaultBindingUtils,
		tools: defaultTools,
		initialState: 'select',
		store,
		getContainer: () => document.createElement('div'),
		isShapeLocked: (shape: TLShape) => !relations.canUpdate(shape),
		options: {
			text: {
				addFontsFromNode: defaultAddFontsFromNode,
				tipTapConfig: { extensions: tipTapDefaultExtensions },
			},
		},
	})
}

/** The messages a peer received of a type, for example every discarded push. */
export function discards(peer: Peer) {
	const out: unknown[] = []
	for (const m of peer.received) {
		const list = m.type === 'data' ? m.data : [m]
		for (const d of list) if (d.type === 'push_result' && d.action === 'discard') out.push(d)
	}
	return out
}
