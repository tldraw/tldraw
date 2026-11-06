import { createRelationId } from '@tldraw/tlschema'
import { describe, expect, it } from 'vitest'
import { defaultRelationSchema } from '../../lib/relations/defaultSchema'
import {
	RelationEvaluator,
	TLRelationContext,
	TLRelationSource,
	authorizeRelationWrite,
	canReadRelationRecord,
} from '../../lib/relations/evaluate'
import { createRelationRoomAccess } from '../../lib/relations/roomAccess'
import {
	anyOf,
	anyone,
	butNot,
	defineRelationSchema,
	direct,
	field,
	from,
} from '../../lib/relations/schema'
import {
	attenuateCapabilityToken,
	createCapabilityToken,
	verifyCapabilityToken,
} from '../../lib/relations/tokens'
import { InMemoryTupleStore, resolveRelationContext } from '../../lib/relations/tupleStore'

function source(records: any[], tuples: [string, string, string][] = []): TLRelationSource {
	const byId = new Map(records.map((r) => [r.id, r]))
	return {
		getRecord: (id) => byId.get(id),
		getSubjects: (o, r) => tuples.filter(([to, tr]) => to === o && tr === r).map((t) => t[2]),
	}
}
const ctx = (over: Partial<TLRelationContext> = {}): TLRelationContext => ({
	actor: 'user:ann',
	subjects: ['user:ann'],
	root: 'file:f',
	rootRelations: [],
	...over,
})
const page = { id: 'page:p', typeName: 'page' }
const shape = (id: string, parentId: string, owner?: string) => ({
	id,
	typeName: 'shape',
	type: 'geo',
	parentId,
	meta: owner ? { owner } : {},
})

describe('schema validation', () => {
	it('rejects references to unknown relations', () => {
		expect(() => defineRelationSchema({ doc: { read: 'viewer' } })).toThrow(/unknown relation/)
		expect(() => defineRelationSchema({ doc: { read: from('parent', 'read') } })).toThrow(
			/traverses unknown relation/
		)
		expect(() =>
			defineRelationSchema({
				doc: { viewer: direct(), parent: 'viewer', read: from('parent', 'x') },
			})
		).toThrow(/must be direct/)
	})
})

describe('evaluation', () => {
	it('the root boundary answers from the context, without tuples', () => {
		const e = new RelationEvaluator(
			defaultRelationSchema,
			source([page]),
			ctx({ rootRelations: ['read', 'viewer'] })
		)
		expect(e.check('page:p', 'read')).toBe(true)
		expect(e.check('page:p', 'edit')).toBe(false)
	})

	it('a userset subject is checked through the room (page editors may view a frame)', () => {
		const frame = shape('shape:f', 'page:p')
		const e = new RelationEvaluator(
			defaultRelationSchema,
			source(
				[page, frame],
				[
					['page:p', 'editor', 'user:ann'],
					['shape:f', 'viewer', 'page:p#editor'],
				]
			),
			ctx()
		)
		expect(e.check('shape:f', 'viewer')).toBe(true)
	})

	it('exclusion breaks inheritance for the named subjects only', () => {
		const s = source([page], [['page:p', 'restricted', 'team:kids#member']])
		const kid = ctx({ subjects: ['user:ann', 'team:kids#member'], rootRelations: ['read'] })
		const adult = ctx({ subjects: ['user:bob'], actor: 'user:bob', rootRelations: ['read'] })
		expect(new RelationEvaluator(defaultRelationSchema, s, kid).check('page:p', 'read')).toBe(false)
		expect(new RelationEvaluator(defaultRelationSchema, s, adult).check('page:p', 'read')).toBe(
			true
		)
	})

	it('a parent loop in corrupt data denies instead of overflowing', () => {
		const a = shape('shape:a', 'shape:b')
		const b = shape('shape:b', 'shape:a')
		const e = new RelationEvaluator(defaultRelationSchema, source([a, b]), ctx())
		expect(e.check('shape:a', 'read')).toBe(false)
	})

	it('unknown types and relations deny', () => {
		const e = new RelationEvaluator(defaultRelationSchema, source([]), ctx())
		expect(e.check('mystery:x', 'read')).toBe(false)
		expect(e.check('page:p', 'fly')).toBe(false)
	})

	it('a field reader that throws grants nothing', () => {
		const schema = defineRelationSchema({
			doc: {
				owner: field(() => {
					throw new Error('bad record')
				}),
				read: anyOf('owner'),
			},
		})
		const e = new RelationEvaluator(schema, source([{ id: 'doc:1', typeName: 'doc' }]), ctx())
		expect(e.check('doc:1', 'read')).toBe(false)
	})

	it('butNot with a computed relation', () => {
		const schema = defineRelationSchema({
			doc: { member: direct(), banned: direct(), read: butNot('member', 'banned') },
		})
		const s = source(
			[],
			[
				['doc:1', 'member', 'user:ann'],
				['doc:1', 'banned', 'user:ann'],
				['doc:1', 'member', 'user:bob'],
			]
		)
		expect(new RelationEvaluator(schema, s, ctx()).check('doc:1', 'read')).toBe(false)
		expect(
			new RelationEvaluator(schema, s, ctx({ subjects: ['user:bob'] })).check('doc:1', 'read')
		).toBe(true)
	})
})

