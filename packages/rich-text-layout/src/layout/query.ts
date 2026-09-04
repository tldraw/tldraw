import { getMeasureContext } from '../measure/install'
import { MeasureContext } from '../measure/types'
import { Fragment, TextLayout } from './types'

/**
 * A position in the source document: the index path of a text node and a character offset
 * within it, the same coordinates `Fragment.source` uses.
 *
 * @public
 */
export interface DocPosition {
	path: number[]
	offset: number
}

/** @public */
export interface HitResult {
	position: DocPosition
	lineIndex: number
	/** Index of the fragment within the line. */
	fragmentIndex: number
	/** Whether the point was past the end of the fragment's text (the caret goes after it). */
	trailing: boolean
}

/** @public */
export interface CaretRect {
	x: number
	y: number
	height: number
	lineIndex: number
}

/** @public */
export interface Rect {
	x: number
	y: number
	width: number
	height: number
}

/**
 * Compare two document positions in document order.
 *
 * @public
 */
export function compareDocPositions(a: DocPosition, b: DocPosition): number {
	const n = Math.min(a.path.length, b.path.length)
	for (let i = 0; i < n; i++) {
		if (a.path[i] !== b.path[i]) return a.path[i] - b.path[i]
	}
	if (a.path.length !== b.path.length) return a.path.length - b.path.length
	return a.offset - b.offset
}

let graphemeSegmenter: Intl.Segmenter | null = null

/**
 * Hit-testing and selection geometry over a `TextLayout`. Sub-fragment positions are measured
 * with the given context (the installed one by default) and cached per fragment.
 *
 * @public
 */
export class LayoutQuery {
	private readonly advances = new WeakMap<Fragment, { offsets: number[]; xs: number[] }>()
	private readonly measure: MeasureContext

	constructor(
		readonly layout: TextLayout,
		measure?: MeasureContext
	) {
		this.measure = measure ?? getMeasureContext()
	}

	/**
	 * Grapheme boundaries of a fragment as text offsets and x positions relative to the fragment.
	 * Right-to-left fragments (odd bidi level) are painted with logical offset 0 at their right
	 * edge, so their xs run from `width` down to 0.
	 */
	private graphemes(fragment: Fragment) {
		let cached = this.advances.get(fragment)
		if (cached) return cached
		graphemeSegmenter ??= new Intl.Segmenter(undefined, { granularity: 'grapheme' })
		const offsets = [0]
		const xs = [0]
		let prefix = ''
		for (const { segment } of graphemeSegmenter.segment(fragment.text)) {
			prefix += segment
			offsets.push(prefix.length)
			xs.push(
				this.measure.measure(prefix, fragment.style.font).width +
					fragment.style.letterSpacing * (offsets.length - 1)
			)
		}
		// Justified or tab-stretched fragments are wider than their text; scale to match.
		const natural = xs[xs.length - 1]
		if (natural > 0 && Math.abs(natural - fragment.width) > 0.01) {
			const k = fragment.width / natural
			for (let i = 0; i < xs.length; i++) xs[i] *= k
		} else if (natural === 0 && xs.length > 1) {
			// A fragment whose text measures as nothing (a tab) still spans its advance.
			for (let i = 0; i < xs.length; i++) xs[i] = (fragment.width * i) / (xs.length - 1)
		}
		if (fragment.level % 2 === 1) {
			for (let i = 0; i < xs.length; i++) xs[i] = fragment.width - xs[i]
		}
		cached = { offsets, xs }
		this.advances.set(fragment, cached)
		return cached
	}

