import { Editor, TLShape, TLShapeId, TLShapePartial, createShapeId, toRichText } from 'tldraw'
import { IdeaNode, IdeaShapeMeta, IdeaStatus } from './types'

const IDEA_NOTE_WIDTH = 480

function asIdeaShapeMeta(shape: TLShape): IdeaShapeMeta | null {
	const meta = shape.meta as Record<string, unknown> | undefined
	if (!meta || meta.kind !== 'idea-node') return null

	return {
		kind: 'idea-node',
		domain: meta.domain === 'code' ? 'code' : 'idea',
		title: String(meta.title ?? ''),
		description: String(meta.description ?? ''),
		inputs: Array.isArray(meta.inputs) ? meta.inputs.map(String) : [],
		outputs: Array.isArray(meta.outputs) ? meta.outputs.map(String) : [],
		language: meta.language ? String(meta.language) : undefined,
		code: meta.code ? String(meta.code) : undefined,
		depth: Number(meta.depth ?? 0),
		parents: Array.isArray(meta.parents) ? (meta.parents as TLShapeId[]) : [],
		status: (meta.status as IdeaStatus) ?? 'seed',
	}
}

function shapeToIdeaNode(shape: TLShape, meta: IdeaShapeMeta): IdeaNode {
	return {
		id: shape.id,
		domain: meta.domain ?? 'idea',
		title: meta.title,
		description: meta.description,
		inputs: meta.inputs,
		outputs: meta.outputs,
		language: meta.language,
		code: meta.code,
		depth: meta.depth,
		parents: meta.parents,
		status: meta.status,
		x: shape.x,
		y: shape.y,
	}
}

function buildIdeaBody(
	domain: IdeaNode['domain'],
	title: string,
	description: string,
	inputs: string[],
	outputs: string[],
	language?: string
): string {
	const inputText = inputs.length > 0 ? inputs.join(', ') : 'none'
	const outputText = outputs.length > 0 ? outputs.join(', ') : 'none'
	const languageLine = domain === 'code' && language ? `\nLanguage: ${language}` : ''
	return `${title}\n\n${description}\n\nInputs: ${inputText}\nOutputs: ${outputText}${languageLine}`
}

export function getIdeaNodes(editor: Editor): IdeaNode[] {
	const shapes = editor.getCurrentPageShapes()
	const nodes: IdeaNode[] = []
	for (const shape of shapes) {
		const meta = asIdeaShapeMeta(shape)
		if (!meta) continue
		nodes.push(shapeToIdeaNode(shape, meta))
	}
	return nodes.sort((a, b) => a.y - b.y || a.x - b.x)
}

export function isIdeaShape(shape: TLShape | null | undefined): boolean {
	if (!shape) return false
	return !!asIdeaShapeMeta(shape)
}

export function getIdeaNodeById(editor: Editor, shapeId: TLShapeId): IdeaNode | null {
	const shape = editor.getShape(shapeId)
	if (!shape) return null
	const meta = asIdeaShapeMeta(shape)
	if (!meta) return null
	return shapeToIdeaNode(shape, meta)
}

export function createIdeaNode(
	editor: Editor,
	idea: Omit<IdeaNode, 'id' | 'x' | 'y'>,
	position: { x: number; y: number }
): TLShapeId {
	const id = createShapeId()
	editor.createShape({
		id,
		type: 'text',
		x: position.x,
		y: position.y,
		props: {
			richText: toRichText(
				buildIdeaBody(
					idea.domain,
					idea.title,
					idea.description,
					idea.inputs,
					idea.outputs,
					idea.language
				)
			),
			autoSize: false,
			w: IDEA_NOTE_WIDTH,
			font: 'mono',
		},
		meta: {
			kind: 'idea-node',
			domain: idea.domain,
			title: idea.title,
			description: idea.description,
			inputs: idea.inputs,
			outputs: idea.outputs,
			...(idea.language !== undefined && { language: idea.language }),
			...(idea.code !== undefined && { code: idea.code }),
			depth: idea.depth,
			parents: idea.parents,
			status: idea.status,
		},
	})
	return id
}

export function updateIdeaStatus(editor: Editor, shapeId: TLShapeId, status: IdeaStatus) {
	const shape = editor.getShape(shapeId)
	if (!shape) return
	const meta = asIdeaShapeMeta(shape)
	if (!meta) return

	editor.updateShape({
		id: shape.id,
		type: shape.type,
		meta: { ...shape.meta, status },
	} as TLShapePartial)
}

const GRID_COLUMNS = 5
const GRID_GAP_X = IDEA_NOTE_WIDTH + 40
const GRID_GAP_Y = 280
const ESTIMATED_SHAPE_HEIGHT = 200
const OVERLAP_PADDING = 20

interface Rect {
	left: number
	top: number
	right: number
	bottom: number
}

