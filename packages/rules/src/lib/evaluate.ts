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
	return undefined
}

export function getPath(obj: Value, path: string): Value {
	let v = obj
	for (const part of path.split('.')) v = member(v, part)
	return v
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

/** Every changed leaf path between two JSON values, as dot paths. */
export function changedPaths(prev: Value, next: Value, prefix = '', out: string[] = []): string[] {
	if (isPlainObject(prev) && isPlainObject(next)) {
		const keys = new Set([...Object.keys(prev), ...Object.keys(next)])
		for (const key of keys) {
			changedPaths(prev[key], next[key], prefix ? `${prefix}.${key}` : key, out)
		}
		return out
	}
	if (!deepEqual(prev, next)) out.push(prefix)
	return out
}

/** True when `path` is `prefix` or lies under it. */
export function isUnder(path: string, prefix: string) {
	return path === prefix || path.startsWith(prefix + '.')
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
			return expr.items.map((item) => evaluate(item, host, scope))
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
			if (test === UNKNOWN) {
				const a = evaluate(expr.then, host, scope)
				const b = evaluate(expr.else, host, scope)
				return a === b && typeof a !== 'object' ? a : UNKNOWN
			}
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
			if (paths.some((p) => typeof p !== 'string')) return ERROR
			if (expr.fn === 'changed') {
				return (paths as string[]).some((p) => !deepEqual(getPath(prev, p), getPath(next, p)))
			}
			return changedPaths(prev, next).every((c) => (paths as string[]).some((p) => isUnder(c, p)))
		}
		case 'exists': {
			const [v] = args()
			if (v === UNKNOWN) return UNKNOWN
			return !isNullish(v) && v !== ERROR
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
): { clause: string; result: 'false' | 'error' } {
	const result = evaluate(expr, host, scope)
	const describe = (): { clause: string; result: 'false' | 'error' } => ({
		clause: source.slice(expr.s[0], expr.s[1]),
		result: result === false ? 'false' : 'error',
	})
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
		return { clause: `${expr.name}: ${inner.clause}`, result: inner.result }
	}
	if (expr.k === 'cond') {
		const test = evaluate(expr.test, host, scope)
		if (test === true) return findFailingClause(expr.then, host, source, scope)
		if (test === false) return findFailingClause(expr.else, host, source, scope)
	}
	return describe()
}
