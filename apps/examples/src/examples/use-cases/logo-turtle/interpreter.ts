import { radians, type TurtleWorld } from './turtle-world'

// A small Logo interpreter in the style of https://www.calormen.com/jslogo/. Programs are
// split into tokens up front, but parsed while they run: how many inputs a word takes depends on which
// procedures exist at the moment it is called, so there is no separate AST.

export type LogoValue = number | string | LogoValue[]

export class LogoError extends Error {
	procedure?: string
}

// Thrown to unwind the JS stack; caught by the procedure call (or the top level) that owns them
class StopSignal {}
class OutputSignal {
	constructor(public value: LogoValue) {}
}
export class HaltSignal {}

interface Procedure {
	minArgs: number
	defaultArgs: number
	maxArgs: number
	fn(args: LogoValue[]): Promise<LogoValue | undefined | void> | LogoValue | undefined | void
}

interface ProcedureDefinition {
	name: string
	required: string[]
	optional: { name: string; defaultValue: LogoValue[] }[]
	rest: string | null
	body: LogoValue[]
}

const DELIMITERS = ' \t\r\n[]()'
const INFIX = ['+', '-', '*', '/', '=', '<', '>', '<=', '>=', '<>']
const NUMBER_RE = /^-?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i

function isNumeric(token: LogoValue): boolean {
	return typeof token === 'number' || (typeof token === 'string' && NUMBER_RE.test(token))
}

function isInfix(token: LogoValue | undefined): boolean {
	return typeof token === 'string' && INFIX.includes(token)
}

// Can't come from source text, because whitespace always splits words
const UNARY_MINUS = ' -'

// Lists are data, so words inside them stay whole (`print [a-b]` prints `a-b`). Operators are
// only split out by `toCode`, when a list is run as instructions.
function readWords(source: string): LogoValue[] {
	const root: LogoValue[] = []
	const stack: LogoValue[][] = [root]
	const top = () => stack[stack.length - 1]
	let i = 0

	while (i < source.length) {
		const ch = source[i]
		if (ch === ';') {
			while (i < source.length && source[i] !== '\n') i++
		} else if (ch === '~' && source[i + 1] === '\n') {
			i += 2
		} else if (/\s/.test(ch)) {
			i++
		} else if (ch === '[') {
			const list: LogoValue[] = []
			top().push(list)
			stack.push(list)
			i++
		} else if (ch === ']') {
			if (stack.length === 1) throw new LogoError("Unexpected ']'")
			stack.pop()
			i++
		} else if (ch === '(' || ch === ')') {
			top().push(ch)
			i++
		} else {
			let j = i
			while (j < source.length && !DELIMITERS.includes(source[j])) j++
			top().push(source.slice(i, j))
			i = j
		}
	}

	if (stack.length > 1) throw new LogoError("Missing ']'")
	return root
}

// [1]
function toCode(words: LogoValue[]): LogoValue[] {
	const code: LogoValue[] = []
	for (const word of words) {
		if (typeof word !== 'string' || word.startsWith('"')) {
			code.push(word)
			continue
		}
		let i = 0
		while (i < word.length) {
			const ch = word[i]
			if ((ch === '<' || ch === '>') && (word[i + 1] === '=' || word.slice(i, i + 2) === '<>')) {
				code.push(word.slice(i, i + 2))
				i += 2
			} else if (ch === '-') {
				const prev = code[code.length - 1]
				const isUnary =
					prev === undefined ||
					prev === '(' ||
					prev === UNARY_MINUS ||
					isInfix(prev) ||
					(i === 0 && word.length > 1)
				code.push(isUnary ? UNARY_MINUS : '-')
				i++
			} else if ('+*/=<>'.includes(ch)) {
				code.push(ch)
				i++
			} else {
				let j = i
				while (j < word.length && !'+-*/=<>'.includes(word[j])) j++
				code.push(word.slice(i, j))
				i = j
			}
		}
	}
	return code
}

const isKeyword = (word: LogoValue | undefined, keyword: string) =>
	typeof word === 'string' && word.toLowerCase() === keyword

