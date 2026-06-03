import {
	DefaultContextMenu,
	DefaultContextMenuContent,
	DefaultToolbar,
	DefaultToolbarContent,
	Editor,
	TLComponents,
	TLShape,
	TLTableCellKind,
	TLTableCellKindProps,
	TLTableCellShape,
	TLTableShape,
	TLUiContextMenuProps,
	TLUiOverrides,
	TableCellShapeUtil,
	Tldraw,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	createShapeId,
	deleteColumn,
	deleteRow,
	getCellText,
	getTableLayout,
	insertColumn,
	insertRow,
	renderPlaintextFromRichText,
	textCellKind,
	toRichText,
	useEditor,
	useIsToolSelected,
	useTools,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'

// Cross-table formulas. A `formula` cell can reference cells in *another* table by
// name (e.g. `Prices!A2:B5`), so you can do spreadsheet-style lookups across two
// separate table shapes on the same canvas. This works because cells are real,
// reactive records: reading another table is the same call as reading your own,
// and the formula recomputes automatically when that other table changes.
//
// This example seeds an "Order" table whose unit prices are pulled from a "Prices"
// table with VLOOKUP. Edit a price in the Prices table and watch the order totals
// update live — across two shapes, and (because it's all records) in multiplayer.

// Registered as the default `text` kind (not a separate `formula` kind), so EVERY
// cell — including new ones you create by clicking — evaluates when its text starts
// with `=`, and renders as plain text otherwise. Just like a spreadsheet.
const formulaCellKind: TLTableCellKind = {
	type: 'text',
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
				const self = editor.getShape(shape.id) as TLTableCellShape | undefined
				if (!self) return null
				const text = renderPlaintextFromRichText(editor, self.props.richText)
				return text.startsWith('=') ? evalFormula(editor, table, text) : null
			},
			[editor, shape.id, table]
		)

		// While editing, or when the text isn't a formula, render the raw text so it
		// stays editable. Otherwise render the computed result through the text cell so
		// it inherits the same font, size, color and alignment as every other cell.
		const TextComponent = textCellKind.Component
		if (isEditing || result === null) return <TextComponent {...props} />

		const display = { ...shape, props: { ...shape.props, richText: toRichText(result) } }
		return <TextComponent {...props} shape={display} />
	},
}

const customShapeUtils = [TableCellShapeUtil.configure({ kinds: [formulaCellKind] })]

const uiOverrides: TLUiOverrides = {
	tools(editor, tools) {
		tools.table = {
			id: 'table',
			icon: 'tool-frame',
			label: 'Table',
			kbd: 'shift+t',
			onSelect: () => editor.setCurrentTool('table'),
		}
		return tools
	},
}

const components: TLComponents = {
	Toolbar: (props) => {
		const tools = useTools()
		const isSelected = useIsToolSelected(tools['table'])
		return (
			<DefaultToolbar {...props}>
				<TldrawUiMenuItem {...tools['table']} isSelected={isSelected} />
				<DefaultToolbarContent />
			</DefaultToolbar>
		)
	},
	// An editable name tag floating above each table. The name is stored in the
	// table's `meta.name` — the same value VLOOKUP resolves with `Name!A1`.
	InFrontOfTheCanvas: TableNameTags,
	// Right-click a table (or a cell in it) to insert/delete rows and columns.
	ContextMenu: (props: TLUiContextMenuProps) => {
		const editor = useEditor()
		const target = useValue('structural-target', () => structuralTarget(editor), [editor])
		const withTable = (fn: (table: TLTableShape) => void) => {
			if (!target) return
			const table = editor.getShape(target.tableId)
			if (table?.type === 'table') fn(table as TLTableShape)
		}
		return (
			<DefaultContextMenu {...props}>
				{target && (
					<TldrawUiMenuGroup id="table-structure">
						<TldrawUiMenuItem
							id="insert-row"
							label="Insert row below"
							onSelect={() =>
								withTable((tt) =>
									insertRow(editor, tt, target.row != null ? target.row + 1 : tt.props.rows.length)
								)
							}
						/>
						<TldrawUiMenuItem
							id="insert-column"
							label="Insert column right"
							onSelect={() =>
								withTable((tt) =>
									insertColumn(
										editor,
										tt,
										target.col != null ? target.col + 1 : tt.props.cols.length
									)
								)
							}
						/>
						<TldrawUiMenuItem
							id="delete-row"
							label="Delete row"
							onSelect={() =>
								withTable((tt) =>
									deleteRow(editor, tt, target.row != null ? target.row : tt.props.rows.length - 1)
								)
							}
						/>
						<TldrawUiMenuItem
							id="delete-column"
							label="Delete column"
							onSelect={() =>
								withTable((tt) =>
									deleteColumn(
										editor,
										tt,
										target.col != null ? target.col : tt.props.cols.length - 1
									)
								)
							}
						/>
					</TldrawUiMenuGroup>
				)}
				<DefaultContextMenuContent />
			</DefaultContextMenu>
		)
	},
}

