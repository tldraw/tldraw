import { BinaryOp, RULE_FUNCTIONS, Span, TLRuleExpr, TLRuleFunctionName } from './ast'

/** @public */
export class TLRuleSyntaxError extends Error {
	constructor(
		message: string,
		readonly source: string,
		readonly at: number
	) {
		super(`${message} at ${at} in \`${source}\``)
	}
}

type Token =
	| { t: 'num'; v: number; s: Span }
	| { t: 'str'; v: string; s: Span }
	| { t: 'name'; v: string; s: Span }
	| { t: 'op'; v: string; s: Span }
	| { t: 'end'; s: Span }

const OPERATORS = [
	'=>',
	'&&',
	'||',
	'==',
	'!=',
	'<=',
	'>=',
	'<',
	'>',
	'!',
	'+',
	'-',
	'(',
	')',
	'[',
	']',
	',',
	'.',
	'?',
	':',
]

function tokenize(src: string): Token[] {
	const tokens: Token[] = []
	let i = 0
	while (i < src.length) {
		const c = src[i]
		if (/\s/.test(c)) {
			i++
			continue
		}
		if (/[0-9]/.test(c)) {
			const m = /^[0-9]+(\.[0-9]+)?/.exec(src.slice(i))!
			tokens.push({ t: 'num', v: Number(m[0]), s: [i, i + m[0].length] })
			i += m[0].length
			continue
		}
		if (c === "'" || c === '"') {
			let j = i + 1
			let v = ''
			while (j < src.length && src[j] !== c) {
				if (src[j] === '\\' && j + 1 < src.length) {
					v += src[j + 1]
					j += 2
				} else {
					v += src[j++]
				}
			}
			if (j >= src.length) throw new TLRuleSyntaxError('Unterminated string', src, i)
			tokens.push({ t: 'str', v, s: [i, j + 1] })
			i = j + 1
			continue
		}
		if (/[A-Za-z_$]/.test(c)) {
			const m = /^[A-Za-z_$][A-Za-z0-9_$]*/.exec(src.slice(i))!
			tokens.push({ t: 'name', v: m[0], s: [i, i + m[0].length] })
			i += m[0].length
			continue
		}
		const op = OPERATORS.find((o) => src.startsWith(o, i))
		if (!op) throw new TLRuleSyntaxError(`Unexpected character '${c}'`, src, i)
		tokens.push({ t: 'op', v: op, s: [i, i + op.length] })
		i += op.length
	}
	tokens.push({ t: 'end', s: [src.length, src.length] })
	return tokens
}

const BINARY_PRECEDENCE: Record<string, number> = {
	'||': 1,
	'&&': 2,
	'==': 3,
	'!=': 3,
	'<': 4,
	'<=': 4,
	'>': 4,
	'>=': 4,
	in: 4,
	'+': 5,
	'-': 5,
}

/**
 * Parse one rule expression. The grammar is a small, side-effect-free subset of JavaScript
 * expression syntax: literals, lists, `.` and `[]` access, `! - + == != < <= > >= && || in ?:`,
 * calls to the fixed function set in {@link RULE_FUNCTIONS}, and `list.some(x => …)` /
 * `list.every(x => …)`. There are no assignments, loops, or user-defined functions.
 *
 * @public
 */