// Definitions are pulled out before anything runs, so a procedure can be called above its `to`
function parseProgram(source: string) {
	const words = readWords(source)
	const definitions: ProcedureDefinition[] = []
	const main: LogoValue[] = []

	for (let i = 0; i < words.length; i++) {
		if (!isKeyword(words[i], 'to')) {
			main.push(words[i])
			continue
		}

		const name = words[++i]
		if (typeof name !== 'string' || !name) throw new LogoError('to needs a procedure name')
		const definition: ProcedureDefinition = {
			name: name.toLowerCase(),
			required: [],
			optional: [],
			rest: null,
			body: [],
		}

		// Inputs run until the first word that isn't `:name` or `[:name default]`
		for (i++; i < words.length; i++) {
			const input = words[i]
			if (typeof input === 'string' && input.startsWith(':')) {
				definition.required.push(input.slice(1).toLowerCase())
			} else if (Array.isArray(input) && typeof input[0] === 'string' && input[0].startsWith(':')) {
				const inputName = input[0].slice(1).toLowerCase()
				if (input.length === 1) definition.rest = inputName
				else definition.optional.push({ name: inputName, defaultValue: toCode(input.slice(1)) })
			} else {
				break
			}
		}

		const body: LogoValue[] = []
		for (; i < words.length && !isKeyword(words[i], 'end'); i++) body.push(words[i])
		if (i >= words.length) throw new LogoError(`Missing "end" for ${definition.name}`)
		definition.body = toCode(body)
		definitions.push(definition)
	}

	return { definitions, body: toCode(main) }
}

class Cursor {
	i = 0
	constructor(public tokens: LogoValue[]) {}
	peek() {
		return this.tokens[this.i]
	}
	next() {
		return this.tokens[this.i++]
	}
	done() {
		return this.i >= this.tokens.length
	}
}

function formatNumber(n: number) {
	return String(Math.round(n * 1e10) / 1e10)
}

function formatValue(value: LogoValue, { brackets = false } = {}): string {
	if (typeof value === 'number') return formatNumber(value)
	if (typeof value === 'string') return value
	const inner = value.map((v) => formatValue(v, { brackets: true })).join(' ')
	return brackets ? `[${inner}]` : inner
}

function toNumber(value: LogoValue | undefined, procedure: string): number {
	if (typeof value === 'number') return value
	if (typeof value === 'string' && NUMBER_RE.test(value)) return Number(value)
	throw new LogoError(
		`${procedure} doesn't like ${value === undefined ? 'nothing' : formatValue(value, { brackets: true })} as input`
	)
}

function toList(value: LogoValue, procedure: string): LogoValue[] {
	if (Array.isArray(value)) return value
	throw new LogoError(`${procedure} doesn't like ${formatValue(value)} as input`)
}

function toBool(value: LogoValue, procedure: string): boolean {
	if (typeof value === 'string') {
		const lower = value.toLowerCase()
		if (lower === 'true') return true
		if (lower === 'false') return false
	}
	if (typeof value === 'number') return value !== 0
	throw new LogoError(
		`${procedure} doesn't like ${formatValue(value, { brackets: true })} as input`
	)
}

const bool = (b: boolean) => (b ? 'true' : 'false')

function equal(a: LogoValue, b: LogoValue): boolean {
	if (isNumeric(a) && isNumeric(b)) return Number(a) === Number(b)
	if (Array.isArray(a) || Array.isArray(b)) {
		return (
			Array.isArray(a) &&
			Array.isArray(b) &&
			a.length === b.length &&
			a.every((v, i) => equal(v, b[i]))
		)
	}
	return String(a).toLowerCase() === String(b).toLowerCase()
}

const asWord = (value: LogoValue) => formatValue(value)
const items = (value: LogoValue) => (Array.isArray(value) ? value : asWord(value).split(''))

export class LogoInterpreter {
	private procedures = new Map<string, Procedure>()
	private scopes: Map<string, LogoValue>[] = [new Map()]
	private repcounts: number[] = []
	private templateValues: LogoValue[] = []
	private callCount = 0
	private pendingText = ''

	constructor(
		private world: TurtleWorld,
		private print: (line: string) => void
	) {
		this.definePrimitives()
	}

	async run(source: string) {
		this.callCount = 0
		const { definitions, body } = parseProgram(source)
		for (const definition of definitions) this.defineProcedure(definition)
		try {
			const value = await this.runTokens(body)
			if (value !== undefined) throw this.unusedValue(value)
		} catch (e) {
			if (e instanceof StopSignal) return
			if (e instanceof OutputSignal) throw new LogoError('output can only be used in a procedure')
			throw e
		} finally {
			this.flushText()
		}
	}

