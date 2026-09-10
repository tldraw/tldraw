import type { StateStmt, StyleClass } from 'mermaid/dist/diagrams/state/stateDb.d.ts'
import type {
	DiagramMermaidBlueprint,
	MermaidBlueprintEdge,
	MermaidBlueprintNode,
} from './blueprint'
import { buildClassDefColorMap, type ParsedNodeColors, toNodeColorProps } from './colors'
import {
	buildNodeCentersFromSvg,
	claimNearestEdgeBend,
	parseAllEdgePointsFromSvg,
	parseClustersFromSvg,
	parseDomId,
	type ParsedDiagramLayout,
	parseNodesFromSvg,
	scaleLayout,
} from './svgParsing'
import { dropDanglingEdges, LAYOUT_SCALE, orderTopDown } from './utils'

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
	topLevelStates: Map<string, StateStmt>,
	topLevelRelations: DiagramEdge[]
): FlattenResult {
	const result: FlattenResult = {
		leafStates: new Map(),
		compoundLabels: new Map(),
		parentOf: new Map(),
		allEdges: [],
	}

	function visit(
		states: Map<string, StateStmt>,
		relations: DiagramEdge[],
		parentCompound: string | null
	) {
		for (const [id, state] of states) {
			if (parentCompound) result.parentOf.set(id, parentCompound)

			if (!state.doc || state.doc.length === 0) {
				result.leafStates.set(id, {
					id,
					type: getEffectiveType(state),
					label: getStateLabel(state),
				})
				continue
			}

			result.compoundLabels.set(id, state.description || id)

			const childStates = new Map<string, StateStmt>()
			const childRelations: DiagramEdge[] = []

			for (const stmt of state.doc) {
				if (typeof stmt === 'string') {
					// Mermaid emits raw strings for stereotyped state declarations
					// like `state H <<history>>` — the ID and stereotype are stored
					// as separate plain string entries.  Look up the state in the
					// top-level map so it gets proper parentage.
					const topState = topLevelStates.get(stmt)
					if (topState && !childStates.has(stmt)) childStates.set(stmt, topState)
				} else if (stmt.stmt === 'state' || stmt.stmt === 'default') {
					const stateEntry = stmt as StateStmt
					childStates.set(stateEntry.id, stateEntry)
				} else if (stmt.stmt === 'relation') {
					const relation = stmt as unknown as {
						state1: StateStmt
						state2: StateStmt
						description?: string
					}
					// Relation state refs are shallow objects without `doc`. Only add
					// them when the state hasn't been registered yet so we don't
					// overwrite a compound-state entry that carries its nested doc.
					for (const ref of [relation.state1, relation.state2]) {
						if (!childStates.has(ref.id)) childStates.set(ref.id, ref)
					}
					childRelations.push({
						id1: relation.state1.id,
						id2: relation.state2.id,
						relationTitle: relation.description,
					})
				}
			}

			visit(childStates, childRelations, id)
		}

		result.allEdges.push(...relations)
	}

	visit(topLevelStates, topLevelRelations, null)
	return result
}

const FIXED_NODE_SIZES: Record<string, [number, number]> = {
	start: [36, 36],
	end: [40, 40],
}

interface Rect {
	x: number
	y: number
	w: number
	h: number
}

function stateToNodes(
	state: FlatState,
	rect: Rect,
	parentId: string | undefined,
	colors: ParsedNodeColors | undefined
): MermaidBlueprintNode[] {
	const { x, y, w, h } = rect
	const label = state.label || undefined
	const node = (
		id: string,
		kind: string,
		overrides: Partial<Omit<MermaidBlueprintNode, 'id' | 'kind'>>
	): MermaidBlueprintNode => ({ id, kind, ...rect, parentId, color: 'black', ...overrides })

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
			return [
				node(state.id, 'end', { fill: 'none' }),
				node(`${state.id}__inner`, 'end_inner', {
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
					...toNodeColorProps(colors),
					align: 'middle',
					verticalAlign: 'middle',
					size: 'm',
				}),
			]
	}
}

const FRAME_PAD = 24
const FRAME_TOP = 54
const STATE_ID = /^state-(.+)-\d+$/

