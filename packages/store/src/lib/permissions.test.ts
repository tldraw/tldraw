import { describe, expect, it, vi } from 'vitest'
import { BaseRecord, RecordId } from './BaseRecord'
import {
	allow,
	atomic,
	denyAll,
	forType,
	getAccessRecord,
	getRecordAccessKey,
	PermissionChain,
	PermissionMiddleware,
	RecordAccess,
	rewrite,
} from './permissions'
import { createRecordType } from './RecordType'
import { Store } from './Store'
import { StoreSchema } from './StoreSchema'

interface Note extends BaseRecord<'note', RecordId<Note>> {
	text: string
	ownerId: string
	parentId: string | null
}
const Note = createRecordType<Note>('note', {
	validator: { validate: (v) => v as Note },
	scope: 'document',
}).withDefaultProperties(() => ({ text: '', ownerId: '', parentId: null }))

interface Cursor extends BaseRecord<'cursor', RecordId<Cursor>> {
	x: number
}
const Cursor = createRecordType<Cursor>('cursor', {
	validator: { validate: (v) => v as Cursor },
	scope: 'session',
}).withDefaultProperties(() => ({ x: 0 }))

type Rec = Note | Cursor
interface Actor {
	userId: string
	role: 'owner' | 'member' | 'viewer'
}

const alice: Actor = { userId: 'alice', role: 'member' }
const viewer: Actor = { userId: 'v', role: 'viewer' }

const note = (id: string, ownerId: string, extra: Partial<Note> = {}) =>
	Note.create({ id: Note.createId(id), ownerId, ...extra })

const ownNotesOnly = allow<Rec, Actor>((access, { actor }) => {
	if (access.type === 'read' || access.type === 'action') return
	const prev = access.prev as Note | null
	if (prev && prev.ownerId !== actor.userId) return 'not your note'
	return undefined
})

const stampOwner = rewrite<Rec, Actor>((access, { actor }) => {
	if (access.type !== 'create' || access.next.typeName !== 'note') return
	return { ...access, next: { ...access.next, ownerId: actor.userId } }
})

const viewersCannotWrite: PermissionMiddleware<Rec, Actor> = (batch, next) =>
	batch.kind === 'write' && batch.actor.role === 'viewer' ? denyAll(batch, 'read only') : next()

function run(chain: PermissionChain<Rec, Actor>, actor: Actor, items: RecordAccess<Rec>[]) {
	return chain.run({
		kind: items[0].type === 'read' ? 'read' : 'write',
		actor,
		items,
		get: () => undefined,
	})
}