function rectsOverlap(a: Rect, b: Rect): boolean {
	return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom)
}

function getAllShapeBounds(editor: Editor): Rect[] {
	const shapes = editor.getCurrentPageShapes()
	const rects: Rect[] = []
	for (const shape of shapes) {
		const bounds = editor.getShapePageBounds(shape.id)
		if (!bounds) continue
		rects.push({
			left: bounds.x - OVERLAP_PADDING,
			top: bounds.y - OVERLAP_PADDING,
			right: bounds.x + bounds.w + OVERLAP_PADDING,
			bottom: bounds.y + bounds.h + OVERLAP_PADDING,
		})
	}
	return rects
}

function candidateRect(x: number, y: number): Rect {
	return {
		left: x,
		top: y,
		right: x + IDEA_NOTE_WIDTH,
		bottom: y + ESTIMATED_SHAPE_HEIGHT,
	}
}

function hasOverlap(x: number, y: number, existingBounds: Rect[]): boolean {
	const candidate = candidateRect(x, y)
	for (const bounds of existingBounds) {
		if (rectsOverlap(candidate, bounds)) return true
	}
	return false
}

export function getNextIdeaPosition(editor: Editor): { x: number; y: number } {
	const nodes = getIdeaNodes(editor)
	if (nodes.length === 0) {
		const { x, y } = editor.getViewportScreenCenter()
		const page = editor.screenToPage({ x, y })
		return { x: Math.round(page.x), y: Math.round(page.y) }
	}

	const originX = Math.min(...nodes.map((n) => n.x))
	const originY = Math.min(...nodes.map((n) => n.y))
	const existingBounds = getAllShapeBounds(editor)

	// Walk grid cells in order until we find one that doesn't overlap
	const maxCells = GRID_COLUMNS * 50
	for (let i = 0; i < maxCells; i++) {
		const col = i % GRID_COLUMNS
		const row = Math.floor(i / GRID_COLUMNS)
		const x = Math.round(originX + col * GRID_GAP_X)
		const y = Math.round(originY + row * GRID_GAP_Y)
		if (!hasOverlap(x, y, existingBounds)) {
			return { x, y }
		}
	}

	// Fallback: place after all existing content
	const fallbackRow = Math.floor(maxCells / GRID_COLUMNS)
	return {
		x: Math.round(originX),
		y: Math.round(originY + fallbackRow * GRID_GAP_Y),
	}
}

const SPIRAL_STEP_X = IDEA_NOTE_WIDTH / 2
const SPIRAL_STEP_Y = 150
const SPIRAL_DIRECTIONS = [
	{ dx: 0, dy: -1 }, // N
	{ dx: 1, dy: -1 }, // NE
	{ dx: 1, dy: 0 }, // E
	{ dx: 1, dy: 1 }, // SE
	{ dx: 0, dy: 1 }, // S
	{ dx: -1, dy: 1 }, // SW
	{ dx: -1, dy: 0 }, // W
	{ dx: -1, dy: -1 }, // NW
]
const SPIRAL_MAX_LEVELS = 20

export function getComposedIdeaPosition(
	editor: Editor,
	parentIds: TLShapeId[]
): { x: number; y: number } {
	const existingBounds = getAllShapeBounds(editor)

	// Compute centroid and lowest bottom from parent shapes
	let sumCx = 0
	let sumCy = 0
	let lowestBottom = -Infinity
	let validParents = 0

	for (const parentId of parentIds) {
		const bounds = editor.getShapePageBounds(parentId)
		if (!bounds) continue
		sumCx += bounds.x + bounds.w / 2
		sumCy += bounds.y + bounds.h / 2
		const bottom = bounds.y + bounds.h
		if (bottom > lowestBottom) lowestBottom = bottom
		validParents++
	}

	// Fallback if no valid parents found
	if (validParents === 0) {
		return getNextIdeaPosition(editor)
	}

	const centroidX = sumCx / validParents
	const targetX = Math.round(centroidX - IDEA_NOTE_WIDTH / 2)
	const targetY = Math.round(lowestBottom + GRID_GAP_Y / 2)

	// Try target position first
	if (!hasOverlap(targetX, targetY, existingBounds)) {
		return { x: targetX, y: targetY }
	}

	// Spiral outward to find a clear spot
	for (let level = 1; level <= SPIRAL_MAX_LEVELS; level++) {
		for (const dir of SPIRAL_DIRECTIONS) {
			const x = Math.round(targetX + dir.dx * level * SPIRAL_STEP_X)
			const y = Math.round(targetY + dir.dy * level * SPIRAL_STEP_Y)
			if (!hasOverlap(x, y, existingBounds)) {
				return { x, y }
			}
		}
	}

	// Give up and use the target position anyway
	return { x: targetX, y: targetY }
}

