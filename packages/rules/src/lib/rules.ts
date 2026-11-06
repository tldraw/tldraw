import { RULE_ROOTS, TLRuleExpr, TLRuleJson } from './ast'
import {
	ERROR,
	EvalHost,
	PartialRecord,
	and,
	UNKNOWN,
	Value,
	changedPaths,
	deepEqual,
	evaluate,
	findFailingClause,
	getPath,
	isUnder,
} from './evaluate'
import { TLRuleSyntaxError, parseRule } from './parse'

/**
 * One rule: an expression in the rule language, or an expression with the message a user sees
 * when it denies.
 *
 * @public
 */
export type TLRuleSource = string | { allow: string; message?: string }

/** @public */
export type TLWriteOp = 'create' | 'update' | 'delete'

/** @public */
export type TLRuleOp = TLWriteOp | 'read'

/**
 * The rules for one record type. Any op left out uses the definition's `default`.
 *
 * @public
 */
export interface TLTypeRules {
	read?: TLRuleSource
	create?: TLRuleSource
	update?: TLRuleSource
	delete?: TLRuleSource
	/**
	 * Fields the server sets on create from trusted data, and that never change after. The value is
	 * an expression, usually over `user`: `{ 'meta.ownerId': 'user.id' }`. A create whose stamp
	 * expression is missing or null (an anonymous user, say) is denied.
	 */
	stamp?: Record<string, string>
	/** Fields that can never change on update, such as `threadId` or `createdAt`. */
	frozen?: string[]
	/**
	 * Fields that some users may not read, inside a record they can read. Where `read` is not true,
	 * the room sends `hidden` in place of the real value, and a write that changes the field is
	 * denied (a write that sends `hidden` back keeps the real value). A card face is the usual case:
	 *
	 * ```ts
	 * fields: { 'props.text': { read: 'record.meta.holder == user.id', hidden: '' } }
	 * ```
	 */
	fields?: Record<string, TLFieldRule>
}

/**
 * Read control for one field. See {@link TLTypeRules.fields}.
 *
 * @public
 */
export interface TLFieldRule {
	read: TLRuleSource
	/** The value a user who may not read the field gets. It must pass the record's validator. */
	hidden: TLRuleJson
}

/**
 * A complete rule set. It is plain JSON: the server can store it, send it to clients, and show it
 * in a UI. Both the editor and the sync server compile the same definition with
 * {@link compileRules}.
 *
 * @example
 * ```ts
 * const classroom = defineRules({
 * 	version: 1,
 * 	let: { isTeacher: "user.role == 'teacher'" },
 * 	types: {
 * 		shape: {
 * 			stamp: { 'meta.ownerId': 'user.id' },
 * 			create: 'true',
 * 			update: { allow: 'isTeacher || prev.meta.ownerId == user.id', message: 'Not your shape' },
 * 			delete: 'isTeacher || prev.meta.ownerId == user.id',
 * 		},
 * 	},
 * 	default: { read: 'true', write: 'isTeacher' },
 * })
 * ```
 *
 * @public
 */
export interface TLRulesDefinition {
	version: 1
	/** Named expressions. Any rule can use the name as if it were a value. */
	let?: Record<string, string>
	/** Host verbs that are not record writes, such as `'lesson:lock'`. Ask with `can('lesson:lock')`. */
	actions?: Record<string, TLRuleSource>
	types?: Record<string, TLTypeRules>
	/** Rules for any type or op not listed in `types`. There is no implicit allow. */
	default: { read: TLRuleSource; write: TLRuleSource }
	/**
	 * `'atomic'` (the default): one denied record rejects the whole push, so an arrow never lands
	 * without its binding. `'per-record'`: skip only the denied records, as `authorizeRecord` does.
	 */
	pushes?: 'atomic' | 'per-record'
}

/**
 * The facts about the current user that rules may read, as `user.*`. The host builds this on the
 * server from its own auth. The client gets the same object from the server. It is JSON.
 *
 * @public
 */
export interface TLRuleUser {
	[key: string]: TLRuleJson
}

/** @public */
export function defineRules<T extends TLRulesDefinition>(def: T): T {
	return def
}

