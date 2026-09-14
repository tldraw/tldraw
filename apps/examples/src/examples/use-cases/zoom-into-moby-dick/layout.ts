/**
 * The book is a tree: one sentence at the root, and every node's children
 * subdivide its rectangle. That single rule gives both features of the example —
 * zooming out shows fewer, coarser nodes, and zooming into one region reveals
 * that region's children rather than some global "next level".
 */

export interface BookNode {
	id: string
	text: string
	title?: string
	/** Set on leaves: the chapter whose full text unfolds inside this rect. */
	chapter?: number
	children?: BookNode[]
}

export interface Rect {
	x: number
	y: number
	w: number
	h: number
}

export interface PlacedNode {
	id: string
	depth: number
	rect: Rect
	text: string
	title?: string
	chapter?: number
	/** Font size in page units. Screen size is this times the camera zoom. */
	fontSize: number
	columns: number
}

/** Page-unit width of the root rect. Everything else is derived from it. */
export const ROOT_WIDTH = 1000

const TARGET_ASPECT = 1.35
const PADDING = 0.04
const GUTTER = 0.06

// Rough metrics for the body face: mean glyph advance as a fraction of font
// size, and line box height. Only used to guess a fitting font size, so being a
// few percent off just means slightly looser or tighter text.
const CHAR_ASPECT = 0.5
const LINE_HEIGHT = 1.45
/** Fraction of a rect that wrapped text can actually cover. Tuned by eye. */
const FILL = 0.62
const TARGET_MEASURE = 68

function inset(r: Rect, amount: number): Rect {
	return { x: r.x + amount, y: r.y + amount, w: r.w - amount * 2, h: r.h - amount * 2 }
}

/**
 * Pick a font size whose glyphs cover `FILL` of the rect, then split into as
 * many columns as it takes to keep the measure near `TARGET_MEASURE`. Long
 * chapters end up as dense multi-column pages; a one-line summary ends up huge.
 */
export function fitText(rect: Rect, charCount: number) {
	const fontSize = Math.sqrt((FILL * rect.w * rect.h) / (charCount * CHAR_ASPECT * LINE_HEIGHT))
	const columns = Math.max(
		1,
		Math.min(12, Math.round(rect.w / (TARGET_MEASURE * CHAR_ASPECT * fontSize)))
	)
	return { fontSize, columns }
}

/** Tile `count` cells into `rect`, choosing the column count that best matches TARGET_ASPECT. */
function subdivide(rect: Rect, count: number): Rect[] {
	const inner = inset(rect, PADDING * Math.min(rect.w, rect.h))

	let cols = 1
	let bestScore = Infinity
	for (let c = 1; c <= count; c++) {
		const rows = Math.ceil(count / c)
		const aspect = inner.w / c / (inner.h / rows)
		const score = Math.abs(Math.log(aspect / TARGET_ASPECT))
		if (score < bestScore) {
			bestScore = score
			cols = c
		}
	}

	const rows = Math.ceil(count / cols)
	const gutter = GUTTER * Math.min(inner.w / cols, inner.h / rows)
	const cellW = (inner.w - gutter * (cols - 1)) / cols
	const cellH = (inner.h - gutter * (rows - 1)) / rows

	const rects: Rect[] = []
	for (let i = 0; i < count; i++) {
		const row = Math.floor(i / cols)
		const col = i % cols
		// Centre a short final row rather than leaving it hanging to the left.
		const inRow = Math.min(cols, count - row * cols)
		const rowWidth = inRow * cellW + (inRow - 1) * gutter
		rects.push({
			x: inner.x + (inner.w - rowWidth) / 2 + col * (cellW + gutter),
			y: inner.y + row * (cellH + gutter),
			w: cellW,
			h: cellH,
		})
	}
	return rects
}

export function layoutBook(root: BookNode): PlacedNode[] {
	const placed: PlacedNode[] = []

	function walk(node: BookNode, rect: Rect, depth: number) {
		const { fontSize, columns } = fitText(rect, node.text.length)
		placed.push({
			id: node.id,
			depth,
			rect,
			text: node.text,
			title: node.title,
			chapter: node.chapter,
			fontSize,
			columns,
		})
		if (node.children?.length) {
			const rects = subdivide(rect, node.children.length)
			node.children.forEach((child, i) => walk(child, rects[i], depth + 1))
		}
	}

	const height = ROOT_WIDTH / TARGET_ASPECT
	walk(root, { x: -ROOT_WIDTH / 2, y: -height / 2, w: ROOT_WIDTH, h: height }, 0)
	return placed
}

