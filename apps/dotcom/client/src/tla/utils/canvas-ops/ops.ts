import { Editor, type TLShapeId } from 'tldraw'
import {
	describeShapes,
	fromShapeId,
	LABEL_PADDING,
	measureLabel,
	runBatch,
	toShapeId,
	type BatchContext,
	type ShapeSummary,
} from './actions'
import type {
	ApplyOpsResult,
	Attribution,
	CanvasAction,
	CanvasColor,
	CanvasOp,
	CanvasSize,
	NewSubject,
	OpResult,
	Ref,
	RefList,
} from './schema'

// Compiles ops to bare actions: resolves references, does the geometry with real text
// measurements, avoids collisions, and reports where things landed. Everything goes through
// `runBatch`, so undo and attribution are the same as for bare actions.

interface Rect {
	x: number
	y: number
	w: number
	h: number
}

function overlaps(a: Rect, b: Rect, slack = 0): boolean {
	return (
		a.x < b.x + b.w + slack &&
		b.x < a.x + a.w + slack &&
		a.y < b.y + b.h + slack &&
		b.y < a.y + a.h + slack
	)
}
function contains(outer: Rect, inner: Rect): boolean {
	return (
		outer.x <= inner.x &&
		outer.y <= inner.y &&
		outer.x + outer.w >= inner.x + inner.w &&
		outer.y + outer.h >= inner.y + inner.h
	)
}
function center(r: Rect) {
	return { x: r.x + r.w / 2, y: r.y + r.h / 2 }
}
function rectOf(editor: Editor, id: TLShapeId): Rect {
	const b = editor.getShapePageBounds(id)
	if (!b) throw new Error(`Unknown shape "${fromShapeId(id)}"`)
	return { x: b.x, y: b.y, w: b.w, h: b.h }
}
function fmt(r: Rect) {
	return `(${Math.round(r.x)}, ${Math.round(r.y)}) ${Math.round(r.w)}x${Math.round(r.h)}`
}
/** Clear space the solver keeps between anything it places and the shapes around it. */
const CLEARANCE = 20
/** The least margin worth having on each side of something squeezed into a gap. */
const MIN_MARGIN = 8
/** How far an arrow's tail starts from the edge of its label. */
const ARROW_TAIL_GAP = 8
/** Clear space between two rects that do not overlap (negative when they do). */
function gapBetween(a: Rect, b: Rect): number {
	return Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w), b.y - (a.y + a.h), a.y - (b.y + b.h))
}

/** Lines and draw strokes are mostly empty space, so their bounding boxes are not obstacles. */
function isPath(type: string) {
	return type === 'line' || type === 'draw'
}

/** Shapes that count as solid obstacles for placement. */
function obstacles(editor: Editor, exclude: Set<TLShapeId>): Array<{ id: TLShapeId; rect: Rect }> {
	return editor
		.getCurrentPageShapesSorted()
		.filter((s) => s.type !== 'arrow' && !isPath(s.type) && !exclude.has(s.id))
		.map((s) => ({ id: s.id, rect: rectOf(editor, s.id) }))
}

/**
 * The first obstacle within `slack` of `rect`. An obstacle that contains `rect` is skipped only if it
 * is in `allowContainers` (any container when that is omitted); a `rect` that swallows an obstacle
 * always collides, since nothing the solver places is meant to contain other shapes.
 */
function collides(
	rect: Rect,
	obs: Array<{ id: TLShapeId; rect: Rect }>,
	slack = CLEARANCE,
	allowContainers?: Set<TLShapeId>
): { id: TLShapeId; rect: Rect } | null {
	for (const o of obs) {
		if (contains(o.rect, rect) && (!allowContainers || allowContainers.has(o.id))) continue
		if (overlaps(rect, o.rect, slack)) return o
	}
	return null
}

const COLOR_WORDS: Record<string, CanvasColor> = {
	black: 'black',
	grey: 'grey',
	gray: 'grey',
	'light-violet': 'light-violet',
	violet: 'violet',
	purple: 'violet',
	blue: 'blue',
	'light-blue': 'light-blue',
	yellow: 'yellow',
	orange: 'orange',
	green: 'green',
	'light-green': 'light-green',
	'light-red': 'light-red',
	pink: 'light-red',
	red: 'red',
	white: 'white',
}
const KIND_WORDS: Array<[RegExp, (s: ShapeSummary) => boolean]> = [
	[/\b(rectangle|rect|box|square)\b/, (s) => s.type === 'geo' && s.geo === 'rectangle'],
	[/\b(ellipse|circle|oval|round)\b/, (s) => s.type === 'geo' && s.geo === 'ellipse'],
	[/\btriangle\b/, (s) => s.geo === 'triangle'],
	[/\bdiamond\b/, (s) => s.geo === 'diamond'],
	[/\bstar\b/, (s) => s.geo === 'star'],
	[/\bcloud\b/, (s) => s.geo === 'cloud'],
	[/\bheart\b/, (s) => s.geo === 'heart'],
	[/\bhexagon\b/, (s) => s.geo === 'hexagon'],
	[/\b(note|sticky|post-?it)\b/, (s) => s.type === 'note'],
	[/\b(text|label|caption|title|heading)\b/, (s) => s.type === 'text'],
	[/\b(arrow|connector|line)\b/, (s) => s.type === 'arrow'],
	[/\b(image|picture|photo|figure)\b/, (s) => s.type === 'image'],
]
/** Region words: a score (higher = more that way) and a threshold for "clearly there". */
const REGION_WORDS: Array<[RegExp, (c: { fx: number; fy: number }) => number, number]> = [
	[/\b(top|upper)[- ](left)\b/, (c) => 2 - c.fx - c.fy, 1.2],
	[/\b(top|upper)[- ](right)\b/, (c) => 1 + c.fx - c.fy, 1.2],
	[/\b(bottom|lower)[- ](left)\b/, (c) => 1 - c.fx + c.fy, 1.2],
	[/\b(bottom|lower)[- ](right)\b/, (c) => c.fx + c.fy, 1.2],
	[/\b(top|upper|topmost|highest)\b/, (c) => 1 - c.fy, 0.6],
	[/\b(bottom|lower|lowest)\b/, (c) => c.fy, 0.6],
	[/\b(left|leftmost)\b/, (c) => 1 - c.fx, 0.6],
	[/\b(right|rightmost)\b/, (c) => c.fx, 0.6],
	[/\b(centre|center|middle)\b/, (c) => 1 - Math.abs(c.fx - 0.5) - Math.abs(c.fy - 0.5), 0.6],
]

