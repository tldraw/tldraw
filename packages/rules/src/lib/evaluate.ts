import { TLRuleExpr } from './ast'

/**
 * A value the evaluator cannot know yet: a field of a record that is not there, during analysis.
 * Logic over it is three-valued (Kleene): `UNKNOWN && false` is `false`, `UNKNOWN || true` is
 * `true`, and everything else that touches it stays `UNKNOWN`.
 */
export const UNKNOWN = Symbol.for('tldraw.rules.unknown')

/**
 * A definite failure: a type error, or a comparison against a missing or null value. It denies,
 * and it survives negation (`!ERROR` is `ERROR`), so `!(prev.ownerId == user.id)` cannot turn a
 * missing owner into an allow. This is the fix for "owner checks fail open": in plain JavaScript
 * `undefined === undefined` is true.
 */
export const ERROR = Symbol.for('tldraw.rules.error')

/** A record whose listed fields are known and whose other fields are {@link UNKNOWN}. */
export class PartialRecord {
	constructor(readonly known: Record<string, unknown>) {}
}

export type Value = unknown

export interface EvalHost {
	user: Value
	prev: Value
	next: Value
	record: Value
	op: string
	/** Another record by id. Returns `UNKNOWN` during analysis. */
	get(id: string): Value
	can(action: string): Value
	canRead(record: Value): Value
	canEdit(record: Value): Value
	lets: Record<string, { expr: TLRuleExpr; source: string }>
}

const MAX_DEPTH = 64

function isPlainObject(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null && !Array.isArray(v) && !(v instanceof PartialRecord)
}

function isNullish(v: unknown) {
	return v === null || v === undefined
}

export function deepEqual(a: unknown, b: unknown): boolean {
	if (a === b) return true
	if (Array.isArray(a)) {
		if (!Array.isArray(b) || a.length !== b.length) return false
		return a.every((x, i) => deepEqual(x, b[i]))
	}
	if (isPlainObject(a) && isPlainObject(b)) {
		const ak = Object.keys(a)
		const bk = Object.keys(b)
		if (ak.length !== bk.length) return false
		return ak.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]))
	}
	return false
}

export function member(obj: Value, prop: string): Value {
	if (obj === UNKNOWN || obj === ERROR) return obj
	if (obj instanceof PartialRecord) {
		if (!Object.prototype.hasOwnProperty.call(obj.known, prop)) return UNKNOWN
		const v = obj.known[prop]
		return isPlainObject(v) ? new PartialRecord(v) : v
	}
	if (isPlainObject(obj)) {
		return Object.prototype.hasOwnProperty.call(obj, prop) ? obj[prop] : undefined
	}
	if (Array.isArray(obj) && /^(0|[1-9]\d*)$/.test(prop)) return obj[Number(prop)]
	return undefined
}

/**
 * A path as segments. A string is split on `.`; a list of strings is taken as is, so a key that
 * holds a dot (an email as a user id, say) can be named exactly: `['props', 'votes', user.id]`.
 */
export type Path = string | readonly string[]

export function toSegments(path: Path): readonly string[] {
	return typeof path === 'string' ? path.split('.') : path
}

export function getPath(obj: Value, path: Path): Value {
	let v = obj
	for (const part of toSegments(path)) v = member(v, part)
	return v
}

/** An array that holds a missing value somewhere: data that cannot be compared safely. */
function hasMissing(v: Value): boolean {
	return Array.isArray(v) && v.some((x) => isNullish(x) || x === ERROR || hasMissing(x))
}

export function and(a: Value, b: Value): Value {
	if (a === false || b === false) return false
	if (a === UNKNOWN || b === UNKNOWN) return UNKNOWN
	if (a === true && b === true) return true
	return ERROR
}

export function or(a: Value, b: Value): Value {
	if (a === true || b === true) return true
	if (a === UNKNOWN || b === UNKNOWN) return UNKNOWN
	if (a === false && b === false) return false
	return ERROR
}

function not(a: Value): Value {
	if (typeof a === 'boolean') return !a
	if (a === UNKNOWN) return UNKNOWN
	return ERROR
}

function isNullLiteral(e: TLRuleExpr) {
	return e.k === 'lit' && e.v === null
}

function isLiteral(e: TLRuleExpr) {
	return e.k === 'lit' || (e.k === 'list' && e.items.every(isLiteral))
}

