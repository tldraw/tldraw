import { describe, expect, it } from 'vitest'
import { BaseRecord, RecordId } from './BaseRecord'
import { PolicyRequest, RecordPolicy, createPolicyActor, isOwnedBy } from './RecordPolicy'
import { createRecordType } from './RecordType'
import { Store } from './Store'
import { StoreSchema, StoreSchemaOptions } from './StoreSchema'

// The store-level contract of record policies: layering, fail-closed defaults, the client guard,
// and its unit of work. The sync server side is tested in sync-core's recordPolicies.test.ts.

interface Note extends BaseRecord<'note', RecordId<Note>> {
	ownerId: string
	text: string
}
interface Camera extends BaseRecord<'camera', RecordId<Camera>> {
	x: number
}
type R = Note | Camera

const anything = { validate: (v: any) => v }
const noteType = (policy?: RecordPolicy<Note>) =>
	createRecordType<Note>('note', { validator: anything, scope: 'document', policy })
const Camera = createRecordType<Camera>('camera', { validator: anything, scope: 'session' })

const ownNotes: RecordPolicy<Note> = {
	create: ({ actor, next }) => isOwnedBy(actor, next.ownerId),
	update: ({ actor, prev, next }) =>
		isOwnedBy(actor, prev.ownerId) && next.ownerId === prev.ownerId,
	delete: ({ actor, prev }) => isOwnedBy(actor, prev.ownerId),
	actions: { pin: ({ can }) => can('notes:pin') },
}

function setup(opts: { type?: RecordPolicy<Note>; schema?: StoreSchemaOptions<R, any> } = {}) {
	const Note = noteType(opts.type)
	const schema = StoreSchema.create<R>({ note: Note, camera: Camera }, opts.schema)
	const store = new Store<R, any>({ schema, props: {} })
	const denied: string[] = []
	store.addPolicyDeniedListener((requests) =>
		denied.push(...requests.map((r) => `${r.verb} ${'next' in r ? r.next.id : (r as any).prev.id}`))
	)
	const note = (id: string, ownerId: string, text = '') =>
		Note.create({ id: Note.createId(id), ownerId, text })
	return { schema, store, denied, note }
}

const ann = createPolicyActor({ id: 'ann', actions: [] })
const mod = createPolicyActor({ id: 'mod', actions: ['notes:write', 'notes:pin'] })
const get = () => undefined

describe('schema.authorize', () => {
	it('allows writes to a type with no rules, and denies unknown actions', () => {
		const { schema, note } = setup()
		const n = note('a', 'x')
		expect(schema.authorize(ann, { verb: 'create', next: n }, get)).toBe(true)
		expect(schema.authorize(ann, { verb: 'action', action: 'pin', record: n }, get)).toBe(false)
	})

	it('runs the record type rules, and treats a throw or a non-true result as a denial', () => {
		const { schema, note } = setup({
			type: {
				...ownNotes,
				read: () => 'yes' as any,
				delete: () => {
					throw new Error('boom')
				},
			},
		})
		expect(schema.authorize(ann, { verb: 'create', next: note('a', 'ann') }, get)).toBe(true)
		expect(schema.authorize(ann, { verb: 'create', next: note('a', 'bob') }, get)).toBe(false)
		expect(schema.authorize(ann, { verb: 'read', record: note('a', 'ann') }, get)).toBe(false)
		expect(schema.authorize(ann, { verb: 'delete', prev: note('a', 'ann') }, get)).toBe(false)
	})

	it('lets a host rule replace or extend the lower layer with ctx.base()', () => {
		const { schema, note } = setup({
			type: ownNotes,
			schema: {
				defaultPolicy: { create: ({ can }) => can('notes:write') },
				policies: { note: { update: (ctx) => ctx.base() || ctx.can('notes:write') } },
			},
		})
		const bobs = note('a', 'bob')
		const edit = { verb: 'update', prev: bobs, next: { ...bobs, text: 'x' } } as const
		expect(schema.authorize(ann, edit, get)).toBe(false)
		expect(schema.authorize(mod, edit, get)).toBe(true)
		// The record type's create rule is above the default policy, so it wins.
		expect(schema.authorize(ann, { verb: 'create', next: note('b', 'ann') }, get)).toBe(true)
	})

	it('denies a change of id or type, an unknown type, and cycles between rules', () => {
		const { schema, note } = setup({
			type: {
				read: (ctx) => ctx.authorize({ verb: 'read', record: ctx.record }),
			},
		})
		const n = note('a', 'ann')
		expect(
			schema.authorize(ann, { verb: 'update', prev: n, next: { ...n, id: 'note:b' as any } }, get)
		).toBe(false)
		expect(
			schema.authorize(ann, { verb: 'create', next: { id: 'x:1', typeName: 'x' } as any }, get)
		).toBe(false)
		expect(schema.authorize(ann, { verb: 'read', record: n }, get)).toBe(false)
	})

	it('allows everything for records outside the document scope', () => {
		const { schema } = setup({ schema: { defaultPolicy: { create: () => false } } })
		const camera = Camera.create({ id: Camera.createId('c'), x: 0 })
		expect(schema.authorize(ann, { verb: 'create', next: camera as R }, get)).toBe(true)
	})
})