describe('writes', () => {
	const contributor = ctx({ rootRelations: ['read', 'contribute', 'comment'] })

	it('create stamps the owner from the context, not from the record', () => {
		const result = authorizeRelationWrite(defaultRelationSchema, source([page]), contributor, {
			type: 'create',
			prev: null,
			next: shape('shape:s', 'page:p', 'user:mallory'),
		})
		expect(result).toMatchObject({ ok: true, record: { meta: { owner: 'user:ann' } } })
	})

	it('an anonymous actor cannot be stamped as a comment author', () => {
		const result = authorizeRelationWrite(
			defaultRelationSchema,
			source([page, { id: 'comment-thread:t', typeName: 'comment-thread', pageId: 'page:p' }]),
			ctx({ actor: 'link:x', subjects: ['link:x'], rootRelations: ['read', 'comment'] }),
			{
				type: 'create',
				prev: null,
				next: { id: 'comment:c', typeName: 'comment', threadId: 'comment-thread:t', authorId: '' },
			}
		)
		expect(result).toEqual({ ok: false, reason: 'stamp rejected the actor' })
	})

	it('update checks where the record would end up, not only where it is', () => {
		const mine = shape('shape:s', 'page:p', 'user:ann')
		const s = source(
			[page, mine, shape('shape:locked-frame', 'page:p')],
			[['shape:locked-frame', 'restricted', '*']]
		)
		const result = authorizeRelationWrite(defaultRelationSchema, s, contributor, {
			type: 'update',
			prev: mine,
			next: { ...mine, parentId: 'shape:locked-frame' },
		})
		expect(result).toEqual({ ok: false, reason: 'no update after' })
	})

	it('a ceiling caps relations whatever the tuples say', () => {
		const result = authorizeRelationWrite(
			defaultRelationSchema,
			source([page]),
			ctx({ rootRelations: ['read', 'edit', 'contribute'], ceilings: [{ relations: ['read'] }] }),
			{ type: 'create', prev: null, next: shape('shape:s', 'page:p') }
		)
		expect(result).toEqual({ ok: false, reason: 'ceiling' })
	})

	it('types not in the schema are closed', () => {
		const result = authorizeRelationWrite(defaultRelationSchema, source([]), contributor, {
			type: 'create',
			prev: null,
			next: { id: 'secret:x', typeName: 'secret' },
		})
		expect(result.ok).toBe(false)
	})
})

