import {
	Editor,
	TLTableCellKind,
	TLTableCellKindProps,
	TLTableCellShape,
	TLTableShape,
	TableCellShapeUtil,
	Tldraw,
	createShapeId,
	getCellText,
	getTableLayout,
	renderPlaintextFromRichText,
	textCellKind,
	toRichText,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'

// A formula cell kind. The cell's rich text holds a formula like "=B2+C2"; the
// kind's Component reads the referenced cells (reactively, so it recomputes when
// they change) and displays the result. Double-click a formula cell to edit the
// raw formula. This shows that a cell kind can derive its content from the rest
// of the table — the basis for things like spreadsheets or roll-ups.

const formulaCellKind: TLTableCellKind = {
	type: 'formula',
	Component: (props: TLTableCellKindProps) => {
		const { editor, shape, table } = props

		// eslint-disable-next-line react-hooks/rules-of-hooks
		const isEditing = useValue('editing', () => editor.getEditingShapeId() === shape.id, [
			editor,
			shape.id,
		])
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const result = useValue(
			'formula-result',
			() => {
				// Read the cell from the store so this recomputes when its *own* formula
				// text changes, not only when a referenced cell does.
				const self = editor.getShape(shape.id) as TLTableCellShape | undefined
				if (!self) return null
				const text = renderPlaintextFromRichText(editor, self.props.richText)
				return text.startsWith('=') ? evalFormula(editor, table, text) : null
			},
			[editor, shape.id, table]
		)

		// While editing, or when the text isn't a formula, render the raw text so it
		// stays editable. Otherwise render the computed result *through* the text cell,
		// passing the result as its rich text — that way it picks up exactly the same
		// font, size, color and alignment as every other cell in the table.
		const TextComponent = textCellKind.Component
		if (isEditing || result === null) return <TextComponent {...props} />

		const display = { ...shape, props: { ...shape.props, richText: toRichText(result) } }
		return <TextComponent {...props} shape={display} />
	},
}

// --- A small spreadsheet formula engine ------------------------------------
// Supports numbers, cell refs (B2), ranges (B2:C3), the operators + - * / ^ and
// % (percent), comparisons (= <> < <= > >=), parentheses, unary minus, and a set
// of functions (SUM, AVERAGE, MIN, MAX, COUNT, IF, ROUND, …). Referenced formula
// cells are evaluated recursively. It's intentionally compact — the point is to
// show that a cell kind can derive its content from the rest of the table.

class FormulaError extends Error {}

type Tok =
	| { t: 'num'; v: number }
	| { t: 'ref'; v: string }
	| { t: 'range'; a: string; b: string }
	| { t: 'ident'; v: string }
	| { t: 'op'; v: string }
	| { t: 'lparen' }
	| { t: 'rparen' }
	| { t: 'comma' }

type Node =
	| { k: 'num'; v: number }
	| { k: 'ref'; v: string }
	| { k: 'range'; a: string; b: string }
	| { k: 'unary'; op: string; x: Node }
	| { k: 'post'; op: string; x: Node }
	| { k: 'bin'; op: string; l: Node; r: Node }
	| { k: 'call'; name: string; args: Node[] }

interface Ctx {
	editor: Editor
	table: TLTableShape
	depth: number
}

// Public entry point: evaluate "=…" and return the result (or an error code).
function evalFormula(editor: Editor, table: TLTableShape, formula: string): string {
	try {
		const node = parseFormula(formula.replace(/^\s*=/, ''))
		return formatNumber(evalNode(node, { editor, table, depth: 0 }))
	} catch (e) {
		return e instanceof FormulaError ? e.message : '#ERR'
	}
}

function formatNumber(n: number): string {
	if (!Number.isFinite(n)) return '#NUM!'
	// trim floating-point noise (0.1 + 0.2 → 0.3)
	return String(Math.round((n + Number.EPSILON) * 1e10) / 1e10)
}

function tokenize(src: string): Tok[] {
	const out: Tok[] = []
	const isWord = (c: string) => /[A-Za-z0-9]/.test(c)
	let i = 0
	while (i < src.length) {
		const c = src[i]
		if (c === ' ' || c === '\t') {
			i++
		} else if ((c >= '0' && c <= '9') || c === '.') {
			let j = i + 1
			while (j < src.length && ((src[j] >= '0' && src[j] <= '9') || src[j] === '.')) j++
			out.push({ t: 'num', v: parseFloat(src.slice(i, j)) })
			i = j
		} else if (/[A-Za-z]/.test(c)) {
			let j = i + 1
			while (j < src.length && isWord(src[j])) j++
			const word = src.slice(i, j)
			i = j
			if (/^[A-Za-z]+\d+$/.test(word)) {
				// a cell ref, possibly the start of a range (B2:C3)
				if (src[i] === ':') {
					let k = i + 1
					while (k < src.length && isWord(src[k])) k++
					const w2 = src.slice(i + 1, k)
					if (/^[A-Za-z]+\d+$/.test(w2)) {
						out.push({ t: 'range', a: word, b: w2 })
						i = k
						continue
					}
				}
				out.push({ t: 'ref', v: word })
			} else {
				out.push({ t: 'ident', v: word.toUpperCase() })
			}
		} else if (c === '<') {
			if (src[i + 1] === '=') {
				out.push({ t: 'op', v: '<=' })
				i += 2
			} else if (src[i + 1] === '>') {
				out.push({ t: 'op', v: '<>' })
				i += 2
			} else {
				out.push({ t: 'op', v: '<' })
				i++
			}
		} else if (c === '>') {
			if (src[i + 1] === '=') {
				out.push({ t: 'op', v: '>=' })
				i += 2
			} else {
				out.push({ t: 'op', v: '>' })
				i++
			}
		} else if (c === '(') {
			out.push({ t: 'lparen' })
			i++
		} else if (c === ')') {
			out.push({ t: 'rparen' })
			i++
		} else if (c === ',') {
			out.push({ t: 'comma' })
			i++
		} else if ('+-*/^%='.includes(c)) {
			out.push({ t: 'op', v: c })
			i++
		} else {
			throw new FormulaError('#ERR')
		}
	}
	return out
}

// Recursive-descent parser. Precedence low→high: comparison, +/-, */, unary,
// ^ (right-assoc), % (postfix), primary.
function parseFormula(src: string): Node {
	const toks = tokenize(src)
	let p = 0
	const isOp = (vs: string[]): boolean => {
		const t = toks[p]
		return !!t && t.t === 'op' && vs.includes(t.v)
	}
	const opVal = (): string => {
		const t = toks[p]
		return t && t.t === 'op' ? t.v : ''
	}
	const expect = (tt: Tok['t']): void => {
		const t = toks[p++]
		if (!t || t.t !== tt) throw new FormulaError('#ERR')
	}

	const parseExpr = (): Node => parseCompare()
	const parseCompare = (): Node => {
		let l = parseAdd()
		while (isOp(['=', '<>', '<', '<=', '>', '>='])) {
			const op = opVal()
			p++
			l = { k: 'bin', op, l, r: parseAdd() }
		}
		return l
	}
	const parseAdd = (): Node => {
		let l = parseMul()
		while (isOp(['+', '-'])) {
			const op = opVal()
			p++
			l = { k: 'bin', op, l, r: parseMul() }
		}
		return l
	}
	const parseMul = (): Node => {
		let l = parseUnary()
		while (isOp(['*', '/'])) {
			const op = opVal()
			p++
			l = { k: 'bin', op, l, r: parseUnary() }
		}
		return l
	}
	const parseUnary = (): Node => {
		if (isOp(['-', '+'])) {
			const op = opVal()
			p++
			return { k: 'unary', op, x: parseUnary() }
		}
		return parsePow()
	}
	const parsePow = (): Node => {
		const l = parsePostfix()
		if (isOp(['^'])) {
			p++
			return { k: 'bin', op: '^', l, r: parseUnary() }
		}
		return l
	}
	const parsePostfix = (): Node => {
		let x = parsePrimary()
		while (isOp(['%'])) {
			p++
			x = { k: 'post', op: '%', x }
		}
		return x
	}
	const parsePrimary = (): Node => {
		const t = toks[p]
		if (!t) throw new FormulaError('#ERR')
		if (t.t === 'num') {
			p++
			return { k: 'num', v: t.v }
		}
		if (t.t === 'range') {
			p++
			return { k: 'range', a: t.a, b: t.b }
		}
		if (t.t === 'ref') {
			p++
			return { k: 'ref', v: t.v }
		}
		if (t.t === 'lparen') {
			p++
			const e = parseExpr()
			expect('rparen')
			return e
		}
		if (t.t === 'ident') {
			p++
			if (t.v === 'TRUE') return { k: 'num', v: 1 }
			if (t.v === 'FALSE') return { k: 'num', v: 0 }
			expect('lparen')
			const args: Node[] = []
			const first = toks[p]
			if (first && first.t !== 'rparen') {
				args.push(parseExpr())
				let ct = toks[p]
				while (ct && ct.t === 'comma') {
					p++
					args.push(parseExpr())
					ct = toks[p]
				}
			}
			expect('rparen')
			return { k: 'call', name: t.v, args }
		}
		throw new FormulaError('#ERR')
	}

	const node = parseExpr()
	if (p !== toks.length) throw new FormulaError('#ERR')
	return node
}

function parseRef(ref: string): { row: number; col: number } {
	const m = /^([A-Za-z]+)(\d+)$/.exec(ref)
	if (!m) throw new FormulaError('#REF!')
	let col = 0
	for (const ch of m[1].toUpperCase()) col = col * 26 + (ch.charCodeAt(0) - 64)
	return { col: col - 1, row: parseInt(m[2], 10) - 1 }
}

// Read a single cell as a number. Empty cells are 0; formula cells recurse.
function cellNumber(ctx: Ctx, row: number, col: number): number {
	const { editor, table } = ctx
	if (col < 0 || col >= table.props.cols.length || row < 0 || row >= table.props.rows.length)
		throw new FormulaError('#REF!')
	const text = getCellText(editor, table.id, row, col).trim()
	if (text === '') return 0
	if (text.startsWith('=')) {
		if (ctx.depth > 32) throw new FormulaError('#CYCLE')
		return evalNode(parseFormula(text.slice(1)), { ...ctx, depth: ctx.depth + 1 })
	}
	const num = Number(text)
	if (Number.isNaN(num)) throw new FormulaError('#VALUE!')
	return num
}

// Expand a range to its numeric cells, skipping blanks and text (like SUM).
function rangeNumbers(ctx: Ctx, a: string, b: string): number[] {
	const { editor, table } = ctx
	const ra = parseRef(a)
	const rb = parseRef(b)
	const r1 = Math.min(ra.row, rb.row)
	const r2 = Math.max(ra.row, rb.row)
	const c1 = Math.min(ra.col, rb.col)
	const c2 = Math.max(ra.col, rb.col)
	if (r1 < 0 || c1 < 0 || r2 >= table.props.rows.length || c2 >= table.props.cols.length)
		throw new FormulaError('#REF!')
	const out: number[] = []
	for (let r = r1; r <= r2; r++) {
		for (let c = c1; c <= c2; c++) {
			const text = getCellText(editor, table.id, r, c).trim()
			if (text === '') continue
			if (text.startsWith('=')) {
				if (ctx.depth > 32) throw new FormulaError('#CYCLE')
				out.push(evalNode(parseFormula(text.slice(1)), { ...ctx, depth: ctx.depth + 1 }))
			} else {
				const num = Number(text)
				if (!Number.isNaN(num)) out.push(num)
			}
		}
	}
	return out
}

const argNumbers = (n: Node, ctx: Ctx): number[] =>
	n.k === 'range' ? rangeNumbers(ctx, n.a, n.b) : [evalNode(n, ctx)]
const collect = (args: Node[], ctx: Ctx): number[] => args.flatMap((a) => argNumbers(a, ctx))
const arg = (args: Node[], i: number, ctx: Ctx): number => {
	const node = args[i]
	if (!node) throw new FormulaError('#N/A')
	return evalNode(node, ctx)
}

const FUNCS: Record<string, (args: Node[], ctx: Ctx) => number> = {
	SUM: (a, c) => collect(a, c).reduce((x, y) => x + y, 0),
	PRODUCT: (a, c) => collect(a, c).reduce((x, y) => x * y, 1),
	AVERAGE: (a, c) => {
		const xs = collect(a, c)
		if (!xs.length) throw new FormulaError('#DIV/0!')
		return xs.reduce((x, y) => x + y, 0) / xs.length
	},
	MIN: (a, c) => {
		const xs = collect(a, c)
		return xs.length ? Math.min(...xs) : 0
	},
	MAX: (a, c) => {
		const xs = collect(a, c)
		return xs.length ? Math.max(...xs) : 0
	},
	COUNT: (a, c) => collect(a, c).length,
	ABS: (a, c) => Math.abs(arg(a, 0, c)),
	SQRT: (a, c) => {
		const x = arg(a, 0, c)
		if (x < 0) throw new FormulaError('#NUM!')
		return Math.sqrt(x)
	},
	ROUND: (a, c) => {
		const f = Math.pow(10, a[1] ? arg(a, 1, c) : 0)
		return Math.round(arg(a, 0, c) * f) / f
	},
	FLOOR: (a, c) => Math.floor(arg(a, 0, c)),
	CEILING: (a, c) => Math.ceil(arg(a, 0, c)),
	INT: (a, c) => Math.trunc(arg(a, 0, c)),
	MOD: (a, c) => {
		const y = arg(a, 1, c)
		if (y === 0) throw new FormulaError('#DIV/0!')
		const x = arg(a, 0, c)
		return x - y * Math.floor(x / y)
	},
	POWER: (a, c) => Math.pow(arg(a, 0, c), arg(a, 1, c)),
	IF: (a, c) => (arg(a, 0, c) !== 0 ? arg(a, 1, c) : a[2] ? arg(a, 2, c) : 0),
	AND: (a, c) => (collect(a, c).every((x) => x !== 0) ? 1 : 0),
	OR: (a, c) => (collect(a, c).some((x) => x !== 0) ? 1 : 0),
	NOT: (a, c) => (arg(a, 0, c) === 0 ? 1 : 0),
}
FUNCS.AVG = FUNCS.AVERAGE

function evalBin(op: string, l: number, r: number): number {
	switch (op) {
		case '+':
			return l + r
		case '-':
			return l - r
		case '*':
			return l * r
		case '/':
			if (r === 0) throw new FormulaError('#DIV/0!')
			return l / r
		case '^':
			return Math.pow(l, r)
		case '=':
			return l === r ? 1 : 0
		case '<>':
			return l !== r ? 1 : 0
		case '<':
			return l < r ? 1 : 0
		case '<=':
			return l <= r ? 1 : 0
		case '>':
			return l > r ? 1 : 0
		case '>=':
			return l >= r ? 1 : 0
		default:
			throw new FormulaError('#ERR')
	}
}

function evalNode(n: Node, ctx: Ctx): number {
	switch (n.k) {
		case 'num':
			return n.v
		case 'ref': {
			const { row, col } = parseRef(n.v)
			return cellNumber(ctx, row, col)
		}
		case 'range':
			// a bare range is only meaningful inside a function like SUM(B2:C3)
			throw new FormulaError('#VALUE!')
		case 'unary':
			return n.op === '-' ? -evalNode(n.x, ctx) : evalNode(n.x, ctx)
		case 'post':
			return evalNode(n.x, ctx) / 100
		case 'bin':
			return evalBin(n.op, evalNode(n.l, ctx), evalNode(n.r, ctx))
		case 'call': {
			const fn = FUNCS[n.name]
			if (!fn) throw new FormulaError('#NAME?')
			return fn(n.args, ctx)
		}
	}
}

const customShapeUtils = [TableCellShapeUtil.configure({ kinds: [textCellKind, formulaCellKind] })]

export default function TableFormulasExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={customShapeUtils}
				onMount={(editor) => {
					if (editor.getCurrentPageShapeIds().size === 0) seedTable(editor)
				}}
			/>
		</div>
	)
}