	private flushText() {
		if (this.pendingText) this.print(this.pendingText)
		this.pendingText = ''
	}

	private unusedValue(value: LogoValue) {
		return new LogoError(`You don't say what to do with ${formatValue(value, { brackets: true })}`)
	}

	private async runTokens(tokens: LogoValue[]): Promise<LogoValue | undefined> {
		const cursor = new Cursor(tokens)
		let last: LogoValue | undefined
		while (!cursor.done()) {
			if (last !== undefined) throw this.unusedValue(last)
			last = await this.expression(cursor)
		}
		return last
	}

	// Loops run the same list many times, so keep its split-out tokens
	private compiledLists = new WeakMap<LogoValue[], LogoValue[]>()

	private runList(value: LogoValue, procedure: string) {
		const list = toList(value, procedure)
		let code = this.compiledLists.get(list)
		if (!code) {
			code = toCode(list)
			this.compiledLists.set(list, code)
		}
		return this.runTokens(code)
	}

	// [2]
	private async expression(c: Cursor): Promise<LogoValue | undefined> {
		let left = await this.additive(c)
		while (['=', '<', '>', '<=', '>=', '<>'].includes(c.peek() as string)) {
			const op = c.next() as string
			const right = await this.additive(c)
			if (left === undefined || right === undefined)
				throw new LogoError(`Not enough inputs to ${op}`)
			if (op === '=') left = bool(equal(left, right))
			else if (op === '<>') left = bool(!equal(left, right))
			else {
				const a = toNumber(left, op)
				const b = toNumber(right, op)
				left = bool(op === '<' ? a < b : op === '>' ? a > b : op === '<=' ? a <= b : a >= b)
			}
		}
		return left
	}

	private async additive(c: Cursor): Promise<LogoValue | undefined> {
		let left = await this.multiplicative(c)
		while (c.peek() === '+' || c.peek() === '-') {
			const op = c.next() as string
			const right = await this.multiplicative(c)
			const a = toNumber(left, op)
			const b = toNumber(right, op)
			left = op === '+' ? a + b : a - b
		}
		return left
	}

	private async multiplicative(c: Cursor): Promise<LogoValue | undefined> {
		let left = await this.primary(c)
		while (c.peek() === '*' || c.peek() === '/') {
			const op = c.next() as string
			const right = await this.primary(c)
			const a = toNumber(left, op)
			const b = toNumber(right, op)
			if (op === '/' && b === 0) throw new LogoError("/ doesn't like 0 as input")
			left = op === '*' ? a * b : a / b
		}
		return left
	}

	private async primary(c: Cursor): Promise<LogoValue | undefined> {
		const token = c.next()
		if (token === undefined) throw new LogoError('Unexpected end of instructions')
		if (typeof token === 'number' || Array.isArray(token)) return token
		if (isNumeric(token)) return Number(token)
		if (token.startsWith('"')) return token.slice(1)
		if (token.startsWith(':')) return this.getVariable(token.slice(1))
		if (token === UNARY_MINUS) return -toNumber(await this.primary(c), '-')
		if (token === ')' || isInfix(token)) throw new LogoError(`Unexpected ${token}`)

		if (token === '(') {
			const next = c.peek()
			// `(name a b c)` calls a procedure with a non-default number of inputs
			if (
				typeof next === 'string' &&
				!isNumeric(next) &&
				!isInfix(next) &&
				!'"(:)'.includes(next[0]) &&
				this.procedures.has(next.toLowerCase())
			) {
				const name = (c.next() as string).toLowerCase()
				const args: LogoValue[] = []
				while (c.peek() !== ')') {
					if (c.done()) throw new LogoError("Expected ')'")
					args.push(await this.input(c, name))
				}
				c.next()
				return this.call(name, args)
			}
			const value = await this.expression(c)
			if (c.next() !== ')') throw new LogoError("Expected ')'")
			return value
		}

		const name = token.toLowerCase()
		const procedure = this.getProcedure(name)
		const args: LogoValue[] = []
		for (let i = 0; i < procedure.defaultArgs; i++) {
			if (c.done() || c.peek() === ')') throw new LogoError(`Not enough inputs to ${name}`)
			args.push(await this.input(c, name))
		}
		return this.call(name, args)
	}