describe('connect-time resolution', () => {
	it('loads only the root ancestry and the actor groups, then evaluates every root relation', async () => {
		const store = new InMemoryTupleStore([
			{ object: 'file:f', relation: 'parent', subject: 'folder:x' },
			{ object: 'folder:x', relation: 'commenter', subject: 'team:t#member' },
			{ object: 'team:t', relation: 'member', subject: 'user:ann' },
			{ object: 'file:other', relation: 'owner', subject: 'user:ann' },
		])
		const reads: unknown[] = []
		const read = store.read.bind(store)
		store.read = async (filter) => {
			reads.push(filter)
			return read(filter)
		}
		const result = await resolveRelationContext({
			schema: defaultRelationSchema,
			store,
			root: 'file:f',
			actor: 'user:ann',
		})
		expect([...result.rootRelations].sort()).toEqual(['comment', 'commenter', 'read', 'viewer'])
		// every userset the actor is in, directly, through a group, or through a rule
		expect(result.subjects).toEqual([
			'user:ann',
			'team:t#member',
			'file:other#owner',
			'folder:x#commenter',
			'folder:x#viewer',
			'folder:x#read',
			'folder:x#comment',
		])
		expect(reads).not.toContainEqual({ object: 'file:other' })
	})

	it('adds groups the actor is in only through a rule, even if nothing above the root names them', async () => {
		const store = new InMemoryTupleStore([
			{ object: 'file:f', relation: 'viewer', subject: 'user:ann' },
			{ object: 'team:class', relation: 'owner', subject: 'user:ann' },
		])
		const result = await resolveRelationContext({
			schema: defaultRelationSchema,
			store,
			root: 'file:f',
			actor: 'user:ann',
		})
		// so an in-room `page:p#restricted@team:class#member` applies to her
		expect(result.subjects).toContain('team:class#member')
	})
})

describe('capability tokens', () => {
	const secret = 's3cret'

	it('round-trips, and folds caveats into ceilings', async () => {
		const token = await createCapabilityToken(
			{ subject: 'agent:a', actingFor: 'user:ann', ceilings: [{ within: ['shape:f'] }] },
			secret
		)
		const narrowed = await attenuateCapabilityToken(token, { relations: ['read'], expiresAt: 5000 })
		expect(await verifyCapabilityToken(narrowed, secret, 1000)).toEqual({
			subject: 'agent:a',
			actingFor: 'user:ann',
			ceilings: [{ within: ['shape:f'] }, { relations: ['read'] }],
			expiresAt: 5000,
		})
	})

	it('rejects a wrong secret, a tampered payload, a removed caveat, and expiry', async () => {
		const token = await createCapabilityToken({ subject: 'link:l', expiresAt: 2000 }, secret)
		expect(await verifyCapabilityToken(token, 'other', 1000)).toBe(null)
		expect(await verifyCapabilityToken(token, secret, 3000)).toBe(null)

		const [prefix, , sig] = token.split('.')
		const forged = btoa(JSON.stringify({ subject: 'link:admin' })).replace(/=+$/, '')
		expect(await verifyCapabilityToken(`${prefix}.${forged}.${sig}`, secret, 1000)).toBe(null)

		const narrowed = await attenuateCapabilityToken(token, { relations: ['read'] })
		const parts = narrowed.split('.')
		const stripped = [parts[0], parts[1], parts[3]].join('.')
		expect(await verifyCapabilityToken(stripped, secret, 1000)).toBe(null)
	})
})