// ── Force-directed layout ──────────────────────────────────────────

const NODE_W = IDEA_NOTE_WIDTH + 60
const NODE_H = ESTIMATED_SHAPE_HEIGHT + 60
const OVERLAP_PUSH = 2
const EDGE_PULL = 0.008
const SEMANTIC_PULL = 0.003
const EDGE_REST = NODE_W * 1.8
const SEMANTIC_REST = NODE_W * 2.5
const CENTER_PULL = 0.001
const DAMPING = 0.7
const ITERATIONS = 400

interface ForceNode {
	idx: number
	id: TLShapeId
	x: number
	y: number
	vx: number
	vy: number
	parents: TLShapeId[]
}

function tokenize(text: string): Set<string> {
	return new Set(
		text
			.toLowerCase()
			.split(/[^a-z0-9]+/g)
			.filter((s) => s.length > 2)
	)
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
	if (a.size === 0 && b.size === 0) return 0
	const union = new Set([...a, ...b])
	let intersection = 0
	for (const t of a) {
		if (b.has(t)) intersection++
	}
	return intersection / Math.max(1, union.size)
}

function ideaTokens(n: IdeaNode): Set<string> {
	return tokenize(`${n.title} ${n.description} ${n.inputs.join(' ')} ${n.outputs.join(' ')}`)
}

export function forceDirectedLayout(nodes: IdeaNode[]): { id: TLShapeId; x: number; y: number }[] {
	if (nodes.length < 2) return nodes.map((n) => ({ id: n.id, x: n.x, y: n.y }))

	const fn: ForceNode[] = nodes.map((n, idx) => ({
		idx,
		id: n.id,
		x: n.x,
		y: n.y,
		vx: 0,
		vy: 0,
		parents: n.parents,
	}))

	const idToIdx = new Map<TLShapeId, number>()
	for (const f of fn) idToIdx.set(f.id, f.idx)

	// Precompute semantic similarity for all pairs
	const tokens = nodes.map(ideaTokens)
	const similarity: number[][] = []
	for (let i = 0; i < nodes.length; i++) {
		similarity[i] = []
		for (let j = 0; j < nodes.length; j++) {
			similarity[i][j] = i === j ? 0 : jaccardSimilarity(tokens[i], tokens[j])
		}
	}

	for (let iter = 0; iter < ITERATIONS; iter++) {
		const fx = new Float64Array(fn.length)
		const fy = new Float64Array(fn.length)

		// Bumper-car overlap resolution
		for (let i = 0; i < fn.length; i++) {
			for (let j = i + 1; j < fn.length; j++) {
				const rawDx = fn[i].x - fn[j].x
				const rawDy = fn[i].y - fn[j].y
				const absDx = Math.abs(rawDx)
				const absDy = Math.abs(rawDy)
				const overlapX = NODE_W - absDx
				const overlapY = NODE_H - absDy
				if (overlapX <= 0 || overlapY <= 0) continue

				// Push proportional to how much they overlap, with a strong multiplier
				const signX = rawDx >= 0 ? 1 : -1
				const signY = rawDy >= 0 ? 1 : -1

				// If nearly perfectly stacked, add jitter to break symmetry
				const jitterX = absDx < 5 ? (Math.random() - 0.5) * 20 : 0
				const jitterY = absDy < 5 ? (Math.random() - 0.5) * 20 : 0

				const pushX = (overlapX * OVERLAP_PUSH + jitterX) * signX
				const pushY = (overlapY * OVERLAP_PUSH + jitterY) * signY
				fx[i] += pushX
				fy[i] += pushY
				fx[j] -= pushX
				fy[j] -= pushY
			}
		}

		// Parent-child attraction (with rest distance — stop pulling when close enough)
		for (let i = 0; i < fn.length; i++) {
			for (const parentId of fn[i].parents) {
				const j = idToIdx.get(parentId)
				if (j === undefined) continue
				const dx = fn[j].x - fn[i].x
				const dy = fn[j].y - fn[i].y
				const dist = Math.sqrt(dx * dx + dy * dy)
				if (dist < EDGE_REST) continue
				const pull = (dist - EDGE_REST) * EDGE_PULL
				const nx = dx / dist
				const ny = dy / dist
				fx[i] += nx * pull
				fy[i] += ny * pull
				fx[j] -= nx * pull
				fy[j] -= ny * pull
			}
		}

		// Semantic similarity attraction (with rest distance)
		for (let i = 0; i < fn.length; i++) {
			for (let j = i + 1; j < fn.length; j++) {
				const sim = similarity[i][j]
				if (sim < 0.1) continue
				const dx = fn[j].x - fn[i].x
				const dy = fn[j].y - fn[i].y
				const dist = Math.sqrt(dx * dx + dy * dy)
				if (dist < SEMANTIC_REST) continue
				const pull = (dist - SEMANTIC_REST) * sim * SEMANTIC_PULL
				const nx = dx / dist
				const ny = dy / dist
				fx[i] += nx * pull
				fy[i] += ny * pull
				fx[j] -= nx * pull
				fy[j] -= ny * pull
			}
		}

		// Centering force: gentle pull toward centroid to prevent scatter
		let cx = 0
		let cy = 0
		for (const f of fn) {
			cx += f.x
			cy += f.y
		}
		cx /= fn.length
		cy /= fn.length
		for (let i = 0; i < fn.length; i++) {
			fx[i] += (cx - fn[i].x) * CENTER_PULL
			fy[i] += (cy - fn[i].y) * CENTER_PULL
		}

		// Apply forces
		for (let i = 0; i < fn.length; i++) {
			fn[i].vx = (fn[i].vx + fx[i]) * DAMPING
			fn[i].vy = (fn[i].vy + fy[i]) * DAMPING
			fn[i].x += fn[i].vx
			fn[i].y += fn[i].vy
		}
	}

	return fn.map((f) => ({ id: f.id, x: Math.round(f.x), y: Math.round(f.y) }))
}

