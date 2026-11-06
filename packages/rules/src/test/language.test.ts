import { describe, expect, it } from 'vitest'
import { composeRules } from '../lib/compose'
import { parseRule } from '../lib/parse'
import {
	TLRuleRecord as BaseRecord,
	TLRulesCompileError,
	TLRulesDefinition,
	compileRules,
} from '../lib/rules'
import { pollPluginRules, useCaseRules } from '../lib/use-cases'

type TLRuleRecord = BaseRecord & Record<string, any>

const base = (def: Partial<TLRulesDefinition>): TLRulesDefinition => ({
	version: 1,
	default: { read: 'true', write: 'false' },
	...def,
})

function shape(id: string, extra: Record<string, unknown> = {}): TLRuleRecord {
	return {
		id: `shape:${id}`,
		typeName: 'shape',
		type: 'geo',
		parentId: 'page:1',
		x: 0,
		y: 0,
		props: {},
		meta: {},
		...extra,
	}
}

function store(...records: TLRuleRecord[]) {
	const map = new Map(records.map((r) => [r.id, r]))
	return (id: string) => map.get(id)
}

describe('parse', () => {
	it('parses precedence and keeps source spans', () => {
		const src = "a || b && c == 'x'"
		const e = parseRule(src)
		expect(e.k).toBe('logical')
		if (e.k !== 'logical') throw new Error()
		expect(e.op).toBe('||')
		expect(src.slice(e.right.s[0], e.right.s[1])).toBe("b && c == 'x'")
	})

	it('parses quantifiers', () => {
		const e = parseRule('ancestors(record).some(a => a.meta.x == 1)')
		expect(e.k).toBe('quant')
	})

	it('rejects unknown functions and wrong arity at parse time', () => {
		expect(() => parseRule('fetch(1)')).toThrow(/Unknown function 'fetch'/)
		expect(() => parseRule('get(1, 2)')).toThrow(/takes 1 argument/)
		expect(() => parseRule('a ==')).toThrow(/Unexpected end/)
	})
})

describe('compile', () => {
	it('rejects unknown names, unknown actions, and self-referencing lets', () => {
		expect(() => compileRules(base({ types: { shape: { update: 'usr.id == 1' } } }))).toThrow(
			TLRulesCompileError
		)
		expect(() => compileRules(base({ types: { shape: { update: "can('nope')" } } }))).toThrow(
			/unknown action 'nope'/
		)
		expect(() => compileRules(base({ let: { a: 'b', b: 'a' } }))).toThrow(/refers to itself/)
	})

	it('compiles every reference rule set', () => {
		for (const def of Object.values(useCaseRules)) expect(() => compileRules(def)).not.toThrow()
		expect(() => compileRules(composeRules(useCaseRules.shareLinks, pollPluginRules))).not.toThrow()
	})

	it('is JSON: a definition survives a round trip unchanged', () => {
		const def = useCaseRules.classroom
		expect(JSON.parse(JSON.stringify(def))).toEqual(def)
	})
})