describe('the client guard', () => {
	it('checks nothing until an actor is set', () => {
		const { store, note, denied } = setup({ type: ownNotes })
		store.put([note('a', 'bob')])
		expect(store.has('note:a' as any)).toBe(true)
		expect(denied).toEqual([])
	})

	it('reverts a whole operation when one change in it is denied, and reports it', () => {
		const { store, note, denied } = setup({ type: ownNotes })
		store.setActor(ann)
		store.put([note('a', 'ann'), note('b', 'bob')])
		expect(store.allRecords()).toEqual([])
		expect(denied).toEqual(['create note:b'])
	})

	it('sends no net change to listeners for a reverted operation', () => {
		const { store, note } = setup({ type: ownNotes })
		store.put([note('b', 'bob')])
		store.setActor(ann)
		const diffs: any[] = []
		store.listen((entry) => diffs.push(entry.changes), { scope: 'document' })
		store.update('note:b' as any, (n: any) => ({ ...n, text: 'hacked' }))
		store.put([note('a', 'ann')])
		expect(diffs.map((d) => Object.keys(d.added))).toEqual([['note:a']])
		expect(diffs.flatMap((d) => Object.keys(d.updated))).toEqual([])
	})

	it('checks the operations of a policy scope together', () => {
		const { store, note, denied } = setup({ type: ownNotes })
		store.put([note('b', 'bob')])
		store.setActor(ann)
		store.withPolicyScope(() => {
			store.put([note('a', 'ann')])
			store.update('note:b' as any, (n: any) => ({ ...n, text: 'hacked' }))
		})
		expect(store.has('note:a' as any)).toBe(false)
		expect(store.get('note:b' as any)).toMatchObject({ text: '' })
		expect(denied).toEqual(['update note:b'])
	})

	it('accepts a scope whose intermediate state is denied but whose end state is allowed', () => {
		const { store, note, denied } = setup({ type: ownNotes })
		store.put([note('b', 'bob')])
		store.setActor(ann)
		store.withPolicyScope(() => {
			store.update('note:b' as any, (n: any) => ({ ...n, text: 'temp' }))
			store.update('note:b' as any, (n: any) => ({ ...n, text: '' }))
		})
		expect(denied).toEqual([])
	})

	it('checks what side effects write in response to remote changes', () => {
		const { store, note, denied } = setup({ type: ownNotes })
		store.setActor(ann)
		// A side effect that answers every new note with a note of its own, in someone else's name.
		store.sideEffects.registerAfterCreateHandler('note', (n: any, source) => {
			if (source === 'remote') store.put([note(`reply-${n.id.slice(5)}`, 'bob')])
		})
		store.mergeRemoteChanges(() => store.put([note('r', 'bob')]))
		expect(store.has('note:r' as any)).toBe(true)
		expect(store.has('note:reply-r' as any)).toBe(false)
		expect(denied).toEqual(['create note:reply-r'])
	})

	it('reports denied requests in the shape the policies saw', () => {
		const { store, note } = setup({ type: ownNotes })
		store.put([note('b', 'bob')])
		store.setActor(ann)
		const seen: PolicyRequest[] = []
		store.addPolicyDeniedListener((requests) => seen.push(...(requests as PolicyRequest[])))
		store.remove(['note:b' as any])
		expect(seen).toEqual([{ verb: 'delete', prev: note('b', 'bob') }])
	})
})