function summarise(s: ShapeSummary) {
	return `${s.id} (${s.type}${s.geo ? ` ${s.geo}` : ''}${s.color ? ` ${s.color}` : ''}${s.text ? ` "${s.text.slice(0, 30)}"` : ''} at ${s.x},${s.y})`
}

/** Deterministic matching of a description like "the red ellipse in the lower right" or "the box labelled 'API'". */
function matchDescription(shapes: ShapeSummary[], description: string): ShapeSummary[] {
	const d = description.toLowerCase()
	let pool = shapes
	const quoted = description.match(/["“'‘]([^"”'’]+)["”'’]/)
	const labelled = d.match(/\b(?:labell?ed|named|saying|reading|called)\s+(\S+)/)
	const needle = (quoted?.[1] ?? labelled?.[1])?.toLowerCase()
	// Filters are soft: a word that would leave nothing (the model called a yellow sun "orange") is ignored.
	const soft = (pred: (s: ShapeSummary) => boolean) => {
		const narrowed = pool.filter(pred)
		if (narrowed.length) pool = narrowed
	}
	if (needle) soft((s) => !!s.text?.toLowerCase().includes(needle))
	for (const [re, test] of KIND_WORDS) {
		if (re.test(d)) {
			soft(test)
			break
		}
	}
	for (const [word, color] of Object.entries(COLOR_WORDS)) {
		if (new RegExp(`\\b${word}\\b`).test(d)) {
			soft((s) => s.color === color)
			break
		}
	}
	if (pool.length > 1) {
		const xs = shapes.map((s) => s.x)
		const ys = shapes.map((s) => s.y)
		const minX = Math.min(...xs)
		const maxX = Math.max(...shapes.map((s) => s.x + s.w))
		const minY = Math.min(...ys)
		const maxY = Math.max(...shapes.map((s) => s.y + s.h))
		for (const [re, score, threshold] of REGION_WORDS) {
			if (!re.test(d)) continue
			const scored = pool.map((s) => {
				const c = center(s)
				return {
					s,
					score: score({
						fx: (c.x - minX) / Math.max(1, maxX - minX),
						fy: (c.y - minY) / Math.max(1, maxY - minY),
					}),
				}
			})
			const clearly = scored.filter((x) => x.score >= threshold)
			// "the box on the right" means the rightmost candidate when nothing is clearly on the right, or several are.
			pool = clearly.length === 1 ? [clearly[0].s] : [scored.sort((a, b) => b.score - a.score)[0].s]
			break
		}
	}
	return pool
}

interface RefContext {
	created: TLShapeId[]
	selected: TLShapeId[]
}

function resolveRef(editor: Editor, ref: Ref, ctx: RefContext): TLShapeId {
	if (typeof ref === 'string') {
		const id = toShapeId(ref)
		if (!editor.getShape(id)) throw new Error(`Unknown shape "${ref}"`)
		return id
	}
	if ('selected' in ref) {
		if (ctx.selected.length === 0) throw new Error('The user has nothing selected')
		if (ctx.selected.length > 1)
			throw new Error(
				`The user has ${ctx.selected.length} shapes selected; name one (${ctx.selected.map(fromShapeId).join(', ')})`
			)
		return ctx.selected[0]
	}
	if ('created' in ref) {
		const index = ref.created === 'last' ? ctx.created.length - 1 : ref.created
		const id = ctx.created[index]
		if (!id || !editor.getShape(id))
			throw new Error(`No created shape at index ${index} (created ${ctx.created.length} so far)`)
		return id
	}
	const shapes = describeShapes(editor)
	if ('text' in ref) {
		const needle = ref.text.toLowerCase()
		const exact = shapes.filter((s) => s.text?.trim().toLowerCase() === needle)
		const matches = exact.length
			? exact
			: shapes.filter((s) => s.text?.toLowerCase().includes(needle))
		if (matches.length === 1) return toShapeId(matches[0].id)
		if (matches.length === 0) throw new Error(`No shape has text containing "${ref.text}"`)
		throw new Error(
			`${matches.length} shapes have text containing "${ref.text}": ${matches.map(summarise).join('; ')}. Use an id or a description.`
		)
	}
	const matches = matchDescription(shapes, ref.description)
	if (matches.length === 1) return toShapeId(matches[0].id)
	if (matches.length === 0) throw new Error(`Nothing matches "${ref.description}"`)
	throw new Error(
		`${matches.length} shapes match "${ref.description}": ${matches.map(summarise).join('; ')}. Add a colour, kind, label, or region, or use an id.`
	)
}

function resolveRefList(editor: Editor, list: RefList, ctx: RefContext): TLShapeId[] {
	if (Array.isArray(list)) return list.map((r) => resolveRef(editor, r, ctx))
	if ('selected' in list) {
		if (ctx.selected.length === 0) throw new Error('The user has nothing selected')
		return ctx.selected
	}
	if ('created' in list) return ctx.created.filter((id) => editor.getShape(id))
	const needle = list.text.toLowerCase()
	const ids = describeShapes(editor)
		.filter((s) => s.text?.toLowerCase().includes(needle))
		.map((s) => toShapeId(s.id))
	if (ids.length === 0) throw new Error(`No shape has text containing "${list.text}"`)
	return ids
}

type Relation = 'above' | 'below' | 'left_of' | 'right_of' | 'inside' | 'centered_on'
type AlignMode = 'start' | 'center' | 'end'

function positionFor(
	subject: Rect,
	target: Rect,
	relation: Relation,
	gap: number,
	align: AlignMode
): { x: number; y: number } {
	const alongX = (a: AlignMode) =>
		a === 'start'
			? target.x
			: a === 'end'
				? target.x + target.w - subject.w
				: target.x + (target.w - subject.w) / 2
	const alongY = (a: AlignMode) =>
		a === 'start'
			? target.y
			: a === 'end'
				? target.y + target.h - subject.h
				: target.y + (target.h - subject.h) / 2
	switch (relation) {
		case 'above':
			return { x: alongX(align), y: target.y - gap - subject.h }
		case 'below':
			return { x: alongX(align), y: target.y + target.h + gap }
		case 'left_of':
			return { x: target.x - gap - subject.w, y: alongY(align) }
		case 'right_of':
			return { x: target.x + target.w + gap, y: alongY(align) }
		case 'inside':
		case 'centered_on':
			return { x: target.x + (target.w - subject.w) / 2, y: target.y + (target.h - subject.h) / 2 }
	}
}

const OPPOSITE: Record<Relation, Relation> = {
	above: 'below',
	below: 'above',
	left_of: 'right_of',
	right_of: 'left_of',
	inside: 'inside',
	centered_on: 'centered_on',
}