function compare(op: string, l: Value, r: Value, le: TLRuleExpr, re: TLRuleExpr): Value {
	if (op === '==' || op === '!=') {
		const eq = (() => {
			if (l === UNKNOWN || r === UNKNOWN) return UNKNOWN
			if (l === ERROR || r === ERROR) return ERROR
			if (l instanceof PartialRecord || r instanceof PartialRecord) return UNKNOWN
			// `x == null` is the explicit way to ask "is it absent?"
			if (isNullLiteral(le) || isNullLiteral(re)) return isNullish(isNullLiteral(le) ? r : l)
			// Against a literal, absent data is simply not equal: `record.meta.hidden == true` is
			// false for a shape with no `hidden` field.
			if (isLiteral(le) || isLiteral(re)) return deepEqual(l, r)
			// Data against data: absent never equals anything, and never differs from anything.
			// In JavaScript `undefined === undefined`, so an unstamped shape and an anonymous user
			// would "match". Here that comparison denies, and `!` cannot flip it.
			if (isNullish(l) || isNullish(r)) return ERROR
			// the same hole, one level down: `[prev.ownerId] == [user.id]`
			if (hasMissing(l) || hasMissing(r)) return ERROR
			return deepEqual(l, r)
		})()
		return op === '==' ? eq : not(eq)
	}
	if (l === UNKNOWN || r === UNKNOWN) return UNKNOWN
	if (op === 'in') {
		if (r instanceof PartialRecord) return UNKNOWN
		if (l === ERROR || r === ERROR) return ERROR
		// absent is in no literal list, but is an error against a list read from data
		if (isNullish(l)) return isLiteral(re) ? false : ERROR
		if (Array.isArray(r)) {
			if (r.some((x) => x === UNKNOWN)) return UNKNOWN
			return r.some((x) => deepEqual(x, l))
		}
		return ERROR
	}
	if (op === '+') {
		if (typeof l === 'number' && typeof r === 'number') return l + r
		if (typeof l === 'string' && (typeof r === 'string' || typeof r === 'number')) return l + r
		if (typeof l === 'number' && typeof r === 'string') return l + r
		return ERROR
	}
	if (op === '-') {
		return typeof l === 'number' && typeof r === 'number' ? l - r : ERROR
	}
	const comparable =
		(typeof l === 'number' && typeof r === 'number') ||
		(typeof l === 'string' && typeof r === 'string')
	if (!comparable) return ERROR
	const a = l as number
	const b = r as number
	switch (op) {
		case '<':
			return a < b
		case '<=':
			return a <= b
		case '>':
			return a > b
		case '>=':
			return a >= b
	}
	return ERROR
}

/** Every changed leaf path between two JSON values, as segments. */
export function changedPaths(
	prev: Value,
	next: Value,
	prefix: string[] = [],
	out: string[][] = []
): string[][] {
	if (isPlainObject(prev) && isPlainObject(next)) {
		const keys = new Set([...Object.keys(prev), ...Object.keys(next)])
		for (const key of keys) changedPaths(prev[key], next[key], [...prefix, key], out)
		return out
	}
	if (!deepEqual(prev, next)) out.push(prefix)
	return out
}

/** True when `path` is `prefix` or lies under it. */
export function isUnder(path: Path, prefix: Path) {
	const a = toSegments(path)
	const b = toSegments(prefix)
	return b.length <= a.length && b.every((seg, i) => seg === a[i])
}

function hasUnknown(v: Value) {
	return v === UNKNOWN || v instanceof PartialRecord
}

function isRecordLike(v: Value) {
	return isPlainObject(v) || v instanceof PartialRecord
}

function ancestorsOf(host: EvalHost, r: Value): Value {
	if (r === UNKNOWN) return UNKNOWN
	if (!isRecordLike(r)) return ERROR
	const out: Value[] = []
	let cur: Value = r
	for (let i = 0; i < MAX_DEPTH; i++) {
		if (member(cur, 'typeName') === 'page') break
		const parentId = member(cur, 'parentId')
		if (parentId === UNKNOWN) return UNKNOWN
		if (typeof parentId !== 'string') break
		const parent = host.get(parentId)
		if (parent === UNKNOWN) return UNKNOWN
		if (!isPlainObject(parent)) break
		out.push(parent)
		cur = parent
	}
	return out
}