describe('PermissionChain', () => {
	it('allows everything with no layers', () => {
		const items: RecordAccess<Rec>[] = [{ type: 'create', prev: null, next: note('a', 'x') }]
		expect(run(new PermissionChain(), alice, items)).toEqual({ allowed: items, denied: [] })
	})

	it('runs layers in order, and a deny in an early layer stops the rest', () => {
		const calls: string[] = []
		const spy =
			(name: string): PermissionMiddleware<Rec, Actor> =>
			(_batch, next) => {
				calls.push(name)
				return next()
			}
		const chain = new PermissionChain<Rec, Actor>(spy('a'), viewersCannotWrite, spy('b'))
		run(chain, viewer, [{ type: 'create', prev: null, next: note('a', 'v') }])
		expect(calls).toEqual(['a'])
		run(chain, alice, [{ type: 'create', prev: null, next: note('a', 'alice') }])
		expect(calls).toEqual(['a', 'a', 'b'])
	})

	it('denies some accesses and keeps the others (per-record default)', () => {
		const mine = note('mine', 'alice')
		const theirs = note('theirs', 'bob')
		const result = run(new PermissionChain(ownNotesOnly), alice, [
			{ type: 'update', prev: mine, next: { ...mine, text: 'x' } },
			{ type: 'update', prev: theirs, next: { ...theirs, text: 'x' } },
		])
		expect(result.allowed.map((a) => (a as any).next.id)).toEqual([mine.id])
		expect(result.denied).toEqual([
			{ access: expect.objectContaining({ prev: theirs }), reason: 'not your note' },
		])
	})

	it('atomic() denies the whole write batch when one write is denied', () => {
		const mine = note('mine', 'alice')
		const theirs = note('theirs', 'bob')
		const result = run(new PermissionChain(atomic(), ownNotesOnly), alice, [
			{ type: 'update', prev: mine, next: { ...mine, text: 'x' } },
			{ type: 'update', prev: theirs, next: { ...theirs, text: 'x' } },
		])
		expect(result.allowed).toEqual([])
		expect(result.denied.map((d) => d.reason)).toEqual(['atomic: not your note', 'not your note'])
	})

	it('atomic() also denies the batch when a later layer drops an access', () => {
		const a = note('a', 'alice')
		const b = note('b', 'alice')
		const dropB: PermissionMiddleware<Rec, Actor> = (batch, next) =>
			next(batch.items.filter((i) => i.type !== 'create' || i.next.id !== b.id))
		const result = run(new PermissionChain(atomic(), dropB), alice, [
			{ type: 'create', prev: null, next: a },
			{ type: 'create', prev: null, next: b },
		])
		expect(result.allowed).toEqual([])
		expect(result.denied.map((d) => d.reason)).toEqual(['atomic: denied', 'atomic: denied'])
	})

	it('changes a record, and later layers see the change', () => {
		let seen: string | undefined
		const chain = new PermissionChain<Rec, Actor>(stampOwner, (batch, next) => {
			seen = (batch.items[0] as any).next.ownerId
			return next()
		})
		const result = run(chain, alice, [{ type: 'create', prev: null, next: note('a', 'mallory') }])
		expect(seen).toBe('alice')
		expect((result.allowed[0] as any).next.ownerId).toBe('alice')
	})

	it('fails closed when a layer throws', () => {
		const onError = vi.fn()
		const chain = new PermissionChain<Rec, Actor>(() => {
			throw new Error('bug')
		})
		const result = chain.run({
			kind: 'write',
			actor: alice,
			items: [{ type: 'create', prev: null, next: note('a', 'a') }],
			get: () => undefined,
			onError,
		})
		expect(result.allowed).toEqual([])
		expect(result.denied[0].reason).toBe('error')
		expect(onError).toHaveBeenCalled()
	})

	it('denies an access that a layer dropped without a reason', () => {
		const chain = new PermissionChain<Rec, Actor>((_b, next) => next([]))
		const result = run(chain, alice, [{ type: 'create', prev: null, next: note('a', 'a') }])
		expect(result.denied[0].reason).toBe('denied')
	})

	it('denies an access whose id a layer changed', () => {
		const chain = new PermissionChain<Rec, Actor>(
			rewrite((access) =>
				access.type === 'create' ? { ...access, next: note('other', 'a') } : undefined
			)
		)
		const result = run(chain, alice, [{ type: 'create', prev: null, next: note('a', 'a') }])
		expect(result.allowed).toEqual([])
		expect(result.denied).toHaveLength(1)
	})

	it('getAfter shows the batch as proposed, so a rule can check a parent made in the same batch', () => {
		const parent = note('parent', 'alice')
		const child = note('child', 'alice', { parentId: parent.id })
		const chain = new PermissionChain<Rec, Actor>(
			allow((access, batch) => {
				if (access.type !== 'create') return
				const p = (access.next as Note).parentId
				if (p && !batch.getAfter(p)) return 'missing parent'
				return undefined
			})
		)
		expect(
			run(chain, alice, [
				{ type: 'create', prev: null, next: child },
				{ type: 'create', prev: null, next: parent },
			]).denied
		).toEqual([])
		expect(run(chain, alice, [{ type: 'create', prev: null, next: child }]).denied[0].reason).toBe(
			'missing parent'
		)
	})

	it('answers named actions with can()', () => {
		const chain = new PermissionChain<Rec, Actor>(
			allow((access, { actor }) =>
				access.type === 'action' && access.name === 'file.rename'
					? actor.role === 'owner'
					: undefined
			)
		)
		expect(chain.can({ actor: alice, action: 'file.rename' })).toBe(false)
		expect(chain.can({ actor: { userId: 'o', role: 'owner' }, action: 'file.rename' })).toBe(true)
		expect(chain.can({ actor: alice, action: 'export' })).toBe(true)
	})

	it('runs a chain added as a layer in place', () => {
		const inner = new PermissionChain<Rec, Actor>(viewersCannotWrite)
		const outer = new PermissionChain<Rec, Actor>(inner, ownNotesOnly)
		expect(
			run(outer, viewer, [{ type: 'create', prev: null, next: note('a', 'v') }]).denied[0].reason
		).toBe('read only')
	})
})