interface Placement {
	x: number
	y: number
	/** Set when the request could not be honoured exactly and the solver did something nearby */
	adjusted?: string
	/** Set when no clear spot was found at all and the position overlaps something */
	blocked?: boolean
}

interface OpContext extends BatchContext {
	refs: RefContext
}

/**
 * Room between the target's edge and the nearest obstacle in the placement direction, measured
 * across the subject's span (the corridor the subject would occupy). Infinity when nothing is there.
 */
function freeGap(
	subject: Rect,
	target: Rect,
	relation: Relation,
	align: AlignMode,
	obs: Array<{ id: TLShapeId; rect: Rect }>
): number {
	if (relation === 'inside' || relation === 'centered_on') return Infinity
	const vertical = relation === 'above' || relation === 'below'
	const p = positionFor(subject, target, relation, 0, align)
	const lo = vertical ? p.x : p.y
	const hi = vertical ? p.x + subject.w : p.y + subject.h
	let nearest = Infinity
	for (const { rect: o } of obs) {
		const oLo = vertical ? o.x : o.y
		const oHi = vertical ? o.x + o.w : o.y + o.h
		if (oHi <= lo || oLo >= hi) continue
		const d =
			relation === 'above'
				? target.y - (o.y + o.h)
				: relation === 'below'
					? o.y - (target.y + target.h)
					: relation === 'left_of'
						? target.x - (o.x + o.w)
						: o.x - (target.x + target.w)
		if (d < 0) continue
		nearest = Math.min(nearest, d)
	}
	return nearest
}

/**
 * Find a collision-free spot for `subject` relative to `target`, trying in order: the requested
 * spot; centred in a too-narrow gap on that side; for left/right, the opposite side, then small
 * vertical nudges (leaving the row reads worse than switching sides); for above/below, nudges along
 * the row, then the opposite side. A shape that contains the target (a frame) is not a collision.
 * Returns `blocked` when nothing fits, so the caller may shrink and retry.
 */
function solvePlacement(
	editor: Editor,
	subject: Rect,
	target: Rect,
	relation: Relation,
	gap: number,
	align: AlignMode,
	exclude: Set<TLShapeId>
): Placement {
	const obs = obstacles(editor, exclude)
	const frames = new Set(obs.filter((o) => contains(o.rect, target)).map((o) => o.id))
	const hit = (rect: Rect, slack = CLEARANCE) => collides(rect, obs, slack, frames)
	const tryAt = (rel: Relation, dx: number, dy: number) => {
		const p = positionFor(subject, target, rel, gap, align)
		const rect = { x: p.x + dx, y: p.y + dy, w: subject.w, h: subject.h }
		return hit(rect) ? null : { x: rect.x, y: rect.y }
	}
	const direct = tryAt(relation, 0, 0)
	if (direct) return direct
	const wanted = {
		...positionFor(subject, target, relation, gap, align),
		w: subject.w,
		h: subject.h,
	}
	const blocker = hit(wanted)
	const vertical = relation === 'above' || relation === 'below'
	const sideways = relation !== 'inside' && relation !== 'centered_on'
	if (sideways) {
		const room = freeGap(subject, target, relation, align, obs)
		const extent = vertical ? subject.h : subject.w
		if (room < extent + 2 * gap) {
			if (room >= extent + 2 * MIN_MARGIN) {
				const clear = (room - extent) / 2
				const p = positionFor(subject, target, relation, clear, align)
				const rect = { x: p.x, y: p.y, w: subject.w, h: subject.h }
				if (!hit(rect, Math.min(CLEARANCE, clear - 1))) {
					return {
						x: rect.x,
						y: rect.y,
						adjusted: `centred in the ${Math.round(room)}-unit gap with ${Math.round(clear)} clear on each side`,
					}
				}
			}
		}
	}
	const tryOpposite = () => {
		if (!sideways) return null
		const opp = tryAt(OPPOSITE[relation], 0, 0)
		return opp
			? {
					...opp,
					adjusted: `placed ${OPPOSITE[relation].replace('_', ' ')} instead: ${relation.replace('_', ' ')} was blocked by ${blocker ? fromShapeId(blocker.id) : 'a neighbour'}`,
				}
			: null
	}
	if (!vertical) {
		const opp = tryOpposite()
		if (opp) return opp
	}
	for (const step of vertical ? [20, 40, 60, 90, 120, 160, 200] : [20, 40]) {
		for (const sign of [1, -1]) {
			const p = vertical ? tryAt(relation, sign * step, 0) : tryAt(relation, 0, sign * step)
			if (p)
				return {
					...p,
					adjusted: `nudged ${step} ${vertical ? (sign > 0 ? 'right' : 'left') : sign > 0 ? 'down' : 'up'} to clear ${blocker ? fromShapeId(blocker.id) : 'a neighbour'}`,
				}
		}
	}
	if (vertical) {
		const opp = tryOpposite()
		if (opp) return opp
	}
	if (sideways) {
		const room = freeGap(subject, target, relation, align, obs)
		const extent = vertical ? subject.h : subject.w
		if (room < extent + 2 * MIN_MARGIN) {
			// Best effort: centred in whatever room there is beats overlapping one side.
			const clear = Math.max(0, (room - extent) / 2)
			const p = positionFor(subject, target, relation, clear, align)
			return {
				x: p.x,
				y: p.y,
				blocked: true,
				adjusted: `the ${Math.round(room)}-unit gap ${relation.replace('_', ' ')} the target is too narrow (${Math.round(extent)} needed); centred in it with ${Math.round(clear)} clear`,
			}
		}
	}
	return {
		x: wanted.x,
		y: wanted.y,
		blocked: true,
		adjusted: `overlaps ${blocker ? fromShapeId(blocker.id) : 'a neighbour'}; no clear spot within 200 units`,
	}
}

const SMALLER: Record<CanvasSize, CanvasSize | null> = { xl: 'l', l: 'm', m: 's', s: null }

/**
 * Solve a label's position, dropping its text size when it cannot fit anywhere; the caller moves it.
 * Only text shapes whose size the request did not fix are shrunk.
 */
function placeLabel(
	ctx: OpContext,
	labelId: TLShapeId,
	sizeAdjustable: boolean,
	solve: (label: Rect) => Placement
): Placement {
	const notes: string[] = []
	let p = solve(rectOf(ctx.editor, labelId))
	for (let attempt = 0; attempt < 3 && p.blocked; attempt++) {
		const shape = ctx.editor.getShape(labelId)!
		const size = (shape.props as { size?: CanvasSize }).size ?? 'm'
		const smaller = SMALLER[size]
		if (!sizeAdjustable || shape.type !== 'text' || !smaller) break
		ctx.apply({ type: 'update_shape', shapeId: fromShapeId(labelId), size: smaller })
		notes.push(`text size reduced to ${smaller} to fit`)
		p = solve(rectOf(ctx.editor, labelId))
	}
	if (p.adjusted) notes.push(p.adjusted)
	return { ...p, adjusted: notes.length ? notes.join('; ') : undefined }
}