/** @public */
export interface TLRuleDenial {
	/** `'shape.update'`, `'comment.stamp'`, `'action.lesson:lock'`, … */
	rule: string
	message: string | null
	/** The smallest clause that did not pass, quoted from the rule's source. */
	clause: string
	/** `'false'` when the clause was false, `'error'` when it read missing data or mixed types. */
	result: 'false' | 'error'
	/** One sentence for a rule author: `prev.meta.ownerId is missing`, `isTeacher is false`. */
	reason: string
}

/** @public */
export type TLRuleCheck<R> = { ok: true; record: R } | { ok: false; denial: TLRuleDenial }

/** The analyzer's answer: decided for every record, decided against every record, or it depends. */
/** @public */
export type TLRuleDecision = 'allow' | 'deny' | 'maybe'

/**
 * What the read rules look at. The sync server uses this to skip visibility work when a change
 * cannot affect what anyone sees, such as a shape drag that changes only `x` and `y`.
 *
 * @public
 */
export interface TLReadDependencies {
	/** Paths a type's read rule reads on the record itself. */
	own: Record<string, string[]>
	/** Paths read on other records: parents, pages, and records from `get()`. */
	other: string[]
	/** A read rule walks up the parent chain, so `parentId` changes can affect descendants. */
	traverses: boolean
	/** A read rule calls `get()`, so creating or deleting any record can change visibility. */
	usesGet: boolean
	/** A computed property name, so any change may matter. */
	wildcard: boolean
}

/** @public */
export interface TLRuleRecord {
	id: string
	typeName: string
}

/** @public */
export interface TLWriteInput<R extends TLRuleRecord> {
	op: TLWriteOp
	typeName: string
	prev: R | null
	next: R | null
	user: TLRuleUser
	get(id: string): TLRuleRecord | undefined
}

interface CompiledRule {
	label: string
	source: string
	expr: TLRuleExpr
	message: string | null
}

interface CompiledType {
	read?: CompiledRule
	create?: CompiledRule
	update?: CompiledRule
	delete?: CompiledRule
	stamp: { path: string; rule: CompiledRule }[]
	frozen: string[]
	fields: { path: string; rule: CompiledRule; hidden: TLRuleJson }[]
}

/** @public */
export class TLRulesCompileError extends Error {}

function compileOne(label: string, src: TLRuleSource): CompiledRule {
	const source = typeof src === 'string' ? src : src.allow
	const message = typeof src === 'string' ? null : (src.message ?? null)
	try {
		return { label, source, expr: parseRule(source), message }
	} catch (e) {
		if (e instanceof TLRuleSyntaxError) throw new TLRulesCompileError(`${label}: ${e.message}`)
		throw e
	}
}

function walk(expr: TLRuleExpr, visit: (e: TLRuleExpr, scope: Set<string>) => void) {
	const go = (e: TLRuleExpr, scope: Set<string>) => {
		visit(e, scope)
		switch (e.k) {
			case 'member':
				return go(e.obj, scope)
			case 'index':
				go(e.obj, scope)
				return go(e.index, scope)
			case 'list':
				return e.items.forEach((i) => go(i, scope))
			case 'unary':
				return go(e.arg, scope)
			case 'binary':
			case 'logical':
				go(e.left, scope)
				return go(e.right, scope)
			case 'cond':
				go(e.test, scope)
				go(e.then, scope)
				return go(e.else, scope)
			case 'call':
				return e.args.forEach((a) => go(a, scope))
			case 'quant':
				go(e.list, scope)
				return go(e.body, new Set([...scope, e.param]))
		}
	}
	go(expr, new Set())
}

/**
 * A compiled rule set. Pure and synchronous: the same object answers write checks on the server,
 * write checks and affordance questions in the editor, and read filtering in the room.
 *
 * @public
 */
export class TLRules {
	// prototype-free, so `constructor` or `__proto__` is never a let, an action, or a type
	readonly lets: Record<string, { expr: TLRuleExpr; source: string }> = Object.create(null)
	private readonly actions: Record<string, CompiledRule> = Object.create(null)
	private readonly types: Record<string, CompiledType> = Object.create(null)
	private readonly defaultRead: CompiledRule
	private readonly defaultWrite: CompiledRule
	readonly pushes: 'atomic' | 'per-record'
	readonly readDependencies: TLReadDependencies