// The table to operate on (the selected table, or the parent of a selected cell),
// plus the selected cell's row/column index when a cell is selected (so we can
// insert/delete relative to it rather than always at the end).
function structuralTarget(
	editor: Editor
): { tableId: TLShape['id']; row: number | null; col: number | null } | null {
	const shape = editor.getOnlySelectedShape()
	if (shape?.type === 'table') return { tableId: shape.id, row: null, col: null }
	if (shape?.type === 'table-cell') {
		const cell = shape as TLTableCellShape
		const parent = editor.getShape(cell.parentId)
		if (parent?.type === 'table') {
			const tt = parent as TLTableShape
			const row = tt.props.rows.findIndex((r) => r.id === cell.props.rowId)
			const col = tt.props.cols.findIndex((c) => c.id === cell.props.colId)
			return { tableId: tt.id, row: row < 0 ? null : row, col: col < 0 ? null : col }
		}
	}
	return null
}

export default function TableVlookupExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				shapeUtils={customShapeUtils}
				overrides={uiOverrides}
				components={components}
				onMount={(editor) => {
					// Give every new table a unique default name so it's immediately
					// referenceable (and the seeded tables keep their explicit names).
					editor.sideEffects.registerAfterCreateHandler('shape', (shape) => {
						if (shape.type === 'table' && !shape.meta['name']) {
							editor.updateShape({
								id: shape.id,
								type: 'table',
								meta: { ...shape.meta, name: nextTableName(editor, shape.id) },
							})
						}
					})
					if (editor.getCurrentPageShapeIds().size === 0) seedTables(editor)
				}}
			/>
		</div>
	)
}

function nextTableName(editor: Editor, excludeId: TLShape['id']): string {
	const used = new Set(
		editor
			.getCurrentPageShapes()
			.filter((s) => s.type === 'table' && s.id !== excludeId)
			.map((s) => String(s.meta['name'] ?? ''))
	)
	let n = 1
	while (used.has(`Table ${n}`)) n++
	return `Table ${n}`
}

// Renders a small editable name field above every table on the page, positioned in
// screen space and kept in sync with the camera.
function TableNameTags() {
	const editor = useEditor()
	const tags = useValue(
		'table-name-tags',
		() => {
			const vp = editor.getViewportScreenBounds()
			return editor.getCurrentPageShapes().flatMap((s) => {
				if (s.type !== 'table') return []
				const bounds = editor.getShapePageBounds(s.id)
				if (!bounds) return []
				const pt = editor.pageToScreen({ x: bounds.x, y: bounds.y })
				return [{ id: s.id, name: String(s.meta['name'] ?? ''), x: pt.x - vp.x, y: pt.y - vp.y }]
			})
		},
		[editor]
	)

	return (
		<>
			{tags.map((tag) => (
				<NameTag key={tag.id} id={tag.id} name={tag.name} x={tag.x} y={tag.y} />
			))}
		</>
	)
}

