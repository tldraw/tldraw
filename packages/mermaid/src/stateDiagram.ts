import type { StateStmt } from 'mermaid/dist/diagrams/state/stateDb.d.ts'
import type {
	DiagramMermaidBlueprint,
	MermaidBlueprintEdge,
	MermaidBlueprintGeoNode,
} from './blueprint'
import { mapStateTypeToGeo, parseClassDefFills } from './mappings'
import {
	buildNodeCentersFromSvg,
	parseAllEdgePointsFromSvg,
	parseClustersFromSvg,
	parseNodesFromSvg,
	scaleLayout,
} from './svgParsing'
import { getArrowBend, LAYOUT_SCALE, orderTopDown, sanitizeDiagramText } from './utils'

export interface DiagramEdge {
	id1: string
	id2: string
	relationTitle?: string
}

interface FlatState {
	id: string
	type: string
	label: string
}

function getEffectiveType(state: StateStmt): string {
	if (state.type && state.type !== 'default') return state.type
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

interface FlattenResult {
	leafStates: Map<string, FlatState>
	compoundLabels: Map<string, string>
	parentOf: Map<string, string>
	allEdges: DiagramEdge[]
}

function flattenStateHierarchy(
	states: Map<string, StateStmt>,
	relations: DiagramEdge[],
	parentCompound: string | null = null
): FlattenResult {
	const leafStates = new Map<string, FlatState>()
	const compoundLabels = new Map<string, string>()
	const parentOf = new Map<string, string>()
	const allEdges: DiagramEdge[] = []

	for (const [id, state] of states) {
		if (parentCompound) parentOf.set(id, parentCompound)

		if (state.doc && state.doc.length > 0) {
			compoundLabels.set(id, state.description || id)

			const childStatesMap = new Map<string, StateStmt>()
			const childRelations: DiagramEdge[] = []

			for (const stmt of state.doc) {
				if (stmt.stmt === 'state' || stmt.stmt === 'default') {
					const stateEntry = stmt as StateStmt
					childStatesMap.set(stateEntry.id, stateEntry)
				} else if (stmt.stmt === 'relation') {
					const relation = stmt as unknown as {
						state1: StateStmt
						state2: StateStmt
						description?: string
					}
					childStatesMap.set(relation.state1.id, relation.state1)
					childStatesMap.set(relation.state2.id, relation.state2)
					childRelations.push({
						id1: relation.state1.id,
						id2: relation.state2.id,
						relationTitle: relation.description,
					})
				}
			}

			const nested = flattenStateHierarchy(childStatesMap, childRelations, id)
			for (const [stateId, flatState] of nested.leafStates) leafStates.set(stateId, flatState)
			for (const [compoundId, label] of nested.compoundLabels) compoundLabels.set(compoundId, label)
			for (const [childId, parentId] of nested.parentOf) parentOf.set(childId, parentId)
			allEdges.push(...nested.allEdges)
		} else {
			leafStates.set(id, {
				id,
				type: getEffectiveType(state),
				label: getStateLabel(state),
			})
		}
	}

	allEdges.push(...relations)

	return { leafStates, compoundLabels, parentOf, allEdges }
}

const FIXED_NODE_SIZES: Record<string, [number, number]> = {
	start: [36, 36],
	end: [40, 40],
	fork: [200, 8],
	join: [200, 8],
}

function stateToNodes(
	state: FlatState,
	x: number,
	y: number,
	w: number,
	h: number,
	parentId: string | undefined,
	fillColor: string | undefined
): MermaidBlueprintGeoNode[] {
	const base = { id: state.id, x, y, w, h, parentId, color: 'black' as const }

	switch (state.type) {
		case 'start':
			return [{ ...base, geo: 'ellipse', fill: 'solid' }]
		case 'end': {
			const innerSize = w * 0.6
			return [
				{ ...base, geo: 'ellipse', fill: 'none' },
				{
					...base,
					id: `${state.id}__inner`,
					x: x + (w - innerSize) / 2,
					y: y + (h - innerSize) / 2,
					w: innerSize,
					h: innerSize,
					geo: 'ellipse',
					fill: 'solid',
				},
			]
		}
		case 'fork':
		case 'join':
			return [{ ...base, geo: 'rectangle', fill: 'solid' }]
		case 'choice':
			return [{ ...base, geo: 'diamond' }]
		default:
			return [
				{
					...base,
					geo: mapStateTypeToGeo(state.type),
					label: state.label ? sanitizeDiagramText(state.label) : undefined,
					...(fillColor ? { fill: 'solid' as const, color: fillColor } : {}),
					align: 'middle',
					verticalAlign: 'middle',
					size: 'm',
				} as MermaidBlueprintGeoNode,
			]
	}
}

const FRAME_PAD = 24
const FRAME_TOP = 54

export function stateToBlueprint(
	root: Element,
	states: Map<string, StateStmt>,
	relations: DiagramEdge[]
): DiagramMermaidBlueprint {
	const stateFillMap = parseClassDefFills(root.outerHTML, 'state-', STATE_KNOWN_CLASSES)

	const svgNodes = parseNodesFromSvg(
		root,
		'.node',
		(domId) => domId.match(/^state-(.+)-\d+$/)?.[1] ?? domId
	)
	const svgClusters = parseClustersFromSvg(root, '.statediagram-cluster')
	const svgEdges = parseAllEdgePointsFromSvg(root, (dataId) =>
		/^edge\d+$/.test(dataId) ? { start: '', end: '' } : null
	)

	scaleLayout(svgNodes, svgClusters, svgEdges, LAYOUT_SCALE)
	const nodeCenters = buildNodeCentersFromSvg(svgNodes, svgClusters)

	const { leafStates, compoundLabels, parentOf, allEdges } = flattenStateHierarchy(
		states,
		relations
	)

	const nodeLayout = new Map<string, { absX: number; absY: number; w: number; h: number }>()
	for (const [id, state] of leafStates) {
		const svgNode = svgNodes.get(id)
		if (!svgNode) continue
		const fixed = FIXED_NODE_SIZES[state.type]
		const nodeWidth = fixed ? fixed[0] : svgNode.width + 20
		const nodeHeight = fixed ? fixed[1] : svgNode.height + 8
		nodeLayout.set(id, {
			absX: svgNode.center.x - nodeWidth / 2,
			absY: svgNode.center.y - nodeHeight / 2,
			w: nodeWidth,
			h: nodeHeight,
		})
	}

	const compoundIds = [...compoundLabels.keys()]
	const frameBounds = new Map<string, { absX: number; absY: number; w: number; h: number }>()

	const bottomUp = orderTopDown(
		compoundIds,
		(id) => id,
		(id) => parentOf.get(id)
	).reverse()

	for (const compoundId of bottomUp) {
		let frameMinX = Infinity,
			frameMinY = Infinity,
			frameMaxX = -Infinity,
			frameMaxY = -Infinity

		for (const [id] of leafStates) {
			if (parentOf.get(id) !== compoundId) continue
			const layout = nodeLayout.get(id)
			if (!layout) continue
			frameMinX = Math.min(frameMinX, layout.absX)
			frameMinY = Math.min(frameMinY, layout.absY)
			frameMaxX = Math.max(frameMaxX, layout.absX + layout.w)
			frameMaxY = Math.max(frameMaxY, layout.absY + layout.h)
		}

		for (const innerId of compoundIds) {
			if (parentOf.get(innerId) !== compoundId) continue
			const innerBounds = frameBounds.get(innerId)
			if (!innerBounds) continue
			frameMinX = Math.min(frameMinX, innerBounds.absX)
			frameMinY = Math.min(frameMinY, innerBounds.absY)
			frameMaxX = Math.max(frameMaxX, innerBounds.absX + innerBounds.w)
			frameMaxY = Math.max(frameMaxY, innerBounds.absY + innerBounds.h)
		}

		if (!isFinite(frameMinX)) {
			const cluster = svgClusters.get(compoundId)
			if (cluster) {
				frameBounds.set(compoundId, {
					absX: cluster.topLeft.x,
					absY: cluster.topLeft.y,
					w: cluster.width,
					h: cluster.height,
				})
			}
			continue
		}

		frameBounds.set(compoundId, {
			absX: frameMinX - FRAME_PAD,
			absY: frameMinY - FRAME_TOP,
			w: frameMaxX - frameMinX + FRAME_PAD * 2,
			h: frameMaxY - frameMinY + FRAME_PAD + FRAME_TOP,
		})
	}

	const nodes: MermaidBlueprintGeoNode[] = []
	const blueprintEdges: MermaidBlueprintEdge[] = []

	for (const compoundId of orderTopDown(
		compoundIds,
		(id) => id,
		(id) => parentOf.get(id)
	)) {
		const bounds = frameBounds.get(compoundId)
		if (!bounds) continue

		nodes.push({
			id: compoundId,
			x: bounds.absX,
			y: bounds.absY,
			w: bounds.w,
			h: bounds.h,
			geo: 'rectangle',
			parentId: parentOf.get(compoundId),
			label: compoundLabels.get(compoundId) || compoundId,
			fill: 'semi',
			color: 'black',
			dash: 'draw',
			size: 's',
			align: 'middle',
			verticalAlign: 'start',
		})
	}

	for (const [id, state] of leafStates) {
		const layout = nodeLayout.get(id)
		if (!layout) continue
		nodes.push(
			...stateToNodes(
				state,
				layout.absX,
				layout.absY,
				layout.w,
				layout.h,
				parentOf.get(id),
				stateFillMap.get(id)
			)
		)
	}

	const claimed = new Set<number>()

	for (const edge of allEdges) {
		const startCenter = nodeCenters.get(edge.id1)
		const endCenter = nodeCenters.get(edge.id2)

		let bend = 0
		if (startCenter && endCenter) {
			let bestIndex = -1
			let bestDistance = Infinity
			for (let edgeIndex = 0; edgeIndex < svgEdges.length; edgeIndex++) {
				if (claimed.has(edgeIndex)) continue
				const points = svgEdges[edgeIndex].points
				if (points.length < 2) continue
				const distance =
					Math.hypot(points[0].x - startCenter.x, points[0].y - startCenter.y) +
					Math.hypot(
						points[points.length - 1].x - endCenter.x,
						points[points.length - 1].y - endCenter.y
					)
				if (distance < bestDistance) {
					bestDistance = distance
					bestIndex = edgeIndex
				}
			}
			if (bestIndex >= 0) {
				claimed.add(bestIndex)
				bend = getArrowBend(svgEdges[bestIndex])
			}
		}

		blueprintEdges.push({
			startNodeId: edge.id1,
			endNodeId: edge.id2,
			label: edge.relationTitle,
			bend,
		})
	}

	return { nodes, edges: blueprintEdges }
}
