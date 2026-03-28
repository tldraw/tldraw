import type { StateStmt, StyleClass } from 'mermaid/dist/diagrams/state/stateDb.d.ts'
import type {
	DiagramMermaidBlueprint,
	MermaidBlueprintEdge,
	MermaidBlueprintNode,
} from './blueprint'
import { buildClassDefColorMap, type ParsedNodeColors } from './colors'
import {
	buildNodeCentersFromSvg,
	parseAllEdgePointsFromSvg,
	parseClustersFromSvg,
	type ParsedDiagramLayout,
	parseNodesFromSvg,
	scaleLayout,
} from './svgParsing'
import { getArrowBend, LAYOUT_SCALE, orderTopDown } from './utils'

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

function getEffectiveType(state: StateStmt): string {
	if (state.type && state.type !== 'default') return state.type
	// Mermaid auto-generates start/end pseudo-state ids ending with "_start"
	// or "_end", optionally followed by a disambiguation digit (e.g. "_start2").
	if (/_start\d*$/.test(state.id)) return 'start'
	if (/_end\d*$/.test(state.id)) return 'end'
	return state.type || 'default'
}

const UNLABELED_TYPES = new Set(['start', 'end'])

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
	parentCompound: string | null = null,
	topLevelStates?: Map<string, StateStmt>
): FlattenResult {
	const leafStates = new Map<string, FlatState>()
	const compoundLabels = new Map<string, string>()
	const parentOf = new Map<string, string>()
	const allEdges: DiagramEdge[] = []
	const root = topLevelStates ?? states

	for (const [id, state] of states) {
		if (parentCompound) parentOf.set(id, parentCompound)

		if (state.doc && state.doc.length > 0) {
			compoundLabels.set(id, state.description || id)

			const childStatesMap = new Map<string, StateStmt>()
			const childRelations: DiagramEdge[] = []

			for (const stmt of state.doc) {
				if (typeof stmt === 'string') {
					// Mermaid emits raw strings for stereotyped state declarations
					// like `state H <<history>>` — the ID and stereotype are stored
					// as separate plain string entries.  Look up the state in the
					// top-level map so it gets proper parentage.
					const topState = root.get(stmt)
					if (topState && !childStatesMap.has(stmt)) {
						childStatesMap.set(stmt, topState)
					}
				} else if (stmt.stmt === 'state' || stmt.stmt === 'default') {
					const stateEntry = stmt as StateStmt
					childStatesMap.set(stateEntry.id, stateEntry)
				} else if (stmt.stmt === 'relation') {
					const relation = stmt as unknown as {
						state1: StateStmt
						state2: StateStmt
						description?: string
					}
					// Relation state refs are shallow objects without `doc`. Only add
					// them when the state hasn't been registered yet so we don't
					// overwrite a compound-state entry that carries its nested doc.
					if (!childStatesMap.has(relation.state1.id)) {
						childStatesMap.set(relation.state1.id, relation.state1)
					}
					if (!childStatesMap.has(relation.state2.id)) {
						childStatesMap.set(relation.state2.id, relation.state2)
					}
					childRelations.push({
						id1: relation.state1.id,
						id2: relation.state2.id,
						relationTitle: relation.description,
					})
				}
			}

			const nested = flattenStateHierarchy(childStatesMap, childRelations, id, root)
			for (const [key, state] of nested.leafStates) leafStates.set(key, state)
			for (const [key, label] of nested.compoundLabels) compoundLabels.set(key, label)
			for (const [key, parent] of nested.parentOf) parentOf.set(key, parent)
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
}

function stateToNodes(
	state: FlatState,
	x: number,
	y: number,
	w: number,
	h: number,
	parentId: string | undefined,
	colors: ParsedNodeColors | undefined
): MermaidBlueprintNode[] {
	const base = { x, y, w, h, parentId, color: 'black' as const }
	const label = state.label || undefined

	const node = (
		id: string,
		kind: string,
		partial: Partial<Pick<MermaidBlueprintNode, 'x' | 'y' | 'w' | 'h' | 'parentId'>> &
			Omit<MermaidBlueprintNode, 'id' | 'kind' | 'x' | 'y' | 'w' | 'h' | 'parentId'>
	): MermaidBlueprintNode => ({
		id,
		kind,
		...base,
		...partial,
	})

	switch (state.type) {
		case 'note':
			return [
				node(state.id, 'note', {
					label,
					fill: 'solid',
					color: 'yellow',
					size: 's',
					align: 'middle',
					verticalAlign: 'middle',
				}),
			]
		case 'start':
			return [node(state.id, 'start', { fill: 'solid' })]
		case 'end': {
			const innerSize = w * 0.6
			const innerId = `${state.id}__inner`
			return [
				node(state.id, 'end', { fill: 'none' }),
				node(innerId, 'end_inner', {
					x: x + (w - innerSize) / 2,
					y: y + (h - innerSize) / 2,
					w: innerSize,
					h: innerSize,
					fill: 'solid',
				}),
			]
		}
		case 'fork':
		case 'join': {
			const barW = w * 4
			const barH = Math.max(16, barW / 10)
			return [
				node(state.id, state.type, {
					x: x - (barW - w) / 2,
					y: y + (h - barH) / 2,
					w: barW,
					h: barH,
					fill: 'solid',
				}),
			]
		}
		case 'choice':
			return [
				node(state.id, 'choice', {
					label,
					align: 'middle',
					verticalAlign: 'middle',
					size: 'm',
				}),
			]
		default:
			return [
				node(state.id, state.type, {
					label,
					...(colors?.fillColor && { fill: 'solid' as const }),
					...(colors && { color: colors.strokeColor ?? colors.fillColor }),
					align: 'middle',
					verticalAlign: 'middle',
					size: 'm',
				}),
			]
	}
}

const FRAME_PAD = 24
const FRAME_TOP = 54

/** Parse state-diagram SVG layout data for use by {@link stateToBlueprint}. */
export function parseStateDiagramLayout(root: Element): ParsedDiagramLayout {
	const nodes = parseNodesFromSvg(
		root,
		'.node',
		(domId) => domId.match(/^state-(.+)-\d+$/)?.[1] ?? domId
	)
	const clusters = parseClustersFromSvg(root, '.statediagram-cluster')
	const edges = parseAllEdgePointsFromSvg(root, (dataId) =>
		/^edge\d+$/.test(dataId) ? { start: '', end: '' } : null
	)
	scaleLayout(nodes, clusters, edges, LAYOUT_SCALE)
	return { nodes, clusters, edges }
}

/** Convert a parsed Mermaid state diagram into a tldraw blueprint of nodes and edges. */
export function stateToBlueprint(
	layout: ParsedDiagramLayout,
	states: Map<string, StateStmt>,
	relations: DiagramEdge[],
	classDefs?: Map<string, StyleClass>
): DiagramMermaidBlueprint {
	const stateColorMap = classDefs ? buildClassDefColorMap(classDefs, states) : new Map()
	const { nodes: svgNodes, clusters: svgClusters, edges: svgEdges } = layout
	const nodeCenters = buildNodeCentersFromSvg(svgNodes, svgClusters)

	const { leafStates, compoundLabels, parentOf, allEdges } = flattenStateHierarchy(
		states,
		relations
	)

	// Collect notes attached to states and add them as synthetic leaf nodes + edges.
	for (const [id, state] of states) {
		const note = (state as StateStmt & { note?: { position?: string; text: string } }).note
		if (!note) continue

		const noteId = `${id}----note`
		leafStates.set(noteId, { id: noteId, type: 'note', label: note.text.trim() })
		allEdges.push({ id1: id, id2: noteId, relationTitle: undefined })
	}

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

	// Use SVG cluster bounds as the authoritative frame size. Mermaid's
	// layout already accounts for label width, padding, and special nodes
	// like <<history>> that are rendered outside the visual cluster.
	// Fall back to child-based computation only when no SVG cluster exists.
	const bottomUp = orderTopDown(
		compoundIds,
		(id) => id,
		(id) => parentOf.get(id)
	).reverse()

	for (const compoundId of bottomUp) {
		const cluster = svgClusters.get(compoundId)
		if (cluster) {
			frameBounds.set(compoundId, {
				absX: cluster.topLeft.x,
				absY: cluster.topLeft.y,
				w: cluster.width,
				h: cluster.height,
			})
			continue
		}

		let frameMinX = Infinity
		let frameMinY = Infinity
		let frameMaxX = -Infinity
		let frameMaxY = -Infinity

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

		if (!isFinite(frameMinX)) continue

		frameBounds.set(compoundId, {
			absX: frameMinX - FRAME_PAD,
			absY: frameMinY - FRAME_TOP,
			w: frameMaxX - frameMinX + FRAME_PAD * 2,
			h: frameMaxY - frameMinY + FRAME_PAD + FRAME_TOP,
		})
	}

	// Un-parent any leaf state whose center falls outside its parent frame.
	// Mermaid renders some pseudo-states (e.g. <<history>>) outside the
	// visual compound cluster even though they're declared inside it.
	for (const [id] of leafStates) {
		const pid = parentOf.get(id)
		if (!pid) continue

		const frame = frameBounds.get(pid)
		const layout = nodeLayout.get(id)
		if (!frame || !layout) continue

		const cx = layout.absX + layout.w / 2
		const cy = layout.absY + layout.h / 2
		if (
			cx < frame.absX ||
			cx > frame.absX + frame.w ||
			cy < frame.absY ||
			cy > frame.absY + frame.h
		) {
			parentOf.delete(id)
		}
	}

	const nodes: MermaidBlueprintNode[] = []
	const blueprintEdges: MermaidBlueprintEdge[] = []

	for (const compoundId of orderTopDown(
		compoundIds,
		(id) => id,
		(id) => parentOf.get(id)
	)) {
		const bounds = frameBounds.get(compoundId)
		if (!bounds) continue

		const kind = 'compound'
		nodes.push({
			id: compoundId,
			kind,
			x: bounds.absX,
			y: bounds.absY,
			w: bounds.w,
			h: bounds.h,
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
				stateColorMap.get(id)
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
				if (claimed.has(edgeIndex) || svgEdges[edgeIndex].points.length < 2) continue

				const points = svgEdges[edgeIndex].points
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

		const isNoteEdge = edge.id2.endsWith('----note') || edge.id1.endsWith('----note')
		blueprintEdges.push({
			startNodeId: edge.id1,
			endNodeId: edge.id2,
			label: edge.relationTitle,
			bend,
			...(isNoteEdge && { dash: 'dotted' as const, arrowheadEnd: 'none' as const }),
		})
	}

	const nodeIds = new Set(nodes.map((n) => n.id))
	const validEdges = blueprintEdges.filter(
		(e) => nodeIds.has(e.startNodeId) && nodeIds.has(e.endNodeId)
	)
	return { diagramKind: 'state', nodes, edges: validEdges }
}