	private async input(c: Cursor, procedure: string): Promise<LogoValue> {
		const value = await this.expression(c)
		if (value === undefined) throw new LogoError(`Not enough inputs to ${procedure}`)
		return value
	}

	private getProcedure(name: string) {
		const procedure = this.procedures.get(name)
		if (!procedure) throw new LogoError(`I don't know how to ${name}`)
		return procedure
	}

	private async call(name: string, args: LogoValue[]) {
		const procedure = this.getProcedure(name)
		if (args.length < procedure.minArgs) throw new LogoError(`Not enough inputs to ${name}`)
		if (args.length > procedure.maxArgs) throw new LogoError(`Too many inputs to ${name}`)
		if (this.world.isHalted) throw new HaltSignal()
		// [3]
		if (++this.callCount % 256 === 0) await this.world.yieldIfNeeded()
		return (await procedure.fn(args)) as LogoValue | undefined
	}

	private getVariable(rawName: string): LogoValue {
		const name = rawName.toLowerCase()
		for (let i = this.scopes.length - 1; i >= 0; i--) {
			const value = this.scopes[i].get(name)
			if (value !== undefined) return value
		}
		throw new LogoError(`${rawName} has no value`)
	}

	private setVariable(rawName: string, value: LogoValue) {
		const name = rawName.toLowerCase()
		for (let i = this.scopes.length - 1; i > 0; i--) {
			if (this.scopes[i].has(name)) {
				this.scopes[i].set(name, value)
				return
			}
		}
		this.scopes[0].set(name, value)
	}

	private defineProcedure(definition: ProcedureDefinition) {
		const { required, optional, rest, body } = definition
		this.procedures.set(definition.name, {
			minArgs: required.length,
			defaultArgs: required.length,
			maxArgs: rest ? Infinity : required.length + optional.length,
			fn: async (args) => {
				const frame = new Map<string, LogoValue>()
				this.scopes.push(frame)
				try {
					required.forEach((name, i) => frame.set(name, args[i]))
					for (let i = 0; i < optional.length; i++) {
						const index = required.length + i
						const value =
							index < args.length ? args[index] : await this.runTokens(optional[i].defaultValue)
						frame.set(optional[i].name, value ?? [])
					}
					if (rest) frame.set(rest, args.slice(required.length + optional.length))
					const value = await this.runTokens(body)
					if (value !== undefined) throw this.unusedValue(value)
					return undefined
				} catch (e) {
					if (e instanceof OutputSignal) return e.value
					if (e instanceof StopSignal) return undefined
					if (e instanceof LogoError && !e.procedure) e.procedure = definition.name
					throw e
				} finally {
					this.scopes.pop()
				}
			},
		})
	}

	private define(
		names: string,
		arity: number | [min: number, defaultArgs: number, max: number],
		fn: Procedure['fn']
	) {
		const [minArgs, defaultArgs, maxArgs] =
			typeof arity === 'number' ? [arity, arity, arity] : arity
		for (const name of names.split(' ')) {
			this.procedures.set(name, { minArgs, defaultArgs, maxArgs, fn })
		}
	}