	constructor(readonly definition: TLRulesDefinition) {
		if (definition.version !== 1) {
			throw new TLRulesCompileError(`Unsupported rules version ${definition.version}`)
		}
		for (const [name, src] of Object.entries(definition.let ?? {})) {
			if ((RULE_ROOTS as readonly string[]).includes(name)) {
				throw new TLRulesCompileError(`let.${name}: '${name}' is a reserved name`)
			}
			this.lets[name] = { expr: compileOne(`let.${name}`, src).expr, source: src }
		}
		for (const [name, src] of Object.entries(definition.actions ?? {})) {
			this.actions[name] = compileOne(`action.${name}`, src)
		}
		for (const [typeName, rules] of Object.entries(definition.types ?? {})) {
			const compiled: CompiledType = {
				stamp: Object.entries(rules.stamp ?? {}).map(([path, src]) => ({
					path,
					rule: compileOne(`${typeName}.stamp.${path}`, src),
				})),
				frozen: rules.frozen ?? [],
				fields: Object.entries(rules.fields ?? {}).map(([path, f]) => ({
					path,
					rule: compileOne(`${typeName}.fields.${path}`, f.read),
					hidden: f.hidden,
				})),
			}
			for (const op of ['read', 'create', 'update', 'delete'] as const) {
				const src = rules[op]
				if (src !== undefined) compiled[op] = compileOne(`${typeName}.${op}`, src)
			}
			this.types[typeName] = compiled
		}
		this.defaultRead = compileOne('default.read', definition.default.read)
		this.defaultWrite = compileOne('default.write', definition.default.write)
		this.pushes = definition.pushes ?? 'atomic'
		this.validateNames()
		this.readDependencies = this.computeReadDependencies()
	}

	private allRules(): CompiledRule[] {
		const out: CompiledRule[] = [
			this.defaultRead,
			this.defaultWrite,
			...Object.values(this.actions),
		]
		for (const t of Object.values(this.types)) {
			for (const op of ['read', 'create', 'update', 'delete'] as const) {
				if (t[op]) out.push(t[op]!)
			}
			for (const s of t.stamp) out.push(s.rule)
			for (const f of t.fields) out.push(f.rule)
		}
		return out
	}

	/** Names and action references are checked at compile time, so a typo fails loudly. */
	private validateNames() {
		const check = (label: string, expr: TLRuleExpr) =>
			walk(expr, (e, scope) => {
				if (e.k === 'ident') {
					const known =
						scope.has(e.name) ||
						(RULE_ROOTS as readonly string[]).includes(e.name) ||
						e.name in this.lets
					if (!known) throw new TLRulesCompileError(`${label}: unknown name '${e.name}'`)
				}
				if (e.k === 'call' && e.fn === 'can') {
					const [arg] = e.args
					if (arg.k !== 'lit' || typeof arg.v !== 'string') {
						throw new TLRulesCompileError(`${label}: can() takes a literal action name`)
					}
					if (!(arg.v in this.actions)) {
						throw new TLRulesCompileError(`${label}: unknown action '${arg.v}'`)
					}
				}
			})
		for (const [name, { expr }] of Object.entries(this.lets)) check(`let.${name}`, expr)
		for (const rule of this.allRules()) check(rule.label, rule.expr)
		// a let that refers to itself, directly or not, would never finish
		const visiting = new Set<string>()
		const done = new Set<string>()
		const visitLet = (name: string) => {
			if (done.has(name)) return
			if (visiting.has(name)) throw new TLRulesCompileError(`let.${name}: refers to itself`)
			visiting.add(name)
			walk(this.lets[name].expr, (e, scope) => {
				if (e.k === 'ident' && !scope.has(e.name) && e.name in this.lets) visitLet(e.name)
			})
			visiting.delete(name)
			done.add(name)
		}
		Object.keys(this.lets).forEach(visitLet)
	}

	private ruleFor(typeName: string, op: TLRuleOp): CompiledRule {
		const t = this.types[typeName]
		return t?.[op] ?? (op === 'read' ? this.defaultRead : this.defaultWrite)
	}

