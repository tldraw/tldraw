import {
	createShapeId,
	Editor,
	TLArrowShapeProps,
	TLDefaultDashStyle,
	TLDefaultSizeStyle,
	TLGeoShape,
	TLShapeId,
	toRichText,
	Vec,
} from 'tldraw'
import { mapEdgeStrokeToDash, mapEdgeTypeToArrowhead, type ParsedCssOverrides } from './mappings'
import type { ParsedEdge, Vec2 } from './svgParsing'

export interface EdgeInfo {
	start: string
	end: string
	label?: string
	type?: string
	stroke?: string
	cssOverrides?: ParsedCssOverrides
}

/**
 * Shared edge creation for flowchart and state diagram.
 * Each model edge is matched to the SVG edge whose start/end points are
 * closest to the corresponding node centers, ensuring bend values come
 * directly from SVG geometry regardless of ordering differences.
 */
export function createEdgesFromLayout(
	editor: Editor,
	edges: EdgeInfo[],
	shapeIds: Map<string, TLShapeId>,
	svgEdges: ParsedEdge[],
	nodeCenters: Map<string, Vec2>
) {
	const claimed = new Set<number>()

	for (let i = 0; i < edges.length; i++) {
		const e = edges[i]
		const startId = shapeIds.get(e.start)
		const endId = shapeIds.get(e.end)
		if (!startId || !endId) continue

		let svgEdge: ParsedEdge | undefined
		const sc = nodeCenters.get(e.start)
		const ec = nodeCenters.get(e.end)
		if (sc && ec) {
			let bestIdx = -1
			let bestDist = Infinity
			for (let j = 0; j < svgEdges.length; j++) {
				if (claimed.has(j)) continue
				const pts = svgEdges[j].points
				if (pts.length < 2) continue
				const d =
					Math.hypot(pts[0].x - sc.x, pts[0].y - sc.y) +
					Math.hypot(pts[pts.length - 1].x - ec.x, pts[pts.length - 1].y - ec.y)
				if (d < bestDist) {
					bestDist = d
					bestIdx = j
				}
			}
			if (bestIdx >= 0) {
				claimed.add(bestIdx)
				svgEdge = svgEdges[bestIdx]
			}
		}
		const bend = svgEdge ? getArrowBend(svgEdge) : 0

		createArrowBetweenShapes(editor, startId, endId, {
			label: e.label,
			type: e.type,
			stroke: e.stroke,
			bend,
			cssOverrides: e.cssOverrides,
		})
	}
}

function buildArrowProps(
	type: string | undefined,
	dash: TLDefaultDashStyle,
	size: TLDefaultSizeStyle,
	cssOverrides: ParsedCssOverrides | undefined,
	label: string | undefined,
	overrides: Partial<TLArrowShapeProps>
): Partial<TLArrowShapeProps> {
	const arrowheadEnd = mapEdgeTypeToArrowhead(type)
	const props: Partial<TLArrowShapeProps> = {
		dash,
		size,
		arrowheadEnd,
		...overrides,
	}
	if (cssOverrides?.color) props.color = cssOverrides.color
	if (type?.includes('double_arrow')) props.arrowheadStart = arrowheadEnd
	if (label) props.richText = toRichText(sanitizeDiagramText(label))
	return props
}

export function createArrowBetweenShapes(
	editor: Editor,
	startShapeId: TLShapeId,
	endShapeId: TLShapeId,
	options: {
		label?: string
		type?: string
		stroke?: string
		bend: number
		cssOverrides?: ParsedCssOverrides
	}
) {
	const { label, type, stroke, bend, cssOverrides } = options
	const isSelfLoop = startShapeId === endShapeId

	const dash = cssOverrides?.dashOverride ?? mapEdgeStrokeToDash(stroke)
	const size = cssOverrides?.sizeOverride ?? (stroke === 'thick' ? 'l' : 's')

	const startShapePageBounds = editor.getShapePageBounds(startShapeId)
	const endShapePageBounds = editor.getShapePageBounds(endShapeId)

	if (!startShapePageBounds || !endShapePageBounds) return

	const arrowId = createShapeId()

	if (isSelfLoop) {
		const bounds = startShapePageBounds
		const arrowProps = buildArrowProps(type, dash, size, cssOverrides, label, {
			start: { x: bounds.w / 2, y: 0 },
			end: { x: bounds.w, y: bounds.h / 2 },
			bend: -80,
		})

		editor.run(() => {
			editor.createShape({
				id: arrowId,
				type: 'arrow',
				x: bounds.x,
				y: bounds.y,
				props: arrowProps,
			})

			editor.createBindings([
				{
					fromId: arrowId,
					toId: startShapeId,
					type: 'arrow',
					props: {
						terminal: 'start',
						normalizedAnchor: { x: 0.9, y: 0.5 },
						isExact: false,
						isPrecise: false,
					},
				},
				{
					fromId: arrowId,
					toId: endShapeId,
					type: 'arrow',
					props: {
						terminal: 'end',
						normalizedAnchor: { x: 0.85, y: 0.8 },
						isExact: false,
						isPrecise: false,
					},
				},
			])
		})
		return
	}

	const startCenter = startShapePageBounds.center
	const endCenter = endShapePageBounds.center
	const arrowPoint = Vec.Min(startCenter, endCenter)

	const arrowProps = buildArrowProps(type, dash, size, cssOverrides, label, {
		start: {
			x: startCenter.x - arrowPoint.x,
			y: startCenter.y - arrowPoint.y,
		},
		end: {
			x: endCenter.x - arrowPoint.x,
			y: endCenter.y - arrowPoint.y,
		},
		bend,
	})

	editor.run(() => {
		editor.createShape({
			id: arrowId,
			type: 'arrow',
			x: arrowPoint.x,
			y: arrowPoint.y,
			props: arrowProps,
		})

		editor.createBindings([
			{
				fromId: arrowId,
				toId: startShapeId,
				type: 'arrow',
				props: {
					terminal: 'start',
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isExact: false,
					isPrecise: false,
				},
			},
			{
				fromId: arrowId,
				toId: endShapeId,
				type: 'arrow',
				props: {
					terminal: 'end',
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isExact: false,
					isPrecise: false,
				},
			},
		])
	})
}

