import { describe, expect, it } from 'vitest'
import { defaultRelationSchema } from '../../lib/relations/defaultSchema'
import {
	RelationEvaluator,
	TLRelationContext,
	TLRelationSource,
	authorizeRelationWrite,
} from '../../lib/relations/evaluate'
import {
	anyOf,
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
		// every userset the actor is in, directly or through a group
		expect(result.subjects).toEqual([
			'user:ann',
			'team:t#member',
			'file:other#owner',
			'folder:x#commenter',
		])
		expect(reads).not.toContainEqual({ object: 'file:other' })
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