/** The width a geo shape needs to show `text` on one line at `size`. */
function labelWidthNeeded(editor: Editor, id: TLShapeId, text: string, size: CanvasSize): number {
	const shape = editor.getShape(id)!
	const font = (shape.props as { font?: string }).font ?? 'draw'
	return measureLabel(editor, text, size, font).w + 2 * LABEL_PADDING
}

/** A note when a shape that just grew now sits within CLEARANCE of (or on) a neighbour. */
function crowding(editor: Editor, id: TLShapeId): string | undefined {
	const rect = rectOf(editor, id)
	let worst: { id: TLShapeId; gap: number } | null = null
	for (const o of obstacles(editor, new Set([id]))) {
		if (contains(o.rect, rect) || contains(rect, o.rect)) continue
		const gap = gapBetween(rect, o.rect)
		if (gap < CLEARANCE && (!worst || gap < worst.gap)) worst = { id: o.id, gap }
	}
	if (!worst) return undefined
	return worst.gap < 0
		? `now overlaps ${fromShapeId(worst.id)}`
		: `now only ${Math.round(worst.gap)} clear of ${fromShapeId(worst.id)}`
}

/** Create a new subject at `at`; the caller moves it into place. */
function materialise(
	ctx: OpContext,
	subject: NewSubject & { kind: NonNullable<NewSubject['kind']> },
	at: { x: number; y: number },
	align?: 'start' | 'end'
): TLShapeId {
	const id = subject.id
	let created: string[]
	switch (subject.kind) {
		case 'label':
			created = ctx.apply({
				type: 'create_text',
				id,
				text: subject.text ?? '',
				x: at.x,
				y: at.y,
				color: subject.color,
				size: subject.size,
			})
			break
		case 'note':
			created = ctx.apply({
				type: 'create_note',
				id,
				text: subject.text ?? '',
				x: at.x,
				y: at.y,
				color: subject.color,
			})
			if (subject.w !== undefined || subject.h !== undefined || subject.size !== undefined) {
				ctx.apply({
					type: 'update_shape',
					shapeId: created[0],
					w: subject.w,
					h: subject.h,
					size: subject.size,
				})
			}
			break
		case 'box':
		case 'ellipse':
		case 'shape':
		default: {
			const geo =
				subject.kind === 'box'
					? 'rectangle'
					: subject.kind === 'ellipse'
						? 'ellipse'
						: (subject.geo ?? 'rectangle')
			const text = subject.text ?? ''
			const size = subject.size ?? 'm'
			// Size new boxes from a real measurement of their label so words do not wrap; ellipses need
			// extra room because the label must fit inside the inscribed area.
			const measured = text ? measureLabel(ctx.editor, text, size) : { w: 0, h: 0 }
			const roomFactor = geo === 'ellipse' ? 1.35 : 1
			const w =
				subject.w ?? Math.max(120, Math.ceil(measured.w * roomFactor) + 2 * LABEL_PADDING + 8)
			const h = subject.h ?? Math.max(60, Math.ceil(measured.h * roomFactor) + 2 * LABEL_PADDING)
			created = ctx.apply({
				type: 'create_shape',
				id,
				geo,
				x: at.x,
				y: at.y,
				w,
				h,
				text: subject.text,
				color: subject.color,
				fill: subject.fill,
				dash: subject.dash,
				size,
				align,
			})
			break
		}
	}
	return toShapeId(created[0])
}

/**
 * A new shape placed relative to one of its own kind (a box beside a box, a label under a label)
 * takes that shape's colour, fill, text size, and for boxes its dimensions, unless the op sets them.
 * Siblings that match is what a collaborator expects; anything deliberate is said in the op.
 */
function inheritStyle(
	editor: Editor,
	spec: NewSubject,
	kind: NonNullable<NewSubject['kind']>,
	targetId: TLShapeId
): string | undefined {
	const target = editor.getShape(targetId)
	if (!target) return undefined
	const sameKind =
		(kind === 'label' && target.type === 'text') ||
		(kind === 'note' && target.type === 'note') ||
		((kind === 'box' || kind === 'ellipse' || kind === 'shape') && target.type === 'geo')
	if (!sameKind) return undefined
	const p = target.props as {
		color?: CanvasColor
		fill?: NewSubject['fill']
		dash?: NewSubject['dash']
		size?: CanvasSize
		w?: number
		h?: number
		geo?: string
	}
	const notes: string[] = []
	if (spec.size === undefined && p.size) {
		spec.size = p.size
		notes.push(`size ${p.size}`)
	}
	if (spec.color === undefined && p.color) {
		spec.color = p.color
		notes.push(`color ${p.color}`)
	}
	if (target.type === 'geo') {
		if (spec.fill === undefined && p.fill) {
			spec.fill = p.fill
			if (p.fill !== 'none') notes.push(`fill ${p.fill}`)
		}
		if (spec.dash === undefined && p.dash) {
			spec.dash = p.dash
			if (p.dash !== 'draw') notes.push(`dash ${p.dash}`)
		}
		// Same footprint as the sibling, widened only if the label needs it.
		if (spec.w === undefined && spec.h === undefined && p.w && p.h) {
			const geo =
				kind === 'box' ? 'rectangle' : kind === 'ellipse' ? 'ellipse' : (spec.geo ?? 'rectangle')
			const roomFactor = geo === 'ellipse' ? 1.35 : 1
			const needed = spec.text
				? Math.ceil(measureLabel(editor, spec.text, spec.size ?? 'm').w * roomFactor) +
					2 * LABEL_PADDING +
					8
				: 0
			spec.w = Math.max(p.w, needed)
			spec.h = p.h
			notes.push(`${Math.round(spec.w)}x${Math.round(spec.h)}`)
		}
	}
	return notes.length ? `styled like ${fromShapeId(targetId)} (${notes.join(', ')})` : undefined
}

function moveTo(ctx: OpContext, id: TLShapeId, x: number, y: number) {
	const shape = ctx.editor.getShape(id)!
	// Page bounds may differ from x/y for rotated shapes; we only ever handle unrotated agent shapes.
	const rect = rectOf(ctx.editor, id)
	const dx = x - rect.x
	const dy = y - rect.y
	if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return
	ctx.apply({ type: 'update_shape', shapeId: fromShapeId(id), x: shape.x + dx, y: shape.y + dy })
}