export function parseRule(src: string): TLRuleExpr {
	const tokens = tokenize(src)
	let pos = 0
	const peek = () => tokens[pos]
	const next = () => tokens[pos++]
	const isOp = (v: string) => {
		const t = peek()
		return t.t === 'op' && t.v === v
	}
	const expectOp = (v: string) => {
		const t = next()
		if (t.t !== 'op' || t.v !== v) throw new TLRuleSyntaxError(`Expected '${v}'`, src, t.s[0])
		return t
	}

	function parseExpr(): TLRuleExpr {
		const test = parseBinary(1)
		if (isOp('?')) {
			next()
			const then = parseExpr()
			expectOp(':')
			const otherwise = parseExpr()
			return { k: 'cond', test, then, else: otherwise, s: [test.s[0], otherwise.s[1]] }
		}
		return test
	}

	function parseBinary(minPrec: number): TLRuleExpr {
		let left = parseUnary()
		for (;;) {
			const t = peek()
			const op = t.t === 'op' || (t.t === 'name' && t.v === 'in') ? t.v : null
			const prec = op ? BINARY_PRECEDENCE[op] : undefined
			if (!op || prec === undefined || prec < minPrec) return left
			next()
			const right = parseBinary(prec + 1)
			const s: Span = [left.s[0], right.s[1]]
			left =
				op === '&&' || op === '||'
					? { k: 'logical', op, left, right, s }
					: { k: 'binary', op: op as BinaryOp, left, right, s }
		}
	}

	function parseUnary(): TLRuleExpr {
		const t = peek()
		if (t.t === 'op' && (t.v === '!' || t.v === '-')) {
			next()
			const arg = parseUnary()
			return { k: 'unary', op: t.v, arg, s: [t.s[0], arg.s[1]] }
		}
		return parsePostfix(parsePrimary())
	}

	function parsePostfix(expr: TLRuleExpr): TLRuleExpr {
		for (;;) {
			if (isOp('.')) {
				next()
				const name = next()
				if (name.t !== 'name') throw new TLRuleSyntaxError('Expected a name', src, name.s[0])
				if ((name.v === 'some' || name.v === 'every') && isOp('(')) {
					next()
					const param = next()
					if (param.t !== 'name') {
						throw new TLRuleSyntaxError('Expected `x => …`', src, param.s[0])
					}
					expectOp('=>')
					const body = parseExpr()
					const end = expectOp(')')
					expr = {
						k: 'quant',
						q: name.v,
						list: expr,
						param: param.v,
						body,
						s: [expr.s[0], end.s[1]],
					}
					continue
				}
				expr = { k: 'member', obj: expr, prop: name.v, s: [expr.s[0], name.s[1]] }
				continue
			}
			if (isOp('[')) {
				next()
				const index = parseExpr()
				const end = expectOp(']')
				expr = { k: 'index', obj: expr, index, s: [expr.s[0], end.s[1]] }
				continue
			}
			return expr
		}
	}

	function parseList(close: string): TLRuleExpr[] {
		const items: TLRuleExpr[] = []
		if (isOp(close)) return items
		for (;;) {
			items.push(parseExpr())
			if (isOp(',')) {
				next()
				continue
			}
			return items
		}
	}

	function parsePrimary(): TLRuleExpr {
		const t = next()
		switch (t.t) {
			case 'num':
			case 'str':
				return { k: 'lit', v: t.v, s: t.s }
			case 'name': {
				if (t.v === 'true' || t.v === 'false') return { k: 'lit', v: t.v === 'true', s: t.s }
				if (t.v === 'null') return { k: 'lit', v: null, s: t.s }
				if (isOp('(')) {
					if (!(t.v in RULE_FUNCTIONS)) {
						throw new TLRuleSyntaxError(`Unknown function '${t.v}'`, src, t.s[0])
					}
					next()
					const args = parseList(')')
					const end = expectOp(')')
					const arity = RULE_FUNCTIONS[t.v as TLRuleFunctionName]
					if (arity >= 0 && args.length !== arity) {
						throw new TLRuleSyntaxError(
							`'${t.v}' takes ${arity} argument${arity === 1 ? '' : 's'}`,
							src,
							t.s[0]
						)
					}
					return { k: 'call', fn: t.v as TLRuleFunctionName, args, s: [t.s[0], end.s[1]] }
				}
				return { k: 'ident', name: t.v, s: t.s }
			}
			case 'op': {
				if (t.v === '(') {
					const inner = parseExpr()
					const end = expectOp(')')
					return { ...inner, s: [t.s[0], end.s[1]] }
				}
				if (t.v === '[') {
					const items = parseList(']')
					const end = expectOp(']')
					return { k: 'list', items, s: [t.s[0], end.s[1]] }
				}
				throw new TLRuleSyntaxError(`Unexpected '${t.v}'`, src, t.s[0])
			}
			case 'end':
				throw new TLRuleSyntaxError('Unexpected end of rule', src, t.s[0])
		}
	}

	const expr = parseExpr()
	const end = peek()
	if (end.t !== 'end') throw new TLRuleSyntaxError('Unexpected token', src, end.s[0])
	return expr
}