describe('room access', () => {
	it('a grant written earlier in a push applies to later writes in the same push', () => {
		const schema = defineRelationSchema({
			doc: { editor: direct(), read: anyone(), update: 'editor' },
			relation: {
				object: field((r) => r?.object),
				read: anyone(),
				create: anyone(),
				delete: anyone(),
			},
		})
		const access = createRelationRoomAccess<any>(schema)
		const doc = { id: 'doc:1', typeName: 'doc', title: 'a' }
		const grant = {
			id: createRelationId('doc:1', 'editor', 'user:ann'),
			typeName: 'relation',
			object: 'doc:1',
			relation: 'editor',
			subject: 'user:ann',
		}
		const records = new Map<string, any>([[doc.id, doc]])
		const view = () => ({ get: (id: string) => records.get(id) })
		const edit = { type: 'update', prev: doc, next: { ...doc, title: 'b' } } as const

		const push = view()
		expect(access.authorizeWrite(ctx(), edit, push)).toBe(null)
		expect(access.authorizeWrite(ctx(), { type: 'create', prev: null, next: grant }, push)).toEqual(
			grant
		)
		// the host's authorizer vetoed it, so the transaction does not hold it: it does not count
		expect(access.authorizeWrite(ctx(), edit, push)).toBe(null)
		// the transaction applies it
		records.set(grant.id, grant)
		expect(access.authorizeWrite(ctx(), edit, push)).toEqual(edit.next)
		// another push does not see the staged grant until it is committed
		expect(access.authorizeWrite(ctx(), edit, view())).toBe(null)
	})
})

describe('within caveats on reads', () => {
	it('show the subtree and the path to it, hide siblings and other pages, keep the document', () => {
		const records = [
			page,
			{ id: 'page:other', typeName: 'page' },
			{ id: 'document:document', typeName: 'document' },
			shape('shape:f', 'page:p'),
			shape('shape:in', 'shape:f'),
			shape('shape:out', 'page:p'),
			{
				id: 'relation:r1',
				typeName: 'relation',
				object: 'shape:out',
				relation: 'viewer',
				subject: '*',
			},
			{
				id: 'relation:r2',
				typeName: 'relation',
				object: 'page:p',
				relation: 'viewer',
				subject: '*',
			},
		]
		const s = source(records)
		const c = ctx({ rootRelations: ['read'], ceilings: [{ within: ['shape:f'] }] })
		const read = (id: string) =>
			canReadRelationRecord(defaultRelationSchema, s, c, records.find((r) => r.id === id)!)
		expect(Object.fromEntries(records.map((r) => [r.id, read(r.id)]))).toEqual({
			'page:p': true,
			'page:other': false,
			'document:document': true,
			'shape:f': true,
			'shape:in': true,
			'shape:out': false,
			'relation:r1': false,
			'relation:r2': true,
		})
	})
})