	private definePrimitives() {
		const world = this.world
		const num = toNumber

		// Turtle motion
		this.define('forward fd', 1, ([n]) => world.forward(num(n, 'forward')))
		this.define('back bk', 1, ([n]) => world.forward(-num(n, 'back')))
		this.define('left lt', 1, ([n]) => world.turn(-num(n, 'left')))
		this.define('right rt', 1, ([n]) => world.turn(num(n, 'right')))
		this.define('home', 0, () => world.home())
		this.define('setxy', 2, ([x, y]) => world.moveTo(num(x, 'setxy'), num(y, 'setxy')))
		this.define('setpos', 1, ([p]) => {
			const [x, y] = toList(p, 'setpos')
			return world.moveTo(num(x, 'setpos'), num(y, 'setpos'))
		})
		this.define('setx', 1, ([x]) => world.moveTo(num(x, 'setx'), world.turtle.y))
		this.define('sety', 1, ([y]) => world.moveTo(world.turtle.x, num(y, 'sety')))
		this.define('setheading seth', 1, ([h]) => world.setHeading(num(h, 'setheading')))
		this.define('arc', 2, ([angle, radius]) => world.arc(num(angle, 'arc'), num(radius, 'arc')))
		this.define('pos', 0, () => [world.turtle.x, world.turtle.y])
		this.define('xcor', 0, () => world.turtle.x)
		this.define('ycor', 0, () => world.turtle.y)
		this.define('heading', 0, () => world.turtle.heading)
		this.define('towards', 1, ([p]) => {
			const [x, y] = toList(p, 'towards')
			const dx = num(x, 'towards') - world.turtle.x
			const dy = num(y, 'towards') - world.turtle.y
			return ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360
		})

		// Pen and screen
		this.define('penup pu', 0, () => world.setPenDown(false))
		this.define('pendown pd', 0, () => world.setPenDown(true))
		this.define('pendownp pendown?', 0, () => bool(world.turtle.penDown))
		this.define('setpencolor setpc setcolor', 1, ([c]) => world.setColor(c))
		this.define('pencolor pc', 0, () => world.turtle.color)
		this.define('setpensize setwidth setpw', 1, ([w]) =>
			world.setPenSize(num(Array.isArray(w) ? w[0] : w, 'setpensize'))
		)
		this.define('clearscreen cs', 0, () => world.clearScreen())
		this.define('clean', 0, () => world.clean())
		this.define('hideturtle ht', 0, () => world.setVisible(false))
		this.define('showturtle st', 0, () => world.setVisible(true))
		this.define('shownp shown?', 0, () => bool(world.turtle.visible))
		this.define('label', 1, ([text]) => world.label(formatValue(text)))
		this.define('setlabelheight', 1, ([h]) => {
			world.labelHeight = num(h, 'setlabelheight')
		})
		this.define('labelheight', 0, () => world.labelHeight)
		this.define('setturtle', 1, ([n]) => world.setTurtle(num(n, 'setturtle')))
		this.define('turtle', 0, () => world.currentTurtle)
		// The canvas is infinite, so every turtle mode behaves like `window`
		this.define('window wrap fence', 0, () => undefined)

		// Control
		this.define('repeat', 2, async ([n, list]) => {
			const count = num(n, 'repeat')
			for (let i = 1; i <= count; i++) {
				this.repcounts.push(i)
				try {
					await this.runList(list, 'repeat')
				} finally {
					this.repcounts.pop()
				}
			}
		})
		this.define('forever', 1, async ([list]) => {
			for (let i = 1; ; i++) {
				this.repcounts.push(i)
				try {
					await this.runList(list, 'forever')
				} finally {
					this.repcounts.pop()
				}
				await world.yieldIfNeeded()
			}
		})
		this.define('repcount #', 0, () => this.repcounts[this.repcounts.length - 1] ?? -1)
		this.define('if', [2, 2, 3], ([cond, then, otherwise]) => {
			if (toBool(cond, 'if')) return this.runList(then, 'if')
			if (otherwise !== undefined) return this.runList(otherwise, 'if')
			return undefined
		})
		this.define('ifelse', 3, ([cond, then, otherwise]) =>
			this.runList(toBool(cond, 'ifelse') ? then : otherwise, 'ifelse')
		)
		this.define('while', 2, async ([cond, body]) => {
			while (toBool((await this.runList(cond, 'while')) ?? 'false', 'while')) {
				await this.runList(body, 'while')
			}
		})
		this.define('until', 2, async ([cond, body]) => {
			while (!toBool((await this.runList(cond, 'until')) ?? 'false', 'until')) {
				await this.runList(body, 'until')
			}
		})
		this.define('for', 2, async ([control, body]) => {
			const [varName, ...rest] = toList(control, 'for')
			const c = new Cursor(toCode(rest))
			const start = num(await this.expression(c), 'for')
			const end = num(await this.expression(c), 'for')
			const step = c.done() ? (end >= start ? 1 : -1) : num(await this.expression(c), 'for')
			if (step === 0) throw new LogoError("for doesn't like 0 as a step")
			const frame = new Map<string, LogoValue>()
			this.scopes.push(frame)
			try {
				for (let i = start; step > 0 ? i <= end : i >= end; i += step) {
					frame.set(String(varName).toLowerCase(), i)
					await this.runList(body, 'for')
				}
			} finally {
				this.scopes.pop()
			}
		})
		this.define('foreach', 2, async ([data, template]) => {
			const values = items(data)
			for (let i = 0; i < values.length; i++) {
				this.templateValues.push(values[i])
				this.repcounts.push(i + 1)
				try {
					await this.runList(template, 'foreach')
				} finally {
					this.templateValues.pop()
					this.repcounts.pop()
				}
			}
		})
		this.define('?', 0, () => {
			const value = this.templateValues[this.templateValues.length - 1]
			if (value === undefined) throw new LogoError('? can only be used in a template')
			return value
		})
		this.define('run', 1, ([list]) =>
			Array.isArray(list)
				? this.runList(list, 'run')
				: this.runTokens(toCode(readWords(asWord(list))))
		)
		this.define('stop', 0, () => {
			throw new StopSignal()
		})
		this.define('output op', 1, ([value]) => {
			throw new OutputSignal(value)
		})
		this.define('wait', 1, ([n]) => world.wait((num(n, 'wait') / 60) * 1000))

		// Variables
		this.define('make', 2, ([name, value]) => this.setVariable(asWord(name), value))
		this.define('localmake', 2, ([name, value]) => {
			this.scopes[this.scopes.length - 1].set(asWord(name).toLowerCase(), value)
		})
		this.define('local', [1, 1, Infinity], (names) => {
			for (const name of names.flat())
				this.scopes[this.scopes.length - 1].set(asWord(name).toLowerCase(), [])
		})
		this.define('thing', 1, ([name]) => this.getVariable(asWord(name)))
		this.define('namep name?', 1, ([name]) => {
			const key = asWord(name).toLowerCase()
			return bool(this.scopes.some((scope) => scope.has(key)))
		})

		// Output
		this.define('print pr', [0, 1, Infinity], (values) => {
			this.pendingText += values.map((v) => formatValue(v)).join(' ')
			this.flushText()
		})
		this.define('show', [0, 1, Infinity], (values) => {
			this.pendingText += values.map((v) => formatValue(v, { brackets: true })).join(' ')
			this.flushText()
		})
		this.define('type', [0, 1, Infinity], (values) => {
			this.pendingText += values.map((v) => formatValue(v)).join('')
		})

		// Math
		const nums = (values: LogoValue[], name: string) => values.map((v) => num(v, name))
		this.define('sum', [0, 2, Infinity], (v) => nums(v, 'sum').reduce((a, b) => a + b, 0))
		this.define('product', [0, 2, Infinity], (v) => nums(v, 'product').reduce((a, b) => a * b, 1))
		this.define('difference', 2, ([a, b]) => num(a, 'difference') - num(b, 'difference'))
		this.define('quotient', [1, 2, 2], (v) => {
			const [a, b] = nums(v, 'quotient')
			return v.length === 1 ? 1 / a : a / b
		})
		this.define('remainder', 2, ([a, b]) => num(a, 'remainder') % num(b, 'remainder'))
		this.define('modulo', 2, ([a, b]) => {
			const m = num(b, 'modulo')
			return ((num(a, 'modulo') % m) + m) % m
		})
		this.define('minus', 1, ([a]) => -num(a, 'minus'))
		this.define('abs', 1, ([a]) => Math.abs(num(a, 'abs')))
		this.define('int', 1, ([a]) => Math.trunc(num(a, 'int')))
		this.define('round', 1, ([a]) => Math.round(num(a, 'round')))
		this.define('sqrt', 1, ([a]) => Math.sqrt(num(a, 'sqrt')))
		this.define('power', 2, ([a, b]) => Math.pow(num(a, 'power'), num(b, 'power')))
		this.define('exp', 1, ([a]) => Math.exp(num(a, 'exp')))
		this.define('ln', 1, ([a]) => Math.log(num(a, 'ln')))
		this.define('log10', 1, ([a]) => Math.log10(num(a, 'log10')))
		this.define('sin', 1, ([a]) => Math.sin(radians(num(a, 'sin'))))
		this.define('cos', 1, ([a]) => Math.cos(radians(num(a, 'cos'))))
		this.define('tan', 1, ([a]) => Math.tan(radians(num(a, 'tan'))))
		this.define('arctan', [1, 1, 2], (v) => {
			const [a, b] = nums(v, 'arctan')
			return ((v.length === 1 ? Math.atan(a) : Math.atan2(b, a)) * 180) / Math.PI
		})
		this.define('pi', 0, () => Math.PI)
		this.define('random', [1, 1, 2], (v) => {
			const [a, b] = nums(v, 'random')
			if (v.length === 2) return a + Math.floor(Math.random() * (b - a + 1))
			return Math.floor(Math.random() * a)
		})
		this.define('pick', 1, ([list]) => {
			const values = items(list)
			if (!values.length) throw new LogoError("pick doesn't like an empty list as input")
			return values[Math.floor(Math.random() * values.length)]
		})

		// Predicates and logic
		this.define('equalp equal?', 2, ([a, b]) => bool(equal(a, b)))
		this.define('notequalp notequal?', 2, ([a, b]) => bool(!equal(a, b)))
		this.define('lessp less?', 2, ([a, b]) => bool(num(a, 'lessp') < num(b, 'lessp')))
		this.define('greaterp greater?', 2, ([a, b]) => bool(num(a, 'greaterp') > num(b, 'greaterp')))
		this.define('numberp number?', 1, ([a]) => bool(isNumeric(a)))
		this.define('wordp word?', 1, ([a]) => bool(!Array.isArray(a)))
		this.define('listp list?', 1, ([a]) => bool(Array.isArray(a)))
		this.define('emptyp empty?', 1, ([a]) => bool(a === '' || (Array.isArray(a) && a.length === 0)))
		this.define('memberp member?', 2, ([a, b]) =>
			bool(Array.isArray(b) ? b.some((v) => equal(v, a)) : asWord(b).includes(asWord(a)))
		)
		this.define('not', 1, ([a]) => bool(!toBool(a, 'not')))
		this.define('and', [0, 2, Infinity], (v) => bool(v.every((a) => toBool(a, 'and'))))
		this.define('or', [0, 2, Infinity], (v) => bool(v.some((a) => toBool(a, 'or'))))

		// Words and lists
		const empty = (value: LogoValue, name: string) => {
			if (items(value).length === 0) throw new LogoError(`${name} doesn't like an empty input`)
		}
		this.define('first', 1, ([a]) => (empty(a, 'first'), items(a)[0]))
		this.define('last', 1, ([a]) => (empty(a, 'last'), items(a)[items(a).length - 1]))
		this.define('butfirst bf', 1, ([a]) => {
			empty(a, 'butfirst')
			return Array.isArray(a) ? a.slice(1) : asWord(a).slice(1)
		})
		this.define('butlast bl', 1, ([a]) => {
			empty(a, 'butlast')
			return Array.isArray(a) ? a.slice(0, -1) : asWord(a).slice(0, -1)
		})
		this.define('item', 2, ([i, a]) => {
			const value = items(a)[num(i, 'item') - 1]
			if (value === undefined) throw new LogoError(`item doesn't like ${formatValue(i)} as input`)
			return value
		})
		this.define('count', 1, ([a]) => items(a).length)
		this.define('reverse', 1, ([a]) =>
			Array.isArray(a) ? [...a].reverse() : asWord(a).split('').reverse().join('')
		)
		this.define('word', [0, 2, Infinity], (v) => v.map((a) => formatValue(a)).join(''))
		this.define('list', [0, 2, Infinity], (v) => v)
		this.define('sentence se', [0, 2, Infinity], (v) =>
			v.flatMap((a) => (Array.isArray(a) ? a : [a]))
		)
		this.define('fput', 2, ([a, b]) => [a, ...toList(b, 'fput')])
		this.define('lput', 2, ([a, b]) => [...toList(b, 'lput'), a])
		this.define('uppercase', 1, ([a]) => asWord(a).toUpperCase())
		this.define('lowercase', 1, ([a]) => asWord(a).toLowerCase())
	}
}

/*
[1]
Logo's minus sign is ambiguous. `:a - 1` and `:a-1` subtract, but `fd -5` and `:a * -1` negate.
Like UCB Logo, a minus that follows an infix operator or open paren, or that starts a word
(space before, none after), is unary. Unary minus binds tighter than any infix operator, so
`-:x - 1` is `(-:x) - 1`.

[2]
Infix operators bind tighter than procedure inputs, so `fd :size / 3` is `fd (:size / 3)`. The
precedence from loosest to tightest is: comparisons, then + and -, then * and /.

[3]
Every call is awaited, so a long computation that never moves the turtle (or `forever` with no
motion) still gives the browser a chance to paint and to handle the stop button.
*/