function resolveTargetRect(
	ctx: OpContext,
	target: Ref | { point: { x: number; y: number } }
): { rect: Rect; id?: TLShapeId } {
	if (typeof target === 'object' && 'point' in target)
		return { rect: { x: target.point.x, y: target.point.y, w: 0, h: 0 } }
	const id = resolveRef(ctx.editor, target, ctx.refs)
	return { rect: rectOf(ctx.editor, id), id }
}

/** Where an arrow from `from` towards `to` starts: the middle of the facing edge, a small consistent distance clear of it. */
function arrowTail(from: Rect, to: Rect): { x: number; y: number } {
	const c = center(to)
	const fc = center(from)
	const dx = c.x - fc.x
	const dy = c.y - fc.y
	if (Math.abs(dx) * from.h > Math.abs(dy) * from.w)
		return { x: dx > 0 ? from.x + from.w + ARROW_TAIL_GAP : from.x - ARROW_TAIL_GAP, y: fc.y }
	return { x: fc.x, y: dy > 0 ? from.y + from.h + ARROW_TAIL_GAP : from.y - ARROW_TAIL_GAP }
}

function arrowIsTooShortForLabel(
	editor: Editor,
	text: string,
	from: { x: number; y: number },
	to: { x: number; y: number },
	size: CanvasSize = 'm'
): boolean {
	const dx = Math.abs(to.x - from.x)
	const dy = Math.abs(to.y - from.y)
	const w = measureLabel(editor, text, size).w
	if (w > 48 && dx > dy && dx < w + 68) return true
	return Math.hypot(dx, dy) < w + 2 * CLEARANCE
}

function rectDistance(a: Rect, b: Rect): number {
	const dx = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w), 0)
	const dy = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h), 0)
	return Math.hypot(dx, dy)
}

/** Put a short arrow's text beside its midpoint, on the clearer perpendicular side. */
function placeShortArrowLabel(
	ctx: OpContext,
	labelId: TLShapeId,
	from: { x: number; y: number },
	to: { x: number; y: number }
): string {
	const label = rectOf(ctx.editor, labelId)
	const dx = to.x - from.x
	const dy = to.y - from.y
	const length = Math.max(1, Math.hypot(dx, dy))
	const normal = { x: -dy / length, y: dx / length }
	const midpoint = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }
	const projectedHalf = Math.abs(normal.x) * (label.w / 2) + Math.abs(normal.y) * (label.h / 2)
	const obs = obstacles(ctx.editor, new Set([labelId]))
	const candidates: Array<{ rect: Rect; sign: number; offset: number; room: number }> = []
	for (const sign of [1, -1]) {
		for (let extra = 0; extra <= 400; extra += 10) {
			const offset = projectedHalf + CLEARANCE + extra
			const c = {
				x: midpoint.x + sign * normal.x * offset,
				y: midpoint.y + sign * normal.y * offset,
			}
			const rect = { x: c.x - label.w / 2, y: c.y - label.h / 2, w: label.w, h: label.h }
			if (collides(rect, obs, CLEARANCE - 0.5)) continue
			const room = obs.length ? Math.min(...obs.map((o) => rectDistance(rect, o.rect))) : Infinity
			candidates.push({ rect, sign, offset, room })
			break
		}
	}
	// More open space wins; exact ties preserve the positive-normal side as the stable default.
	const best = candidates.sort((a, b) => b.room - a.room || a.offset - b.offset)[0]
	if (!best)
		throw new Error(`No clear side-label position found within 400 units of the short arrow`)
	moveTo(ctx, labelId, best.rect.x, best.rect.y)
	return `label moved beside the short arrow (${Math.round(length)} units) so it does not hide the shaft`
}

/** Whether an empty geo shape's actual outline contains the padded label rectangle at its centre. */
function labelFitsInside(
	editor: Editor,
	targetId: TLShapeId,
	measured: { w: number; h: number }
): boolean {
	const shape = editor.getShape(targetId)
	if (!shape || shape.type !== 'geo' || (editor.getShapeUtil(shape).getText(shape) ?? '').trim())
		return false
	const geometry = editor.getShapeGeometry(shape)
	const body =
		'children' in geometry && Array.isArray(geometry.children) ? geometry.children[0] : geometry
	const c = body.bounds.center
	const halfW = measured.w / 2 + LABEL_PADDING
	const halfH = measured.h / 2 + LABEL_PADDING
	if (halfW * 2 > body.bounds.w || halfH * 2 > body.bounds.h) return false
	return [
		{ x: c.x - halfW, y: c.y - halfH },
		{ x: c.x + halfW, y: c.y - halfH },
		{ x: c.x + halfW, y: c.y + halfH },
		{ x: c.x - halfW, y: c.y + halfH },
	].every((p) => body.hitTestPoint(p, 0, true))
}

function arrowCrossings(
	editor: Editor,
	label: Rect,
	target: Rect,
	exclude: Set<TLShapeId>
): number {
	const from = arrowTail(label, target)
	const to = center(target)
	return obstacles(editor, exclude).filter((o) => segmentCrossesRect(from, to, o.rect)).length
}