describe('review regressions', () => {
	it('a userset cycle cannot make a restriction miss', () => {
		const s = source(
			[page],
			[
				['page:p', 'contributor', 'page:a#viewer'],
				['page:a', 'viewer', 'page:b#viewer'],
				['page:a', 'viewer', 'user:u'],
				['page:b', 'viewer', 'page:a#viewer'],
				['shape_type:geo', 'restricted', 'page:b#viewer'],
			]
		)
		const c = ctx({ actor: 'user:u', subjects: ['user:u'], rootRelations: ['read'] })
		const result = authorizeRelationWrite(defaultRelationSchema, s, c, {
			type: 'create',
			prev: null,
			next: shape('shape:s', 'page:p'),
		})
		expect(result).toEqual({ ok: false, reason: 'no create' })
	})

	it('a caveat cannot remove an expiry or carry malformed limits', async () => {
		const token = await createCapabilityToken({ subject: 'link:l', expiresAt: 1000 }, 's')
		const bad = [{ expiresAt: 'never' }, { relations: 'read' }, { within: 'shape:x' }]
		for (const caveat of bad) {
			const t = await attenuateCapabilityToken(token, caveat as any)
			expect(await verifyCapabilityToken(t, 's', 500)).toBe(null)
		}
	})

	it('a ceiling also applies to changing a locked field', () => {
		const mine = shape('shape:s', 'page:p', 'user:ann')
		const result = authorizeRelationWrite(
			defaultRelationSchema,
			source([page, mine]),
			ctx({
				rootRelations: ['read', 'edit', 'manage', 'contribute'],
				ceilings: [{ relations: ['read', 'create', 'update', 'delete'] }],
			}),
			{ type: 'update', prev: mine, next: { ...mine, meta: { owner: 'user:bob' } } }
		)
		expect(result).toEqual({ ok: false, reason: "field relation 'owner' is locked" })
	})

	it('a binding cannot be pointed at a shape the user cannot read', () => {
		const hiddenPage = { id: 'page:hidden', typeName: 'page' }
		const a = shape('shape:a', 'page:p')
		const hidden = shape('shape:hidden', 'page:hidden')
		const binding = { id: 'binding:b', typeName: 'binding', fromId: 'shape:a', toId: 'shape:a' }
		const result = authorizeRelationWrite(
			defaultRelationSchema,
			source([page, hiddenPage, a, hidden, binding], [['page:hidden', 'restricted', '*']]),
			ctx({ rootRelations: ['read', 'edit', 'contribute'] }),
			{ type: 'update', prev: binding, next: { ...binding, toId: 'shape:hidden' } }
		)
		expect(result).toEqual({ ok: false, reason: 'no update after' })
	})

	it('the server rejects a tuple whose id does not name it', () => {
		const access = createRelationRoomAccess<any>(defaultRelationSchema)
		const forged = {
			id: createRelationId('page:p', 'viewer', 'user:ann'),
			typeName: 'relation',
			object: 'page:p',
			relation: 'restricted',
			subject: '*',
			meta: {},
		}
		const view = { get: (id: string) => (id === 'page:p' ? page : undefined) }
		const owner = ctx({ rootRelations: ['read', 'edit', 'manage', 'share'] })
		expect(access.authorizeWrite(owner, { type: 'create', prev: null, next: forged }, view)).toBe(
			null
		)
		const honest = { ...forged, id: createRelationId('page:p', 'restricted', '*') }
		expect(
			access.authorizeWrite(owner, { type: 'create', prev: null, next: honest }, view)
		).toEqual(honest)
	})

	it('a team owner gets access granted to team members', async () => {
		const store = new InMemoryTupleStore([
			{ object: 'team:t', relation: 'owner', subject: 'user:o' },
			{ object: 'file:f', relation: 'editor', subject: 'team:t#member' },
		])
		const result = await resolveRelationContext({
			schema: defaultRelationSchema,
			store,
			root: 'file:f',
			actor: 'user:o',
		})
		expect(result.rootRelations).toContain('edit')
		expect(result.subjects).toContain('team:t#member')
	})

	it('a user record can be created only by that user', () => {
		const result = authorizeRelationWrite(defaultRelationSchema, source([]), ctx(), {
			type: 'create',
			prev: null,
			next: { id: 'user:bob', typeName: 'user', name: 'Bob' },
		})
		expect(result.ok).toBe(false)
	})
})

describe('owner on re-create', () => {
	it('a manager who undoes a delete keeps the original owner; a contributor cannot', () => {
		const restored = shape('shape:s', 'page:p', 'user:bob')
		const create = { type: 'create', prev: null, next: restored } as const
		const asManager = authorizeRelationWrite(
			defaultRelationSchema,
			source([page]),
			ctx({ rootRelations: ['read', 'edit', 'manage', 'contribute'] }),
			create
		)
		expect(asManager).toMatchObject({ ok: true, record: { meta: { owner: 'user:bob' } } })
		const asContributor = authorizeRelationWrite(
			defaultRelationSchema,
			source([page]),
			ctx({ rootRelations: ['read', 'contribute'] }),
			create
		)
		expect(asContributor).toMatchObject({ ok: true, record: { meta: { owner: 'user:ann' } } })
	})
})

