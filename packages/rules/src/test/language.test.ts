import { describe, expect, it } from 'vitest'
import { composeRules } from '../lib/compose'
import { parseRule } from '../lib/parse'
import { TLRuleRecord, TLRulesCompileError, TLRulesDefinition, compileRules } from '../lib/rules'
import { pollPluginRules, useCaseRules } from '../lib/use-cases'

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
