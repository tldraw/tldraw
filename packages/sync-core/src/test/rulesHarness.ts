/**
 * A rules room with real TLSyncClients and real stores, shared by the rules backtests and the
 * read-filtering fuzz test.
 */
import type { TLRuleUser, TLRulesDefinition } from '@tldraw/rules'
import { Atom, atom } from '@tldraw/state'
import { Store, StoreSchema, createRecordType } from '@tldraw/store'
import { afterEach } from 'vitest'
import type { TLRoomAccess } from '../lib/RoomRules'
import { TLSyncClient } from '../lib/TLSyncClient'
import { TestServer } from './TestServer'
import { TestSocketPair } from './TestSocketPair'

// A minimal tldraw-shaped schema: the rules read typeName, parentId, meta, and props, so the
// records need nothing else. Validators pass everything through.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type R = any
const passthrough = { validate: (v: unknown) => v as R }
const docType = (name: string) =>
	createRecordType<R>(name, { scope: 'document', validator: passthrough })
export const schema = StoreSchema.create<R>({
	document: docType('document'),
	page: docType('page'),
	shape: docType('shape'),
	binding: docType('binding'),
	comment: docType('comment'),
	'comment-thread': docType('comment-thread'),
	'comment-reaction': docType('comment-reaction'),
	instance_presence: createRecordType<R>('instance_presence', {
		scope: 'presence',
		validator: passthrough,
	}),
})

export function doc(meta: Record<string, unknown> = {}): R {
	return { id: 'document:document', typeName: 'document', meta }
}
export function page(id: string, meta: Record<string, unknown> = {}): R {
	return { id: `page:${id}`, typeName: 'page', name: id, meta }
}
export function shape(id: string, extra: Record<string, any> = {}): R {
	return {
		id: `shape:${id}`,
		typeName: 'shape',
		type: 'geo',
		parentId: 'page:main',
		x: 0,
		y: 0,
		rotation: 0,
		props: {},
		meta: {},
		...extra,
	}
}

export const disposables: (() => void)[] = []
afterEach(() => {
	while (disposables.length) disposables.pop()!()
})

export function makeRoom(rules: TLRulesDefinition, records: R[]) {
	const server = new TestServer<R>(
		schema,
		{
			documents: records.map((state) => ({ state, lastChangedClock: 0 })),
			clock: 1,
			documentClock: 1,
			schema: schema.serialize(),
		},
		{ rules }
	)
	disposables.push(() => server.room.close())
	let n = 0
	const clients: Client[] = []

	function flush() {
		for (let i = 0; i < 20; i++) {
			server.flushDebouncingMessages()
			const busy = clients.filter((c) => c.socket.getNeedsFlushing())
			if (!busy.length) return
			for (const c of busy) {
				c.socket.flushClientSentEvents()
				c.socket.flushServerSentEvents()
			}
		}
	}

	function connect(user: TLRuleUser, presencePageId?: string): Client {
		const id = `session-${++n}`
		const socket = new TestSocketPair<R>(id, server)
		socket.connectOpts = { user }
		socket.connect()
		const store = new Store<R>({ schema, props: {} })
		const access = atom<TLRoomAccess | null>('access', null)
		const presence = atom<R | null>(
			'presence',
			presencePageId
				? {
						id: `instance_presence:${id}`,
						typeName: 'instance_presence',
						currentPageId: presencePageId,
						userName: String(user.id),
					}
				: null
		)
		const client = new TLSyncClient<R>({
			store,
			socket: socket.clientSocket,
			presence,
			presenceMode: atom('presence mode', 'full' as const),
			onLoad: () => {},
			onSyncError: (reason) => {
				throw new Error(`unexpected sync error: ${reason}`)
			},
			onAccessChange: (a) => access.set(a),
		})
		disposables.push(() => client.close())
		const c = { id, socket, store, client, access, presence, user }
		clients.push(c)
		flush()
		return c
	}

	const ids = (c: Client, typeName?: string): string[] =>
		c.store
			.allRecords()
			.filter((r) => !typeName || r.typeName === typeName)
			.map((r) => r.id)
			.sort()

	const stored = (id: string): R =>
		server.storage.getSnapshot().documents.find((d) => d.state.id === id)?.state

	return { server, connect, flush, ids, stored }
}
export interface Client {
	id: string
	socket: TestSocketPair<R>
	store: Store<R>
	client: TLSyncClient<R>
	access: Atom<TLRoomAccess | null>
	presence: Atom<R | null>
	user: TLRuleUser
}