/*
 * Takes a list of points from Mermaid's layout (edge path waypoints)
 * and extrapolates a bend value for tldraw arrows.
 * Uses perpendicular distance from chord to mid-points, scaled and clamped.
 */
const BEND_SCALE = -1.8
const MAX_ARROW_BEND = 200

function getArrowBend(edgeData: { points: { x: number; y: number }[] }) {
	const pts = edgeData.points

	if (pts.length < 2) {
		return 0
	}

	const start = pts[0]
	const end = pts[pts.length - 1]
	const dx = end.x - start.x
	const dy = end.y - start.y
	const len = Math.sqrt(dx * dx + dy * dy)

	if (len === 0) return 0

	let maxDist = 0
	for (let i = 1; i < pts.length - 1; i++) {
		const dist = ((pts[i].x - start.x) * dy - (pts[i].y - start.y) * dx) / len
		if (Math.abs(dist) > Math.abs(maxDist)) {
			maxDist = dist
		}
	}

	const bend = maxDist * BEND_SCALE
	return Math.max(-MAX_ARROW_BEND, Math.min(MAX_ARROW_BEND, bend))
}

/** Normalize HTML line breaks to newlines and trim; use for any diagram text (labels, notes, etc.). */
export function sanitizeDiagramText(text: string): string {
	if (typeof text !== 'string') return ''
	// Mermaid labels can contain HTML <br> or <br/> tags for line breaks
	return text.replace(/<br\s*\/?>/gi, '\n').trim()
}

// ---------------------------------------------------------------------------
// Shared constants for flowchart and state diagram
// ---------------------------------------------------------------------------

/** Scale factor applied to parsed SVG layout (nodes, clusters, edges). */
export const LAYOUT_SCALE = 1.25

/** Create a labelled frame (geo rectangle) used for subgraphs and compound states. */
export function createFrameShape(
	editor: Editor,
	frameId: TLShapeId,
	absX: number,
	absY: number,
	w: number,
	h: number,
	label: string,
	parentFrameId?: TLShapeId,
	parentPos?: Vec2
) {
	editor.createShape<TLGeoShape>({
		id: frameId,
		type: 'geo',
		x: parentPos ? absX - parentPos.x : absX,
		y: parentPos ? absY - parentPos.y : absY,
		parentId: parentFrameId,
		props: {
			geo: 'rectangle',
			w,
			h,
			fill: 'semi',
			color: 'black',
			dash: 'draw',
			size: 's',
			richText: toRichText(sanitizeDiagramText(label)),
			align: 'middle',
			verticalAlign: 'start',
		},
	})
}

// ---------------------------------------------------------------------------
// Shared layout helpers
// ---------------------------------------------------------------------------

/** Compute viewport offset to center a bounding box on screen. */
export function centerOnViewport(
	editor: Editor,
	bounds: { minX: number; minY: number; maxX: number; maxY: number }
): { ox: number; oy: number } {
	const vp = editor.getViewportPageBounds().center
	return {
		ox: vp.x - (bounds.maxX + bounds.minX) / 2,
		oy: vp.y - (bounds.maxY + bounds.minY) / 2,
	}
}

/**
 * Order items top-down by parent relationship so parents are visited before children.
 * Works for subgraphs (FlowSubGraph[]) and compound state IDs (string[]).
 */
export function orderTopDown<T>(
	items: T[],
	getId: (item: T) => string,
	getParentId: (item: T) => string | undefined
): T[] {
	const byId = new Map(items.map((item) => [getId(item), item]))
	const visited = new Set<string>()
	const result: T[] = []

	function visit(id: string) {
		if (visited.has(id)) return
		visited.add(id)
		const item = byId.get(id)
		if (item) result.push(item)
		for (const child of items) {
			if (getParentId(child) === id) visit(getId(child))
		}
	}

	for (const item of items) {
		const pid = getParentId(item)
		if (!pid || !byId.has(pid)) visit(getId(item))
	}
	return result
}

/**
 * Compute axis-aligned bounding box from a collection of positioned rectangles.
 * Each rect has an origin (x, y) and size (w, h).
 */
export function computeBoundsFromRects(
	...maps: Map<string, { absX: number; absY: number; w: number; h: number }>[]
): { minX: number; minY: number; maxX: number; maxY: number } {
	let minX = Infinity,
		minY = Infinity,
		maxX = -Infinity,
		maxY = -Infinity
	for (const map of maps) {
		for (const [, r] of map) {
			minX = Math.min(minX, r.absX)
			minY = Math.min(minY, r.absY)
			maxX = Math.max(maxX, r.absX + r.w)
			maxY = Math.max(maxY, r.absY + r.h)
		}
	}
	return { minX, minY, maxX, maxY }
}