function pageOf(host: EvalHost, r: Value): Value {
	if (r === UNKNOWN) return UNKNOWN
	if (!isRecordLike(r)) return ERROR
	const typeName = member(r, 'typeName')
	if (typeName === 'page') return r
	const parentId = member(r, 'parentId')
	if (parentId === UNKNOWN) return UNKNOWN
	if (typeof parentId === 'string') {
		const chain = ancestorsOf(host, r)
		if (!Array.isArray(chain)) return chain
		const top = chain[chain.length - 1]
		return member(top, 'typeName') === 'page' ? top : undefined
	}
	for (const field of ['pageId', 'currentPageId']) {
		const id = member(r, field)
		if (id === UNKNOWN) return UNKNOWN
		if (typeof id === 'string') return host.get(id)
	}
	return undefined
}

export function evaluate(expr: TLRuleExpr, host: EvalHost, scope?: Map<string, Value>): Value {
	switch (expr.k) {
		case 'lit':
			return expr.v
		case 'list': {
			const items = expr.items.map((item) => evaluate(item, host, scope))
			// `[x] == ['a']` must not decide while x is unknown: the list is unknown as a whole
			if (items.some(hasUnknown)) return UNKNOWN
			return items
		}
		case 'ident': {
			if (scope?.has(expr.name)) return scope.get(expr.name)
			switch (expr.name) {
				case 'user':
					return host.user
				case 'prev':
					return host.prev
				case 'next':
					return host.next
				case 'record':
					return host.record
				case 'op':
					return host.op
			}
			const named = host.lets[expr.name]
			if (named) return evaluate(named.expr, host, scope)
			return ERROR
		}
		case 'member':
			return member(evaluate(expr.obj, host, scope), expr.prop)
		case 'index': {
			const index = evaluate(expr.index, host, scope)
			if (index === UNKNOWN) return UNKNOWN
			if (typeof index !== 'string' && typeof index !== 'number') return ERROR
			const obj = evaluate(expr.obj, host, scope)
			if (Array.isArray(obj) && typeof index === 'number') return obj[index]
			return member(obj, String(index))
		}
		case 'unary': {
			const v = evaluate(expr.arg, host, scope)
			if (expr.op === '!') return not(v)
			if (v === UNKNOWN) return UNKNOWN
			return typeof v === 'number' ? -v : ERROR
		}
		case 'binary':
			return compare(
				expr.op,
				evaluate(expr.left, host, scope),
				evaluate(expr.right, host, scope),
				expr.left,
				expr.right
			)
		case 'logical': {
			const l = evaluate(expr.left, host, scope)
			if (expr.op === '&&' && l === false) return false
			if (expr.op === '||' && l === true) return true
			const r = evaluate(expr.right, host, scope)
			return expr.op === '&&' ? and(l, r) : or(l, r)
		}
		case 'cond': {
			const test = evaluate(expr.test, host, scope)
			if (test === true) return evaluate(expr.then, host, scope)
			if (test === false) return evaluate(expr.else, host, scope)
			// an unknown test may turn out to be an error, which denies whatever the branches say
			if (test === UNKNOWN) return UNKNOWN
			return ERROR
		}
		case 'quant': {
			const list = evaluate(expr.list, host, scope)
			if (list === UNKNOWN || list instanceof PartialRecord) return UNKNOWN
			if (!Array.isArray(list)) return ERROR
			let acc: Value = expr.q === 'some' ? false : true
			for (const item of list) {
				const inner = new Map(scope)
				inner.set(expr.param, item)
				const v = evaluate(expr.body, host, inner)
				acc = expr.q === 'some' ? or(acc, v) : and(acc, v)
				if (expr.q === 'some' && acc === true) return true
				if (expr.q === 'every' && acc === false) return false
			}
			return acc
		}
		case 'call':
			return call(expr, host, scope)
	}
}