describe('semantics', () => {
	const rules = compileRules(
		base({
			types: {
				shape: {
					update: 'prev.meta.ownerId == user.id',
					delete: '!(prev.meta.ownerId == user.id)',
				},
			},
		})
	)
	const check = (op: 'update' | 'delete', prev: TLRuleRecord, user: Record<string, any>) =>
		rules.checkWrite({ op, typeName: 'shape', prev, next: prev, user, get: () => undefined }).ok

	// Review finding 5: `undefined === undefined` passes in JavaScript.
	it('does not match an unstamped shape to an anonymous user', () => {
		expect(check('update', shape('a'), { id: null })).toBe(false)
		expect(check('update', shape('a'), {})).toBe(false)
	})

	it('does not let negation flip a missing comparison into an allow', () => {
		expect(check('delete', shape('a'), {})).toBe(false)
		expect(check('delete', shape('a', { meta: { ownerId: 'bob' } }), { id: 'alice' })).toBe(true)
	})

	it('compares absent data against a literal as not equal', () => {
		const r = compileRules(base({ types: { shape: { read: '!(record.meta.hidden == true)' } } }))
		expect(r.canRead(shape('a'), {}, () => undefined)).toBe(true)
		expect(r.canRead(shape('a', { meta: { hidden: true } }), {}, () => undefined)).toBe(false)
	})

	it('treats `x == null` as an explicit absence check', () => {
		const r = compileRules(base({ types: { shape: { read: 'record.meta.holder == null' } } }))
		expect(r.canRead(shape('a'), {}, () => undefined)).toBe(true)
		expect(r.canRead(shape('a', { meta: { holder: 'u' } }), {}, () => undefined)).toBe(false)
	})

	it('denies on a type error instead of coercing', () => {
		const r = compileRules(base({ types: { shape: { read: "record.x < 'ten'" } } }))
		expect(r.canRead(shape('a'), {}, () => undefined)).toBe(false)
	})

	it('reads other records with get, parent, page, and ancestors', () => {
		const r = compileRules(
			base({
				types: {
					shape: {
						read: "page(record).meta.open == true && ancestors(record).some(a => a.id == 'shape:frame')",
					},
				},
			})
		)
		const page = { id: 'page:1', typeName: 'page', meta: { open: true } }
		const frame = shape('frame', { type: 'frame' })
		const child = shape('child', { parentId: frame.id })
		expect(r.canRead(child, {}, store(page, frame, child))).toBe(true)
		expect(r.canRead(shape('loose'), {}, store(page, frame))).toBe(false)
	})

	it('checks onlyChanged against leaf paths', () => {
		const r = compileRules(
			base({ types: { shape: { update: "onlyChanged('x', 'props.votes.ann')" } } })
		)
		const prev = shape('a', { props: { votes: { ann: 0, bob: 0 } } })
		const ok = { ...prev, x: 5, props: { votes: { ann: 1, bob: 0 } } }
		const bad = { ...prev, props: { votes: { ann: 0, bob: 1 } } }
		const run = (next: TLRuleRecord) =>
			r.checkWrite({ op: 'update', typeName: 'shape', prev, next, user: {}, get: () => undefined })
				.ok
		expect(run(ok)).toBe(true)
		expect(run(bad)).toBe(false)
	})
})

describe('stamps and frozen fields', () => {
	const rules = compileRules(
		base({
			types: { shape: { stamp: { 'meta.ownerId': 'user.id' }, create: 'true', update: 'true' } },
		})
	)

	it('stamps on create, overriding the client value', () => {
		const result = rules.checkWrite({
			op: 'create',
			typeName: 'shape',
			prev: null,
			next: shape('a', { meta: { ownerId: 'forged' } }),
			user: { id: 'ann' },
			get: () => undefined,
		})
		expect(result).toMatchObject({ ok: true, record: { meta: { ownerId: 'ann' } } })
	})

	it('denies a create it cannot stamp', () => {
		const result = rules.checkWrite({
			op: 'create',
			typeName: 'shape',
			prev: null,
			next: shape('a'),
			user: { id: null },
			get: () => undefined,
		})
		expect(result.ok).toBe(false)
	})

	// Review finding 23: old clients and up-migrations must not overwrite the stored owner.
	it('freezes stamped fields on update', () => {
		const prev = shape('a', { meta: { ownerId: 'ann' } })
		const result = rules.checkWrite({
			op: 'update',
			typeName: 'shape',
			prev,
			next: { ...prev, meta: { ownerId: 'bob' } },
			user: { id: 'bob' },
			get: () => undefined,
		})
		expect(result).toMatchObject({ ok: false, denial: { message: 'meta.ownerId cannot change' } })
	})
})

describe('explain', () => {
	it('names the failing clause and the rule message', () => {
		const rules = compileRules(useCaseRules.classroom)
		const page = { id: 'page:1', typeName: 'page', meta: {} }
		const doc = { id: 'document:document', typeName: 'document', meta: {} }
		const prev = shape('a', { meta: { ownerId: 'bob' } })
		const result = rules.checkWrite({
			op: 'update',
			typeName: 'shape',
			prev,
			next: { ...prev, x: 10 },
			user: { id: 'ann', role: 'student' },
			get: store(page, doc as any),
		})
		expect(result).toEqual({
			ok: false,
			denial: {
				rule: 'shape.update',
				message: 'You can only change your own shapes, inside your frame',
				clause: 'mine: prev.meta.ownerId == user.id',
				result: 'false',
				reason: 'prev.meta.ownerId is "bob" and user.id is "ann"',
			},
		})
	})

	it('descends into && and into lets', () => {
		const rules = compileRules(
			base({
				let: { mine: 'prev.meta.ownerId == user.id' },
				types: { shape: { delete: 'exists(user.id) && mine' } },
			})
		)
		const result = rules.checkWrite({
			op: 'delete',
			typeName: 'shape',
			prev: shape('a', { meta: { ownerId: 'bob' } }),
			next: null,
			user: { id: 'ann' },
			get: () => undefined,
		})
		expect(result.ok ? null : result.denial.clause).toBe('mine: prev.meta.ownerId == user.id')
	})
})