	/** Type names with their own entry in the definition. */
	getTypeNames(): string[] {
		return Object.keys(this.types)
	}

	private host(
		user: TLRuleUser,
		op: TLRuleOp,
		prev: Value,
		next: Value,
		get: (id: string) => Value,
		depth = 0
	): EvalHost {
		const deeper = (r: Value, ruleOp: 'read' | 'update') => {
			if (depth > 16) return ERROR
			if (r === UNKNOWN || r instanceof PartialRecord) return UNKNOWN
			if (!r || typeof r !== 'object' || typeof (r as any).typeName !== 'string') return ERROR
			const rule = this.ruleFor((r as any).typeName, ruleOp)
			return evaluate(rule.expr, this.host(user, ruleOp, r, r, get, depth + 1))
		}
		return {
			user,
			op,
			prev,
			next,
			record: op === 'delete' || op === 'read' ? prev : next,
			get,
			lets: this.lets,
			can: (action) => {
				const rule = this.actions[action]
				if (!rule) return ERROR
				return evaluate(rule.expr, this.host(user, 'read', undefined, undefined, get, depth + 1))
			},
			canRead: (r) => deeper(r, 'read'),
			canEdit: (r) => deeper(r, 'update'),
		}
	}

	private deny(rule: CompiledRule, host: EvalHost): { ok: false; denial: TLRuleDenial } {
		const failing = findFailingClause(rule.expr, host, rule.source)
		return { ok: false, denial: { rule: rule.label, message: rule.message, ...failing } }
	}

	/**
	 * Check one write. On create, the returned record has its stamps applied: store that one. On
	 * update and delete it is `next` and `prev`. The editor and the server both call this.
	 */
	checkWrite<R extends TLRuleRecord>(input: TLWriteInput<R>): TLRuleCheck<R> {
		const { op, typeName, user } = input
		const get = (id: string) => input.get(id)
		const t = this.types[typeName]
		let next = input.next
		const prev = input.prev

		if (op === 'update' && prev && next && t?.fields.length) {
			// You cannot change what you cannot see. The client holds `hidden` for the field, so a
			// write that sends `hidden` back (a full put after a drag, say) keeps the real value.
			for (const field of t.fields) {
				const host = this.host(user, 'read', prev, prev, get)
				if (evaluate(field.rule.expr, host) === true) continue
				const sent = getPath(next, field.path)
				const real = getPath(prev, field.path)
				if (deepEqual(sent, real)) continue
				if (!deepEqual(sent, field.hidden)) {
					const failing = findFailingClause(field.rule.expr, host, field.rule.source)
					return {
						ok: false,
						denial: {
							rule: field.rule.label,
							message: field.rule.message ?? `${field.path} is hidden from you`,
							...failing,
						},
					}
				}
				next = setPath(next, field.path, real)
			}
		}

		if (op === 'update' && prev && next && t) {
			for (const path of [...t.frozen, ...t.stamp.map((s) => s.path)]) {
				if (!deepEqual(getPath(prev, path), getPath(next, path))) {
					return {
						ok: false,
						denial: {
							rule: `${typeName}.frozen`,
							message: `${path} cannot change`,
							clause: path,
							result: 'false',
							reason: `${path} is frozen`,
						},
					}
				}
			}
		}

		if (op === 'create' && next && t?.stamp.length) {
			let stamped: any = next
			for (const { path, rule } of t.stamp) {
				const host = this.host(user, 'create', undefined, next, get)
				const value = evaluate(rule.expr, host)
				if (value === null || value === undefined || typeof value === 'symbol') {
					return this.deny(rule, host)
				}
				stamped = setPath(stamped, path, value)
			}
			next = stamped
		}

		const read = this.ruleFor(typeName, 'read')
		if (op !== 'create' && prev && !(read.expr.k === 'lit' && read.expr.v === true)) {
			// You cannot change what you cannot see. The client never holds such a record, so this
			// only stops a forged id.
			const readHost = this.host(user, 'read', prev, prev, get)
			if (evaluate(read.expr, readHost) !== true) return this.deny(read, readHost)
		}

		const rule = this.ruleFor(typeName, op)
		const host = this.host(user, op, prev ?? undefined, next ?? undefined, get)
		if (evaluate(rule.expr, host) !== true) return this.deny(rule, host)

		if (op !== 'delete' && next && !(read.expr.k === 'lit' && read.expr.v === true)) {
			// Nor write a record you could not see afterwards: a shape put on a team page you are
			// not on, or moved into a hidden frame. The client would lose it at once.
			const readHost = this.host(user, 'read', next, next, get)
			if (evaluate(read.expr, readHost) !== true) {
				const denied = this.deny(read, readHost)
				denied.denial.message ??= 'You cannot put this where you cannot see it'
				return denied
			}
		}

		return { ok: true, record: (op === 'delete' ? prev : next) as R }
	}