function call(
	expr: Extract<TLRuleExpr, { k: 'call' }>,
	host: EvalHost,
	scope?: Map<string, Value>
) {
	const args = () => expr.args.map((a) => evaluate(a, host, scope))
	switch (expr.fn) {
		case 'get': {
			const [id] = args()
			if (id === UNKNOWN) return UNKNOWN
			if (typeof id !== 'string') return ERROR
			return host.get(id)
		}
		case 'parent': {
			const [r] = args()
			if (r === UNKNOWN) return UNKNOWN
			if (!isRecordLike(r)) return ERROR
			const parentId = member(r, 'parentId')
			if (parentId === UNKNOWN) return UNKNOWN
			return typeof parentId === 'string' ? host.get(parentId) : undefined
		}
		case 'page':
			return pageOf(host, args()[0])
		case 'ancestors':
			return ancestorsOf(host, args()[0])
		case 'changed':
		case 'onlyChanged': {
			const { prev, next } = host
			if (hasUnknown(prev) || hasUnknown(next)) return UNKNOWN
			if (!isPlainObject(prev) || !isPlainObject(next)) return ERROR
			const paths = args()
			const isPath = (p: Value) =>
				typeof p === 'string' || (Array.isArray(p) && p.every((x) => typeof x === 'string'))
			if (!paths.every(isPath)) return ERROR
			const typed = paths as Path[]
			if (expr.fn === 'changed') {
				return typed.some((p) => !deepEqual(getPath(prev, p), getPath(next, p)))
			}
			return changedPaths(prev, next).every((c) => typed.some((p) => isUnder(c, p)))
		}
		case 'exists': {
			const [v] = args()
			if (v === UNKNOWN || v === ERROR) return v
			return !isNullish(v)
		}
		case 'size': {
			const [v] = args()
			if (v === UNKNOWN) return UNKNOWN
			return Array.isArray(v) || typeof v === 'string' ? v.length : ERROR
		}
		case 'startsWith': {
			const [s, p] = args()
			if (s === UNKNOWN || p === UNKNOWN) return UNKNOWN
			return typeof s === 'string' && typeof p === 'string' ? s.startsWith(p) : ERROR
		}
		case 'encode': {
			const [s] = args()
			if (s === UNKNOWN) return UNKNOWN
			return typeof s === 'string' ? encodeURIComponent(s) : ERROR
		}
		case 'can': {
			const [action] = args()
			if (typeof action !== 'string') return ERROR
			return host.can(action)
		}
		case 'canRead':
			return host.canRead(args()[0])
		case 'canEdit':
			return host.canEdit(args()[0])
	}
	return ERROR
}

/** What a value is, in words a rule author reads: `a string`, `missing`, `a record`. */
function kindOf(v: Value): string {
	if (v === undefined || v === null) return 'missing'
	if (v === ERROR) return 'an error'
	if (v === UNKNOWN) return 'unknown'
	if (Array.isArray(v)) return 'a list'
	if (isRecordLike(v)) return 'a record'
	return `a ${typeof v}`
}

/**
 * Why an expression is an error, in one sentence: the operand that was missing, or the two kinds
 * that did not mix. It descends into the operand that caused the error.
 */
function explainError(
	expr: TLRuleExpr,
	host: EvalHost,
	source: string,
	scope?: Map<string, Value>
): string {
	const text = (e: TLRuleExpr) => source.slice(e.s[0], e.s[1])
	const sub = (e: TLRuleExpr) => explainError(e, host, source, scope)
	switch (expr.k) {
		case 'binary': {
			const l = evaluate(expr.left, host, scope)
			const r = evaluate(expr.right, host, scope)
			if (l === ERROR) return sub(expr.left)
			if (r === ERROR) return sub(expr.right)
			if (isNullish(l)) return `${text(expr.left)} is missing`
			if (isNullish(r)) return `${text(expr.right)} is missing`
			return `${text(expr.left)} is ${kindOf(l)} and ${text(expr.right)} is ${kindOf(r)}`
		}
		case 'logical':
		case 'unary': {
			const parts = expr.k === 'unary' ? [expr.arg] : [expr.left, expr.right]
			for (const part of parts) {
				const v = evaluate(part, host, scope)
				if (v === ERROR) return sub(part)
				if (typeof v !== 'boolean' && v !== UNKNOWN) {
					return `${text(part)} is ${kindOf(v)}, not true or false`
				}
			}
			break
		}
		case 'cond': {
			const test = evaluate(expr.test, host, scope)
			if (test === ERROR) return sub(expr.test)
			return `${text(expr.test)} is ${kindOf(test)}, not true or false`
		}
		case 'ident': {
			const named = !scope?.has(expr.name) && host.lets[expr.name]
			if (named) return explainError(named.expr, host, named.source, scope)
			break
		}
		case 'member':
		case 'index':
			return `${text(expr)} is ${kindOf(evaluate(expr, host, scope))}, not true or false`
		case 'quant':
		case 'call':
			for (const arg of expr.k === 'call' ? expr.args : [expr.list]) {
				if (evaluate(arg, host, scope) === ERROR) return sub(arg)
			}
			if (expr.k === 'quant') {
				const list = evaluate(expr.list, host, scope)
				if (!Array.isArray(list)) return `${text(expr.list)} is ${kindOf(list)}, not a list`
				for (const item of list) {
					const inner = new Map(scope)
					inner.set(expr.param, item)
					if (evaluate(expr.body, host, inner) === ERROR) {
						return explainError(expr.body, host, source, inner)
					}
				}
				break
			}
			return `${text(expr)} got ${expr.args.map((a) => kindOf(evaluate(a, host, scope))).join(' and ')}`
	}
	return `${text(expr)} is ${kindOf(evaluate(expr, host, scope))}, not true or false`
}