describe('explain in words', () => {
	const check = (rule: string, prev: TLRuleRecord, user: Record<string, any>) =>
		compileRules(base({ types: { shape: { update: rule } } })).checkWrite({
			op: 'update',
			typeName: 'shape',
			prev,
			next: prev,
			user,
			get: () => undefined,
		})

	it('says which side of a comparison was missing', () => {
		const result = check('!(prev.meta.ownerId == user.id)', shape('a'), { id: 'ann' })
		expect(result).toMatchObject({
			ok: false,
			denial: { result: 'error', reason: 'prev.meta.ownerId is missing' },
		})
	})

	it('names the kinds that did not mix', () => {
		const result = check('prev.x > user.id', shape('a'), { id: 'ann' })
		expect(result).toMatchObject({
			denial: { result: 'error', reason: 'prev.x is a number and user.id is a string' },
		})
	})

	it('shows the value that was not in the list', () => {
		const result = check("prev.type in ['draw', 'note']", shape('a'), {})
		expect(result).toMatchObject({ denial: { result: 'false', reason: 'prev.type is "geo"' } })
	})
})

describe('field read control', () => {
	const rules = compileRules(
		base({
			default: { read: 'true', write: 'true' },
			types: {
				shape: {
					fields: {
						'props.text': {
							read: 'record.meta.holder == user.id || record.meta.revealed == true',
							hidden: '',
						},
					},
				},
			},
		})
	)
	const card = shape('card', { props: { text: 'A♠' }, meta: { holder: 'ann' } })

	it('hides the field from everyone but the holder', () => {
		expect(rules.redact(card, { id: 'ann' }, () => undefined)).toBe(card)
		expect(rules.redact(card, { id: 'bob' }, () => undefined)).toEqual({
			...card,
			props: { text: '' },
		})
		expect(rules.mayHideFields('shape', { id: 'bob' })).toBe(true)
	})

	it('denies a write to a hidden field, and keeps the real value when the hidden one comes back', () => {
		const write = (text: string) =>
			rules.checkWrite({
				op: 'update',
				typeName: 'shape',
				prev: card,
				next: { ...card, x: 5, props: { text } },
				user: { id: 'bob' },
				get: () => undefined,
			})
		expect(write('K♥')).toMatchObject({
			ok: false,
			denial: { rule: 'shape.fields.props.text', message: 'props.text is hidden from you' },
		})
		expect(write('')).toEqual({ ok: true, record: { ...card, x: 5 } })
	})

	it('counts field rules as read dependencies', () => {
		expect(rules.readDependencies.own.shape).toEqual(
			expect.arrayContaining(['meta.holder', 'meta.revealed'])
		)
		expect(
			rules.changeAffectsVisibility({
				typeName: 'shape',
				prev: card,
				next: { ...card, meta: { ...card.meta, revealed: true } },
			})
		).toBe('self')
	})
})