describe('second review regressions', () => {
	const tuple = (object: string, relation: string, subject: string) => ({
		id: createRelationId(object, relation, subject),
		typeName: 'relation',
		object,
		relation,
		subject,
	})
	const binding = (id: string, fromId: string, toId: string) => ({
		id,
		typeName: 'binding',
		type: 'arrow',
		fromId,
		toId,
	})
	const viewOf = (records: any[]) => {
		const byId = new Map(records.map((r) => [r.id, r]))
		return { get: (id: string) => byId.get(id) }
	}

	it('a within caveat whose object is gone shows nothing in the tree', () => {
		const records = [page, { id: 'page:q', typeName: 'page' }, shape('shape:x', 'page:q')]
		const c = ctx({ rootRelations: ['read'], ceilings: [{ within: ['shape:gone'] }] })
		const read = (r: any) => canReadRelationRecord(defaultRelationSchema, source(records), c, r)
		expect(records.map(read)).toEqual([false, false, false])
	})

	it('a binding under a within caveat is hidden when its target is outside', () => {
		const records = [
			page,
			shape('shape:f', 'page:p'),
			shape('shape:in', 'shape:f'),
			shape('shape:out', 'page:p'),
			binding('binding:b', 'shape:in', 'shape:out'),
		]
		const c = ctx({ rootRelations: ['read', 'edit'], ceilings: [{ within: ['shape:f'] }] })
		const b = records[4]
		expect(canReadRelationRecord(defaultRelationSchema, source(records), c, b)).toBe(false)
		expect(
			authorizeRelationWrite(defaultRelationSchema, source(records), c, {
				type: 'create',
				prev: null,
				next: b,
			}).ok
		).toBe(false)
	})

	it('moving a record re-checks its old and new pages', () => {
		const access = createRelationRoomAccess<any>(defaultRelationSchema)
		const q = { id: 'page:q', typeName: 'page' }
		const before = shape('shape:f', 'page:p')
		const after = shape('shape:f', 'page:q')
		const records = [page, q, after, { id: 'page:z', typeName: 'page' }]
		access.didChange({ reset: true, puts: records, deletes: [] })
		const recheck = access.readRecheck(
			[{ id: after.id, prev: before, next: after }],
			viewOf(records)
		)
		if (typeof recheck !== 'function') throw new Error(`expected a predicate, got ${recheck}`)
		expect(records.map(recheck)).toEqual([true, true, true, false])
	})

	it('moving a binding target re-checks the binding', () => {
		const access = createRelationRoomAccess<any>(defaultRelationSchema)
		const q = { id: 'page:q', typeName: 'page' }
		const before = shape('shape:t', 'page:p')
		const after = shape('shape:t', 'page:q')
		const records = [
			page,
			q,
			shape('shape:s', 'page:p'),
			after,
			binding('binding:b', 'shape:s', 'shape:t'),
		]
		access.didChange({ reset: true, puts: records, deletes: [] })
		const recheck = access.readRecheck(
			[{ id: after.id, prev: before, next: after }],
			viewOf(records)
		)
		if (typeof recheck !== 'function') throw new Error(`expected a predicate, got ${recheck}`)
		expect(recheck(records[4])).toBe(true)
	})

	it('a grant above a userset record re-checks the objects that name it', () => {
		const access = createRelationRoomAccess<any>(defaultRelationSchema)
		const pageA = { id: 'page:a', typeName: 'page' }
		const grant = tuple('page:p', 'editor', 'user:bob')
		const records = [
			page,
			pageA,
			shape('shape:s', 'page:p'),
			tuple('page:a', 'restricted', '*'),
			tuple('page:a', 'viewer', 'shape:s#edit'),
			grant,
		]
		access.didChange({ reset: true, puts: records, deletes: [] })
		const recheck = access.readRecheck([{ id: grant.id, prev: null, next: grant }], viewOf(records))
		if (typeof recheck !== 'function') throw new Error(`expected a predicate, got ${recheck}`)
		expect(recheck(pageA)).toBe(true)
	})
})