	/** May `user` see this record? */
	canRead(record: TLRuleRecord, user: TLRuleUser, get: (id: string) => unknown): boolean {
		const rule = this.ruleFor(record.typeName, 'read')
		return evaluate(rule.expr, this.host(user, 'read', record, record, get)) === true
	}

	/**
	 * The record as this user may see it: each field they may not read holds its `hidden` value.
	 * Returns the same object when nothing is hidden.
	 */
	redact<R extends TLRuleRecord>(record: R, user: TLRuleUser, get: (id: string) => unknown): R {
		const t = this.types[record.typeName]
		if (!t?.fields.length) return record
		let out = record
		for (const field of t.fields) {
			const host = this.host(user, 'read', record, record, get)
			if (evaluate(field.rule.expr, host) !== true) out = setPath(out, field.path, field.hidden)
		}
		return out
	}

	/** Does this type have any field rules? */
	hasFieldRules(typeName: string): boolean {
		return !!this.types[typeName]?.fields.length
	}

	/** Could some record of this type have a field this user may not read? */
	mayHideFields(typeName: string, user: TLRuleUser): boolean {
		const t = this.types[typeName]
		if (!t?.fields.length) return false
		return t.fields.some(
			(f) =>
				evaluate(
					f.rule.expr,
					this.host(user, 'read', UNKNOWN, UNKNOWN, () => UNKNOWN)
				) !== true
		)
	}

	explainRead(
		record: TLRuleRecord,
		user: TLRuleUser,
		get: (id: string) => unknown
	): TLRuleDenial | null {
		const rule = this.ruleFor(record.typeName, 'read')
		const host = this.host(user, 'read', record, record, get)
		if (evaluate(rule.expr, host) === true) return null
		return this.deny(rule, host).denial
	}

	/** May `user` do a host action, such as `'lesson:lock'`? Unknown actions are denied. */
	can(action: string, user: TLRuleUser): boolean {
		const rule = this.actions[action]
		if (!rule) return false
		return (
			evaluate(
				rule.expr,
				this.host(user, 'read', undefined, undefined, () => undefined)
			) === true
		)
	}

	/** Names of every action in the definition. */
	getActionNames(): string[] {
		return Object.keys(this.actions)
	}

	/**
	 * Decide a write without the full records. Pass what you know: `{ next: { type: 'draw' } }`
	 * asks "could this user ever create a draw shape?". Fields you leave out are unknown, so the
	 * answer is `'allow'` or `'deny'` only when no value of them could change it.
	 *
	 * The editor uses this to hide tools, derive read-only mode, and lock shapes before any write.
	 */
	decide(
		op: TLRuleOp,
		typeName: string,
		user: TLRuleUser,
		known: { prev?: Record<string, unknown>; next?: Record<string, unknown> } = {},
		get?: (id: string) => unknown
	): TLRuleDecision {
		const lookup = get ?? (() => UNKNOWN)
		let next: Value = known.next ? new PartialRecord({ ...known.next, typeName }) : UNKNOWN
		const prev: Value = known.prev ? new PartialRecord({ ...known.prev, typeName }) : UNKNOWN
		const t = this.types[typeName]
		if (op === 'create' && t?.stamp.length) {
			const base = known.next ? { ...known.next, typeName } : { typeName }
			let stamped: Record<string, unknown> = base
			for (const { path, rule } of t.stamp) {
				const v = evaluate(rule.expr, this.host(user, 'create', undefined, next, lookup))
				if (v === null || v === undefined || v === ERROR) return 'deny'
				if (v !== UNKNOWN) stamped = setPath(stamped, path, v)
			}
			next = new PartialRecord(stamped)
		}
		const rule = this.ruleFor(typeName, op)
		let v = evaluate(rule.expr, this.host(user, op, prev, next, lookup))
		if (op === 'update' || op === 'delete') {
			// checkWrite also requires that the writer can read the record, so the analysis must too
			const read = this.ruleFor(typeName, 'read')
			v = and(evaluate(read.expr, this.host(user, 'read', prev, prev, lookup)), v)
		}
		if (v === true) return 'allow'
		if (v === UNKNOWN) return 'maybe'
		return 'deny'
	}

