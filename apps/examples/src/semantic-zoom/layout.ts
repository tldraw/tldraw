/**
 * Semantic zoom over any body of text that can be summarised at several scales.
 *
 * The corpus is a tree, and every node's children subdivide its rectangle. That
 * single rule gives both halves of the effect: zooming out shows fewer, coarser
 * nodes, and zooming into one region reveals that region's children rather than
 * some global "next level". Nothing here knows it is looking at a novel.
 */

export interface ZoomNode {
	id: string
	/** What this node says at its own scale. */
	text: string
	title?: string
	/**
	 * How much source material is behind this node. Only used to judge how long
	 * the detail text is, so the excerpt and full-text levels can be sized before
	 * that text has been fetched.
	 */
	weight?: number
	/** Set on leaves that have a longer body of text to unfold inside them. */
	detailKey?: string
	children?: ZoomNode[]
}

export interface Corpus {
	root: ZoomNode
	/** Loads the long text for every `detailKey`. Called once, on demand. */
	loadDetail?(): Promise<Record<string, string>>
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
	detailKey?: string
	/** Carried through for sizing the detail levels. */
	weight?: number
	/** Font size in page units. Screen size is this times the camera zoom. */
	fontSize: number
	columns: number
}

/** A hairline on the shared edge between two sibling cells. */
export interface Separator extends Rect {
	/** Depth of the children it divides, so it fades in and out with them. */
	depth: number
}

/** Page-unit width of the root rect. Everything else is derived from it. */
export const ROOT_WIDTH = 1000

const TARGET_ASPECT = 1.35

const PADDING = 0.04
const GUTTER = 0.06

/** Hairline width as a fraction of the gutter it sits in. */
const RULE_WEIGHT = 0.1

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
 * many columns as it takes to keep the measure near `TARGET_MEASURE`. A long
 * chapter ends up as a dense multi-column page; a one-line summary ends up huge.
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
function subdivide(rect: Rect, count: number): { rects: Rect[]; separators: Rect[] } {
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

	// Rule only where two cells actually abut, so a short centred final row does
	// not get a line hanging off the end of it.
	const weight = gutter * RULE_WEIGHT
	const separators: Rect[] = []
	for (let i = 0; i < count; i++) {
		const cell = rects[i]
		const rightNeighbour = i % cols < cols - 1 ? rects[i + 1] : undefined
		if (rightNeighbour) {
			separators.push({
				x: (cell.x + cell.w + rightNeighbour.x - weight) / 2,
				y: cell.y,
				w: weight,
				h: cell.h,
			})
		}
		const belowNeighbour = rects[i + cols]
		if (belowNeighbour) {
			separators.push({
				x: cell.x,
				y: (cell.y + cell.h + belowNeighbour.y - weight) / 2,
				w: cell.w,
				h: weight,
			})
		}
	}

	return { rects, separators }
}

export interface Layout {
	nodes: PlacedNode[]
	separators: Separator[]
	byId: Map<string, PlacedNode>
	/** Leaves that have a longer body of text waiting behind them. */
	leaves: PlacedNode[]
	bounds: Rect
	/** Nominal font size per level, including the detail level. */
	nominals: number[]
	hasDetail: boolean
}