// ── Lightweight overlap repulsion ─────────────────────────────────

const REPEL_ITERATIONS = 120
const REPEL_PUSH = 2.5
const REPEL_DAMPING = 0.65

/**
 * Runs only the bumper-car overlap resolution from the force sim.
 * Returns new positions for every node that moved.
 */
export function repelOverlaps(
	nodes: { id: TLShapeId; x: number; y: number }[]
): { id: TLShapeId; x: number; y: number }[] {
	if (nodes.length < 2) return nodes.map((n) => ({ id: n.id, x: n.x, y: n.y }))

	const fn = nodes.map((n, idx) => ({
		idx,
		id: n.id,
		x: n.x,
		y: n.y,
		vx: 0,
		vy: 0,
	}))

	for (let iter = 0; iter < REPEL_ITERATIONS; iter++) {
		const fx = new Float64Array(fn.length)
		const fy = new Float64Array(fn.length)

		for (let i = 0; i < fn.length; i++) {
			for (let j = i + 1; j < fn.length; j++) {
				const rawDx = fn[i].x - fn[j].x
				const rawDy = fn[i].y - fn[j].y
				const absDx = Math.abs(rawDx)
				const absDy = Math.abs(rawDy)
				const overlapX = NODE_W - absDx
				const overlapY = NODE_H - absDy
				if (overlapX <= 0 || overlapY <= 0) continue

				const signX = rawDx >= 0 ? 1 : -1
				const signY = rawDy >= 0 ? 1 : -1
				const jitterX = absDx < 5 ? (Math.random() - 0.5) * 20 : 0
				const jitterY = absDy < 5 ? (Math.random() - 0.5) * 20 : 0

				const pushX = (overlapX * REPEL_PUSH + jitterX) * signX
				const pushY = (overlapY * REPEL_PUSH + jitterY) * signY
				fx[i] += pushX
				fy[i] += pushY
				fx[j] -= pushX
				fy[j] -= pushY
			}
		}

		let settled = true
		for (let i = 0; i < fn.length; i++) {
			fn[i].vx = (fn[i].vx + fx[i]) * REPEL_DAMPING
			fn[i].vy = (fn[i].vy + fy[i]) * REPEL_DAMPING
			fn[i].x += fn[i].vx
			fn[i].y += fn[i].vy
			if (Math.abs(fn[i].vx) > 0.5 || Math.abs(fn[i].vy) > 0.5) settled = false
		}
		if (settled) break
	}

	return fn.map((f) => ({ id: f.id, x: Math.round(f.x), y: Math.round(f.y) }))
}

/**
 * Returns the midpoint between the centers of the given parent shapes.
 * Offsets by half the node width so the new node is visually centered.
 */
export function getMidpointPosition(
	editor: Editor,
	parentIds: TLShapeId[]
): { x: number; y: number } | null {
	let sumCx = 0
	let sumCy = 0
	let count = 0
	for (const pid of parentIds) {
		const bounds = editor.getShapePageBounds(pid)
		if (!bounds) continue
		sumCx += bounds.x + bounds.w / 2
		sumCy += bounds.y + bounds.h / 2
		count++
	}
	if (count === 0) return null
	return {
		x: Math.round(sumCx / count - IDEA_NOTE_WIDTH / 2),
		y: Math.round(sumCy / count),
	}
}

export function parseCsvTags(raw: string): string[] {
	return raw
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean)
}

export function createPairKey(aId: TLShapeId, bId: TLShapeId): string {
	return [aId, bId].sort().join('::')
}

export function createGroupKey(ids: TLShapeId[]): string {
	return [...ids].sort().join('::')
}
