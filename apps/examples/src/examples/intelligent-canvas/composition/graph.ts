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
