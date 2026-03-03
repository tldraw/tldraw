import type { StateStmt } from 'mermaid/dist/diagrams/state/stateDb.d.ts'
import {
	createShapeId,
	Editor,
	TLDefaultColorStyle,
	TLGeoShape,
	TLShapeId,
	toRichText,
} from 'tldraw'
import { mapStateTypeToGeo, parseClassDefFills } from './mappings'
import {
	buildNodeCentersFromSvg,
	mountSvg,
	parseAllEdgePointsFromSvg,
	parseClustersFromSvg,
	parseNodesFromSvg,
	scaleLayout,
	type Vec2,
} from './svgParsing'
import {
	centerOnViewport,
	computeBoundsFromRects,
	createEdgesFromLayout,
	createFrameShape,
	LAYOUT_SCALE,
	orderTopDown,
	sanitizeDiagramText,
	type EdgeInfo,
} from './utils'

// ---------------------------------------------------------------------------
// State types and helpers
// ---------------------------------------------------------------------------

export interface DiagramEdge {
	id1: string
	id2: string
	relationTitle?: string
}

export interface FlatState {
	id: string
	type: string
	label: string
}

function getEffectiveType(state: StateStmt): string {
	if (state.type && state.type !== 'default') return state.type
	// Mermaid names implicit start/end pseudo-states with suffixed IDs like "Session_start0", "root_end1"
	if (/_start\d*$/.test(state.id)) return 'start'
	if (/_end\d*$/.test(state.id)) return 'end'
	return state.type || 'default'
}

const UNLABELED_TYPES = new Set(['start', 'end', 'fork', 'join', 'choice'])

const STATE_KNOWN_CLASSES = new Set(['node', 'statediagram-state', 'default'])

function getStateLabel(state: StateStmt): string {
	if (state.descriptions && state.descriptions.length > 0) {
		return state.descriptions.join('\n')
	}
	if (state.description) return state.description
	if (UNLABELED_TYPES.has(getEffectiveType(state))) return ''
	return state.id
}

function createStateShapeAt(
	editor: Editor,
	state: FlatState,
	x: number,
	y: number,
	w: number,
	h: number,
	parentId: TLShapeId | undefined,
	shapeIds: Map<string, TLShapeId>,
	fillColor?: TLDefaultColorStyle
) {
	const shapeId = createShapeId()
	shapeIds.set(state.id, shapeId)

	switch (state.type) {
		case 'start': {
			editor.createShape<TLGeoShape>({
				id: shapeId,
				type: 'geo',
				x,
				y,
				parentId,
				props: { geo: 'ellipse', w, h, fill: 'solid', color: 'black' },
			})
			break
		}
		case 'end': {
			const innerSize = w * 0.6
			const innerId = createShapeId()
			editor.createShape<TLGeoShape>({
				id: shapeId,
				type: 'geo',
				x,
				y,
				parentId,
				props: { geo: 'ellipse', w, h, fill: 'none', color: 'black' },
			})
			editor.createShape<TLGeoShape>({
				id: innerId,
				type: 'geo',
				x: x + (w - innerSize) / 2,
				y: y + (h - innerSize) / 2,
				parentId,
				props: {
					geo: 'ellipse',
					w: innerSize,
					h: innerSize,
					fill: 'solid',
					color: 'black',
				},
			})
			editor.groupShapes([shapeId, innerId])
			break
		}
		case 'fork':
		case 'join': {
			editor.createShape<TLGeoShape>({
				id: shapeId,
				type: 'geo',
				x,
				y,
				parentId,
				props: { geo: 'rectangle', w, h, fill: 'solid', color: 'black' },
			})
			break
		}
		case 'choice': {
			editor.createShape<TLGeoShape>({
				id: shapeId,
				type: 'geo',
				x,
				y,
				parentId,
				props: { geo: 'diamond', w, h, color: 'black' },
			})
			break
		}
		default: {
			editor.createShape<TLGeoShape>({
				id: shapeId,
				type: 'geo',
				x,
				y,
				parentId,
				props: {
					geo: mapStateTypeToGeo(state.type),
					w,
					h,
					...(fillColor && { fill: 'solid' as const, color: fillColor }),
					richText: state.label ? toRichText(sanitizeDiagramText(state.label)) : undefined,
					align: 'middle',
					verticalAlign: 'middle',
					size: 'm',
				},
			})
		}
	}
}

// ---------------------------------------------------------------------------
// State-specific ID parsers
// ---------------------------------------------------------------------------

