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
	/** How much source material is inside this node. Sizes its cell. */
	weight?: number
	/** Set on leaves that have a longer body of text to unfold inside them. */
	detailKey?: string
	children?: ZoomNode[]
}

/** A relationship between two nodes, drawn across the canvas. */
export interface ZoomLink {
	from: string
	to: string
	label: string
}

export interface Corpus {
	root: ZoomNode
	/** Cross-references drawn between nodes once the map is wide enough to see. */
	links?: ZoomLink[]
	/** Loads the long text for every `detailKey`. Called once, on demand. */
	loadDetail?(): Promise<Record<string, string>>
	/** Depth whose nodes give their descendants a shared tint. */
	tintDepth?: number
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
	/** The whole cell. Children tile this exactly, leaving no gaps to fall into. */
	rect: Rect
	/** Where the text sits, inset from the cell so neighbours are not crowded. */
	textRect: Rect
	text: string
	title?: string
	detailKey?: string
	/** Raw, uncompressed content weight, carried through for sizing the detail levels. */
	weight?: number
	/** Index of the ancestor at the corpus's tint depth, if it has one. */
	tint?: number
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

/**
 * Cells tile their parent exactly and the breathing room is taken *inside* each
 * cell instead of between them. Gaps between cells would be self-similar: zoom
 * into one and you fall through every level at once, landing on blank canvas
 * with nothing to read and no way to tell where you are.
 */
const TEXT_PAD = 0.05

/** Hairline width as a fraction of the parent's shorter side. */
const RULE_WEIGHT = 0.0015

// Rough metrics for the body face: mean glyph advance as a fraction of font
// size, and line box height. Only used to guess a fitting font size, so being a
// few percent off just means slightly looser or tighter text.
const CHAR_ASPECT = 0.5
const LINE_HEIGHT = 1.45
/** Fraction of a rect that wrapped text can actually cover. Tuned by eye. */
const FILL = 0.62
const TARGET_MEASURE = 68

/**
 * How hard cell area tracks content length. At 0 every sibling is the same size;
 * at 1 a cell is exactly proportional to the words inside it.
 *
 * Full proportionality is too strong to use. Melville's longest chapter is 183x
 * his shortest, and since font size goes as the square root of area, a straight
 * mapping spreads one level's type over a 13x range — some cards are still
 * specks while their neighbours are already unreadably large, and the level
 * stops arriving all at once. Compressing keeps the proportions legible while
 * holding the type close enough together that a crossfade still reads as one
 * event: at 0.35 the areas still vary about 7x but the type only 2.4x.
 */
const WEIGHT_EXPONENT = 0.35

function inset(r: Rect, amount: number): Rect {
	return { x: r.x + amount, y: r.y + amount, w: r.w - amount * 2, h: r.h - amount * 2 }
}

function textRectOf(rect: Rect): Rect {
	return inset(rect, TEXT_PAD * Math.min(rect.w, rect.h))
}

export function rectCentre(r: Rect) {
	return { x: r.x + r.w / 2, y: r.y + r.h / 2 }
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

/**
 * Lay `weights` into `rect` as horizontal strips, in order, with each cell's
 * area proportional to its weight.
 *
 * The familiar squarified treemap sorts by size to get squarer cells, which is
 * exactly what this cannot do: a node's position on the canvas is its position
 * in the text, and sorting would scramble it. Strips keep reading order — left
 * to right, then down — and recover most of the shape by choosing where to
 * break each row.
 */
function stripTreemap(rect: Rect, weights: number[]): { rects: Rect[]; separators: Rect[] } {
	const total = weights.reduce((sum, w) => sum + w, 0)
	const areaPerWeight = (rect.w * rect.h) / total

	/** Mean distance from the target aspect, in log space, for one candidate strip. */
	const badness = (strip: number[]) => {
		const height = (strip.reduce((sum, i) => sum + weights[i], 0) * areaPerWeight) / rect.w
		let sum = 0
		for (const i of strip) {
			const width = (weights[i] * areaPerWeight) / height
			sum += Math.abs(Math.log(width / height / TARGET_ASPECT))
		}
		return sum / strip.length
	}

	const strips: number[][] = []
	let current: number[] = []
	for (let i = 0; i < weights.length; i++) {
		if (current.length === 0) {
			current = [i]
		} else if (badness([...current, i]) <= badness(current)) {
			current.push(i)
		} else {
			strips.push(current)
			current = [i]
		}
	}
	if (current.length) strips.push(current)

	const rects: Rect[] = []
	const separators: Rect[] = []
	const rule = RULE_WEIGHT * Math.min(rect.w, rect.h)

	let y = rect.y
	strips.forEach((strip, stripIndex) => {
		const isLastStrip = stripIndex === strips.length - 1
		const area = strip.reduce((sum, i) => sum + weights[i], 0) * areaPerWeight
		// Snap the final strip and the final cell of each strip to the parent's
		// edge, so rounding never opens a seam between a cell and its container.
		const h = isLastStrip ? rect.y + rect.h - y : area / rect.w

		let x = rect.x
		strip.forEach((index, k) => {
			const w = k === strip.length - 1 ? rect.x + rect.w - x : (weights[index] * areaPerWeight) / h
			rects[index] = { x, y, w, h }
			if (k > 0) separators.push({ x: x - rule / 2, y, w: rule, h })
			x += w
		})

		if (stripIndex > 0) separators.push({ x: rect.x, y: y - rule / 2, w: rect.w, h: rule })
		y += h
	})

	return { rects, separators }
}

/** Compressed content weight of a node, summed up from its leaves. */
function weigh(node: ZoomNode): number {
	if (node.children?.length) return node.children.reduce((sum, child) => sum + weigh(child), 0)
	return Math.pow(Math.max(1, node.weight ?? 1), WEIGHT_EXPONENT)
}

export interface Layout {
	nodes: PlacedNode[]
	separators: Separator[]
	byId: Map<string, PlacedNode>
	/** Leaves that have a longer body of text waiting behind them. */
	leaves: PlacedNode[]
	bounds: Rect
	/** Nominal font size per level, including the detail levels. */
	nominals: number[]
	/** Characters of detail text shown at the excerpt level. */
	excerptChars: number
	hasDetail: boolean
}

export function layoutCorpus(corpus: Corpus): Layout {
	const nodes: PlacedNode[] = []
	const separators: Separator[] = []

	function walk(node: ZoomNode, rect: Rect, depth: number, tint: number | undefined) {
		const textRect = textRectOf(rect)
		const { fontSize, columns } = fitText(textRect, node.text.length)
		nodes.push({
			id: node.id,
			depth,
			rect,
			textRect,
			text: node.text,
			title: node.title,
			detailKey: node.detailKey,
			weight: node.weight,
			tint,
			fontSize,
			columns,
		})
		if (node.children?.length) {
			const split = stripTreemap(rect, node.children.map(weigh))
			for (const line of split.separators) separators.push({ ...line, depth: depth + 1 })
			node.children.forEach((child, i) =>
				walk(child, split.rects[i], depth + 1, depth + 1 === corpus.tintDepth ? i : tint)
			)
		}
	}

	const height = ROOT_WIDTH / TARGET_ASPECT
	const bounds = { x: -ROOT_WIDTH / 2, y: -height / 2, w: ROOT_WIDTH, h: height }
	walk(corpus.root, bounds, 0, corpus.tintDepth === 0 ? 0 : undefined)

	const byId = new Map(nodes.map((node) => [node.id, node]))
	const leaves = nodes.filter((node) => node.detailKey !== undefined)
	const hasDetail = leaves.length > 0 && !!corpus.loadDetail

	const nominals = medianFontPerDepth(nodes)
	let excerptChars = 0
	if (hasDetail) {
		// `weight` already means "how much source material is in here", so the
		// typical leaf weight is the typical length of the detail text.
		const detailChars = median(leaves.map((leaf) => leaf.weight ?? 0)) || 1
		const summaryChars = median(leaves.map((leaf) => leaf.text.length))
		// Put the excerpt at the geometric mean of the two, which splits the jump
		// into two equal steps in log space — one boundary instead of one chasm.
		excerptChars = Math.round(Math.sqrt(summaryChars * detailChars))
		nominals.push(median(leaves.map((leaf) => fitText(leaf.textRect, excerptChars).fontSize)))
		nominals.push(median(leaves.map((leaf) => fitText(leaf.textRect, detailChars).fontSize)))
	}

	return { nodes, separators, byId, leaves, bounds, nominals, excerptChars, hasDetail }
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

/** The excerpt and full-text levels that live inside one leaf's rect. */
export function detailNodes(leaf: PlacedNode, text: string, excerptChars: number): PlacedNode[] {
	const excerpt = clipToSentence(text, excerptChars)
	return [excerpt, text].map((body, i) => {
		const { fontSize, columns } = fitText(leaf.textRect, body.length)
		return {
			...leaf,
			id: `${leaf.id}:detail-${i}`,
			depth: leaf.depth + 1 + i,
			text: body,
			fontSize,
			columns,
		}
	})
}

/** Trim to roughly `limit` characters, ending on a sentence so it reads as prose. */
function clipToSentence(text: string, limit: number) {
	if (text.length <= limit) return text
	const window = text.slice(0, Math.min(text.length, Math.round(limit * 1.25)))
	const stop = Math.max(window.lastIndexOf('. '), window.lastIndexOf('.”'), window.lastIndexOf('!'))
	return stop > limit * 0.5 ? window.slice(0, stop + 1) : window.slice(0, limit)
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
	return handoffZoom(nominals, Math.max(0, nominals.length - 3)) / FADE
}

/**
 * The most zoomed-out view that still has something to read: the root text at
 * full strength, just before the next level starts to fade up.
 */
export function openingZoom(nominals: number[]) {
	return handoffZoom(nominals, 0) / FADE
}
