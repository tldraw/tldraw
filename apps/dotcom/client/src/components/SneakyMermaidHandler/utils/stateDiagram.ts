import { layout } from 'dagre-d3-es/src/dagre/index.js'
import { Graph } from 'dagre-d3-es/src/graphlib/index.js'
import type { StateStmt } from 'mermaid/dist/diagrams/state/stateDb.d.ts'
import { createShapeId, Editor, TLFrameShape, TLGeoShape, TLShapeId, toRichText } from 'tldraw'
import { FRAME_PADDING, FRAME_TOP_PADDING } from './constants'
import { mapStateTypeToGeo, mapStateTypeToSize } from './mappings'
import { createEdgesFromLayout, dagreToFrameLocal, EdgeInfo } from './utils'

const EDGE_LENGTH_FACTOR = 50
const FONT_SIZE_FACTOR = 5.5
const LABEL_HEIGHT = 16

interface DiagramEdge {
	id1: string
	id2: string
	relationTitle?: string
}

interface FlatState {
	id: string
	type: string
	label: string
}

interface ParsedCompound {
	id: string
	label: string
	parentCompound: string | null
	childStates: FlatState[]
	childEdges: EdgeInfo[]
}

function getEffectiveType(state: StateStmt): string {
	if (state.type && state.type !== 'default') return state.type
	if (/_start\d*$/.test(state.id)) return 'start'
	if (/_end\d*$/.test(state.id)) return 'end'
	return state.type || 'default'
}

const UNLABELED_TYPES = new Set(['start', 'end', 'fork', 'join', 'choice'])

function getStateLabel(state: StateStmt): string {
	if (state.descriptions && state.descriptions.length > 0) {
		return state.descriptions.join('\n')
	}
	if (state.description) return state.description
	if (UNLABELED_TYPES.has(getEffectiveType(state))) return ''
	return state.id
}

function collectStatesAndEdges(
	states: Map<string, StateStmt>,
	relations: DiagramEdge[],
	parentCompound: string | null = null
): {
	topLevelStates: FlatState[]
	topLevelEdges: EdgeInfo[]
	compounds: ParsedCompound[]
} {
	const topLevelStates: FlatState[] = []
	const topLevelEdges: EdgeInfo[] = []
	const compounds: ParsedCompound[] = []

	for (const [id, state] of states) {
		if (state.doc && state.doc.length > 0) {
			const childStatesMap = new Map<string, StateStmt>()
			const childDiagramEdges: DiagramEdge[] = []

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
					childDiagramEdges.push({
						id1: rel.state1.id,
						id2: rel.state2.id,
						relationTitle: rel.description,
					})
				}
			}

			const nested = collectStatesAndEdges(childStatesMap, childDiagramEdges, id)

			compounds.push({
				id,
				label: state.description || id,
				parentCompound,
				childStates: nested.topLevelStates,
				childEdges: nested.topLevelEdges,
			})
			compounds.push(...nested.compounds)

			topLevelStates.push({
				id,
				type: 'compound',
				label: state.description || id,
			})
		} else {
			topLevelStates.push({
				id,
				type: getEffectiveType(state),
				label: getStateLabel(state),
			})
		}
	}

	for (const rel of relations) {
		topLevelEdges.push({ start: rel.id1, end: rel.id2, label: rel.relationTitle })
	}

	return { topLevelStates, topLevelEdges, compounds }
}

function getLabelWidth(text: string | undefined): number {
	return text ? text.length * FONT_SIZE_FACTOR : 1
}

function getLabelRows(text: string | undefined): number {
	if (!text) return 1
	return text.split(/\n/).length
}

function runDagreLayout(
	states: FlatState[],
	edges: EdgeInfo[],
	direction: string,
	compoundSizes: Map<string, { w: number; h: number }>
) {
	const edgeFree = edges.length === 0

	const g = new Graph({ compound: true, multigraph: true })
		.setGraph({
			rankdir: direction,
			compound: true,
			multigraph: true,
			ranker: 'tight-tree',
			ranksep: edgeFree ? 1 : EDGE_LENGTH_FACTOR,
			nodesep: edgeFree ? 1 : 50,
			marginx: 8,
			marginy: 8,
		})
		.setDefaultEdgeLabel(() => ({}))

	const nodeIds = new Set<string>()
	for (const state of states) {
		const compSize = compoundSizes.get(state.id)
		const size = compSize ?? mapStateTypeToSize(state.type)
		g.setNode(state.id, { width: size.w, height: size.h })
		nodeIds.add(state.id)
	}

	let edgeCount = 0
	for (const edge of edges) {
		if (nodeIds.has(edge.start) && nodeIds.has(edge.end)) {
			edgeCount++
			g.setEdge(
				edge.start,
				edge.end,
				{
					width: getLabelWidth(edge.label),
					height: LABEL_HEIGHT * getLabelRows(edge.label),
					labelpos: 'c',
				},
				'id' + edgeCount
			)
		}
	}

	layout(g, {})
	return g
}