function stateNodeIdParser(domId: string): string {
	// Mermaid gives state node <g> elements IDs like "state-MyState-42"
	// where "MyState" is the user-defined ID and the trailing number is internal.
	const m = domId.match(/^state-(.+)-\d+$/)
	return m ? m[1] : domId
}

function stateEdgeIdParser(dataId: string): { start: string; end: string } | null {
	// State diagram edge paths have opaque IDs like "edge0", "edge1" (no start/end info).
	// We return empty strings; actual start/end matching happens by geometry in createEdgesFromLayout.
	const m = dataId.match(/^edge(\d+)$/)
	return m ? { start: '', end: '' } : null
}

// ---------------------------------------------------------------------------
// Flatten state hierarchy
// ---------------------------------------------------------------------------

interface FlattenResult {
	leafStates: Map<string, FlatState>
	compoundLabels: Map<string, string>
	stateParent: Map<string, string>
	compoundParent: Map<string, string>
	allEdges: EdgeInfo[]
}

function flattenStateHierarchy(
	states: Map<string, StateStmt>,
	relations: DiagramEdge[],
	parentCompound: string | null = null
): FlattenResult {
	const leafStates = new Map<string, FlatState>()
	const compoundLabels = new Map<string, string>()
	const stateParent = new Map<string, string>()
	const compoundParent = new Map<string, string>()
	const allEdges: EdgeInfo[] = []

	for (const [id, state] of states) {
		if (parentCompound) {
			stateParent.set(id, parentCompound)
		}

		if (state.doc && state.doc.length > 0) {
			compoundLabels.set(id, state.description || id)
			if (parentCompound) compoundParent.set(id, parentCompound)

			const childStatesMap = new Map<string, StateStmt>()
			const childRelations: DiagramEdge[] = []

			for (const stmt of state.doc) {
				if (stmt.stmt === 'state' || stmt.stmt === 'default') {
					const s = stmt as StateStmt
					childStatesMap.set(s.id, s)
				} else if (stmt.stmt === 'relation') {
					const rel = stmt as unknown as {
						state1: StateStmt
						state2: StateStmt
						description?: string
					}
					childStatesMap.set(rel.state1.id, rel.state1)
					childStatesMap.set(rel.state2.id, rel.state2)
					childRelations.push({
						id1: rel.state1.id,
						id2: rel.state2.id,
						relationTitle: rel.description,
					})
				}
			}

			const nested = flattenStateHierarchy(childStatesMap, childRelations, id)
			for (const [k, v] of nested.leafStates) leafStates.set(k, v)
			for (const [k, v] of nested.compoundLabels) compoundLabels.set(k, v)
			for (const [k, v] of nested.stateParent) stateParent.set(k, v)
			for (const [k, v] of nested.compoundParent) compoundParent.set(k, v)
			allEdges.push(...nested.allEdges)
		} else {
			leafStates.set(id, {
				id,
				type: getEffectiveType(state),
				label: getStateLabel(state),
			})
		}
	}

	for (const rel of relations) {
		allEdges.push({ start: rel.id1, end: rel.id2, label: rel.relationTitle })
	}

	return { leafStates, compoundLabels, stateParent, compoundParent, allEdges }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

const FRAME_PAD = 24
const FRAME_TOP = 54

export function createStateDiagram(
	editor: Editor,
	svgString: string,
	states: Map<string, StateStmt>,
	relations: DiagramEdge[]
) {
	const { root, cleanup } = mountSvg(svgString)

	const stateFillMap = parseClassDefFills(svgString, 'state-', STATE_KNOWN_CLASSES)

	const svgNodes = parseNodesFromSvg(root, '.node', stateNodeIdParser)
	const svgClusters = parseClustersFromSvg(root, '.statediagram-cluster')
	const svgEdges = parseAllEdgePointsFromSvg(root, stateEdgeIdParser)
	cleanup()

	scaleLayout(svgNodes, svgClusters, svgEdges, LAYOUT_SCALE)

	const nodeCenters = buildNodeCentersFromSvg(svgNodes, svgClusters)

	const { leafStates, compoundLabels, stateParent, compoundParent, allEdges } =
		flattenStateHierarchy(states, relations)

	// ---- pre-compute all leaf node absolute positions and sizes ----
	const nodeLayout = new Map<string, { absX: number; absY: number; w: number; h: number }>()
	for (const [id, state] of leafStates) {
		const n = svgNodes.get(id)
		if (!n) continue
		const { w, h } = computeStateSize(state, n)
		nodeLayout.set(id, {
			absX: n.center.x - w / 2,
			absY: n.center.y - h / 2,
			w,
			h,
		})
	}

	// ---- compute frame bounds from children (bottom-up) ----
	const compoundIds = [...compoundLabels.keys()]
	const frameBounds = new Map<string, { absX: number; absY: number; w: number; h: number }>()

	// Process compounds bottom-up so children bounds exist before parent frame
	const bottomUp = orderTopDown(
		compoundIds,
		(id) => id,
		(id) => compoundParent.get(id)
	).reverse()
	for (const cid of bottomUp) {
		let fMinX = Infinity,
			fMinY = Infinity,
			fMaxX = -Infinity,
			fMaxY = -Infinity

		// Leaf children
		for (const [id] of leafStates) {
			if (stateParent.get(id) !== cid) continue
			const nd = nodeLayout.get(id)
			if (!nd) continue
			fMinX = Math.min(fMinX, nd.absX)
			fMinY = Math.min(fMinY, nd.absY)
			fMaxX = Math.max(fMaxX, nd.absX + nd.w)
			fMaxY = Math.max(fMaxY, nd.absY + nd.h)
		}

		// Nested compound children
		for (const innerId of compoundIds) {
			if (compoundParent.get(innerId) !== cid) continue
			const fb = frameBounds.get(innerId)
			if (!fb) continue
			fMinX = Math.min(fMinX, fb.absX)
			fMinY = Math.min(fMinY, fb.absY)
			fMaxX = Math.max(fMaxX, fb.absX + fb.w)
			fMaxY = Math.max(fMaxY, fb.absY + fb.h)
		}

		if (!isFinite(fMinX)) {
			const c = svgClusters.get(cid)
			if (c) {
				frameBounds.set(cid, { absX: c.topLeft.x, absY: c.topLeft.y, w: c.width, h: c.height })
			}
			continue
		}

		frameBounds.set(cid, {
			absX: fMinX - FRAME_PAD,
			absY: fMinY - FRAME_TOP,
			w: fMaxX - fMinX + FRAME_PAD * 2,
			h: fMaxY - fMinY + FRAME_PAD + FRAME_TOP,
		})
	}

	// ---- compute viewport centering offset ----
	// Bounds from precomputed node rects and compound frame rects (state diagram layout)
	const bounds = computeBoundsFromRects(nodeLayout, frameBounds)
	const { ox, oy } = centerOnViewport(editor, bounds)

	const shapeIds = new Map<string, TLShapeId>()
	const frameAbs = new Map<string, Vec2>()

	// ---- create frames (top-down so parents exist first) ----
	for (const cid of orderTopDown(
		compoundIds,
		(id) => id,
		(id) => compoundParent.get(id)
	)) {
		const fb = frameBounds.get(cid)
		if (!fb) continue

		const absX = ox + fb.absX
		const absY = oy + fb.absY
		frameAbs.set(cid, { x: absX, y: absY })

		const parentId = compoundParent.get(cid)
		const frameId = createShapeId()
		shapeIds.set(cid, frameId)

		createFrameShape(
			editor,
			frameId,
			absX,
			absY,
			fb.w,
			fb.h,
			compoundLabels.get(cid) || cid,
			parentId ? shapeIds.get(parentId) : undefined,
			parentId ? frameAbs.get(parentId) : undefined
		)
	}

	// ---- create leaf state shapes ----
	for (const [id, state] of leafStates) {
		const nd = nodeLayout.get(id)
		if (!nd) continue

		const parentCid = stateParent.get(id)
		const parentFrameId = parentCid ? shapeIds.get(parentCid) : undefined
		const parentPos = parentCid ? frameAbs.get(parentCid) : undefined

		const absX = ox + nd.absX
		const absY = oy + nd.absY
		const x = parentPos ? absX - parentPos.x : absX
		const y = parentPos ? absY - parentPos.y : absY

		const fillColor = stateFillMap.get(id)
		createStateShapeAt(editor, state, x, y, nd.w, nd.h, parentFrameId, shapeIds, fillColor)
	}

	// ---- edges ----
	createEdgesFromLayout(editor, allEdges, shapeIds, svgEdges, nodeCenters)
}

// ---------------------------------------------------------------------------
// State shape sizing and creation
// ---------------------------------------------------------------------------

function computeStateSize(
	state: FlatState,
	node: { width: number; height: number }
): { w: number; h: number } {
	switch (state.type) {
		case 'start':
			return { w: 36, h: 36 }
		case 'end':
			return { w: 40, h: 40 }
		case 'fork':
		case 'join':
			return { w: 200, h: 8 }
		default:
			return { w: node.width + 20, h: node.height + 8 }
	}
}