function NameTag({ id, name, x, y }: { id: TLShape['id']; name: string; x: number; y: number }) {
	const editor = useEditor()
	return (
		<input
			value={name}
			placeholder="Table name"
			spellCheck={false}
			onChange={(e) =>
				editor.updateShape({
					id,
					type: 'table',
					meta: { ...editor.getShape(id)?.meta, name: e.target.value },
				})
			}
			onPointerDown={(e) => e.stopPropagation()}
			style={{
				position: 'absolute',
				transform: `translate(${x}px, ${y - 32}px)`,
				transformOrigin: 'top left',
				pointerEvents: 'all',
				width: 150,
				padding: '3px 8px',
				font: '600 12px/1.3 inherit',
				color: '#1d1d1f',
				background: 'white',
				border: '1px solid #e3e3e6',
				borderRadius: 8,
				boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
			}}
		/>
	)
}

// --- A spreadsheet formula engine with strings + cross-table references --------
// Values can be numbers or strings. Supports cell refs (B2), ranges (B2:C3),
// table-qualified refs/ranges (Prices!A2:B5), the operators + - * / ^ % and & (text
// concat), comparisons (= <> < <= > >=), parentheses and unary minus, and functions
// including SUM/AVERAGE/MIN/MAX/COUNT, IF, ROUND, and VLOOKUP/MATCH/INDEX.

class FormulaError extends Error {}

type Cell = number | string

type Tok =
	| { t: 'num'; v: number }
	| { t: 'str'; v: string }
	| { t: 'ref'; table?: string; v: string }
	| { t: 'range'; table?: string; a: string; b: string }
	| { t: 'ident'; v: string }
	| { t: 'op'; v: string }
	| { t: 'lparen' }
	| { t: 'rparen' }
	| { t: 'comma' }

type Node =
	| { k: 'num'; v: number }
	| { k: 'str'; v: string }
	| { k: 'ref'; table?: string; v: string }
	| { k: 'range'; table?: string; a: string; b: string }
	| { k: 'unary'; op: string; x: Node }
	| { k: 'post'; op: string; x: Node }
	| { k: 'bin'; op: string; l: Node; r: Node }
	| { k: 'call'; name: string; args: Node[] }

interface Ctx {
	editor: Editor
	table: TLTableShape
	depth: number
}

function evalFormula(editor: Editor, table: TLTableShape, formula: string): string {
	try {
		const node = parseFormula(formula.replace(/^\s*=/, ''))
		return formatValue(evalNode(node, { editor, table, depth: 0 }))
	} catch (e) {
		return e instanceof FormulaError ? e.message : '#ERR'
	}
}

function formatValue(v: Cell): string {
	if (typeof v === 'string') return v
	if (!Number.isFinite(v)) return '#NUM!'
	return String(Math.round((v + Number.EPSILON) * 1e10) / 1e10)
}

function toNum(v: Cell): number {
	if (typeof v === 'number') return v
	if (v.trim() === '') return 0
	const n = Number(v)
	if (Number.isNaN(n)) throw new FormulaError('#VALUE!')
	return n
}

function looseEq(a: Cell, b: Cell): boolean {
	if (typeof a === 'number' && typeof b === 'number') return a === b
	return String(a).toLowerCase() === String(b).toLowerCase()
}