export function createMermaidStateDiagram(
	editor: Editor,
	states: Map<string, StateStmt>,
	relations: DiagramEdge[],
	direction: string
) {
	direction = direction || 'TB'

	const { topLevelStates, topLevelEdges, compounds } = collectStatesAndEdges(states, relations)

	// Pass 1: bottom-up layout of each compound's children to compute frame sizes
	const compoundSizes = new Map<string, { w: number; h: number }>()
	const compoundLayouts = new Map<string, Graph>()

	for (const compound of [...compounds].reverse()) {
		if (compound.childStates.length === 0) continue

		const childG = runDagreLayout(compound.childStates, compound.childEdges, direction, compoundSizes)
		compoundLayouts.set(compound.id, childG)

		const { width, height } = childG.graph() as { width: number; height: number }
		compoundSizes.set(compound.id, {
			w: width + FRAME_PADDING * 2,
			h: height + FRAME_PADDING + FRAME_TOP_PADDING,
		})
	}

	// Pass 2: top-level layout using computed compound sizes
	const mainG = runDagreLayout(topLevelStates, topLevelEdges, direction, compoundSizes)

	const offset = editor.getViewportPageBounds().center
	const { width: graphWidth, height: graphHeight } = mainG.graph() as {
		width: number
		height: number
	}
	const halfW = graphWidth / 2
	const halfH = graphHeight / 2

	const stateShapeIds = new Map<string, TLShapeId>()
	const framePagePositions = new Map<string, { x: number; y: number }>()

	// Create compound frames top-down so parent frames exist before children
	for (const compound of compounds) {
		const size = compoundSizes.get(compound.id)
		if (!size) continue

		let frameX: number
		let frameY: number
		let parentFrameId: TLShapeId | undefined

		if (!compound.parentCompound) {
			const mainPos = mainG.node(compound.id)
			if (!mainPos) continue
			frameX = offset.x + mainPos.x - size.w / 2 - halfW
			frameY = offset.y + mainPos.y - size.h / 2 - halfH
		} else {
			const parentLayout = compoundLayouts.get(compound.parentCompound)
			const parentPagePos = framePagePositions.get(compound.parentCompound)
			const parentSize = compoundSizes.get(compound.parentCompound)
			if (!parentLayout || !parentPagePos || !parentSize) continue

			const posInParent = parentLayout.node(compound.id)
			if (!posInParent) continue

			const graphSize = parentLayout.graph() as { width: number; height: number }
			const local = dagreToFrameLocal(posInParent, size, graphSize, parentSize)
			frameX = parentPagePos.x + local.x
			frameY = parentPagePos.y + local.y
			parentFrameId = stateShapeIds.get(compound.parentCompound)
		}

		framePagePositions.set(compound.id, { x: frameX, y: frameY })

		const frameId = createShapeId()
		stateShapeIds.set(compound.id, frameId)

		editor.createShape<TLFrameShape>({
			id: frameId,
			type: 'frame',
			x: parentFrameId
				? frameX - framePagePositions.get(compound.parentCompound!)!.x
				: frameX,
			y: parentFrameId
				? frameY - framePagePositions.get(compound.parentCompound!)!.y
				: frameY,
			parentId: parentFrameId,
			props: { w: size.w, h: size.h, name: compound.label },
		})

		// Create leaf children with frame-local coordinates
		const childG = compoundLayouts.get(compound.id)
		if (!childG) continue
		const childGraphSize = childG.graph() as { width: number; height: number }

		for (const childState of compound.childStates) {
			if (childState.type === 'compound') continue

			const childPos = childG.node(childState.id)
			if (!childPos) continue

			const childSize = mapStateTypeToSize(childState.type)
			const local = dagreToFrameLocal(childPos, childSize, childGraphSize, size)
			createStateShape(editor, childState, local.x, local.y, childSize, frameId, stateShapeIds)
		}
	}

	// Create non-compound top-level shapes
	for (const state of topLevelStates) {
		if (state.type === 'compound') continue
		const pos = mainG.node(state.id)
		if (!pos) continue

		const size = mapStateTypeToSize(state.type)
		createStateShape(
			editor,
			state,
			offset.x + pos.x - size.w / 2 - halfW,
			offset.y + pos.y - size.h / 2 - halfH,
			size,
			undefined,
			stateShapeIds
		)
	}

	// Create arrows
	createEdgesFromLayout(editor, direction, topLevelEdges, stateShapeIds, mainG)

	for (const compound of compounds) {
		const childG = compoundLayouts.get(compound.id)
		if (!childG) continue
		createEdgesFromLayout(editor, direction, compound.childEdges, stateShapeIds, childG)
	}
}

function createStateShape(
	editor: Editor,
	state: FlatState,
	x: number,
	y: number,
	size: { w: number; h: number },
	parentId: TLShapeId | undefined,
	shapeIds: Map<string, TLShapeId>
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
				props: { geo: 'ellipse', w: size.w, h: size.h, fill: 'solid', color: 'black' },
			})
			break
		}
		case 'end': {
			const innerSize = size.w * 0.6
			const innerId = createShapeId()
			editor.createShape<TLGeoShape>({
				id: shapeId,
				type: 'geo',
				x,
				y,
				parentId,
				props: { geo: 'ellipse', w: size.w, h: size.w, fill: 'none', color: 'black' },
			})
			editor.createShape<TLGeoShape>({
				id: innerId,
				type: 'geo',
				x: x + (size.w - innerSize) / 2,
				y: y + (size.w - innerSize) / 2,
				parentId,
				props: { geo: 'ellipse', w: innerSize, h: innerSize, fill: 'solid', color: 'black' },
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
				props: { geo: 'rectangle', w: size.w, h: size.h, fill: 'solid', color: 'black' },
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
					w: size.w,
					h: size.h,
					richText: state.label ? toRichText(state.label) : undefined,
					align: 'middle',
					verticalAlign: 'middle',
					size: 'm',
				},
			})
		}
	}
}