	/**
	 * "May I touch this record at all?": the update rule with `prev` and `next` both set to the
	 * record. The editor treats a shape that fails this as locked.
	 */
	canEdit(record: TLRuleRecord, user: TLRuleUser, get: (id: string) => unknown): boolean {
		return this.checkWrite({
			op: 'update',
			typeName: record.typeName,
			prev: record,
			next: record,
			user,
			get: get as any,
		}).ok
	}

	/** Apply this type's stamps to a record the client is about to create, so the server agrees. */
	stamp<R extends TLRuleRecord>(record: R, user: TLRuleUser, get: (id: string) => unknown): R {
		const t = this.types[record.typeName]
		if (!t?.stamp.length) return record
		let out: any = record
		for (const { path, rule } of t.stamp) {
			const v = evaluate(rule.expr, this.host(user, 'create', undefined, record, get))
			if (v !== null && v !== undefined && typeof v !== 'symbol') out = setPath(out, path, v)
		}
		return out
	}

	private computeReadDependencies(): TLReadDependencies {
		const own: Record<string, Set<string>> = {}
		const other = new Set<string>()
		const flags = { traverses: false, usesGet: false, wildcard: false, crossType: false }
		const STRUCTURAL = ['parentId', 'pageId', 'currentPageId']

		const visited = new Set<string>()
		const isOwnRoot = (e: TLRuleExpr, scope: Set<string>) =>
			e.k === 'ident' && ['record', 'prev', 'next'].includes(e.name) && !scope.has(e.name)
		const collect = (
			e: TLRuleExpr,
			ownSet: Set<string>,
			otherSet: Set<string>,
			scope: Set<string> = new Set()
		): void => {
			const recurse = (x: TLRuleExpr, s = scope) => collect(x, ownSet, otherSet, s)
			switch (e.k) {
				case 'lit':
					return
				case 'ident':
					if (!scope.has(e.name) && e.name in this.lets && !visited.has(e.name)) {
						visited.add(e.name)
						recurse(this.lets[e.name].expr)
						visited.delete(e.name)
					}
					return
				case 'member':
				case 'index': {
					const chain = memberChain(e)
					if (!chain) {
						flags.wildcard = true
						if (e.k === 'index') recurse(e.index)
						return recurse(e.obj)
					}
					const { root, path } = chain
					if (root.k === 'ident' && (root.name === 'user' || root.name === 'op')) return
					if (root.k === 'ident' && !scope.has(root.name) && root.name in this.lets) {
						// a let that yields a record: treat its fields as another record's
						otherSet.add(path.join('.'))
						return recurse(root)
					}
					;(isOwnRoot(root, scope) ? ownSet : otherSet).add(path.join('.'))
					return recurse(root)
				}
				case 'list':
					return e.items.forEach((x) => recurse(x))
				case 'unary':
					return recurse(e.arg)
				case 'binary':
				case 'logical':
					recurse(e.left)
					return recurse(e.right)
				case 'cond':
					recurse(e.test)
					recurse(e.then)
					return recurse(e.else)
				case 'quant':
					recurse(e.list)
					return recurse(e.body, new Set([...scope, e.param]))
				case 'call': {
					if (e.fn === 'get') flags.usesGet = true
					if (e.fn === 'parent' || e.fn === 'page' || e.fn === 'ancestors') {
						flags.traverses = true
						const target = isOwnRoot(e.args[0], scope) ? ownSet : otherSet
						STRUCTURAL.forEach((p) => target.add(p))
						STRUCTURAL.forEach((p) => otherSet.add(p))
						otherSet.add('typeName')
					}
					if (e.fn === 'canRead' || e.fn === 'canEdit') flags.crossType = true
					if (e.fn === 'can') {
						// an action reads no record of its own: whatever it reads is another record
						const [arg] = e.args
						const name = arg.k === 'lit' && typeof arg.v === 'string' ? arg.v : null
						const action = name ? this.actions[name] : null
						if (action && !visited.has(`action:${name}`)) {
							visited.add(`action:${name}`)
							collect(action.expr, otherSet, otherSet)
							visited.delete(`action:${name}`)
						}
					}
					return e.args.forEach((x) => recurse(x))
				}
			}
		}

		const readRules: [string, CompiledRule][] = [['*', this.defaultRead]]
		for (const [typeName, t] of Object.entries(this.types)) {
			if (t.read) readRules.push([typeName, t.read])
			else if (t.fields.length) readRules.push([typeName, this.defaultRead])
			for (const f of t.fields) readRules.push([typeName, f.rule])
		}
		for (const [typeName, rule] of readRules) {
			const set = (own[typeName] ??= new Set())
			collect(rule.expr, set, other)
		}
		if (flags.crossType) {
			// canRead(x) runs x's read rule, and canEdit(x) its update rule, on another record: what
			// they read on their own record is read on "other" records here.
			flags.traverses = true
			for (const t of [...Object.values(this.types).flatMap((t) => [t.read, t.update])]) {
				if (!t) continue
				collect(t.expr, other, other)
			}
			collect(this.defaultRead.expr, other, other)
			collect(this.defaultWrite.expr, other, other)
		}
		return {
			own: Object.fromEntries(Object.entries(own).map(([k, v]) => [k, [...v]])),
			other: [...other],
			traverses: flags.traverses,
			usesGet: flags.usesGet,
			wildcard: flags.wildcard,
		}
	}