export function layoutCorpus(corpus: Corpus): Layout {
	const nodes: PlacedNode[] = []
	const separators: Separator[] = []

	function walk(node: ZoomNode, rect: Rect, depth: number) {
		const { fontSize, columns } = fitText(rect, node.text.length)
		nodes.push({
			id: node.id,
			depth,
			rect,
			text: node.text,
			title: node.title,
			detailKey: node.detailKey,
			weight: node.weight,
			fontSize,
			columns,
		})
		if (node.children?.length) {
			// Every sibling gets the same area. Sizing cells by how much text is
			// behind them was tried and taken out again: it makes the map lopsided
			// in a way that reads as meaningful before you know the rule, and the
			// levels then arrive raggedly, since font size follows cell size.
			const split = subdivide(rect, node.children.length)
			for (const line of split.separators) separators.push({ ...line, depth: depth + 1 })
			node.children.forEach((child, i) => walk(child, split.rects[i], depth + 1))
		}
	}

	const height = ROOT_WIDTH / TARGET_ASPECT
	const bounds = { x: -ROOT_WIDTH / 2, y: -height / 2, w: ROOT_WIDTH, h: height }
	walk(corpus.root, bounds, 0)

	const byId = new Map(nodes.map((node) => [node.id, node]))
	const leaves = nodes.filter((node) => node.detailKey !== undefined)
	const hasDetail = leaves.length > 0 && !!corpus.loadDetail

	const nominals = medianFontPerDepth(nodes)
	if (hasDetail) {
		// `weight` already means "how much source material is in here", so the
		// typical leaf weight is the typical length of the detail text.
		const detailChars = median(leaves.map((leaf) => leaf.weight ?? 0)) || 1
		nominals.push(median(leaves.map((leaf) => fitText(detailRect(leaf), detailChars).fontSize)))
	}

	return { nodes, separators, byId, leaves, bounds, nominals, hasDetail }
}

function median(values: number[]) {
	const sorted = [...values].sort((a, b) => a - b)
	return sorted[Math.floor(sorted.length / 2)]
}

function medianFontPerDepth(placed: PlacedNode[]): number[] {
	const byDepth: number[][] = []
	for (const node of placed) {
		;(byDepth[node.depth] ??= []).push(node.fontSize)
	}
	return byDepth.map(median)
}

/** The full text, which lives inside its leaf's own rect. */
export function detailNode(leaf: PlacedNode, text: string): PlacedNode {
	const rect = detailRect(leaf)
	const { fontSize, columns } = fitText(rect, text.length)
	return { ...leaf, id: `${leaf.id}:detail`, depth: leaf.depth + 1, rect, text, fontSize, columns }
}

function detailRect(leaf: PlacedNode): Rect {
	return inset(leaf.rect, PADDING * Math.min(leaf.rect.w, leaf.rect.h))
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
export function handoffZoom(nominals: number[], depth: number) {
	return HANDOFF_PX / nominals[depth]
}

export function levelOpacities(nominals: number[], zoom: number): number[] {
	const deepest = nominals.length - 1
	return nominals.map((_, depth) => {
		// The root has no parent to take over from, so it never fades in, and the
		// deepest level has nothing below it, so it never hands on.
		const rise = depth === 0 ? 1 : smoothstepAcross(zoom, handoffZoom(nominals, depth - 1))
		const fall = depth === deepest ? 1 : 1 - smoothstepAcross(zoom, handoffZoom(nominals, depth))
		return Math.min(rise, fall)
	})
}

/** Zoom at which the detail text starts to matter, so it can be fetched in time. */
export function detailZoom(nominals: number[]) {
	return handoffZoom(nominals, Math.max(0, nominals.length - 2)) / FADE
}

/**
 * A comfortable zoom for reading one level: the middle of the span it owns.
 *
 * Navigation has to be expressed in these terms rather than in geometry. Fitting
 * a cell to the viewport picks a zoom from how big the box is, while the levels
 * change over on how big the *type* is, and the two do not coincide — framing a
 * cell lands part-way through a crossfade, with its own text half gone and its
 * children half arrived.
 */
export function bandZoom(nominals: number[], depth: number) {
	const level = Math.min(Math.max(depth, 0), nominals.length - 1)
	const from =
		level === 0 ? handoffZoom(nominals, 0) / (FADE * FADE) : handoffZoom(nominals, level - 1)
	const to = level < nominals.length - 1 ? handoffZoom(nominals, level) : from * 4
	return Math.sqrt(from * to)
}

/**
 * The most zoomed-out view that still has something to read: the root text at
 * full strength, just before the next level starts to fade up.
 */
export function openingZoom(nominals: number[]) {
	return bandZoom(nominals, 0)
}