function chapterTextRect(summary: PlacedNode): Rect {
	return inset(summary.rect, PADDING * Math.min(summary.rect.w, summary.rect.h))
}

/** A chapter's full text occupies its summary's rect, just very much smaller. */
export function layoutChapterText(summary: PlacedNode, text: string): PlacedNode {
	const rect = chapterTextRect(summary)
	const { fontSize, columns } = fitText(rect, text.length)
	return {
		id: `${summary.id}:text`,
		depth: summary.depth + 1,
		rect,
		text,
		title: summary.title,
		chapter: summary.chapter,
		fontSize,
		columns,
	}
}

/** Median font size at each depth, used to place that depth's crossfade band. */
export function nominalFontSizes(placed: PlacedNode[]): number[] {
	const byDepth: number[][] = []
	for (const node of placed) {
		;(byDepth[node.depth] ??= []).push(node.fontSize)
	}
	return byDepth.map((sizes) => sizes.sort((a, b) => a - b)[Math.floor(sizes.length / 2)])
}

/**
 * Median characters per chapter across the whole book. Lets us place the deepest
 * crossfade band before `chapters.json` has loaded — the band is per level, so
 * the typical chapter is what matters, not any particular one.
 */
export const MEDIAN_CHAPTER_CHARS = 6768

/** Nominal font size per depth, including the not-yet-loaded chapter text. */
export function estimateNominals(placed: PlacedNode[]): number[] {
	const nominals = nominalFontSizes(placed)
	const textSizes = placed
		.filter((node) => node.chapter !== undefined)
		.map((leaf) => fitText(chapterTextRect(leaf), MEDIAN_CHAPTER_CHARS).fontSize)
		.sort((a, b) => a - b)
	nominals.push(textSizes[Math.floor(textSizes.length / 2)])
	return nominals
}

/**
 * A level takes over when its parent's text has grown to `HANDOFF_PX` on screen,
 * and hands on when its own text reaches the same size. Both sides of every
 * handoff are therefore the same zoom, which is what keeps the crossfade brief:
 * one level is always leaving exactly as the next arrives.
 *
 * Two earlier versions got this wrong in opposite ways. Retiring a level only
 * once its *child* became readable let a level whose child is much denser grow
 * without limit — the chapter summaries reached 110px before the full text took
 * over. Giving appear and retire independent pixel thresholds capped that, but
 * then the two boundaries no longer coincided, so the book sentence and the act
 * summaries sat on top of each other at full strength for most of an octave.
 */
export const HANDOFF_PX = 60

/**
 * Half-width of a crossfade, as a zoom factor either side of a boundary. A level
 * and its parent occupy the same rectangle, so while both are part-way visible
 * their text is superimposed. Keep this tight enough that the reader passes
 * through that state rather than sitting in it.
 */
const FADE = 1.22

function smoothstepAcross(zoom: number, boundary: number) {
	const t = Math.min(1, Math.max(0, (Math.log(zoom / boundary) / Math.log(FADE) + 1) / 2))
	return t * t * (3 - 2 * t)
}

/** Zoom at which the level below `depth` takes over from it. */
function handoffZoom(nominals: number[], depth: number) {
	return HANDOFF_PX / nominals[depth]
}

export function levelOpacities(nominals: number[], zoom: number): number[] {
	const deepest = nominals.length - 1
	return nominals.map((_, depth) => {
		// The root has no parent to take over from, so it never fades in, and the
		// full text has nothing below it, so it never hands on.
		const rise = depth === 0 ? 1 : smoothstepAcross(zoom, handoffZoom(nominals, depth - 1))
		const fall = depth === deepest ? 1 : 1 - smoothstepAcross(zoom, handoffZoom(nominals, depth))
		return Math.min(rise, fall)
	})
}

/** Zoom at which the deepest level starts to matter, so we can preload its text. */
export function chapterTextZoom(nominals: number[]) {
	return handoffZoom(nominals, nominals.length - 2) / FADE
}

/**
 * The most zoomed-out view that still has something to read: the root sentence
 * at full strength, just before the act summaries start to fade up.
 */
export function openingZoom(nominals: number[]) {
	return handoffZoom(nominals, 0) / FADE
}