/** Parse state-diagram SVG layout data for use by {@link stateToBlueprint}. */
export function parseStateDiagramLayout(root: Element): ParsedDiagramLayout {
	const parseId = (domId: string) => parseDomId(domId, STATE_ID)
	const nodes = parseNodesFromSvg(root, '.node', parseId)
	const clusters = parseClustersFromSvg(root, '.statediagram-cluster', parseId)
	const edges = parseAllEdgePointsFromSvg(root, (dataId) =>
		/(?:^|-)edge\d+$/.test(dataId) ? { start: '', end: '' } : null
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
	const stateColorMap = buildClassDefColorMap(classDefs ?? new Map(), states)
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

	const nodeLayout = new Map<string, Rect>()
	for (const [id, state] of leafStates) {
		const svgNode = svgNodes.get(id)
		if (!svgNode) continue

		const [w, h] = FIXED_NODE_SIZES[state.type] ?? [svgNode.width + 20, svgNode.height + 8]
		nodeLayout.set(id, { x: svgNode.center.x - w / 2, y: svgNode.center.y - h / 2, w, h })
	}

	const compoundIds = [...compoundLabels.keys()]
	const compoundsTopDown = orderTopDown(
		compoundIds,
		(id) => id,
		(id) => parentOf.get(id)
	)
	const frameBounds = new Map<string, Rect>()

	// Use SVG cluster bounds as the authoritative frame size. Mermaid's
	// layout already accounts for label width, padding, and special nodes
	// like <<history>> that are rendered outside the visual cluster.
	// Fall back to child-based computation only when no SVG cluster exists.
	// Children are visited first (bottom-up) so nested frames are already sized.
	for (const compoundId of [...compoundsTopDown].reverse()) {
		const cluster = svgClusters.get(compoundId)
		if (cluster) {
			frameBounds.set(compoundId, {
				x: cluster.topLeft.x,
				y: cluster.topLeft.y,
				w: cluster.width,
				h: cluster.height,
			})
			continue
		}

		let minX = Infinity
		let minY = Infinity
		let maxX = -Infinity
		let maxY = -Infinity
		for (const [id, rect] of [...nodeLayout, ...frameBounds]) {
			if (parentOf.get(id) !== compoundId) continue
			minX = Math.min(minX, rect.x)
			minY = Math.min(minY, rect.y)
			maxX = Math.max(maxX, rect.x + rect.w)
			maxY = Math.max(maxY, rect.y + rect.h)
		}
		if (!isFinite(minX)) continue

		frameBounds.set(compoundId, {
			x: minX - FRAME_PAD,
			y: minY - FRAME_TOP,
			w: maxX - minX + FRAME_PAD * 2,
			h: maxY - minY + FRAME_PAD + FRAME_TOP,
		})
	}

	// Un-parent any leaf state whose center falls outside its parent frame.
	// Mermaid renders some pseudo-states (e.g. <<history>>) outside the
	// visual compound cluster even though they're declared inside it.
	for (const [id, rect] of nodeLayout) {
		const pid = parentOf.get(id)
		const frame = pid ? frameBounds.get(pid) : undefined
		if (!frame) continue

		const cx = rect.x + rect.w / 2
		const cy = rect.y + rect.h / 2
		if (cx < frame.x || cx > frame.x + frame.w || cy < frame.y || cy > frame.y + frame.h) {
			parentOf.delete(id)
		}
	}

	const nodes: MermaidBlueprintNode[] = []
	const blueprintEdges: MermaidBlueprintEdge[] = []

	for (const compoundId of compoundsTopDown) {
		const bounds = frameBounds.get(compoundId)
		if (!bounds) continue

		nodes.push({
			id: compoundId,
			kind: 'compound',
			...bounds,
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
		const rect = nodeLayout.get(id)
		if (!rect) continue

		nodes.push(...stateToNodes(state, rect, parentOf.get(id), stateColorMap.get(id)))
	}

	const claimed = new Set<number>()
	for (const edge of allEdges) {
		const bend = claimNearestEdgeBend(
			svgEdges,
			claimed,
			nodeCenters.get(edge.id1),
			nodeCenters.get(edge.id2)
		)
		const isNoteEdge = edge.id2.endsWith('----note') || edge.id1.endsWith('----note')
		blueprintEdges.push({
			startNodeId: edge.id1,
			endNodeId: edge.id2,
			label: edge.relationTitle,
			bend,
			...(isNoteEdge && { dash: 'dotted' as const, arrowheadEnd: 'none' as const }),
		})
	}

	return { diagramKind: 'state', nodes, edges: dropDanglingEdges(nodes, blueprintEdges) }
}