function tokenize(src: string): Tok[] {
	const out: Tok[] = []
	const isWord = (c: string) => /[A-Za-z0-9]/.test(c)
	let i = 0
	while (i < src.length) {
		const c = src[i]
		if (c === ' ' || c === '\t') {
			i++
		} else if (c === '"') {
			let j = i + 1
			while (j < src.length && src[j] !== '"') j++
			out.push({ t: 'str', v: src.slice(i + 1, j) })
			i = j + 1
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
			if (src[i] === '!') {
				// a table-qualified ref/range, e.g. Prices!A2 or Prices!A2:B5. Checked
				// before the bare-ref test so a table name that looks like a cell ref
				// (e.g. one ending in a digit) is still treated as a table qualifier.
				i++
				let k = i
				while (k < src.length && isWord(src[k])) k++
				const r1 = src.slice(i, k)
				if (!/^[A-Za-z]+\d+$/.test(r1)) throw new FormulaError('#ERR')
				i = pushRefOrRange(out, src, k, word, r1)
			} else if (/^[A-Za-z]+\d+$/.test(word)) {
				// a bare cell ref in the current table, possibly a range (B2:C3)
				i = pushRefOrRange(out, src, i, undefined, word)
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
		} else if ('+-*/^%=&'.includes(c)) {
			out.push({ t: 'op', v: c })
			i++
		} else {
			throw new FormulaError('#ERR')
		}
	}
	return out
}

// Emit a ref or range token. `first` is the already-read cell ref (e.g. "A2"); if a
// ":" follows, read the second ref and emit a range. `table` qualifies both.
function pushRefOrRange(
	out: Tok[],
	src: string,
	i: number,
	table: string | undefined,
	first: string
): number {
	if (src[i] === ':') {
		let k = i + 1
		while (k < src.length && /[A-Za-z0-9]/.test(src[k])) k++
		const second = src.slice(i + 1, k)
		if (/^[A-Za-z]+\d+$/.test(second)) {
			out.push({ t: 'range', table, a: first, b: second })
			return k
		}
	}
	out.push({ t: 'ref', table, v: first })
	return i
}

// Recursive descent. Precedence low→high: comparison, & (concat), +/-, */, unary,
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
		let l = parseConcat()
		while (isOp(['=', '<>', '<', '<=', '>', '>='])) {
			const op = opVal()
			p++
			l = { k: 'bin', op, l, r: parseConcat() }
		}
		return l
	}
	const parseConcat = (): Node => {
		let l = parseAdd()
		while (isOp(['&'])) {
			p++
			l = { k: 'bin', op: '&', l, r: parseAdd() }
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
		if (t.t === 'str') {
			p++
			return { k: 'str', v: t.v }
		}
		if (t.t === 'range') {
			p++
			return { k: 'range', table: t.table, a: t.a, b: t.b }
		}
		if (t.t === 'ref') {
			p++
			return { k: 'ref', table: t.table, v: t.v }
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

// Resolve a table reference: no name → the formula's own table; a name → the page
// table whose `meta.name` matches (case-insensitive).
function resolveTable(ctx: Ctx, name: string | undefined): TLTableShape {
	if (!name) return ctx.table
	const match = ctx.editor
		.getCurrentPageShapes()
		.find(
			(s) => s.type === 'table' && String(s.meta.name ?? '').toLowerCase() === name.toLowerCase()
		)
	if (!match) throw new FormulaError('#REF!')
	return match as TLTableShape
}

// Read a single cell as a value. Empty → ''; numeric text → number; formula cells
// recurse (evaluated in *their* table's context). Other text → the string.
function cellValue(ctx: Ctx, table: TLTableShape, row: number, col: number): Cell {
	if (col < 0 || col >= table.props.cols.length || row < 0 || row >= table.props.rows.length)
		throw new FormulaError('#REF!')
	const text = getCellText(ctx.editor, table.id, row, col).trim()
	if (text === '') return ''
	if (text.startsWith('=')) {
		if (ctx.depth > 32) throw new FormulaError('#CYCLE')
		return evalNode(parseFormula(text.slice(1)), { ...ctx, table, depth: ctx.depth + 1 })
	}
	const n = Number(text)
	return Number.isNaN(n) ? text : n
}

function rangeBounds(ctx: Ctx, node: Extract<Node, { k: 'range' }>) {
	const table = resolveTable(ctx, node.table)
	const ra = parseRef(node.a)
	const rb = parseRef(node.b)
	const r1 = Math.min(ra.row, rb.row)
	const r2 = Math.max(ra.row, rb.row)
	const c1 = Math.min(ra.col, rb.col)
	const c2 = Math.max(ra.col, rb.col)
	if (r1 < 0 || c1 < 0 || r2 >= table.props.rows.length || c2 >= table.props.cols.length)
		throw new FormulaError('#REF!')
	return { table, r1, r2, c1, c2 }
}

// Numeric cells of a range, skipping blanks and text (like SUM).
function rangeNumbers(ctx: Ctx, node: Extract<Node, { k: 'range' }>): number[] {
	const { table, r1, r2, c1, c2 } = rangeBounds(ctx, node)
	const out: number[] = []
	for (let r = r1; r <= r2; r++) {
		for (let c = c1; c <= c2; c++) {
			const v = cellValue(ctx, table, r, c)
			if (typeof v === 'number') out.push(v)
		}
	}
	return out
}

// The full 2D values of a range — used by VLOOKUP/INDEX/MATCH.
function rangeGrid(ctx: Ctx, node: Extract<Node, { k: 'range' }>): Cell[][] {
	const { table, r1, r2, c1, c2 } = rangeBounds(ctx, node)
	const grid: Cell[][] = []
	for (let r = r1; r <= r2; r++) {
		const row: Cell[] = []
		for (let c = c1; c <= c2; c++) row.push(cellValue(ctx, table, r, c))
		grid.push(row)
	}
	return grid
}

const asRange = (n: Node): Extract<Node, { k: 'range' }> => {
	if (n.k !== 'range') throw new FormulaError('#REF!')
	return n
}
const numbers = (args: Node[], ctx: Ctx): number[] =>
	args.flatMap((a) => (a.k === 'range' ? rangeNumbers(ctx, a) : [toNum(evalNode(a, ctx))]))
const arg = (args: Node[], i: number, ctx: Ctx): Cell => {
	const node = args[i]
	if (!node) throw new FormulaError('#N/A')
	return evalNode(node, ctx)
}

// Flatten a range to a row-major list of values, for the COUNTIF/SUMIF family.
const rangeCells = (ctx: Ctx, node: Extract<Node, { k: 'range' }>): Cell[] =>
	rangeGrid(ctx, node).flat()

// Match a cell value against a criterion. A criterion is either a value (equality)
// or a string with a leading comparator: ">5", "<=10", "<>0", "=x", or "Apples".
function criterionMatches(value: Cell, criterion: Cell): boolean {
	if (typeof criterion === 'string') {
		const m = /^(>=|<=|<>|>|<|=)(.*)$/.exec(criterion)
		if (m) {
			const rhsRaw = m[2].trim()
			const rhsNum = Number(rhsRaw)
			const rhs: Cell = rhsRaw !== '' && !Number.isNaN(rhsNum) ? rhsNum : rhsRaw
			return compareCriterion(m[1], value, rhs)
		}
	}
	return looseEq(value, criterion)
}

function compareCriterion(op: string, value: Cell, rhs: Cell): boolean {
	if (op === '=') return looseEq(value, rhs)
	if (op === '<>') return !looseEq(value, rhs)
	if (typeof rhs === 'number') {
		if (typeof value !== 'number') return false
		return op === '<'
			? value < rhs
			: op === '<='
				? value <= rhs
				: op === '>'
					? value > rhs
					: value >= rhs
	}
	const a = String(value).toLowerCase()
	const b = String(rhs).toLowerCase()
	return op === '<' ? a < b : op === '<=' ? a <= b : op === '>' ? a > b : a >= b
}

// Build (range, criterion) pairs from alternating args starting at `start`, for the
// *IFS functions. Every range is flattened to the same row-major order.
function criteriaPairs(
	args: Node[],
	ctx: Ctx,
	start: number
): Array<{ cells: Cell[]; crit: Cell }> {
	const pairs: Array<{ cells: Cell[]; crit: Cell }> = []
	for (let i = start; i + 1 < args.length; i += 2) {
		pairs.push({ cells: rangeCells(ctx, asRange(args[i])), crit: arg(args, i + 1, ctx) })
	}
	return pairs
}

const allMatch = (pairs: Array<{ cells: Cell[]; crit: Cell }>, k: number): boolean =>
	pairs.every((p) => criterionMatches(p.cells[k], p.crit))

const FUNCS: Record<string, (args: Node[], ctx: Ctx) => Cell> = {
	SUM: (a, c) => numbers(a, c).reduce((x, y) => x + y, 0),
	PRODUCT: (a, c) => numbers(a, c).reduce((x, y) => x * y, 1),
	AVERAGE: (a, c) => {
		const xs = numbers(a, c)
		if (!xs.length) throw new FormulaError('#DIV/0!')
		return xs.reduce((x, y) => x + y, 0) / xs.length
	},
	MIN: (a, c) => {
		const xs = numbers(a, c)
		return xs.length ? Math.min(...xs) : 0
	},
	MAX: (a, c) => {
		const xs = numbers(a, c)
		return xs.length ? Math.max(...xs) : 0
	},
	COUNT: (a, c) => numbers(a, c).length,
	ROUND: (a, c) => {
		const f = Math.pow(10, a[1] ? toNum(arg(a, 1, c)) : 0)
		return Math.round(toNum(arg(a, 0, c)) * f) / f
	},
	ABS: (a, c) => Math.abs(toNum(arg(a, 0, c))),
	IF: (a, c) => (toNum(arg(a, 0, c)) !== 0 ? arg(a, 1, c) : a[2] ? arg(a, 2, c) : 0),
	CONCAT: (a, c) => a.map((n) => String(evalNode(n, c))).join(''),
	// VLOOKUP(key, range, colIndex): find `key` in the range's first column and
	// return the value in column `colIndex` (1-based) of the matching row.
	VLOOKUP: (a, c) => {
		const key = arg(a, 0, c)
		const col = toNum(arg(a, 2, c))
		const grid = rangeGrid(c, asRange(a[1]))
		for (const row of grid) {
			if (row.length && looseEq(row[0], key)) {
				if (col < 1 || col > row.length) throw new FormulaError('#REF!')
				return row[col - 1]
			}
		}
		throw new FormulaError('#N/A')
	},
	// MATCH(key, range): 1-based position of `key` within a single-row/column range.
	MATCH: (a, c) => {
		const key = arg(a, 0, c)
		const flat = rangeGrid(c, asRange(a[1])).flat()
		const idx = flat.findIndex((v) => looseEq(v, key))
		if (idx === -1) throw new FormulaError('#N/A')
		return idx + 1
	},
	// INDEX(range, row, [col]): the value at (row, col), both 1-based, within range.
	INDEX: (a, c) => {
		const grid = rangeGrid(c, asRange(a[0]))
		const r = toNum(arg(a, 1, c)) - 1
		const col = (a[2] ? toNum(arg(a, 2, c)) : 1) - 1
		const cell = grid[r]?.[col]
		if (cell === undefined) throw new FormulaError('#REF!')
		return cell
	},
	// COUNTIF(range, criterion): how many cells in `range` match `criterion`.
	COUNTIF: (a, c) =>
		rangeCells(c, asRange(a[0])).filter((v) => criterionMatches(v, arg(a, 1, c))).length,
	// COUNTIFS(range1, crit1, range2, crit2, …): count positions matching every pair.
	COUNTIFS: (a, c) => {
		const pairs = criteriaPairs(a, c, 0)
		const len = pairs.length ? pairs[0].cells.length : 0
		let count = 0
		for (let k = 0; k < len; k++) if (allMatch(pairs, k)) count++
		return count
	},
	// SUMIF(range, criterion, [sumRange]): sum cells whose `range` value matches.
	SUMIF: (a, c) => {
		const range = rangeCells(c, asRange(a[0]))
		const crit = arg(a, 1, c)
		const sumRange = a[2] ? rangeCells(c, asRange(a[2])) : range
		let total = 0
		for (let k = 0; k < range.length; k++) {
			const v = sumRange[k]
			if (criterionMatches(range[k], crit) && typeof v === 'number') total += v
		}
		return total
	},
	// SUMIFS(sumRange, range1, crit1, …): sum where every criterion matches.
	SUMIFS: (a, c) => {
		const sumRange = rangeCells(c, asRange(a[0]))
		const pairs = criteriaPairs(a, c, 1)
		let total = 0
		for (let k = 0; k < sumRange.length; k++) {
			const v = sumRange[k]
			if (allMatch(pairs, k) && typeof v === 'number') total += v
		}
		return total
	},
	// AVERAGEIF(range, criterion, [avgRange]): mean of matching cells.
	AVERAGEIF: (a, c) => {
		const range = rangeCells(c, asRange(a[0]))
		const crit = arg(a, 1, c)
		const avgRange = a[2] ? rangeCells(c, asRange(a[2])) : range
		const vals: number[] = []
		for (let k = 0; k < range.length; k++) {
			const v = avgRange[k]
			if (criterionMatches(range[k], crit) && typeof v === 'number') vals.push(v)
		}
		if (!vals.length) throw new FormulaError('#DIV/0!')
		return vals.reduce((x, y) => x + y, 0) / vals.length
	},
	// AVERAGEIFS(avgRange, range1, crit1, …): mean where every criterion matches.
	AVERAGEIFS: (a, c) => {
		const avgRange = rangeCells(c, asRange(a[0]))
		const pairs = criteriaPairs(a, c, 1)
		const vals: number[] = []
		for (let k = 0; k < avgRange.length; k++) {
			const v = avgRange[k]
			if (allMatch(pairs, k) && typeof v === 'number') vals.push(v)
		}
		if (!vals.length) throw new FormulaError('#DIV/0!')
		return vals.reduce((x, y) => x + y, 0) / vals.length
	},
}

function evalBin(op: string, l: Cell, r: Cell): Cell {
	switch (op) {
		case '+':
			return toNum(l) + toNum(r)
		case '-':
			return toNum(l) - toNum(r)
		case '*':
			return toNum(l) * toNum(r)
		case '/': {
			const d = toNum(r)
			if (d === 0) throw new FormulaError('#DIV/0!')
			return toNum(l) / d
		}
		case '^':
			return Math.pow(toNum(l), toNum(r))
		case '&':
			return formatValue(l) + formatValue(r)
		case '=':
			return looseEq(l, r) ? 1 : 0
		case '<>':
			return looseEq(l, r) ? 0 : 1
		case '<':
		case '<=':
		case '>':
		case '>=': {
			const bothNum = typeof l === 'number' && typeof r === 'number'
			const a = bothNum ? (l as number) : String(l).toLowerCase()
			const b = bothNum ? (r as number) : String(r).toLowerCase()
			if (op === '<') return a < b ? 1 : 0
			if (op === '<=') return a <= b ? 1 : 0
			if (op === '>') return a > b ? 1 : 0
			return a >= b ? 1 : 0
		}
		default:
			throw new FormulaError('#ERR')
	}
}

function evalNode(n: Node, ctx: Ctx): Cell {
	switch (n.k) {
		case 'num':
			return n.v
		case 'str':
			return n.v
		case 'ref': {
			const { row, col } = parseRef(n.v)
			return cellValue(ctx, resolveTable(ctx, n.table), row, col)
		}
		case 'range':
			// a bare range is only meaningful inside a function like SUM(B2:C3)
			throw new FormulaError('#VALUE!')
		case 'unary':
			return n.op === '-' ? -toNum(evalNode(n.x, ctx)) : toNum(evalNode(n.x, ctx))
		case 'post':
			return toNum(evalNode(n.x, ctx)) / 100
		case 'bin':
			return evalBin(n.op, evalNode(n.l, ctx), evalNode(n.r, ctx))
		case 'call': {
			const fn = FUNCS[n.name]
			if (!fn) throw new FormulaError('#NAME?')
			return fn(n.args, ctx)
		}
	}
}

// --- seed: a Prices table and an Order table that looks up prices from it -------

interface Seed {
	kind: string
	text: string
}

function seedTables(editor: Editor) {
	// Prices: Item | Price
	const pricesId = createShapeId()
	editor.createShape({
		id: pricesId,
		type: 'table',
		x: 120,
		y: 160,
		props: {
			cols: [
				{ id: 'p0', width: 130 },
				{ id: 'p1', width: 90 },
			],
			rows: ['pr0', 'pr1', 'pr2', 'pr3', 'pr4'].map((id) => ({ id })),
			headerRows: 1,
			size: 's',
		},
		meta: { name: 'Prices' },
	})
	seedCells(editor, pricesId, [
		[t('Item'), t('Price')],
		[t('Apples'), t('1.2')],
		[t('Pears'), t('0.8')],
		[t('Cherries'), t('3.5')],
		[t('Bananas'), t('0.5')],
	])

	// Order: Item | Qty | Unit price (VLOOKUP) | Total (Qty × Unit price)
	const orderId = createShapeId()
	editor.createShape({
		id: orderId,
		type: 'table',
		x: 420,
		y: 160,
		props: {
			cols: [
				{ id: 'o0', width: 110 },
				{ id: 'o1', width: 60 },
				// wide enough that the VLOOKUP formula fits on one line when editing, so
				// the row's auto-height (which measures the editable source) stays compact
				{ id: 'o2', width: 240 },
				{ id: 'o3', width: 80 },
			],
			rows: ['or0', 'or1', 'or2', 'or3', 'or4'].map((id) => ({ id })),
			headerRows: 1,
			size: 's',
		},
		meta: { name: 'Order' },
	})
	seedCells(editor, orderId, [
		[t('Item'), t('Qty'), t('Unit price'), t('Total')],
		[t('Apples'), t('6'), f('=VLOOKUP(A2,Prices!A2:B5,2)'), f('=B2*C2')],
		[t('Pears'), t('3'), f('=VLOOKUP(A3,Prices!A2:B5,2)'), f('=B3*C3')],
		[t('Cherries'), t('2'), f('=VLOOKUP(A4,Prices!A2:B5,2)'), f('=B4*C4')],
		[t('Total'), t(''), t(''), f('=SUM(D2:D4)')],
	])

	editor.zoomToFit()
}

const t = (text: string): Seed => ({ kind: 'text', text })
// Formulas are just text cells whose content starts with `=`; the `f` alias only
// documents intent in the seed below.
const f = (text: string): Seed => ({ kind: 'text', text })

function seedCells(editor: Editor, tableId: TLTableShape['id'], grid: Seed[][]) {
	const table = editor.getShape(tableId) as TLTableShape
	const layout = getTableLayout(table)
	const { rows, cols } = table.props
	editor.createShapes(
		grid.flatMap((rowData, r) =>
			rowData.flatMap((cell, c) =>
				cell.text === '' && cell.kind === 'text'
					? []
					: [
							{
								id: createShapeId(),
								type: 'table-cell' as const,
								parentId: tableId,
								x: layout.cols[c].x,
								y: layout.rows[r].y,
								props: {
									rowId: rows[r].id,
									colId: cols[c].id,
									kind: cell.kind,
									richText: toRichText(cell.text),
									color: 'black' as const,
									fill: 'none' as const,
									align: 'start' as const,
									verticalAlign: 'middle' as const,
								},
							},
						]
			)
		)
	)
}