describe('analysis', () => {
	const classroom = compileRules(useCaseRules.classroom)
	const student = { id: 'ann', role: 'student' }
	const teacher = { id: 't', role: 'teacher' }

	it('decides tool availability from a partial record', () => {
		expect(classroom.decide('create', 'shape', teacher, { next: { type: 'frame' } })).toBe('allow')
		expect(classroom.decide('create', 'shape', student, { next: { type: 'frame' } })).toBe('deny')
		// depends on where the student draws
		expect(classroom.decide('create', 'shape', student, { next: { type: 'draw' } })).toBe('maybe')
	})

	it('derives read-only: no write to any shape is possible', () => {
		const tiers = compileRules(useCaseRules.shareLinks)
		const viewer = { id: 'v', access: 'view' }
		for (const op of ['create', 'update', 'delete'] as const) {
			expect(tiers.decide(op, 'shape', viewer)).toBe('deny')
			expect(tiers.decide(op, 'shape', { id: 'e', access: 'edit' })).toBe('allow')
		}
		// but a commenter may still comment
		expect(
			tiers.decide(
				'create',
				'comment',
				{ id: 'c', access: 'comment' },
				{ next: { isDeleted: false } }
			)
		).toBe('allow')
	})

	it('folds a read rule to a constant when it does not depend on the record', () => {
		const agent = compileRules(useCaseRules.agent)
		expect(agent.decide('read', 'shape', { id: 'h', role: 'human' })).toBe('allow')
		expect(agent.decide('read', 'shape', { id: 'a', role: 'agent', area: 'shape:f' })).toBe('maybe')
	})

	it('lists what read rules depend on', () => {
		const pages = compileRules(useCaseRules.teamPages)
		expect(pages.readDependencies).toMatchObject({
			traverses: true,
			usesGet: true,
			wildcard: false,
		})
		expect(pages.readDependencies.own.page).toEqual(['meta.team'])
		expect(pages.readDependencies.other).toContain('meta.team')
	})

	it('knows a drag cannot change visibility, and a reparent can', () => {
		const reveal = compileRules(useCaseRules.reveal)
		const prev = shape('a')
		expect(
			reveal.changeAffectsVisibility({ typeName: 'shape', prev, next: { ...prev, x: 9 } })
		).toBe('none')
		expect(
			reveal.changeAffectsVisibility({
				typeName: 'shape',
				prev,
				next: { ...prev, meta: { hidden: false } },
			})
		).toBe('all')
		expect(
			reveal.changeAffectsVisibility({
				typeName: 'shape',
				prev,
				next: { ...prev, parentId: 'shape:f' },
			})
		).toBe('all')
		const plain = compileRules(base({ types: { shape: { read: 'record.meta.public == true' } } }))
		expect(
			plain.changeAffectsVisibility({
				typeName: 'shape',
				prev,
				next: { ...prev, meta: { public: true } },
			})
		).toBe('self')
	})
})

describe('compose', () => {
	it('narrows with &&, and lets a later let replace an earlier one', () => {
		const def = composeRules(
			base({ let: { ok: 'false' }, types: { shape: { update: 'true' } } }),
			{ types: { shape: { update: 'ok' } } },
			{ let: { ok: 'true' } }
		)
		expect(def.types!.shape.update).toBe('(true) && (ok)')
		const rules = compileRules(def)
		expect(
			rules.checkWrite({
				op: 'update',
				typeName: 'shape',
				prev: shape('a'),
				next: shape('a'),
				user: {},
				get: () => undefined,
			}).ok
		).toBe(true)
	})

	it('rejects an action defined twice', () => {
		expect(() =>
			composeRules(base({ actions: { a: 'true' } }), { actions: { a: 'false' } })
		).toThrow(/defined twice/)
	})
})

