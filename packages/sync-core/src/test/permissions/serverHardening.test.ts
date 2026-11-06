import {
	createTLSchema,
	defaultAbilityRules,
	defaultBindingSchemas,
	defaultShapeSchemas,
	definePermissions,
	InstancePresenceRecordType,
	ownShapesOnly,
	pageReadAccess,
	TL_FULL_ACCESS,
	TLAccess,
	TLMutator,
	TLPageId,
	TLPermissions,
	TLRecord,
	TLUserId,
} from '@tldraw/tlschema'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { InMemorySyncStorage } from '../../lib/InMemorySyncStorage'
import { getTlsyncProtocolVersion } from '../../lib/protocol'
import { TLSocketRoom } from '../../lib/TLSocketRoom'
import { TLSyncRoom } from '../../lib/TLSyncRoom'

/*
 * Raw protocol tests: a client that is not tldraw sends whatever it likes. These pin down what
 * the server answers, not what the editor does.
 */

const schema = createTLSchema({ shapes: defaultShapeSchemas, bindings: defaultBindingSchemas })
const CANNOT_SEE = 'You cannot change records you cannot see.'

const richText = (text: string) => ({
	type: 'doc',
	content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
})

function shape(id: string, parentId: string, ownerId: string, x = 0): any {
	return {
		id,
		typeName: 'shape',
		type: 'geo',
		x,
		y: 0,
		rotation: 0,
		index: 'a1',
		parentId,
		isLocked: false,
		opacity: 1,
		meta: { ownerId },
		props: {
			w: 100,
			h: 100,
			geo: 'rectangle',
			dash: 'draw',
			growY: 0,
			url: '',
			scale: 1,
			flipX: false,
			flipY: false,
			color: 'black',
			labelColor: 'black',
			fill: 'none',
			size: 'm',
			font: 'draw',
			align: 'middle',
			verticalAlign: 'middle',
			richText: richText('secret'),
		},
	}
}

function page(id: string, name: string, meta: Record<string, unknown> = {}): any {
	return { id, typeName: 'page', name, index: 'a5', meta }
}

const rooms: TLSocketRoom<TLRecord, any>[] = []
afterEach(() => {
	for (const room of rooms.splice(0)) room.close()
})

function makeRoom(
	permissions: TLPermissions<TLRecord>,
	opts: { onCommittedChanges?: any; storage?: InMemorySyncStorage<TLRecord> } = {}
) {
	const room = new TLSocketRoom<TLRecord, any>({ schema, permissions, ...opts })
	rooms.push(room)
	return room
}

/** A raw client. Every push says it has seen every denial, unless it says otherwise. */
function connect(room: TLSocketRoom<TLRecord, any>, sessionId: string, access?: TLAccess) {
	const received: any[] = []
	const socket: any = {
		readyState: 1,
		send: (data: string) => received.push(JSON.parse(data)),
		close: (code?: number, reason?: string) => received.push({ type: '__closed', code, reason }),
		addEventListener: () => {},
		removeEventListener: () => {},
	}
	room.handleSocketConnect({ sessionId, socket, access })
	const send = (message: any) => room.handleSocketMessage(sessionId, JSON.stringify(message))
	send({
		type: 'connect',
		connectRequestId: 'c',
		lastServerClock: 0,
		protocolVersion: getTlsyncProtocolVersion(),
		schema: schema.serialize(),
	})
	let clock = 0
	const flush = () => (room as any).room._flushDataMessages(sessionId)
	const messages = () => {
		flush()
		return received.flatMap((m) => (m.type === 'data' ? m.data : [m]))
	}
	return {
		send,
		messages,
		push(diff: any, extra: Record<string, unknown> = {}) {
			send({ type: 'push', clientClock: ++clock, diff, deniedCount: 1e9, ...extra })
			return messages().at(-1)
		},
		/** Every record id this client was sent, in connect or patch messages. */
		receivedIds() {
			const ids = new Set<string>()
			for (const m of messages()) {
				if (m.type !== 'connect' && m.type !== 'patch') continue
				for (const [id, op] of Object.entries<any>(m.diff)) if (op[0] === 'put') ids.add(id)
			}
			return ids
		},
	}
}

const admin: TLAccess = { userId: 'admin', abilities: ['edit', 'admin'] }
const eveAccess: TLAccess = { userId: 'eve', abilities: ['edit'] }

function pagePermissions(mutators: Record<string, TLMutator<TLRecord>> = {}) {
	return definePermissions<TLRecord>({
		rules: defaultAbilityRules(),
		canRead: pageReadAccess({
			canSeePage: (p: any, ctx) => !p.meta.private || ctx.can('admin'),
		}),
		mutators,
	})
}