function applyOp(ctx: OpContext, op: CanvasOp, index: number): OpResult {
	const { editor } = ctx
	if ('text' in op && typeof op.text === 'string' && op.text.includes('\\n')) {
		op = { ...op, text: op.text.replace(/\\n/g, '\n') }
	}
	const ok = (shapeIds: TLShapeId[], message: string, adjusted?: string): OpResult => ({
		index,
		op: op.op,
		ok: true,
		shapeIds: shapeIds.map(fromShapeId),
		message,
		adjusted,
	})
	switch (op.op) {
		case 'path': {
			const { op: _op, ...fields } = op
			const ids = ctx.apply({ type: 'create_path', ...fields }).map(toShapeId)
			return ok(
				ids,
				`Created ${op.closed ? 'closed outline' : op.smooth ? 'curve' : 'polyline'} at the supplied page points.`
			)
		}
		case 'duplicate': {
			const source = resolveRef(editor, op.subject, ctx.refs)
			const ids = ctx
				.apply({
					type: 'duplicate_shape',
					shapeId: fromShapeId(source),
					id: op.id,
					x: op.at.x,
					y: op.at.y,
					text: op.text,
				})
				.map(toShapeId)
			return ok(ids, `Copied ${fromShapeId(source)} with matching style and dimensions`)
		}
		case 'add': {
			const kind =
				op.kind ?? (op.w !== undefined || op.h !== undefined || op.geo ? 'shape' : 'label')
			const spec: NewSubject & { kind: typeof kind } = {
				kind,
				text: op.text,
				id: op.id,
				geo: op.geo,
				w: op.w,
				h: op.h,
				color: op.color,
				fill: op.fill,
				dash: op.dash,
				size: op.size,
			}
			if (op.at || !op.target) {
				const pos = op.at ? { x: op.at.x, y: op.at.y } : { x: 100, y: 100 }
				const align = op.at && op.align && op.align !== 'center' ? op.align : undefined
				const id = materialise(ctx, spec, pos, align)
				return ok([id], `${fromShapeId(id)} at ${fmt(rectOf(editor, id))}`)
			}
			const targetId = resolveRef(editor, op.target, ctx.refs)
			const relation = op.relation ?? 'below'
			const target = rectOf(editor, targetId)
			const gap = op.gap ?? 24
			const align = op.align ?? 'center'
			const styled = inheritStyle(editor, spec, kind, targetId)
			const id = materialise(ctx, spec, { x: target.x, y: target.y - 10_000 })
			const exclude = new Set([id, targetId])
			const p = placeLabel(ctx, id, kind === 'label' && op.size === undefined, (r) =>
				solvePlacement(editor, r, target, relation, gap, align, exclude)
			)
			moveTo(ctx, id, p.x, p.y)
			return ok(
				[id],
				`${fromShapeId(id)} ${relation.replace('_', ' ')} ${fromShapeId(targetId)} at ${fmt(rectOf(editor, id))}`,
				[styled, p.adjusted].filter(Boolean).join('; ') || undefined
			)
		}
		case 'place': {
			const subjectId = resolveRef(editor, op.subject, ctx.refs)
			if (
				op.w !== undefined ||
				op.h !== undefined ||
				op.text !== undefined ||
				op.color !== undefined ||
				op.fill !== undefined ||
				op.dash !== undefined ||
				op.size !== undefined
			) {
				ctx.apply({
					type: 'update_shape',
					shapeId: fromShapeId(subjectId),
					w: op.w,
					h: op.h,
					text: op.text,
					color: op.color,
					fill: op.fill,
					dash: op.dash,
					size: op.size,
				})
			}
			if (op.at) {
				moveTo(ctx, subjectId, op.at.x, op.at.y)
				return ok(
					[subjectId],
					`${fromShapeId(subjectId)} moved to ${fmt(rectOf(editor, subjectId))}`
				)
			}
			if (!op.target || !op.relation) {
				return ok([subjectId], `${fromShapeId(subjectId)} at ${fmt(rectOf(editor, subjectId))}`)
			}
			const targetId = resolveRef(editor, op.target, ctx.refs)
			const target = rectOf(editor, targetId)
			const gap = op.gap ?? 24
			const align = op.align ?? 'center'
			const exclude = new Set([subjectId, targetId])
			const relation = op.relation
			const p = placeLabel(ctx, subjectId, false, (r) =>
				solvePlacement(editor, r, target, relation, gap, align, exclude)
			)
			moveTo(ctx, subjectId, p.x, p.y)
			return ok(
				[subjectId],
				`${fromShapeId(subjectId)} ${op.relation.replace('_', ' ')} ${fromShapeId(targetId)} at ${fmt(rectOf(editor, subjectId))}`,
				p.adjusted
			)
		}
		case 'label': {
			const { rect: target, id: targetId } = resolveTargetRect(ctx, op.target)
			const isPoint = target.w === 0 && target.h === 0
			const wantArrow = op.arrow ?? isPoint
			const size = op.size ?? 'm'
			const measured = measureLabel(editor, op.text, size)
			const labelId = materialise(
				ctx,
				{ kind: 'label', text: op.text, color: op.color, size, id: op.id },
				{ x: target.x, y: target.y - 10_000 }
			)
			if (targetId && labelFitsInside(editor, targetId, measured)) {
				const label = rectOf(editor, labelId)
				moveTo(
					ctx,
					labelId,
					target.x + (target.w - label.w) / 2,
					target.y + (target.h - label.h) / 2
				)
				return ok(
					[labelId],
					`label "${op.text}" centred inside ${fromShapeId(targetId)} at ${fmt(rectOf(editor, labelId))}, without an arrow`,
					`placed inside because the padded label fits and the target has no text of its own${wantArrow ? '; omitted the requested arrow' : ''}`
				)
			}
			const gap = op.gap ?? (wantArrow ? (isPoint ? 60 : 40) : 16)
			const sides: Relation[] =
				op.side && op.side !== 'auto'
					? [
							{ above: 'above', below: 'below', left: 'left_of', right: 'right_of' }[
								op.side
							] as Relation,
						]
					: ['above', 'right_of', 'below', 'left_of']
			const exclude = new Set<TLShapeId>([labelId, ...(targetId ? [targetId] : [])])
			// The first side that fits exactly; otherwise the first side that is at least clear; otherwise the first side.
			const solveSides = (label: Rect): Placement => {
				const candidates = sides.map((side) => {
					const placement = solvePlacement(editor, label, target, side, gap, 'center', exclude)
					const rect = { x: placement.x, y: placement.y, w: label.w, h: label.h }
					return {
						side,
						placement,
						crossings: wantArrow ? arrowCrossings(editor, rect, target, exclude) : 0,
					}
				})
				const firstFit =
					candidates.find((c) => !c.placement.adjusted) ??
					candidates.find((c) => !c.placement.blocked) ??
					candidates[0]
				let best = firstFit
				if (wantArrow) {
					const pool = candidates.some((c) => !c.placement.blocked)
						? candidates.filter((c) => !c.placement.blocked)
						: candidates
					best = pool.reduce((winner, candidate) =>
						candidate.crossings < winner.crossings ? candidate : winner
					)
				}
				if (wantArrow && best !== firstFit) {
					const note = `${best.side.replace('_', ' ')} chosen over first-fitting ${firstFit.side.replace('_', ' ')}: ${best.crossings} rather than ${firstFit.crossings} arrow crossing(s)`
					return {
						...best.placement,
						adjusted: [best.placement.adjusted, note].filter(Boolean).join('; '),
					}
				}
				return best.placement
			}
			const best = placeLabel(ctx, labelId, op.size === undefined, solveSides)
			moveTo(ctx, labelId, best.x, best.y)
			const ids = [labelId]
			let arrowAdjustment: string | undefined
			if (wantArrow) {
				const from = arrowTail(rectOf(editor, labelId), target)
				const arrowId = ctx.apply({
					type: 'create_arrow',
					id: op.id ? `${op.id}-arrow` : undefined,
					from,
					to: targetId ? { shapeId: fromShapeId(targetId) } : { x: target.x, y: target.y },
					color: op.color,
				})
				ids.push(toShapeId(arrowId[0]))
				const ends = describeShapes(editor).find((s) => s.id === arrowId[0])?.arrowEnds
				if (ends && arrowIsTooShortForLabel(editor, op.text, ends.start, ends.end, size))
					arrowAdjustment = `short arrow kept free of text; its label is already beside the shaft`
			}
			return ok(
				ids,
				`label "${op.text}" at ${fmt(rectOf(editor, labelId))}${wantArrow ? ' with an arrow' : ''}`,
				[best.adjusted, arrowAdjustment].filter(Boolean).join('; ') || undefined
			)
		}
		case 'connect': {
			const terminal = (t: Ref | { point: { x: number; y: number } }) => {
				if (typeof t === 'object' && 'point' in t)
					return { action: { x: t.point.x, y: t.point.y }, point: t.point }
				const id = resolveRef(editor, t, ctx.refs)
				return { action: { shapeId: fromShapeId(id) }, point: center(rectOf(editor, id)) }
			}
			const from = terminal(op.from)
			const to = terminal(op.to)
			const existingArrow = op.id ? editor.getShape(toShapeId(op.id)) : undefined
			const existingProps =
				existingArrow?.type === 'arrow'
					? (existingArrow.props as unknown as {
							color?: CanvasColor
							dash?: 'solid' | 'dashed' | 'dotted' | 'draw'
						})
					: undefined
			// Replacing an arrow keeps its text unless the op gives new text; a side label the old
			// arrow had is re-made below if the new shaft is short.
			const text =
				op.text ??
				(existingArrow ? editor.getShapeUtil(existingArrow).getText(existingArrow) : undefined)
			if (existingArrow?.type === 'arrow') {
				const oldLabel = editor.getShape(toShapeId(`${op.id}-label`))
				ctx.apply({
					type: 'delete_shapes',
					shapeIds: [
						fromShapeId(existingArrow.id),
						...(oldLabel ? [fromShapeId(oldLabel.id)] : []),
					],
				})
			}
			// Bind first so the decision uses the visible, clipped shaft rather than the distance between
			// shape centres. A label is applied to the arrow only after the shaft proves long enough.
			const created = ctx.apply({
				type: 'create_arrow',
				id: op.id,
				from: from.action,
				to: to.action,
				color: op.color ?? existingProps?.color,
				dash: op.dash ?? (existingProps?.dash as never),
			})
			const ids = [toShapeId(created[0])]
			const ends = describeShapes(editor).find((s) => s.id === created[0])?.arrowEnds
			const visibleFrom = ends?.start ?? from.point
			const visibleTo = ends?.end ?? to.point
			const short = !!text && arrowIsTooShortForLabel(editor, text, visibleFrom, visibleTo)
			let adjusted: string | undefined
			if (short) {
				const labelId = materialise(
					ctx,
					{
						kind: 'label',
						text: text!,
						color: op.color,
						size: 'm',
						id: op.id ? `${op.id}-label` : undefined,
					},
					{ x: (visibleFrom.x + visibleTo.x) / 2, y: (visibleFrom.y + visibleTo.y) / 2 }
				)
				adjusted = placeShortArrowLabel(ctx, labelId, visibleFrom, visibleTo)
				ids.push(labelId)
			} else if (text) ctx.apply({ type: 'update_shape', shapeId: created[0], text })
			return ok(
				ids,
				`arrow ${created[0]} from ${'shapeId' in from.action ? from.action.shapeId : `(${from.action.x}, ${from.action.y})`} to ${'shapeId' in to.action ? to.action.shapeId : `(${to.action.x}, ${to.action.y})`}${short ? `; label "${text}" beside it` : ''}`,
				adjusted
			)
		}
		case 'rename': {
			const id = resolveRef(editor, op.target, ctx.refs)
			const shape = editor.getShape(id)!
			const rect = rectOf(editor, id)
			const props = shape.props as { size?: CanvasSize; w?: number }
			const size = props.size ?? 'm'
			let needed = shape.type === 'geo' ? labelWidthNeeded(editor, id, op.text, size) : 0
			if (shape.type === 'geo' && needed > rect.w) {
				for (const s of editor.getCurrentPageShapes()) {
					if (s.id === id || s.type !== 'geo') continue
					const b = rectOf(editor, s.id)
					if (
						b.w > rect.w + 16 &&
						rect.x >= b.x &&
						rect.y >= b.y &&
						rect.x + rect.w <= b.x + b.w + 4 &&
						rect.y + rect.h <= b.y + b.h + 4
					) {
						needed = Math.min(needed, Math.floor(b.x + b.w - rect.x - 10))
					}
				}
			}
			const fit = op.fit ?? 'widen'
			const update: Extract<CanvasAction, { type: 'update_shape' }> = {
				type: 'update_shape',
				shapeId: fromShapeId(id),
				text: op.text,
			}
			let adjusted: string | undefined
			if (shape.type === 'geo' && needed > rect.w) {
				if (fit === 'widen') {
					update.w = needed
					adjusted = `widened to ${Math.round(needed)} so the label stays on one line`
				} else if (fit === 'shrink_text') {
					update.size = SMALLER[size] ?? 's'
					adjusted = `text size reduced to ${update.size} to fit`
				}
			}
			ctx.apply(update)
			const crowded = update.w !== undefined ? crowding(editor, id) : undefined
			return ok(
				[id],
				`${fromShapeId(id)} renamed to "${op.text}"`,
				[adjusted, crowded].filter(Boolean).join('; ') || undefined
			)
		}
		case 'restyle': {
			const ids = resolveRefList(editor, op.targets, ctx.refs)
			let like: { color?: string; fill?: string; dash?: string; size?: string } = {}
			if (op.like) {
				const ref = editor.getShape(resolveRef(editor, op.like, ctx.refs))!
				const p = ref.props as typeof like
				like = { color: p.color, fill: p.fill, dash: p.dash, size: p.size }
			}
			for (const id of ids) {
				ctx.apply({
					type: 'update_shape',
					shapeId: fromShapeId(id),
					color: (op.color ?? like.color) as CanvasColor | undefined,
					fill: (op.fill ?? like.fill) as never,
					dash: (op.dash ?? like.dash) as never,
					size: (op.size ?? like.size) as never,
				})
			}
			return ok(ids, `restyled ${ids.length} shape(s)`)
		}
		case 'remove': {
			const ids = resolveRefList(editor, op.targets, ctx.refs)
			ctx.apply({ type: 'delete_shapes', shapeIds: ids.map(fromShapeId) })
			return ok(ids, `removed ${ids.length} shape(s)`)
		}
		case 'untangle': {
			const ids = resolveRefList(editor, op.targets, ctx.refs)
			const anchors = op.keepNear?.map((r) => resolveRef(editor, r, ctx.refs))
			const maxDistance = op.maxDistance ?? 60
			const moved: TLShapeId[] = []
			const stuck: string[] = []
			for (const [i, id] of ids.entries()) {
				const rect = rectOf(editor, id)
				const anchorRect = anchors?.[i] ? rectOf(editor, anchors[i]) : rect
				const obs = obstacles(editor, new Set([id]))
				if (!collides(rect, obs, 2)) continue
				const ac = center(anchorRect)
				let placed = false
				outer: for (let r = 10; r <= maxDistance; r += 10) {
					for (let k = 0; k < 16; k++) {
						const angle = (k * Math.PI) / 8
						const cand = {
							x:
								ac.x +
								r * Math.cos(angle) -
								rect.w / 2 +
								(anchorRect.w / 2 + MIN_MARGIN) * Math.cos(angle),
							y:
								ac.y +
								r * Math.sin(angle) -
								rect.h / 2 +
								(anchorRect.h / 2 + MIN_MARGIN) * Math.sin(angle),
							w: rect.w,
							h: rect.h,
						}
						if (!collides(cand, obs, 2)) {
							moveTo(ctx, id, cand.x, cand.y)
							moved.push(id)
							placed = true
							break outer
						}
					}
				}
				if (!placed) stuck.push(fromShapeId(id))
			}
			return ok(
				moved,
				`moved ${moved.length} of ${ids.length} shape(s) apart`,
				stuck.length
					? `could not clear: ${stuck.join(', ')} (within ${maxDistance} of their anchors)`
					: undefined
			)
		}
		case 'resize': {
			const id = resolveRef(editor, op.target, ctx.refs)
			const rect = rectOf(editor, id)
			const shape = editor.getShape(id)!
			if (shape.type === 'line' || shape.type === 'draw' || shape.type === 'arrow') {
				throw new Error(`resize does not support ${shape.type} shapes`)
			}
			const uniform = shape.type === 'note' || shape.type === 'text'
			const factor = uniform
				? Math.min(
						op.w === undefined ? Infinity : op.w / rect.w,
						op.h === undefined ? Infinity : op.h / rect.h
					)
				: Infinity
			const uniformScale = Number.isFinite(factor) ? factor : (op.scale ?? 1)
			const w = uniform ? rect.w * uniformScale : (op.w ?? (op.scale ? rect.w * op.scale : rect.w))
			const h = uniform ? rect.h * uniformScale : (op.h ?? (op.scale ? rect.h * op.scale : rect.h))
			const geometry = editor.getShapeGeometry(shape).bounds
			const currentScale = (shape.props as { scale?: number }).scale ?? 1
			const update: Extract<CanvasAction, { type: 'update_shape' }> = {
				type: 'update_shape',
				shapeId: fromShapeId(id),
				w: uniform ? (geometry.w / currentScale) * (currentScale * uniformScale) : w,
				h: uniform ? (geometry.h / currentScale) * (currentScale * uniformScale) : h,
			}
			if (op.anchor === 'center' && !uniform) {
				// rect is page space and update_shape writes parent space: move by the delta.
				update.x = shape.x - (w - rect.w) / 2
				update.y = shape.y - (h - rect.h) / 2
			}
			ctx.apply(update)
			if (uniform && op.anchor === 'center') {
				const resized = rectOf(editor, id)
				ctx.apply({
					type: 'update_shape',
					shapeId: fromShapeId(id),
					x: shape.x + (rect.x + rect.w / 2) - (resized.x + resized.w / 2),
					y: shape.y + (rect.y + rect.h / 2) - (resized.y + resized.h / 2),
				})
			}
			const actual = rectOf(editor, id)
			return ok(
				[id],
				`${fromShapeId(id)} resized to ${Math.round(actual.w)}x${Math.round(actual.h)}`,
				crowding(editor, id)
			)
		}
	}
}

