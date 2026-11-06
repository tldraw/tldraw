import { type Editor, type TLArrowBinding, type TLShape } from 'tldraw'
import { fromShapeId, LABEL_PADDING, measureLabel, runBatch, toShapeId } from '../actions'
import type { CanvasAction, CanvasSize } from '../schema'

export interface ShapeState {
	id: string
	type: string
	geo?: string
	x: number
	y: number
	w: number
	h: number
	text: string
	color?: string
	/** Arrows: the shape each end is bound to */
	start?: string
	end?: string
}

/** Seed a board with bare actions, outside any agent attribution. */
export function seed(editor: Editor, actions: CanvasAction[]) {
	runBatch(editor, {}, (ctx) => {
		for (const action of actions) ctx.apply(action)
	})
}

/** A box with a label, the usual card. */
export function card(
	id: string,
	text: string,
	x: number,
	y: number,
	w = 200,
	h = 100
): CanvasAction {
	return { type: 'create_shape', id, geo: 'rectangle', x, y, w, h, text }
}

export function snapshot(editor: Editor): Map<string, ShapeState> {
	const out = new Map<string, ShapeState>()
	for (const shape of editor.getCurrentPageShapesSorted()) {
		const b = editor.getShapePageBounds(shape)!
		const props = shape.props as { geo?: string; color?: string }
		const state: ShapeState = {
			id: fromShapeId(shape.id),
			type: shape.type,
			geo: props.geo,
			x: b.x,
			y: b.y,
			w: b.w,
			h: b.h,
			text: editor.getShapeUtil(shape).getText(shape) ?? '',
			color: props.color,
		}
		if (shape.type === 'arrow') {
			for (const binding of editor.getBindingsFromShape<TLArrowBinding>(shape, 'arrow')) {
				state[binding.props.terminal] = fromShapeId(binding.toId)
			}
		}
		out.set(state.id, state)
	}
	return out
}

type Board = Map<string, ShapeState>
export function shapes(board: Board) {
	return [...board.values()]
}
export function solids(board: Board) {
	return shapes(board).filter((s) => !['arrow', 'line', 'draw'].includes(s.type))
}
export function arrows(board: Board) {
	return shapes(board).filter((s) => s.type === 'arrow')
}
export function boundArrows(board: Board) {
	return arrows(board).filter((a) => a.start && a.end)
}

/** The one shape whose text matches; throws when there is none or more than one. */
export function byText(board: Map<string, ShapeState>, pattern: RegExp): ShapeState {
	const found = shapes(board).filter((s) => pattern.test(s.text))
	if (found.length !== 1) throw new Error(`${found.length} shapes match ${pattern}`)
	return found[0]
}

type Rect = Pick<ShapeState, 'x' | 'y' | 'w' | 'h'>
const EPS = 0.5
export function contains(outer: Rect, inner: Rect) {
	return (
		inner.x >= outer.x - EPS &&
		inner.y >= outer.y - EPS &&
		inner.x + inner.w <= outer.x + outer.w + EPS &&
		inner.y + inner.h <= outer.y + outer.h + EPS
	)
}
export function overlaps(a: Rect, b: Rect) {
	return (
		a.x < b.x + b.w - EPS && b.x < a.x + a.w - EPS && a.y < b.y + b.h - EPS && b.y < a.y + a.h - EPS
	)
}

/**
 * What a person would call a broken board: solid shapes that overlap without one containing the
 * other, text that straddles a container's border, and geo labels with a word too wide for the box.
 */
export function boardProblems(editor: Editor, board = snapshot(editor)): string[] {
	const problems: string[] = []
	const list = solids(board)
	for (const [i, a] of list.entries()) {
		for (const b of list.slice(i + 1)) {
			if (!overlaps(a, b) || contains(a, b) || contains(b, a)) continue
			const text = a.type === 'text' ? a : b.type === 'text' ? b : null
			problems.push(
				text
					? `text ${text.id} crosses the border of ${text === a ? b.id : a.id}`
					: `${a.id} overlaps ${b.id}`
			)
		}
	}
	for (const s of list) {
		if (s.type !== 'geo' || !s.text) continue
		const shape = editor.getShape(toShapeId(s.id)) as TLShape
		const size = ((shape.props as { size?: CanvasSize }).size ?? 'm') as CanvasSize
		const widest = Math.max(
			...s.text.split(/\s+/).map((word) => measureLabel(editor, word, size).w)
		)
		if (widest + 2 * LABEL_PADDING > s.w + 1) problems.push(`the label of ${s.id} spills out of it`)
	}
	return problems
}

/** Ids of shapes from `before` that moved, resized, changed text, or were removed. */
export function changed(
	before: Map<string, ShapeState>,
	after: Map<string, ShapeState>,
	ids?: string[]
) {
	const out: string[] = []
	for (const id of ids ?? before.keys()) {
		const a = before.get(id)
		const b = after.get(id)
		if (!a) throw new Error(`No shape ${id} before`)
		if (
			!b ||
			Math.abs(a.x - b.x) > 1 ||
			Math.abs(a.y - b.y) > 1 ||
			Math.abs(a.w - b.w) > 1 ||
			Math.abs(a.h - b.h) > 1 ||
			a.text !== b.text ||
			a.color !== b.color
		) {
			out.push(id)
		}
	}
	return out
}