	/**
	 * Could this change to a record change whether some session can see some record? Answers from
	 * the read dependencies only, so it is cheap enough to ask on every push.
	 */
	changeAffectsVisibility(
		change:
			| { typeName: string; prev: unknown; next: unknown }
			| { typeName: string; created: true }
			| { typeName: string; deleted: true }
	): 'none' | 'self' | 'all' {
		const deps = this.readDependencies
		if (deps.wildcard) return 'all'
		if ('created' in change || 'deleted' in change) return deps.usesGet ? 'all' : 'self'
		const changed = changedPaths(change.prev, change.next).map((c) => c.join('.'))
		const touches = (paths: string[]) =>
			changed.some((c) => paths.some((p) => isUnder(c, p) || isUnder(p, c)))
		if (touches(deps.other)) return 'all'
		if (deps.traverses && changed.some((c) => c === 'parentId')) return 'all'
		const own = Object.hasOwn(deps.own, change.typeName) ? deps.own[change.typeName] : deps.own['*']
		return touches(own) ? 'self' : 'none'
	}
}

function memberChain(e: TLRuleExpr): { root: TLRuleExpr; path: string[] } | null {
	const path: string[] = []
	let cur = e
	for (;;) {
		if (cur.k === 'member') {
			path.unshift(cur.prop)
			cur = cur.obj
		} else if (cur.k === 'index') {
			if (cur.index.k !== 'lit' || typeof cur.index.v !== 'string') return null
			path.unshift(cur.index.v)
			cur = cur.obj
		} else {
			return { root: cur, path }
		}
	}
}

function setPath<T>(obj: T, path: string, value: unknown): T {
	const [head, ...rest] = path.split('.')
	const base = (obj ?? {}) as Record<string, unknown>
	return {
		...base,
		[head]: rest.length ? setPath(base[head] as any, rest.join('.'), value) : value,
	} as T
}

/**
 * Compile a definition. Throws {@link TLRulesCompileError} for syntax errors, unknown names,
 * unknown functions, unknown actions, and self-referencing `let`s.
 *
 * @public
 */
export function compileRules(def: TLRulesDefinition): TLRules {
	return new TLRules(def)
}