describe('Store.setPermissions', () => {
	function makeStore(actor: Actor, ...layers: PermissionMiddleware<Rec, Actor>[]) {
		const store = new Store<Rec>({
			schema: StoreSchema.create<Rec>({ note: Note, cursor: Cursor }),
			props: {},
		})
		const onDenied = vi.fn()
		store.setPermissions({ chain: new PermissionChain(...layers), getActor: () => actor, onDenied })
		return { store, onDenied }
	}

	it('puts back a denied update and reports it', () => {
		const { store, onDenied } = makeStore(alice, ownNotesOnly)
		const theirs = note('theirs', 'bob')
		store.withoutPermissions(() => store.put([theirs]))
		store.put([{ ...theirs, text: 'hacked' }])
		expect(store.get(theirs.id)).toEqual(theirs)
		expect(onDenied).toHaveBeenCalledWith([expect.objectContaining({ reason: 'not your note' })])
	})

	it('removes a denied create, and puts back a denied delete', () => {
		const { store } = makeStore(viewer, viewersCannotWrite)
		const existing = note('e', 'x')
		store.withoutPermissions(() => store.put([existing]))
		store.put([note('new', 'v')])
		expect(store.has(Note.createId('new'))).toBe(false)
		store.remove([existing.id])
		expect(store.get(existing.id)).toEqual(existing)
	})

	it('checks one operation as one batch', () => {
		const { store } = makeStore(alice, atomic(), ownNotesOnly)
		const mine = note('mine', 'alice')
		const theirs = note('theirs', 'bob')
		store.withoutPermissions(() => store.put([mine, theirs]))
		store.atomic(() => {
			store.put([{ ...mine, text: 'a' }])
			store.put([{ ...theirs, text: 'b' }])
		})
		expect(store.get(mine.id)!.text).toBe('')
		expect(store.get(theirs.id)!.text).toBe('')
	})

	it('stores the changed record of an allowed write', () => {
		const { store } = makeStore(alice, stampOwner)
		store.put([note('a', 'mallory')])
		expect(store.get(Note.createId('a'))!.ownerId).toBe('alice')
	})

	it('listeners and history never see a denied write', () => {
		const { store } = makeStore(viewer, viewersCannotWrite)
		const listener = vi.fn()
		store.listen(listener, { source: 'user', scope: 'document' })
		store.put([note('a', 'v')])
		store._flushHistory()
		const changes = listener.mock.calls.map((c) => c[0].changes)
		for (const diff of changes) {
			expect(Object.keys(diff.added)).toEqual([])
		}
	})

	it('does not check remote merges, session records, or writes without permissions', () => {
		const { store, onDenied } = makeStore(viewer, viewersCannotWrite)
		store.mergeRemoteChanges(() => store.put([note('remote', 'x')]))
		store.put([Cursor.create({ id: Cursor.createId('c'), x: 1 })])
		store.withoutPermissions(() => store.put([note('system', 'x')]))
		expect(store.has(Note.createId('remote'))).toBe(true)
		expect(store.has(Cursor.createId('c'))).toBe(true)
		expect(store.has(Note.createId('system'))).toBe(true)
		expect(onDenied).not.toHaveBeenCalled()
	})

	it('skips a record created and deleted in the same operation', () => {
		const { store, onDenied } = makeStore(viewer, viewersCannotWrite)
		const a = note('a', 'v')
		store.atomic(() => {
			store.put([a])
			store.remove([a.id])
		})
		expect(store.has(a.id)).toBe(false)
		expect(onDenied).not.toHaveBeenCalled()
	})

	it('does not check writes in withoutPermissions inside an operation', () => {
		const { store, onDenied } = makeStore(viewer, viewersCannotWrite)
		store.atomic(() => {
			store.withoutPermissions(() => store.put([note('system', 'x')]))
		})
		expect(store.has(Note.createId('system'))).toBe(true)
		expect(onDenied).not.toHaveBeenCalled()
	})

	it('reads the record before the operation with get()', () => {
		let seen: string | undefined
		const { store } = makeStore(alice, (batch, next) => {
			seen = (batch.get(Note.createId('a')) as Note | undefined)?.text
			return next()
		})
		store.withoutPermissions(() => store.put([note('a', 'alice', { text: 'before' })]))
		store.atomic(() => {
			store.put([note('a', 'alice', { text: 'middle' })])
			store.put([note('a', 'alice', { text: 'after' })])
		})
		expect(seen).toBe('before')
	})
})