/** Whether the segment from `a` to `b` enters `rect` (Liang–Barsky clipping). */
function segmentCrossesRect(
	a: { x: number; y: number },
	b: { x: number; y: number },
	rect: Rect
): boolean {
	const dx = b.x - a.x
	const dy = b.y - a.y
	let t0 = 0
	let t1 = 1
	const edges: Array<[number, number]> = [
		[-dx, a.x - rect.x],
		[dx, rect.x + rect.w - a.x],
		[-dy, a.y - rect.y],
		[dy, rect.y + rect.h - a.y],
	]
	for (const [p, q] of edges) {
		if (p === 0) {
			if (q < 0) return false
			continue
		}
		const t = q / p
		if (p < 0) t0 = Math.max(t0, t)
		else t1 = Math.min(t1, t)
		if (t0 > t1) return false
	}
	return true
}

/**
 * Apply one op atomically: an op that throws partway (an ambiguous ref after an update, an id that
 * already exists after a create) is rolled back, so a failed op never leaves half an edit behind.
 *
 * Rolled back through the history manager rather than a signal transaction, which would restore the
 * store but leave the half-edit in the pending undo entry, to come back on undo then redo.
 */
function runOp(ctx: OpContext, op: CanvasOp, index: number, errors: string[]): OpResult {
	const created = [ctx.journal.created.length, ctx.memory.created.length]
	const mark = ctx.editor.markHistoryStoppingPoint('canvas op')
	try {
		return applyOp(ctx, op, index)
	} catch (e) {
		ctx.editor.bailToMark(mark)
		ctx.journal.created.length = created[0]
		ctx.memory.created.length = created[1]
		const message = (e as Error).message
		errors.push(`Op ${index} (${op.op}): ${message}`)
		return { index, op: op.op, ok: false, shapeIds: [], message }
	}
}

/**
 * Apply ops as one batch (one undo step). A failing op is reported and the rest still run.
 *
 * `{ selected: true }` is this editor's own selection, since a batch runs in the tab of the user it
 * is for. Presence is never consulted: its records are whatever a client sent.
 */
export function applyOps(
	editor: Editor,
	ops: CanvasOp[],
	attribution: Attribution = {}
): ApplyOpsResult {
	const results: OpResult[] = []
	const errors: string[] = []
	const selected = editor.getSelectedShapeIds()
	let createdIds: string[] = []
	const batchId = runBatch(editor, attribution, (batch) => {
		const ctx: OpContext = { ...batch, refs: { created: batch.memory.created, selected } }
		for (const [index, op] of ops.entries()) results.push(runOp(ctx, op, index, errors))
		createdIds = batch.journal.created.map(fromShapeId)
	})
	return { batchId, applied: results.filter((r) => r.ok).length, createdIds, errors, results }
}