describe('third review regressions', () => {
	const c = ctx({ rootRelations: ['read', 'contribute', 'comment', 'view'] })
	const write = (records: any[], tuples: [string, string, string][], op: any) =>
		authorizeRelationWrite(defaultRelationSchema, source(records, tuples), c, op).ok

	it('a shape cannot be turned into a restricted type', () => {
		const geo = shape('shape:s', 'page:p', 'user:ann')
		const embed = { ...geo, type: 'embed' }
		const tuples: [string, string, string][] = [['shape_type:embed', 'restricted', '*']]
		expect(write([page, geo], tuples, { type: 'create', prev: null, next: embed })).toBe(false)
		expect(write([page, geo], tuples, { type: 'update', prev: geo, next: embed })).toBe(false)
	})

	it('an author cannot move a comment into another thread, and needs comment to edit it', () => {
		const threads = [
			{ id: 'comment-thread:a', typeName: 'comment-thread', pageId: 'page:p', createdBy: 'ann' },
			{ id: 'comment-thread:b', typeName: 'comment-thread', pageId: 'page:p', createdBy: 'ann' },
		]
		const comment = {
			id: 'comment:c',
			typeName: 'comment',
			threadId: 'comment-thread:a',
			authorId: 'ann',
			body: 'hi',
		}
		const records = [page, ...threads, comment]
		const moved = { ...comment, threadId: 'comment-thread:b' }
		const edited = { ...comment, body: 'hello' }
		expect(write(records, [], { type: 'update', prev: comment, next: edited })).toBe(true)
		expect(write(records, [], { type: 'update', prev: comment, next: moved })).toBe(false)
		const viewer = ctx({ rootRelations: ['read', 'view'] })
		expect(
			authorizeRelationWrite(defaultRelationSchema, source(records), viewer, {
				type: 'update',
				prev: comment,
				next: edited,
			}).ok
		).toBe(false)
	})

	it('a relation record must have the canonical id, and a malformed id does not throw', () => {
		const access = createRelationRoomAccess<any>(defaultRelationSchema)
		const owner = ctx({ rootRelations: ['read', 'share', 'manage', 'edit'] })
		const view = { get: (id: string) => (id === page.id ? page : undefined) }
		const tuple = {
			typeName: 'relation',
			object: 'page:p',
			relation: 'editor',
			subject: 'user:bob',
		}
		const create = (id: string) =>
			access.authorizeWrite(owner, { type: 'create', prev: null, next: { ...tuple, id } }, view)
		expect(create(createRelationId('page:p', 'editor', 'user:bob'))).not.toBe(null)
		expect(create('relation:page:p#editor@user:bob')).toBe(null)
		expect(create('relation:%E0%A4%A#x@y')).toBe(null)
		expect(
			access.readRecheck([{ id: 'relation:%E0%A4%A#x@y', prev: null, next: null }], view)
		).toBe('all')
	})

	it('creating a record re-checks records whose usersets name it', () => {
		const access = createRelationRoomAccess<any>(defaultRelationSchema)
		const t = shape('shape:t', 'page:p', 'user:ann')
		const s = shape('shape:s', 'page:p')
		const records = [page, s, t, tuple('shape:s', 'restricted', 'shape:t#owner')]
		access.didChange({ reset: true, puts: records, deletes: [] })
		const byId = new Map(records.map((r: any) => [r.id, r]))
		const recheck = access.readRecheck([{ id: t.id, prev: null, next: t }], {
			get: (id: string) => byId.get(id),
		})
		if (typeof recheck !== 'function') throw new Error(`expected a predicate, got ${recheck}`)
		expect(recheck(s)).toBe(true)
	})

	function tuple(object: string, relation: string, subject: string) {
		return {
			id: createRelationId(object, relation, subject),
			typeName: 'relation',
			object,
			relation,
			subject,
		}
	}
})