/** A room with a private page holding `shape:secret` (x = 42), and eve, who cannot see it. */
function roomWithSecret(mutators: Record<string, TLMutator<TLRecord>> = {}) {
	const room = makeRoom(pagePermissions(mutators))
	const boss = connect(room, 'admin', admin)
	boss.push({
		'page:hidden': ['put', page('page:hidden', 'Hidden', { private: true })],
		'shape:secret': ['put', shape('shape:secret', 'page:hidden', 'admin', 42)],
	})
	const eve = connect(room, 'eve', eveAccess)
	expect(eve.receivedIds().has('shape:secret')).toBe(false)
	return { room, boss, eve }
}

describe('pushes that touch hidden records', () => {
	it('get the same answer whether or not the record exists, and whatever they guess', () => {
		const { room, eve } = roomWithSecret()
		const answers = [
			// a right guess, a wrong guess, and an id with no record
			{ 'shape:secret': ['patch', { x: ['put', 42] }] },
			{ 'shape:secret': ['patch', { x: ['put', 7] }] },
			{ 'shape:nope': ['patch', { x: ['put', 7] }] },
			// a typeName swap, and a value that does not validate
			{ 'shape:secret': ['put', page('shape:secret', 'x')] },
			{ 'shape:secret': ['patch', { x: ['put', 'not a number'] }] },
			// removes and overwrites
			{ 'shape:secret': ['remove'] },
			{ 'shape:nope': ['remove'] },
			{ 'shape:secret': ['put', shape('shape:secret', 'page:page', 'eve')] },
		].map((diff) => {
			const { clientClock: _c, serverClock: _s, ...answer } = eve.push(diff)
			return answer
		})
		for (const answer of answers) {
			expect(answer).toEqual({
				type: 'push_result',
				action: 'discard',
				denied: { reason: CANNOT_SEE },
			})
		}
		expect(room.getRecord('shape:secret')).toMatchObject({ x: 42, parentId: 'page:hidden' })
	})

	it('still let a client create a record with a new id', () => {
		const { room, eve } = roomWithSecret()
		const answer = eve.push({ 'shape:new': ['put', shape('shape:new', 'page:page', 'eve')] })
		expect(answer).toMatchObject({ type: 'push_result', action: 'commit' })
		expect(room.getRecord('shape:new')).toBeDefined()
	})
})

describe('server mutators', () => {
	it('see only the records the session can see', () => {
		const { eve, boss } = roomWithSecret({
			peek(ctx, args: any) {
				const shapes = [...ctx.all()].filter((r) => r.typeName === 'shape').length
				throw new Error(`${!!ctx.get(args.id)}:${shapes}`)
			},
		})
		const peek = (who: typeof eve) =>
			who.push({}, { intent: { name: 'peek', args: { id: 'shape:secret' } } }).denied?.reason
		expect(peek(eve)).toBe('false:0')
		expect(peek(boss)).toBe('true:1')
	})

	it('cannot write records the session cannot see, and say the same whether they exist', () => {
		const { room, eve } = roomWithSecret({
			remove(ctx, args: any) {
				ctx.remove([args.id])
			},
			overwrite(ctx, args: any) {
				ctx.put([shape(args.id, 'page:page', 'eve')])
			},
		})
		const run = (name: string, id: string) =>
			eve.push({}, { intent: { name, args: { id } } }).denied?.reason
		expect(run('remove', 'shape:secret')).toBe(CANNOT_SEE)
		expect(run('remove', 'shape:nope')).toBe(CANNOT_SEE)
		expect(run('overwrite', 'shape:secret')).toBe(CANNOT_SEE)
		expect(room.getRecord('shape:secret')).toMatchObject({ x: 42, parentId: 'page:hidden' })
	})

	it('send one create for a new record that the mutator writes twice', async () => {
		const committed = vi.fn()
		const room = makeRoom(
			definePermissions<TLRecord>({
				rules: defaultAbilityRules(),
				mutators: {
					createAndMove(ctx, args: any) {
						const s = shape(args.id, 'page:page', 'a')
						ctx.put([s])
						ctx.put([{ ...s, x: 50 }])
					},
					createAndRemove(ctx, args: any) {
						ctx.put([shape(args.id, 'page:page', 'a')])
						ctx.remove([args.id])
					},
				},
			}),
			{ onCommittedChanges: committed }
		)
		const a = connect(room, 'a', TL_FULL_ACCESS)
		const b = connect(room, 'b', TL_FULL_ACCESS)

		const prediction = { 'shape:m': ['put', shape('shape:m', 'page:page', 'a', 50)] }
		const answer = a.push(prediction, {
			intent: { name: 'createAndMove', args: { id: 'shape:m' } },
		})
		expect(answer).toMatchObject({ type: 'push_result', action: 'commit' })
		const patch = b.messages().findLast((m) => m.type === 'patch')
		expect(patch.diff['shape:m']).toEqual(['put', shape('shape:m', 'page:page', 'a', 50)])
		await Promise.resolve()
		expect(committed).toHaveBeenCalledTimes(1)
		expect(committed.mock.calls[0][0].diff).toEqual({
			puts: { 'shape:m': shape('shape:m', 'page:page', 'a', 50) },
			deletes: [],
		})

		const before = b.messages().length
		a.push({}, { intent: { name: 'createAndRemove', args: { id: 'shape:gone' } } })
		expect(b.messages().length).toBe(before)
		expect(room.getRecord('shape:gone')).toBeUndefined()
		await Promise.resolve()
		expect(committed).toHaveBeenCalledTimes(1)
	})
})