	private lineAt(y: number): number {
		const { lines } = this.layout
		if (lines.length === 0) return -1
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i]
			if (y < line.y + line.height) return i
		}
		return lines.length - 1
	}

	/**
	 * The document position under a point. Points outside any text snap to the nearest line and
	 * the nearest edge of its nearest fragment, like a browser caret.
	 */
	hitTest(x: number, y: number): HitResult | null {
		const lineIndex = this.lineAt(y)
		if (lineIndex < 0) return null
		const line = this.layout.lines[lineIndex]
		const fragments = line.fragments.filter((f) => f.kind !== 'marker')
		if (fragments.length === 0) return null

		// nearest fragment horizontally
		let best = 0
		let bestDistance = Infinity
		for (let i = 0; i < fragments.length; i++) {
			const f = fragments[i]
			const left = line.x + f.x
			const right = left + f.width
			const distance = x < left ? left - x : x > right ? x - right : 0
			if (distance < bestDistance) {
				bestDistance = distance
				best = i
			}
		}
		const fragment = fragments[best]
		const { offsets, xs } = this.graphemes(fragment)
		const local = x - (line.x + fragment.x)
		// nearest grapheme boundary
		let index = 0
		for (let i = 1; i < xs.length; i++) {
			if (Math.abs(xs[i] - local) <= Math.abs(xs[index] - local)) index = i
		}
		const trailing = index === offsets.length - 1
		return {
			position: {
				path: fragment.source.path,
				offset: fragment.source.from + offsets[index],
			},
			lineIndex,
			fragmentIndex: line.fragments.indexOf(fragment),
			trailing,
		}
	}

	/** Where a caret at a document position is drawn, or null if the position isn't in the layout. */
	caretRect(position: DocPosition): CaretRect | null {
		const located = this.locate(position)
		if (!located) return null
		const { line, lineIndex, fragment, x } = located
		return {
			x,
			y: line.y + line.baseline + fragment.baselineShift - fragment.ascent,
			height: fragment.ascent + fragment.descent,
			lineIndex,
		}
	}

	/**
	 * Rectangles covering a document range, one per line. Marker fragments are never included;
	 * an empty line inside the range contributes a zero-width rect at its start, and a collapsed
	 * range gives the single zero-width rect of its caret.
	 */
	rangeRects(anchor: DocPosition, head: DocPosition): Rect[] {
		let from = anchor
		let to = head
		const order = compareDocPositions(from, to)
		if (order > 0) [from, to] = [to, from]
		if (order === 0) {
			// A wrap offset belongs to both the end of one line and the start of the next; the
			// caret rule picks one so the collapsed range doesn't get a rect on each line.
			const caret = this.caretRect(from)
			if (caret) return [{ x: caret.x, y: caret.y, width: 0, height: caret.height }]
		}
		const rects: Rect[] = []
		this.layout.lines.forEach((line, lineIndex) => {
			let left = Infinity
			let right = -Infinity
			let top = Infinity
			let bottom = -Infinity
			for (const f of line.fragments) {
				if (f.kind === 'marker') continue
				const start: DocPosition = { path: f.source.path, offset: f.source.from }
				const end: DocPosition = { path: f.source.path, offset: f.source.to }
				if (compareDocPositions(end, from) < 0 || compareDocPositions(start, to) > 0) continue
				// Logical offsets within the fragment, then their x positions: in a right-to-left
				// fragment the end offset is the left edge, so the rect spans min..max of the two.
				const fromOffset = compareDocPositions(from, start) > 0 ? from.offset - f.source.from : 0
				const toOffset =
					compareDocPositions(to, end) < 0 ? to.offset - f.source.from : f.text.length
				if (toOffset <= fromOffset && f.text.length > 0 && !(from.offset === to.offset)) continue
				const a = this.xAt(f, fromOffset)
				const b = this.xAt(f, toOffset)
				left = Math.min(left, line.x + f.x + Math.min(a, b))
				right = Math.max(right, line.x + f.x + Math.max(a, b))
				top = Math.min(top, line.y + line.baseline + f.baselineShift - f.ascent)
				bottom = Math.max(bottom, line.y + line.baseline + f.baselineShift + f.descent)
			}
			if (left !== Infinity) {
				rects.push({ x: left, y: top, width: right - left, height: bottom - top })
			} else if (
				line.fragments.every((f) => f.kind === 'marker') &&
				this.lineInRange(lineIndex, from, to)
			) {
				rects.push({ x: line.x, y: line.y, width: 0, height: line.height })
			}
		})
		return rects
	}

	private lineInRange(lineIndex: number, from: DocPosition, to: DocPosition) {
		// An empty line has no fragments to compare; it is inside the range when a line before
		// it starts the range and a line after it ends it.
		const { lines } = this.layout
		const before = lines.slice(0, lineIndex).flatMap((l) => l.fragments)
		const after = lines.slice(lineIndex + 1).flatMap((l) => l.fragments)
		const started =
			before.some(
				(f) =>
					f.kind !== 'marker' &&
					compareDocPositions({ path: f.source.path, offset: f.source.from }, from) >= 0
			) ||
			before.some(
				(f) =>
					f.kind !== 'marker' &&
					compareDocPositions({ path: f.source.path, offset: f.source.to }, from) >= 0
			)
		const continues = after.some(
			(f) =>
				f.kind !== 'marker' &&
				compareDocPositions({ path: f.source.path, offset: f.source.from }, to) <= 0
		)
		return started && continues
	}

	private xAt(fragment: Fragment, offset: number): number {
		const { offsets, xs } = this.graphemes(fragment)
		let index = 0
		for (let i = 0; i < offsets.length; i++) if (offsets[i] <= offset) index = i
		return xs[index]
	}

	private locate(position: DocPosition) {
		const { lines } = this.layout
		for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
			const line = lines[lineIndex]
			for (const fragment of line.fragments) {
				if (fragment.kind === 'marker') continue
				const { path, from, to } = fragment.source
				if (path.length !== position.path.length || path.some((p, i) => p !== position.path[i])) {
					continue
				}
				if (position.offset < from || position.offset > to) continue
				// An offset shared by two fragments belongs to the later one's start, except at the
				// end of a line, where the caret stays on that line.
				const last = line.fragments[line.fragments.length - 1] === fragment
				if (position.offset === to && !last && to !== from) {
					const next = line.fragments[line.fragments.indexOf(fragment) + 1]
					if (next.kind !== 'marker' && next.source.from === to) continue
				}
				return {
					line,
					lineIndex,
					fragment,
					x: line.x + fragment.x + this.xAt(fragment, position.offset - from),
				}
			}
		}
		return null
	}
}