/** A value in a sentence: `'bob'`, `3`, `missing`, `a record`. Long values are cut. */
function show(v: Value): string {
	if (typeof v === 'string') return JSON.stringify(v.length > 40 ? v.slice(0, 40) + '…' : v)
	if (typeof v === 'number' || typeof v === 'boolean') return String(v)
	if (Array.isArray(v) && v.length <= 5 && v.every((x) => typeof x !== 'object')) {
		return `[${v.map(show).join(', ')}]`
	}
	return kindOf(v)
}

/** Why a false clause is false: the values it compared, so the author sees what was there. */
function explainFalse(
	expr: TLRuleExpr,
	host: EvalHost,
	source: string,
	scope?: Map<string, Value>
): string {
	const text = (e: TLRuleExpr) => source.slice(e.s[0], e.s[1])
	if (
		expr.k === 'binary' &&
		!isLiteral(expr.left) &&
		['==', '!=', 'in', '<', '<=', '>', '>='].includes(expr.op)
	) {
		const l = evaluate(expr.left, host, scope)
		const r = evaluate(expr.right, host, scope)
		if (isLiteral(expr.right)) return `${text(expr.left)} is ${show(l)}`
		return `${text(expr.left)} is ${show(l)} and ${text(expr.right)} is ${show(r)}`
	}
	if (expr.k === 'unary' && expr.op === '!') return `${text(expr.arg)} is true`
	if (expr.k === 'quant') {
		const list = evaluate(expr.list, host, scope)
		const n = Array.isArray(list) ? list.length : 0
		const items = `${text(expr.list)} has ${n} item${n === 1 ? '' : 's'}`
		return expr.q === 'some'
			? `${items}, and none has ${text(expr.body)}`
			: `${items}, and not every one has ${text(expr.body)}`
	}
	return `${text(expr)} is false`
}

/** A denied clause: its source, how it failed, and a sentence that says why. */
export interface FailingClause {
	clause: string
	result: 'false' | 'error'
	reason: string
}

/**
 * The clause that made an expression deny: descend into the first non-true conjunct of `&&`, the
 * last branch of `||`, the chosen branch of `?:`, and the body of a named `let`. Anything else is
 * reported whole.
 */
export function findFailingClause(
	expr: TLRuleExpr,
	host: EvalHost,
	source: string,
	scope?: Map<string, Value>
): FailingClause {
	const result = evaluate(expr, host, scope)
	const describe = (): FailingClause => {
		const clause = source.slice(expr.s[0], expr.s[1])
		if (result === false) {
			return { clause, result: 'false', reason: explainFalse(expr, host, source, scope) }
		}
		return { clause, result: 'error', reason: explainError(expr, host, source, scope) }
	}
	if (expr.k === 'logical' && expr.op === '&&') {
		const left = evaluate(expr.left, host, scope)
		return left === true
			? findFailingClause(expr.right, host, source, scope)
			: findFailingClause(expr.left, host, source, scope)
	}
	// `override || usual`: when both are false, the usual path is the one worth explaining
	if (expr.k === 'logical' && expr.op === '||' && result !== UNKNOWN) {
		return findFailingClause(expr.right, host, source, scope)
	}
	if (expr.k === 'ident' && !scope?.has(expr.name) && host.lets[expr.name]) {
		const named = host.lets[expr.name]
		const inner = findFailingClause(named.expr, host, named.source, scope)
		return { ...inner, clause: `${expr.name}: ${inner.clause}` }
	}
	if (expr.k === 'cond') {
		const test = evaluate(expr.test, host, scope)
		if (test === true) return findFailingClause(expr.then, host, source, scope)
		if (test === false) return findFailingClause(expr.else, host, source, scope)
	}
	return describe()
}