describe('page read access', () => {
	it("keeps a page's shapes hidden when the page alone is deleted", async () => {
		const { room, eve } = roomWithSecret()
		room.storage.transaction((txn) => txn.delete('page:hidden'))
		await Promise.resolve()
		expect(eve.receivedIds().has('shape:secret')).toBe(false)
		// a late joiner does not get it either
		expect(connect(room, 'eve2', eveAccess).receivedIds().has('shape:secret')).toBe(false)
	})

	it("does not let a raw client hide someone else's shapes by deleting only their page", () => {
		const room = makeRoom(
			definePermissions<TLRecord>({
				rules: [...defaultAbilityRules<TLRecord>(), ownShapesOnly({ unless: 'teach' })],
				canRead: pageReadAccess({ canSeePage: () => true }),
			})
		)
		const bob = connect(room, 'bob', { userId: 'bob', abilities: ['edit'] })
		bob.push({ 'shape:bobs': ['put', shape('shape:bobs', 'page:page', 'bob')] })
		const eve = connect(room, 'eve', eveAccess)

		expect(eve.push({ 'page:page': ['remove'] })).toMatchObject({
			action: 'discard',
			denied: { reason: 'You can only delete your own shapes.' },
		})
		expect(room.getRecord('page:page')).toBeDefined()
		expect(bob.messages().some((m) => m.type === 'patch' && 'shape:bobs' in m.diff)).toBe(false)
	})
})

describe('access', () => {
	it('denies every write from a session that connected with no access', () => {
		const room = makeRoom(definePermissions<TLRecord>({ rules: defaultAbilityRules() }))
		const anon = connect(room, 'anon')
		const answer = anon.push({ 'shape:a': ['put', shape('shape:a', 'page:page', 'x')] })
		expect(answer).toMatchObject({ action: 'discard', denied: { reason: expect.any(String) } })
		expect(room.getRecord('shape:a')).toBeUndefined()
	})

	it('keeps a session in step with its index when the host changes its access object in place', () => {
		const room = makeRoom(pagePermissions())
		const boss = connect(room, 'admin', admin)
		const access = { userId: 'eve', abilities: ['edit'] }
		const eve = connect(room, 'eve', access)
		;(access.abilities as string[]).push('admin')
		boss.push({
			'page:hidden': ['put', page('page:hidden', 'Hidden', { private: true })],
			'shape:secret': ['put', shape('shape:secret', 'page:hidden', 'admin')],
			'shape:open': ['put', shape('shape:open', 'page:page', 'admin')],
		})
		const ids = eve.receivedIds()
		expect(ids.has('shape:open')).toBe(true)
		expect(ids.has('shape:secret')).toBe(false)
	})
})

describe('chained denial', () => {
	it('does not overflow the stack on a deeply nested push', () => {
		const room = makeRoom(definePermissions<TLRecord>({ rules: defaultAbilityRules() }))
		const viewer = connect(room, 'viewer', { userId: 'v', abilities: [] })
		viewer.push({ 'shape:a': ['put', shape('shape:a', 'page:page', 'v')] }, { deniedCount: 0 })
		const depth = 200_000
		const deep = '{"a":'.repeat(depth) + '1' + '}'.repeat(depth)
		// the client has not seen the denial yet, so the room scans the push for denied ids
		room.handleSocketMessage(
			'viewer',
			`{"type":"push","clientClock":2,"deniedCount":0,"diff":{"shape:deep":["patch",{"meta":["put",${deep}]}],"shape:a":["remove"]}}`
		)
		expect(viewer.messages().at(-1)).toMatchObject({
			type: 'push_result',
			denied: { reason: 'This change depends on a change that was denied.' },
		})
	})

	it('caps the denied ids, then denies every push until the client has seen the denials', () => {
		const room = makeRoom(definePermissions<TLRecord>({ rules: defaultAbilityRules() }))
		const viewer = connect(room, 'viewer', { userId: 'v', abilities: [] })
		const diff: Record<string, unknown> = {
			'shape:a': ['put', shape('shape:a', 'page:page', 'v')],
		}
		for (let i = 0; i < 6000; i++) diff[`shape:x${i}`] = ['remove']
		expect(viewer.push(diff, { deniedCount: 0 }).denied).toBeDefined()
		const session = (room as any).room.sessions.get('viewer')
		expect(session.deniedIds.size).toBe(5000)

		room.updateSessionAccess('viewer', { userId: 'v', abilities: ['edit'] })
		const unrelated = { 'shape:b': ['put', shape('shape:b', 'page:page', 'v')] }
		expect(viewer.push(unrelated, { deniedCount: 0 }).denied).toEqual({
			reason: 'This change depends on a change that was denied.',
		})
		expect(viewer.push(unrelated, { deniedCount: 2 })).toMatchObject({ action: 'commit' })
		expect(session.deniedIds.size).toBe(0)
	})
})