describe('forType', () => {
	interface Shape extends BaseRecord<'shape', RecordId<Shape>> {
		ownerId: string
	}
	interface Page extends BaseRecord<'page', RecordId<Page>> {
		name: string
	}
	type Rec = Shape | Page
	const shape = (id: string, ownerId: string): Shape => ({
		id: id as RecordId<Shape>,
		typeName: 'shape',
		ownerId,
	})
	const page = (id: string): Page => ({ id: id as RecordId<Page>, typeName: 'page', name: id })
	const writeAll = (chain: PermissionChain<Rec, string>, items: RecordAccess<Rec>[]) =>
		chain.run({ kind: 'write', actor: 'me', items, get: () => undefined })

	it('runs typed layers on one type only, and passes the rest on', () => {
		const seen: string[] = []
		const chain = new PermissionChain<Rec, string>(
			forType(
				'shape',
				allow((access, { actor }) => {
					// typed: no narrowing on typeName
					if (access.type === 'read' || access.type === 'action') return
					const record = access.prev ?? access.next
					seen.push(record.id)
					return record.ownerId === actor ? undefined : 'not yours'
				})
			),
			allow((access) => (getAccessRecord(access)?.id === 'p2' ? 'no p2' : undefined))
		)
		const result = writeAll(chain, [
			{ type: 'create', prev: null, next: shape('s1', 'me') },
			{ type: 'create', prev: null, next: shape('s2', 'them') },
			{ type: 'create', prev: null, next: page('p1') },
			{ type: 'create', prev: null, next: page('p2') },
		])
		// The second run is on what the first allowed (see `run`).
		expect(seen).toEqual(['s1', 's2', 's1'])
		expect({
			allowed: result.allowed.map(getRecordAccessKey).sort(),
			denied: result.denied.map((d) => [getRecordAccessKey(d.access), d.reason]).sort(),
		}).toEqual({
			allowed: ['p1', 's1'],
			denied: [
				['p2', 'no p2'],
				['s2', 'not yours'],
			],
		})
	})

	it('runs the rest of the chain once, also when the typed layers deny all of their part', () => {
		let runs = 0
		const chain = new PermissionChain<Rec, string>(
			forType('shape', (batch) => denyAll(batch, 'no shapes')),
			(_batch, next) => {
				runs++
				return next()
			}
		)
		const result = chain.run({
			kind: 'read',
			actor: 'me',
			items: [
				{ type: 'read', record: shape('s1', 'me') },
				{ type: 'read', record: page('p1') },
			],
			get: () => undefined,
		})
		expect([
			runs,
			result.allowed.map(getRecordAccessKey),
			result.denied.map((d) => d.reason),
		]).toEqual([1, ['p1'], ['no shapes']])
	})

	it('lets a later layer deny a typed access that the typed layers passed', () => {
		const chain = new PermissionChain<Rec, string>(
			atomic(),
			forType(
				'shape',
				rewrite((access) =>
					access.type === 'create'
						? { ...access, next: { ...access.next, ownerId: 'me' } }
						: undefined
				)
			),
			allow((access) => (getAccessRecord(access)?.id === 's1' ? 'later' : undefined))
		)
		const result = writeAll(chain, [
			{ type: 'create', prev: null, next: shape('s1', 'x') },
			{ type: 'create', prev: null, next: page('p1') },
		])
		expect(result.denied.map((d) => [getRecordAccessKey(d.access), d.reason])).toEqual([
			['s1', 'later'],
			['p1', 'atomic: later'],
		])
	})
})