function seedTable(editor: Editor) {
	const id = createShapeId()
	const cols = ['c0', 'c1', 'c2', 'c3'].map((cid) => ({ id: cid, width: 120 }))
	const rows = ['r0', 'r1', 'r2', 'r3', 'r4'].map((rid) => ({ id: rid }))
	editor.createShape({ id, type: 'table', x: 150, y: 150, props: { cols, rows, headerRows: 1 } })
	const layout = getTableLayout(editor.getShape(id) as TLTableShape)

	// columns: Item, Jan, Feb, Total. The Total column and the Total/Average rows
	// are formulas using operators (=B2+C2) and functions over ranges (=SUM(B2:B3)).
	const seed: { kind: string; text: string }[][] = [
		[
			{ kind: 'text', text: 'Item' },
			{ kind: 'text', text: 'Jan' },
			{ kind: 'text', text: 'Feb' },
			{ kind: 'text', text: 'Total' },
		],
		[
			{ kind: 'text', text: 'Apples' },
			{ kind: 'text', text: '3' },
			{ kind: 'text', text: '5' },
			{ kind: 'formula', text: '=B2+C2' },
		],
		[
			{ kind: 'text', text: 'Pears' },
			{ kind: 'text', text: '2' },
			{ kind: 'text', text: '4' },
			{ kind: 'formula', text: '=B3+C3' },
		],
		[
			{ kind: 'text', text: 'Total' },
			{ kind: 'formula', text: '=SUM(B2:B3)' },
			{ kind: 'formula', text: '=SUM(C2:C3)' },
			{ kind: 'formula', text: '=SUM(D2:D3)' },
		],
		[
			{ kind: 'text', text: 'Average' },
			{ kind: 'formula', text: '=AVERAGE(B2:B3)' },
			{ kind: 'formula', text: '=AVERAGE(C2:C3)' },
			{ kind: 'formula', text: '=AVERAGE(D2:D3)' },
		],
	]
	editor.createShapes(
		seed.flatMap((rowData, r) =>
			rowData.map((cell, c) => ({
				id: createShapeId(),
				type: 'table-cell' as const,
				parentId: id,
				x: layout.cols[c].x,
				y: layout.rows[r].y,
				props: {
					rowId: rows[r].id,
					colId: cols[c].id,
					kind: cell.kind,
					richText: toRichText(cell.text),
					color: 'black',
					fill: 'none',
					align: 'start',
					verticalAlign: 'middle',
				},
			}))
		)
	)
	editor.zoomToFit()
}