describe('review findings stay fixed', () => {
	const read = (rule: string) =>
		compileRules(
			base({ types: { shape: { read: rule } }, default: { read: 'true', write: 'true' } })
		)
	const update = (rule: string, prev: TLRuleRecord, user: Record<string, any>) =>
		compileRules(base({ types: { shape: { update: rule } } })).checkWrite({
			op: 'update',
			typeName: 'shape',
			prev,
			next: prev,
			user,
			get: () => undefined,
		}).ok

	it('does not decide a list with an unknown in it', () => {
		const rules = read("!([record.meta.vis] == ['private'])")
		expect(rules.decide('read', 'shape', {})).toBe('maybe')
		expect(rules.canRead(shape('a', { meta: { vis: 'private' } }), {}, () => undefined)).toBe(false)
	})

	it('does not decide a ?: whose test may be an error', () => {
		const rules = read('record.meta.ownerId == user.id ? true : user.admin')
		expect(rules.decide('read', 'shape', { admin: true })).toBe('maybe')
	})

	it('does not match missing values inside lists', () => {
		expect(update('[prev.meta.ownerId] == [user.id]', shape('a'), {})).toBe(false)
	})

	it('passes errors through exists() and parent()', () => {
		expect(update("!exists(get('ban:' + user.id))", shape('a'), {})).toBe(false)
		expect(update('parent(get(user.home)) == null', shape('a'), {})).toBe(false)
	})

	it('has no prototype names: lets, actions, functions, and types', () => {
		expect(() => compileRules(base({ types: { shape: { update: 'constructor' } } }))).toThrow(
			TLRulesCompileError
		)
		expect(() => compileRules(base({ types: { shape: { update: "can('toString')" } } }))).toThrow(
			TLRulesCompileError
		)
		expect(() => parseRule('hasOwnProperty(1) == null')).toThrow()
		const rules = compileRules(base({}))
		expect(rules.can('constructor', {})).toBe(false)
		expect(
			rules.checkWrite({
				op: 'create',
				typeName: '__proto__',
				prev: null,
				next: { id: 'x', typeName: '__proto__' },
				user: {},
				get: () => undefined,
			}).ok
		).toBe(false)
	})

	it('composes without widening: no stamp replaced, a listed type keeps its default', () => {
		const host = base({
			types: { shape: { stamp: { 'meta.ownerId': 'user.id' } }, page: { read: 'true' } },
			default: { read: 'true', write: 'user.teacher == true' },
		})
		expect(() =>
			composeRules(host, { types: { shape: { stamp: { 'meta.ownerId': 'next.meta.ownerId' } } } })
		).toThrow('stamped twice')
		const rules = compileRules(composeRules(host, { types: { page: { update: 'true' } } }))
		const p = { id: 'page:1', typeName: 'page', meta: {} }
		const write = (teacher: boolean) =>
			rules.checkWrite({
				op: 'update',
				typeName: 'page',
				prev: p,
				next: p,
				user: { teacher },
				get: () => undefined,
			}).ok
		expect([write(false), write(true)]).toEqual([false, true])
	})

	it('names a key with a dot exactly, with a list path', () => {
		const rules = compileRules(composeRules(useCaseRules.shareLinks, pollPluginRules))
		const poll = shape('p', { type: 'poll', props: { votes: {} }, meta: { ownerId: 'host' } })
		const vote = (key: string, user: string) =>
			rules.checkWrite({
				op: 'update',
				typeName: 'shape',
				prev: poll,
				next: { ...poll, props: { votes: { [key]: 'yes' } } },
				user: { id: user, access: 'edit' },
				get: () => undefined,
			}).ok
		expect(vote('bob@x.com', 'bob@x.com')).toBe(true)
		expect(vote('bob@x.com', 'bob@x')).toBe(false)
	})

	it('freezes paths that go through lists', () => {
		const rules = compileRules(
			base({ types: { shape: { frozen: ['meta.tags.0'], update: 'true' } } })
		)
		const prev = shape('a', { meta: { tags: ['a'] } })
		const ok = rules.checkWrite({
			op: 'update',
			typeName: 'shape',
			prev,
			next: { ...prev, meta: { tags: ['b'] } },
			user: {},
			get: () => undefined,
		}).ok
		expect(ok).toBe(false)
	})

	it('closes the reference rule bypasses: retyping into a teacher tool, or into a poll', () => {
		const classroom = compileRules(useCaseRules.classroom)
		const frame = shape('frame', { type: 'frame', meta: { assignee: 'ann' } })
		const mine = shape('mine', { type: 'geo', parentId: 'shape:frame', meta: { ownerId: 'ann' } })
		const get = store(
			frame,
			{ id: 'page:1', typeName: 'page', meta: {} } as any,
			{
				id: 'document:document',
				typeName: 'document',
				meta: {},
			} as any
		)
		const retype = (rules: typeof classroom, prev: TLRuleRecord, type: string, user: any) =>
			rules.checkWrite({
				op: 'update',
				typeName: 'shape',
				prev,
				next: { ...prev, type },
				user,
				get,
			}).ok
		expect(retype(classroom, mine, 'draw', { id: 'ann', role: 'student' })).toBe(true)
		expect(retype(classroom, mine, 'frame', { id: 'ann', role: 'student' })).toBe(false)

		const polls = compileRules(composeRules(useCaseRules.shareLinks, pollPluginRules))
		const geo = shape('g', { meta: { ownerId: 'cara' } })
		const editor = { id: 'cara', access: 'edit' }
		expect(retype(polls, geo, 'note', editor)).toBe(true)
		expect(retype(polls, geo, 'poll', editor)).toBe(false)
	})

	it('decides an update the way checkWrite does: the read check included', () => {
		const rules = compileRules(
			base({
				types: { shape: { read: '!(record.meta.hidden == true)', update: 'true' } },
				default: { read: 'true', write: 'false' },
			})
		)
		expect(rules.decide('update', 'shape', {})).toBe('maybe')
	})

	it('explains an error inside a quantifier body', () => {
		const rules = compileRules(
			base({ types: { shape: { update: 'ancestors(prev).some(a => a.meta.n > user.n)' } } })
		)
		const parent = shape('p', { meta: { n: 1 } })
		const child = shape('c', { parentId: 'shape:p' })
		const result = rules.checkWrite({
			op: 'update',
			typeName: 'shape',
			prev: child,
			next: child,
			user: {},
			get: store(parent),
		})
		expect(result).toMatchObject({ denial: { reason: 'user.n is missing' } })
	})
})