describe('run', () => {
	interface Item extends BaseRecord<'item', RecordId<Item>> {
		parentId: string | null
		open: boolean
	}
	const item = (id: string, parentId: string | null, open = true): Item => ({
		id: id as RecordId<Item>,
		typeName: 'item',
		parentId,
		open,
	})

	it('denies all when a layer returns something that is not a result', () => {
		const onError = vi.fn()
		const chain = new PermissionChain<Item, null>((async (_b: unknown, next: () => unknown) =>
			next()) as unknown as PermissionMiddleware<Item, null>)
		const result = chain.run({
			kind: 'write',
			actor: null,
			items: [{ type: 'create', prev: null, next: item('a', null) }],
			get: () => undefined,
			onError,
		})
		expect([result.allowed, result.denied.map((d) => d.reason), onError.mock.calls.length]).toEqual(
			[[], ['error'], 1]
		)
	})

	it('runs again on what it allowed, so a rule never trusts the state of a denied write', () => {
		// The parent must be open, as the batch proposes it. Opening a closed parent is denied.
		const chain = new PermissionChain<Item, null>(
			allow((access, batch) => {
				if (access.type !== 'create' && access.type !== 'update') return undefined
				if (access.type === 'update' && access.next.open && !access.prev.open) return 'no opening'
				const parent = access.next.parentId ? batch.getAfter(access.next.parentId) : undefined
				return parent && !parent.open ? 'parent is closed' : undefined
			})
		)
		const closed = item('p', null, false)
		const result = chain.run({
			kind: 'write',
			actor: null,
			items: [
				{ type: 'update', prev: closed, next: { ...closed, open: true } },
				{ type: 'create', prev: null, next: item('child', 'p') },
			],
			get: (id) => (id === 'p' ? closed : undefined),
		})
		expect(result.denied.map((d) => [getRecordAccessKey(d.access), d.reason])).toEqual([
			['p', 'no opening'],
			['child', 'parent is closed'],
		])
	})

	it('denies host denials at the end, where atomic() sees them', () => {
		const chain = new PermissionChain<Item, null>(atomic())
		const result = chain.run({
			kind: 'write',
			actor: null,
			items: [
				{ type: 'create', prev: null, next: item('a', null) },
				{ type: 'create', prev: null, next: item('b', null) },
			],
			get: () => undefined,
			hostDenials: new Map([['b', 'read-only lane']]),
		})
		expect(result.denied.map((d) => [getRecordAccessKey(d.access), d.reason])).toEqual([
			['a', 'atomic: read-only lane'],
			['b', 'read-only lane'],
		])
	})
})