describe('visibility index', () => {
	it('is rebuilt after a wipe, so a session waiting to connect sees nothing stale', () => {
		const storage = new InMemorySyncStorage<TLRecord>({
			snapshot: {
				documents: [],
				clock: 0,
				documentClock: 0,
				schema: schema.serialize(),
			},
		})
		storage.transaction((txn) => {
			txn.set('page:p', page('page:p', 'P'))
			txn.set('shape:s', shape('shape:s', 'page:p', 'admin'))
		})
		const room = new TLSyncRoom<TLRecord, undefined>({
			schema,
			storage,
			permissions: pagePermissions(),
		})
		const socket = () => ({ isOpen: true, sendMessage: vi.fn(), close: vi.fn() })
		const connectRequest = {
			type: 'connect' as const,
			connectRequestId: 'c',
			lastServerClock: 0,
			protocolVersion: getTlsyncProtocolVersion(),
			schema: schema.serialize(),
		}
		room.handleNewSession({ sessionId: 'a', socket: socket(), meta: undefined, access: eveAccess })
		room.handleMessage('a', connectRequest)
		// b has the same access, so it shares a's index, but has not sent its connect message yet
		const b = socket()
		room.handleNewSession({ sessionId: 'b', socket: b, meta: undefined, access: eveAccess })

		// the page is hidden, and the history needed to diff incrementally is gone
		storage.transaction((txn) => {
			txn.set('page:p', page('page:p', 'P', { private: true }))
		})
		storage.tombstoneHistoryStartsAtClock.set(storage.getClock())

		room.handleMessage('b', connectRequest)
		const connected = b.sendMessage.mock.calls.map(([m]) => m).find((m) => m.type === 'connect')
		expect(Object.keys(connected.diff)).not.toContain('shape:s')
		expect(Object.keys(connected.diff)).not.toContain('page:p')
		room.close()
	})

	it('closes every session on a wipe when the storage cannot nest transactions', async () => {
		// SQLite throws on a nested transaction. Removing a session with presence used to open
		// one, so only the first session was closed and the rest kept records they can't see.
		class NoNestingStorage extends InMemorySyncStorage<TLRecord> {
			depth = 0
			override transaction<T>(
				callback: Parameters<InMemorySyncStorage<TLRecord>['transaction']>[0],
				opts?: Parameters<InMemorySyncStorage<TLRecord>['transaction']>[1]
			): T {
				if (this.depth > 0) throw new Error('cannot start a transaction within a transaction')
				this.depth++
				try {
					return super.transaction(callback as any, opts) as T
				} finally {
					this.depth--
				}
			}
		}
		const storage = new NoNestingStorage({
			snapshot: { documents: [], clock: 0, documentClock: 0, schema: schema.serialize() },
		})
		storage.transaction((txn) => {
			txn.set('page:p', page('page:p', 'P'))
			txn.set('shape:s', shape('shape:s', 'page:p', 'admin'))
		})
		const room = makeRoom(pagePermissions(), { storage })
		const clients = ['eve', 'eve2'].map((name) => {
			const client = connect(room, name, eveAccess)
			client.send({
				type: 'push',
				clientClock: 1,
				presence: [
					'put',
					InstancePresenceRecordType.create({
						id: InstancePresenceRecordType.createId(name),
						userId: `user:${name}` as TLUserId,
						userName: name,
						currentPageId: 'page:p' as TLPageId,
					}),
				],
			})
			return client
		})
		expect(Object.keys(room.getPresenceRecords())).toHaveLength(2)

		storage.transaction((txn) => {
			txn.set('page:p', page('page:p', 'P', { private: true }))
		})
		storage.tombstoneHistoryStartsAtClock.set(storage.getClock())
		await new Promise((resolve) => setTimeout(resolve, 0))

		const closed = clients.map((c) => c.messages().some((m) => m.type === '__closed'))
		expect(closed).toEqual([true, true])
		expect(room.getPresenceRecords()).toEqual({})
	})
})
