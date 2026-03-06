import {
	DefaultColorThemePalette,
	Editor,
	TLArrowShape,
	TLArrowShapeArrowheadStyle,
	TLBindingCreate,
	TLDefaultColorStyle,
	TLShapeId,
	TLShapePartial,
	VecLike,
	clamp,
	createShapeId,
	toRichText,
} from '@tldraw/editor'
import { FONT_FAMILIES, FONT_SIZES, TEXT_PROPS } from '../../shapes/shared/default-shape-constants'
import { cleanupText } from '../text/text'
import {
	fromMermaidBlock,
	fromMermaidClass,
	fromMermaidER,
	fromMermaidFlowchart,
	fromMermaidSequence,
	fromMermaidState,
} from './parseMermaid'

type MermaidDirection = 'up' | 'down' | 'left' | 'right'

interface MermaidNode {
	id: string
	label: string
	shape?: string
	color?: string
	parentId?: string | null
	data?: unknown
}

interface MermaidEdge {
	id: string
	sourceId: string
	targetId: string
	label: string
	data?: unknown
}

interface MermaidGraph {
	direction?: MermaidDirection
	nodes: MermaidNode[]
	edges: MermaidEdge[]
	data?: unknown
}

interface MermaidNodeLayout {
	x: number
	y: number
	w: number
	h: number
	label: string
	isStartOrEnd: boolean
	isStart: boolean
	isEnd: boolean
	isSubgraph: boolean
}

const MERMAID_CODE_BLOCK_REGEX = /```(?:mermaid|mmd)\s*([\s\S]*?)```/im
const MERMAID_FLOWCHART_REGEX = /^(graph|flowchart)\s+/i
const MERMAID_STATE_REGEX = /^stateDiagram(?:-v2)?\b/i

const MIN_NODE_WIDTH = 200
const MAX_NODE_WIDTH = 320
const MIN_NODE_HEIGHT = 100
const MAX_TEXT_WIDTH = 260
const NODE_HORIZONTAL_PADDING = 32
const NODE_VERTICAL_PADDING = 24
const LABELED_NODE_SIZE_INCREASE = 0
const TERMINAL_NODE_SIZE = 12
const LAYER_GAP = 180
const NODE_GAP = 100
const SUBGRAPH_HORIZONTAL_PADDING = 48
const SUBGRAPH_VERTICAL_PADDING = 40
const SUBGRAPH_HEADER_HEIGHT = 44
const SUBGRAPH_GAP = 48
const OPPOSING_EDGE_BEND = 40
const DIAGONAL_EDGE_BEND = 40
const STATE_BENT_ARROW_LABEL_POSITION = 0.3
const SELF_EDGE_LABEL_POSITION = 0.5
const OBSTACLE_AVOIDANCE_BEND = 40
const OBSTACLE_AVOIDANCE_RECT_PADDING = 12
const OBSTACLE_AVOIDANCE_MAX_BEND = 480
const OBSTACLE_AVOIDANCE_MIN_SEGMENTS = 16
const OBSTACLE_AVOIDANCE_MAX_SEGMENTS = 56
const MERMAID_START_ANCHOR_MIN = 0
const MERMAID_START_ANCHOR_MAX = 1
const MERMAID_END_ANCHOR_MAX = 0.9
const SELF_EDGE_START_ANCHOR_Y = 0.22
const SELF_EDGE_END_ANCHOR_Y = 0.78
const SELF_EDGE_BASE_BEND = 64
const SELF_EDGE_LABEL_PADDING = 18
const STATE_TERMINAL_SCOPE_GAP = 40
const STATE_TERMINAL_SCOPE_LABEL_GAP = 64
const STATE_TERMINAL_SIBLING_GAP = 24
const MERMAID_COLOR_MAPPINGS: Record<string, TLDefaultColorStyle> = {
	black: 'black',
	white: 'white',
	gray: 'grey',
	grey: 'grey',
	lightgray: 'grey',
	lightgrey: 'grey',
	darkgray: 'grey',
	darkgrey: 'grey',
	silver: 'grey',
	slategrey: 'grey',
	slategray: 'grey',
	red: 'red',
	darkred: 'red',
	crimson: 'red',
	maroon: 'red',
	firebrick: 'red',
	pink: 'light-red',
	hotpink: 'light-red',
	lightpink: 'light-red',
	salmon: 'light-red',
	coral: 'orange',
	orangered: 'orange',
	orange: 'orange',
	darkorange: 'orange',
	amber: 'yellow',
	gold: 'yellow',
	yellow: 'yellow',
	khaki: 'yellow',
	olive: 'yellow',
	green: 'green',
	darkgreen: 'green',
	forestgreen: 'green',
	seagreen: 'green',
	teal: 'green',
	lime: 'light-green',
	limegreen: 'light-green',
	chartreuse: 'light-green',
	springgreen: 'light-green',
	cyan: 'light-blue',
	aqua: 'light-blue',
	skyblue: 'light-blue',
	lightblue: 'light-blue',
	deepskyblue: 'light-blue',
	dodgerblue: 'light-blue',
	blue: 'blue',
	royalblue: 'blue',
	navy: 'blue',
	darkblue: 'blue',
	purple: 'violet',
	violet: 'violet',
	indigo: 'violet',
	magenta: 'light-violet',
	fuchsia: 'light-violet',
	orchid: 'light-violet',
	plum: 'light-violet',
	brown: 'orange',
	tan: 'yellow',
}

const MERMAID_COLOR_TARGETS: Array<{ color: TLDefaultColorStyle; rgb: RGB }> = [
	'black',
	'grey',
	'light-violet',
	'violet',
	'blue',
	'light-blue',
	'yellow',
	'orange',
	'green',
	'light-green',
	'light-red',
	'red',
	'white',
].map((color) => ({
	color,
	rgb: hexToRgb(DefaultColorThemePalette.lightMode[color].solid) ?? { r: 0, g: 0, b: 0 },
}))

interface RGB {
	r: number
	g: number
	b: number
}

export async function tryPutMermaidContent(
	editor: Editor,
	{
		point,
		text,
	}: {
		point: VecLike
		text: string
	}
) {
	const mermaidText = extractMermaidText(text)
	if (!mermaidText) return false

	const normalizedMermaidText = normalizeMermaidSource(mermaidText)

	const header = getFirstMermaidHeaderLine(normalizedMermaidText)
	if (!header) return false
	const isFlowchart = MERMAID_FLOWCHART_REGEX.test(header)

	let graph: MermaidGraph
	try {
		graph = parseMermaidGraphFromHeader(header, normalizedMermaidText)
	} catch {
		return false
	}
	if (isFlowchart) {
		graph = inferFlowchartSubgraphParents(normalizedMermaidText, graph)
	}
	const isStateDiagram = isStateDiagramGraph(graph)
	if (isStateDiagram) {
		graph = mergeStateTerminalNodes(graph, {
			filter: (node) =>
				(node.parentId ?? null) === null &&
				isRecord(node.data) &&
				(node.data.isStart === true || node.shape === 'start'),
			groupByParent: false,
		})
		graph = mergeStateTerminalNodes(graph, {
			filter: (node) => isRecord(node.data) && (node.data.isEnd === true || node.shape === 'end'),
			groupByParent: true,
		})
	}

	if (!graph.nodes.length) return false

	const subgraphNodeIds = getSubgraphNodeIds(graph.nodes)
	const renderedNodes = graph.nodes.filter((node) => !subgraphNodeIds.has(node.id))
	const nodeLayouts = getNodeLayouts(editor, renderedNodes)
	if (!nodeLayouts.size) return false

	const positionedNodeLayouts = positionNodes(nodeLayouts, graph.edges, graph.direction ?? 'down')
	if (isStateDiagram) {
		positionStateTerminals(positionedNodeLayouts, renderedNodes, graph.edges)
	}
	const childrenByParent = getChildrenByParent(graph.nodes)
	const subgraphLayouts = getSubgraphLayouts(
		graph.nodes,
		subgraphNodeIds,
		positionedNodeLayouts,
		childrenByParent
	)
	const allNodeLayouts = new Map<string, MermaidNodeLayout>([
		...positionedNodeLayouts,
		...subgraphLayouts,
	])
	resolveSubgraphOverlaps(graph.nodes, subgraphNodeIds, allNodeLayouts)
	if (isStateDiagram) {
		positionStateRootTerminals(allNodeLayouts, graph.nodes, graph.edges)
	}
	centerNodeLayoutsOnPoint(allNodeLayouts, point)
	inflateLabeledNodeLayouts(allNodeLayouts, LABELED_NODE_SIZE_INCREASE)

	const geoDefaultProps = editor.getShapeUtil('geo').getDefaultProps()
	const arrowDefaultProps = editor.getShapeUtil('arrow').getDefaultProps()

	const shapePartials: TLShapePartial[] = []
	const nodeIdToShapeId = new Map<string, TLShapeId>()

	for (const node of sortSubgraphNodesForLayout(graph.nodes, subgraphNodeIds).reverse()) {
		const layout = allNodeLayouts.get(node.id)
		if (!layout) continue

		const shapeId = createShapeId()
		nodeIdToShapeId.set(node.id, shapeId)

		shapePartials.push({
			id: shapeId,
			type: 'geo',
			x: layout.x,
			y: layout.y,
			props: {
				...geoDefaultProps,
				geo: 'rectangle',
				w: layout.w,
				h: layout.h,
				richText: toRichText(layout.label),
				align: 'start',
				verticalAlign: 'start',
				dash: 'dashed',
				fill: 'none',
			},
		})
	}

	for (const node of renderedNodes) {
		const layout = allNodeLayouts.get(node.id)
		if (!layout) continue

		const shapeId = createShapeId()
		nodeIdToShapeId.set(node.id, shapeId)
		const mappedColor = getMermaidNodeColor(node.color)

		shapePartials.push({
			id: shapeId,
			type: 'geo',
			x: layout.x,
			y: layout.y,
			props: {
				...geoDefaultProps,
				geo: getGeoForMermaidNode(node.shape, layout.isStartOrEnd),
				w: layout.w,
				h: layout.h,
				richText: toRichText(layout.label),
				align: 'middle',
				verticalAlign: 'middle',
				...(mappedColor ? { color: mappedColor, fill: 'solid' as const } : null),
				...(layout.isStartOrEnd && !mappedColor ? { fill: 'fill' as const } : null),
			},
		})
	}

	const bindingPartials: TLBindingCreate[] = []
	const arrowPartials: TLShapePartial<TLArrowShape>[] = []
	const arrowPartialsByPair = new Map<string, TLShapePartial<TLArrowShape>[]>()
	const straightArrowPartials = new Set<TLShapePartial<TLArrowShape>>()
	const selfEdgeArrowPartials = new Set<TLShapePartial<TLArrowShape>>()
	const directedEdgeCountByPair = new Map<string, number>()
	for (const edge of graph.edges) {
		const key = `${edge.sourceId}__${edge.targetId}`
		directedEdgeCountByPair.set(key, (directedEdgeCountByPair.get(key) ?? 0) + 1)
	}
	const edgeObstacleLayouts = Array.from(allNodeLayouts.entries())
		.filter(([, layout]) => !layout.isSubgraph && !layout.isStartOrEnd)
		.map(([id, layout]) => ({ id, layout }))
	const nodeById = new Map(graph.nodes.map((node) => [node.id, node]))

	for (const edge of graph.edges) {
		const sourceLayout = allNodeLayouts.get(edge.sourceId)
		const targetLayout = allNodeLayouts.get(edge.targetId)
		const sourceShapeId = nodeIdToShapeId.get(edge.sourceId)
		const targetShapeId = nodeIdToShapeId.get(edge.targetId)
		if (!sourceLayout || !targetLayout || !sourceShapeId || !targetShapeId) continue

		const edgeData = isRecord(edge.data) ? edge.data : null
		if (edgeData?.stroke === 'invisible') continue

		const isSelfEdge = edge.sourceId === edge.targetId
		const isParentToChildEdge = isNodeAncestorOf(edge.sourceId, edge.targetId, nodeById)
		const edgeLabel = normalizeMermaidLabel(edge.label || '')
		const { sourceAnchor, targetAnchor } = getEdgeAnchors(
			sourceLayout,
			targetLayout,
			isSelfEdge,
			isParentToChildEdge
		)
		const sourcePoint = getAnchorPoint(sourceLayout, sourceAnchor)
		const targetPoint = getAnchorPoint(targetLayout, targetAnchor)

		const arrowId = createShapeId()
		const x = Math.min(sourcePoint.x, targetPoint.x)
		const y = Math.min(sourcePoint.y, targetPoint.y)

		const { arrowheadStart, arrowheadEnd } = getArrowheadsForEdge(edgeData)
		const isStateEntryEdge = isStateDiagram && sourceLayout.isStart
		let bend = 0
		if (!isStateEntryEdge) {
			bend = isSelfEdge
				? getSelfEdgeBend(editor, sourceLayout, edgeLabel, arrowDefaultProps)
				: getOpposingEdgeBend(edge, directedEdgeCountByPair)
			if (!isSelfEdge && bend === 0) {
				bend = getDiagonalEdgeBend(sourcePoint, targetPoint)
			}
			if (!isSelfEdge) {
				bend = getObstacleAvoidanceBend(
					sourcePoint,
					targetPoint,
					edge.sourceId,
					edge.targetId,
					edgeObstacleLayouts,
					bend
				)
			}
		}
		const labelPosition = isSelfEdge
			? SELF_EDGE_LABEL_POSITION
			: isStateDiagram && bend !== 0
				? STATE_BENT_ARROW_LABEL_POSITION
				: arrowDefaultProps.labelPosition

		const arrowPartial = {
			id: arrowId,
			type: 'arrow',
			x,
			y,
			props: {
				...arrowDefaultProps,
				start: { x: sourcePoint.x - x, y: sourcePoint.y - y },
				end: { x: targetPoint.x - x, y: targetPoint.y - y },
				richText: toRichText(edgeLabel),
				arrowheadStart,
				arrowheadEnd,
				dash: edgeData?.stroke === 'dotted' ? 'dotted' : arrowDefaultProps.dash,
				size: edgeData?.stroke === 'thick' ? 'l' : arrowDefaultProps.size,
				bend,
				labelPosition,
			},
		} satisfies TLShapePartial<TLArrowShape>
		arrowPartials.push(arrowPartial)
		if (isStateEntryEdge) {
			straightArrowPartials.add(arrowPartial)
		}
		if (isSelfEdge) {
			selfEdgeArrowPartials.add(arrowPartial)
		}

		const pairKey = `${edge.sourceId}__${edge.targetId}`
		const pairPartials = arrowPartialsByPair.get(pairKey)
		if (pairPartials) {
			pairPartials.push(arrowPartial)
		} else {
			arrowPartialsByPair.set(pairKey, [arrowPartial])
		}

		bindingPartials.push({
			type: 'arrow',
			fromId: arrowId,
			toId: sourceShapeId,
			props: {
				terminal: 'start',
				normalizedAnchor: sourceAnchor,
				isPrecise: true,
			},
		})

		bindingPartials.push({
			type: 'arrow',
			fromId: arrowId,
			toId: targetShapeId,
			props: {
				terminal: 'end',
				normalizedAnchor: targetAnchor,
				isPrecise: true,
			},
		})
	}
	distributeParallelEdgeBends(
		arrowPartialsByPair,
		isStateDiagram,
		straightArrowPartials,
		selfEdgeArrowPartials
	)
	shapePartials.push(...arrowPartials)

	if (!shapePartials.length) return false

	editor.run(() => {
		editor.createShapes(shapePartials)
		if (bindingPartials.length) {
			editor.createBindings(bindingPartials)
		}
		editor.select(...shapePartials.map((shape) => shape.id))
	})

	return true
}

function distributeParallelEdgeBends(
	arrowPartialsByPair: Map<string, TLShapePartial<TLArrowShape>[]>,
	isStateDiagram: boolean,
	straightArrowPartials: Set<TLShapePartial<TLArrowShape>>,
	selfEdgeArrowPartials: Set<TLShapePartial<TLArrowShape>>
) {
	for (const pairPartials of arrowPartialsByPair.values()) {
		if (pairPartials.length < 2) continue

		for (let i = 0; i < pairPartials.length; i++) {
			const arrowPartial = pairPartials[i]
			if (straightArrowPartials.has(arrowPartial)) {
				arrowPartial.props.bend = 0
				continue
			}
			const offset = getParallelEdgeBendOffset(i)
			arrowPartial.props.bend += offset
			if (
				isStateDiagram &&
				arrowPartial.props.bend !== 0 &&
				!selfEdgeArrowPartials.has(arrowPartial)
			) {
				arrowPartial.props.labelPosition = STATE_BENT_ARROW_LABEL_POSITION
			}
		}
	}
}

function getParallelEdgeBendOffset(edgeIndex: number) {
	const magnitude = (Math.floor(edgeIndex / 2) + 1) * OPPOSING_EDGE_BEND
	return (edgeIndex % 2 === 0 ? 1 : -1) * magnitude
}

function extractMermaidText(text: string) {
	const codeBlockMatch = text.match(MERMAID_CODE_BLOCK_REGEX)
	if (codeBlockMatch) {
		return cleanupText(codeBlockMatch[1])
	}
	return cleanupText(text)
}

function normalizeMermaidSource(text: string) {
	let normalized = stripYamlFrontmatter(text)
	const header = getFirstMermaidHeaderLine(normalized)
	if (header && MERMAID_FLOWCHART_REGEX.test(header)) {
		normalized = normalizeFlowchartSource(normalized)
	}
	return normalized
}

function stripYamlFrontmatter(text: string) {
	const lines = text.split('\n')
	if (lines[0]?.trim() !== '---') return text

	const endIndex = lines.findIndex((line, index) => index > 0 && line.trim() === '---')
	if (endIndex <= 0) return text

	return lines
		.slice(endIndex + 1)
		.join('\n')
		.trim()
}

function normalizeFlowchartSource(source: string) {
	const lines = source.split('\n')
	const normalizedLines: string[] = []

	for (const line of lines) {
		const trimmed = line.trim()
		if (!trimmed) {
			normalizedLines.push(line)
			continue
		}

		if (/^[A-Za-z_][\w-]*@\s*\{.*\}\s*;?$/.test(trimmed)) {
			continue
		}

		let nextLine = line

		// Remove edge ID prefixes in forms like: A e1@--> B
		nextLine = nextLine.replace(/\s+[A-Za-z_][\w-]*@(?=(?:-+|=+|<|o--|x--|--o|--x))/g, ' ')

		// Normalize bidirectional marker forms that stately's parser currently tokenizes into node IDs.
		nextLine = nextLine.replace(/\bo--o\b/g, '--o')
		nextLine = nextLine.replace(/\bx--x\b/g, '--x')

		const expandedInvisible = expandInvisibleLinkFlowchartLine(nextLine)
		if (expandedInvisible) {
			normalizedLines.push(...expandedInvisible)
			continue
		}

		const expandedMixedShortcut = expandMixedShortcutFlowchartLine(nextLine)
		if (expandedMixedShortcut) {
			normalizedLines.push(...expandedMixedShortcut)
			continue
		}

		const expanded = expandAmpersandFlowchartLine(nextLine)
		if (expanded) {
			normalizedLines.push(...expanded)
		} else {
			normalizedLines.push(nextLine)
		}
	}

	return normalizedLines.join('\n')
}

function expandInvisibleLinkFlowchartLine(line: string): string[] | null {
	const match = line.match(/^\s*([A-Za-z_][\w]*)\s*~~~\s*([A-Za-z_][\w]*)\s*;?\s*$/)
	if (!match) return null

	const [, sourceId, targetId] = match
	if (sourceId === targetId) return [sourceId]
	return [sourceId, targetId]
}

function expandMixedShortcutFlowchartLine(line: string): string[] | null {
	const match = line.match(
		/^(\s*)([A-Za-z_][\w]*)\s*(-->|---|==>|-.->)\s*([A-Za-z_][\w]*)\s*&\s*([A-Za-z_][\w]*)\s*(-->|---|==>|-.->)\s*([A-Za-z_][\w]*)\s*;?\s*$/
	)
	if (!match) return null

	const [, indent, rootId, rootArrow, firstTargetId, secondTargetId, secondArrow, finalTargetId] =
		match

	return [
		`${indent}${rootId} ${rootArrow} ${firstTargetId}`,
		`${indent}${rootId} ${rootArrow} ${secondTargetId}`,
		`${indent}${secondTargetId} ${secondArrow} ${finalTargetId}`,
	]
}

function expandAmpersandFlowchartLine(line: string): string[] | null {
	const match = line.match(
		/^(\s*)([A-Za-z_][\w]*(?:\s*&\s*[A-Za-z_][\w]*)*)\s*(-->|---|==>|-.->)\s*([A-Za-z_][\w]*(?:\s*&\s*[A-Za-z_][\w]*)*)\s*;?\s*$/
	)
	if (!match) return null

	const [, indent, sourceExpr, arrowExpr, targetExpr] = match
	const sourceNodes = sourceExpr.split('&').map((part) => part.trim())
	const targetNodes = targetExpr.split('&').map((part) => part.trim())

	if (sourceNodes.length === 1 && targetNodes.length === 1) return null

	const expanded: string[] = []
	for (const sourceNode of sourceNodes) {
		for (const targetNode of targetNodes) {
			expanded.push(`${indent}${sourceNode} ${arrowExpr} ${targetNode}`)
		}
	}

	return expanded
}

function getFirstMermaidHeaderLine(text: string) {
	for (const line of text.split('\n')) {
		const trimmed = line.trim()
		if (!trimmed) continue
		if (trimmed.startsWith('%%')) continue
		return trimmed
	}
	return null
}

function parseMermaidGraphFromHeader(headerLine: string, source: string): MermaidGraph {
	if (MERMAID_FLOWCHART_REGEX.test(headerLine)) {
		return fromMermaidFlowchart(source)
	}
	if (headerLine.startsWith('sequenceDiagram')) {
		return fromMermaidSequence(source)
	}
	if (MERMAID_STATE_REGEX.test(headerLine)) {
		return fromMermaidState(source)
	}
	if (headerLine.startsWith('classDiagram')) {
		return fromMermaidClass(source)
	}
	if (headerLine.startsWith('erDiagram')) {
		return fromMermaidER(source)
	}
	if (headerLine.startsWith('block-beta')) {
		return fromMermaidBlock(source)
	}
	throw new Error('Not a Mermaid diagram type supported by the parser')
}

function getNodeLayouts(editor: Editor, nodes: MermaidNode[]) {
	const nodeLayouts = new Map<string, MermaidNodeLayout>()
	const geoDefaultProps = editor.getShapeUtil('geo').getDefaultProps()
	const fontFamily = FONT_FAMILIES[geoDefaultProps.font]
	const fontSize = FONT_SIZES[geoDefaultProps.size]

	for (const node of nodes) {
		if (nodeLayouts.has(node.id)) continue

		const isStartOrEnd = isRecord(node.data) ? Boolean(node.data.isStart || node.data.isEnd) : false
		const isStart = isRecord(node.data) ? node.data.isStart === true : false
		const isEnd = isRecord(node.data) ? node.data.isEnd === true : false
		const label = isStartOrEnd ? '' : getMermaidNodeLabel(node)

		let w = TERMINAL_NODE_SIZE
		let h = TERMINAL_NODE_SIZE

		if (!isStartOrEnd) {
			const measured = editor.textMeasure.measureText(label || ' ', {
				...TEXT_PROPS,
				fontFamily,
				fontSize,
				maxWidth: MAX_TEXT_WIDTH,
			})

			w = clamp(measured.w + NODE_HORIZONTAL_PADDING * 2, MIN_NODE_WIDTH, MAX_NODE_WIDTH)
			h = Math.max(measured.h + NODE_VERTICAL_PADDING * 2, MIN_NODE_HEIGHT)
		}

		nodeLayouts.set(node.id, {
			x: 0,
			y: 0,
			w,
			h,
			label,
			isStartOrEnd,
			isStart,
			isEnd,
			isSubgraph: false,
		})
	}

	return nodeLayouts
}

function getSubgraphNodeIds(nodes: MermaidNode[]) {
	const subgraphNodeIds = new Set<string>()
	for (const node of nodes) {
		if (node.parentId) {
			subgraphNodeIds.add(node.parentId)
		}
	}
	return subgraphNodeIds
}

function inferFlowchartSubgraphParents(source: string, graph: MermaidGraph): MermaidGraph {
	const nodeIds = new Set(graph.nodes.map((node) => node.id))
	const declaredParentsByNodeId = new Map<string, string>()
	const subgraphStack: string[] = []

	for (const line of source.split('\n')) {
		const trimmed = line.trim()
		if (!trimmed || trimmed.startsWith('%%')) continue

		const subgraphMatch = trimmed.match(/^subgraph\s+(.+)$/i)
		if (subgraphMatch) {
			const subgraphId = extractFlowchartSubgraphId(subgraphMatch[1], nodeIds)
			if (subgraphId) subgraphStack.push(subgraphId)
			continue
		}

		if (/^end\b/i.test(trimmed)) {
			subgraphStack.pop()
			continue
		}

		if (!subgraphStack.length) continue
		const currentSubgraphId = subgraphStack[subgraphStack.length - 1]

		const tokens = extractFlowchartIdentifierTokens(trimmed)
		for (const token of tokens) {
			if (!nodeIds.has(token)) continue
			declaredParentsByNodeId.set(token, currentSubgraphId)
		}
	}

	if (!declaredParentsByNodeId.size) return graph

	return {
		...graph,
		nodes: graph.nodes.map((node) => {
			const inferredParentId = declaredParentsByNodeId.get(node.id)
			if (!inferredParentId) return node
			if (node.parentId && node.parentId !== inferredParentId) return node
			return { ...node, parentId: node.parentId ?? inferredParentId }
		}),
	}
}

function isStateDiagramGraph(graph: MermaidGraph) {
	return isRecord(graph.data) && graph.data.diagramType === 'stateDiagram'
}

function mergeStateTerminalNodes(
	graph: MermaidGraph,
	options: {
		filter(node: MermaidNode): boolean
		groupByParent: boolean
	}
): MermaidGraph {
	const terminalNodes = graph.nodes.filter(options.filter)
	if (terminalNodes.length < 2) return graph

	const duplicateIdToCanonicalId = new Map<string, string>()

	if (options.groupByParent) {
		const canonicalByParent = new Map<string, MermaidNode>()
		for (const node of terminalNodes) {
			const parentKey = node.parentId ?? '__root__'
			const canonical = canonicalByParent.get(parentKey)
			if (!canonical) {
				canonicalByParent.set(parentKey, node)
			} else {
				duplicateIdToCanonicalId.set(node.id, canonical.id)
			}
		}
	} else {
		const canonical = terminalNodes[0]
		for (const node of terminalNodes.slice(1)) {
			duplicateIdToCanonicalId.set(node.id, canonical.id)
		}
	}

	if (!duplicateIdToCanonicalId.size) return graph

	const nextEdges: MermaidEdge[] = []
	const seenEdgeKeys = new Set<string>()
	for (const edge of graph.edges) {
		const sourceId = duplicateIdToCanonicalId.get(edge.sourceId) ?? edge.sourceId
		const targetId = duplicateIdToCanonicalId.get(edge.targetId) ?? edge.targetId
		const edgeKey = `${sourceId}::${targetId}::${edge.label}`
		if (seenEdgeKeys.has(edgeKey)) continue
		seenEdgeKeys.add(edgeKey)
		nextEdges.push({ ...edge, sourceId, targetId })
	}

	const nextNodes = graph.nodes.filter((node) => !duplicateIdToCanonicalId.has(node.id))

	return {
		...graph,
		nodes: nextNodes,
		edges: nextEdges,
	}
}

function extractFlowchartSubgraphId(rawSubgraphValue: string, nodeIds: Set<string>) {
	const trimmed = rawSubgraphValue.trim()
	if (!trimmed) return null

	// Supports forms like:
	// - subgraph one
	// - subgraph one["Title"]
	// - subgraph "Title only"
	const bracketMatch = trimmed.match(/^([A-Za-z_][\w-]*)\s*(?:\[|\()/)
	if (bracketMatch) return bracketMatch[1]

	const bareIdMatch = trimmed.match(/^([A-Za-z_][\w-]*)\b/)
	if (bareIdMatch && nodeIds.has(bareIdMatch[1])) return bareIdMatch[1]

	if (bareIdMatch) return bareIdMatch[1]
	return null
}

function extractFlowchartIdentifierTokens(line: string) {
	return line.match(/[A-Za-z_][A-Za-z0-9_]*(?:-[A-Za-z0-9_]+)*/g) ?? []
}

function positionStateTerminals(
	nodeLayouts: Map<string, MermaidNodeLayout>,
	nodes: MermaidNode[],
	edges: MermaidEdge[]
) {
	const nodeIdsByParent = new Map<string, string[]>()

	for (const node of nodes) {
		const parentKey = node.parentId ?? '__root__'
		const ids = nodeIdsByParent.get(parentKey)
		if (ids) ids.push(node.id)
		else nodeIdsByParent.set(parentKey, [node.id])
	}

	for (const scopeNodeIds of nodeIdsByParent.values()) {
		positionStateTerminalScope(scopeNodeIds, nodeLayouts, edges)
	}
}

function positionStateTerminalScope(
	scopeNodeIds: string[],
	nodeLayouts: Map<string, MermaidNodeLayout>,
	edges: MermaidEdge[]
) {
	const scopeLayouts = scopeNodeIds
		.map((nodeId) => ({ nodeId, layout: nodeLayouts.get(nodeId) }))
		.filter((entry): entry is { nodeId: string; layout: MermaidNodeLayout } =>
			Boolean(entry.layout)
		)

	const nonTerminalLayouts = scopeLayouts
		.map((entry) => entry.layout)
		.filter((layout) => !layout.isStart && !layout.isEnd)
	if (!nonTerminalLayouts.length) return

	const minY = Math.min(...nonTerminalLayouts.map((layout) => layout.y))
	const maxY = Math.max(...nonTerminalLayouts.map((layout) => layout.y + layout.h))

	const starts = scopeLayouts.filter((entry) => entry.layout.isStart)
	const ends = scopeLayouts.filter((entry) => entry.layout.isEnd)

	positionStateTerminalRow(starts, minY, -1, nodeLayouts, edges)
	positionStateTerminalRow(ends, maxY, 1, nodeLayouts, edges)
}

function positionStateRootTerminals(
	nodeLayouts: Map<string, MermaidNodeLayout>,
	nodes: MermaidNode[],
	edges: MermaidEdge[]
) {
	const rootNodeIds = nodes
		.filter((node) => (node.parentId ?? null) === null)
		.map((node) => node.id)
	positionStateTerminalScope(rootNodeIds, nodeLayouts, edges)
}

function positionStateTerminalRow(
	terminals: { nodeId: string; layout: MermaidNodeLayout }[],
	referenceY: number,
	direction: -1 | 1,
	nodeLayouts: Map<string, MermaidNodeLayout>,
	edges: MermaidEdge[]
) {
	if (!terminals.length) return

	const candidates = terminals.map((terminal) => {
		const connectedEdges =
			direction < 0
				? edges.filter((edge) => edge.sourceId === terminal.nodeId)
				: edges.filter((edge) => edge.targetId === terminal.nodeId)
		const connectedNodeIds = Array.from(
			new Set(
				connectedEdges
					.map((edge) => (direction < 0 ? edge.targetId : edge.sourceId))
					.filter((id) => id !== terminal.nodeId)
			)
		)

		const connectedLayouts = connectedNodeIds
			.map((nodeId) => nodeLayouts.get(nodeId))
			.filter((layout): layout is MermaidNodeLayout => Boolean(layout))
		const hasLabeledEdge = connectedEdges.some(
			(edge) => normalizeMermaidLabel(edge.label || '').length > 0
		)
		const terminalGap = hasLabeledEdge ? STATE_TERMINAL_SCOPE_LABEL_GAP : STATE_TERMINAL_SCOPE_GAP

		let preferredX = terminal.layout.x
		if (connectedLayouts.length > 0) {
			const connectedMinX = Math.min(...connectedLayouts.map((layout) => layout.x))
			const connectedMaxX = Math.max(...connectedLayouts.map((layout) => layout.x + layout.w))
			const connectedCenterX = connectedMinX + (connectedMaxX - connectedMinX) / 2
			preferredX = connectedCenterX - terminal.layout.w / 2
		}

		return {
			...terminal,
			preferredX,
			terminalGap,
		}
	})

	candidates.sort((a, b) => a.preferredX - b.preferredX)
	const rowGap = Math.max(...candidates.map((candidate) => candidate.terminalGap))

	let cursorX = -Infinity
	for (const candidate of candidates) {
		const nextX = Math.max(candidate.preferredX, cursorX)
		cursorX = nextX + candidate.layout.w + STATE_TERMINAL_SIBLING_GAP
		const nextY = direction < 0 ? referenceY - rowGap - candidate.layout.h : referenceY + rowGap

		nodeLayouts.set(candidate.nodeId, {
			...candidate.layout,
			x: nextX,
			y: nextY,
		})
	}
}

function getSubgraphLayouts(
	nodes: MermaidNode[],
	subgraphNodeIds: Set<string>,
	nodeLayouts: Map<string, MermaidNodeLayout>,
	childrenByParent: Map<string, string[]>
) {
	const subgraphLayouts = new Map<string, MermaidNodeLayout>()
	if (!subgraphNodeIds.size) return subgraphLayouts

	const subgraphNodes = sortSubgraphNodesForLayout(nodes, subgraphNodeIds)
	for (const subgraphNode of subgraphNodes) {
		const childLayouts: MermaidNodeLayout[] = []
		for (const childId of childrenByParent.get(subgraphNode.id) ?? []) {
			const layout = nodeLayouts.get(childId) ?? subgraphLayouts.get(childId)
			if (layout) childLayouts.push(layout)
		}
		if (!childLayouts.length) continue

		const minX = Math.min(...childLayouts.map((layout) => layout.x))
		const minY = Math.min(...childLayouts.map((layout) => layout.y))
		const maxX = Math.max(...childLayouts.map((layout) => layout.x + layout.w))
		const maxY = Math.max(...childLayouts.map((layout) => layout.y + layout.h))
		const label = cleanupText(subgraphNode.label || subgraphNode.id)

		subgraphLayouts.set(subgraphNode.id, {
			x: minX - SUBGRAPH_HORIZONTAL_PADDING,
			y: minY - (SUBGRAPH_VERTICAL_PADDING + SUBGRAPH_HEADER_HEIGHT),
			w: maxX - minX + SUBGRAPH_HORIZONTAL_PADDING * 2,
			h: maxY - minY + SUBGRAPH_VERTICAL_PADDING * 2 + SUBGRAPH_HEADER_HEIGHT,
			label,
			isStartOrEnd: false,
			isStart: false,
			isEnd: false,
			isSubgraph: true,
		})
	}

	return subgraphLayouts
}

function getChildrenByParent(nodes: MermaidNode[]) {
	const childrenByParent = new Map<string, string[]>()
	for (const node of nodes) {
		if (!node.parentId) continue
		const siblings = childrenByParent.get(node.parentId)
		if (siblings) siblings.push(node.id)
		else childrenByParent.set(node.parentId, [node.id])
	}
	return childrenByParent
}

function sortSubgraphNodesForLayout(nodes: MermaidNode[], subgraphNodeIds: Set<string>) {
	const nodeById = new Map(nodes.map((node) => [node.id, node]))
	const getDepth = (node: MermaidNode) => {
		let depth = 0
		let parentId = node.parentId
		while (parentId) {
			const parentNode = nodeById.get(parentId)
			if (!parentNode || !subgraphNodeIds.has(parentNode.id)) break
			depth++
			parentId = parentNode.parentId
		}
		return depth
	}

	return nodes
		.filter((node) => subgraphNodeIds.has(node.id))
		.sort((a, b) => getDepth(b) - getDepth(a))
}

function resolveSubgraphOverlaps(
	nodes: MermaidNode[],
	subgraphNodeIds: Set<string>,
	allNodeLayouts: Map<string, MermaidNodeLayout>
) {
	if (subgraphNodeIds.size < 2) return

	const nodeById = new Map(nodes.map((node) => [node.id, node]))
	const subgraphNodes = sortSubgraphNodesForLayout(nodes, subgraphNodeIds)
		.reverse()
		.filter((node) => allNodeLayouts.has(node.id))
		.sort((a, b) => {
			const aLayout = allNodeLayouts.get(a.id)!
			const bLayout = allNodeLayouts.get(b.id)!
			if (aLayout.x !== bLayout.x) return aLayout.x - bLayout.x
			return aLayout.y - bLayout.y
		})

	for (let i = 0; i < subgraphNodes.length; i++) {
		const currentSubgraph = subgraphNodes[i]
		let currentLayout = allNodeLayouts.get(currentSubgraph.id)
		if (!currentLayout) continue

		let minAllowedX = currentLayout.x
		for (let j = 0; j < i; j++) {
			const otherSubgraph = subgraphNodes[j]
			const otherLayout = allNodeLayouts.get(otherSubgraph.id)
			if (!otherLayout) continue

			if (
				isNodeDescendantOf(currentSubgraph.id, otherSubgraph.id, nodeById) ||
				isNodeDescendantOf(otherSubgraph.id, currentSubgraph.id, nodeById)
			) {
				continue
			}

			if (
				!rangesOverlap(
					currentLayout.y,
					currentLayout.y + currentLayout.h,
					otherLayout.y,
					otherLayout.y + otherLayout.h
				)
			) {
				continue
			}

			minAllowedX = Math.max(minAllowedX, otherLayout.x + otherLayout.w + SUBGRAPH_GAP)
		}

		// Keep non-member nodes from being swallowed by a subgraph container.
		// This helps cases like `c1 --> a2` where `c1` should stay outside `subgraph one`.
		for (const node of nodes) {
			if (node.id === currentSubgraph.id) continue
			if (subgraphNodeIds.has(node.id)) continue
			if (isNodeDescendantOf(node.id, currentSubgraph.id, nodeById)) continue

			const otherLayout = allNodeLayouts.get(node.id)
			if (!otherLayout) continue

			if (
				!rangesOverlap(
					currentLayout.y,
					currentLayout.y + currentLayout.h,
					otherLayout.y,
					otherLayout.y + otherLayout.h
				)
			) {
				continue
			}

			if (
				otherLayout.x + otherLayout.w <= currentLayout.x ||
				otherLayout.x >= currentLayout.x + currentLayout.w
			) {
				continue
			}

			minAllowedX = Math.max(minAllowedX, otherLayout.x + otherLayout.w + SUBGRAPH_GAP)
		}

		if (minAllowedX <= currentLayout.x) continue
		const dx = minAllowedX - currentLayout.x
		translateSubgraphSubtree(currentSubgraph.id, dx, 0, nodes, nodeById, allNodeLayouts)
		currentLayout = allNodeLayouts.get(currentSubgraph.id)
		if (!currentLayout) continue
	}
}

function translateSubgraphSubtree(
	subgraphId: string,
	dx: number,
	dy: number,
	nodes: MermaidNode[],
	nodeById: Map<string, MermaidNode>,
	allNodeLayouts: Map<string, MermaidNodeLayout>
) {
	if (!dx && !dy) return

	for (const node of nodes) {
		if (!isNodeDescendantOf(node.id, subgraphId, nodeById) && node.id !== subgraphId) continue
		const layout = allNodeLayouts.get(node.id)
		if (!layout) continue
		allNodeLayouts.set(node.id, {
			...layout,
			x: layout.x + dx,
			y: layout.y + dy,
		})
	}
}

function isNodeDescendantOf(
	nodeId: string,
	ancestorId: string,
	nodeById: Map<string, MermaidNode>
): boolean {
	let parentId = nodeById.get(nodeId)?.parentId ?? null
	while (parentId) {
		if (parentId === ancestorId) return true
		parentId = nodeById.get(parentId)?.parentId ?? null
	}
	return false
}

function rangesOverlap(aMin: number, aMax: number, bMin: number, bMax: number) {
	return !(aMax <= bMin || bMax <= aMin)
}

function positionNodes(
	nodeLayouts: Map<string, MermaidNodeLayout>,
	edges: MermaidEdge[],
	direction: MermaidDirection
) {
	const orderedNodeIds = Array.from(nodeLayouts.keys())
	const edgesToRender = edges.filter(
		(edge) => nodeLayouts.has(edge.sourceId) && nodeLayouts.has(edge.targetId)
	)

	const incomingCount = new Map<string, number>()
	const outgoingEdges = new Map<string, MermaidEdge[]>()
	const incomingEdges = new Map<string, MermaidEdge[]>()

	for (const nodeId of orderedNodeIds) {
		incomingCount.set(nodeId, 0)
		outgoingEdges.set(nodeId, [])
		incomingEdges.set(nodeId, [])
	}

	for (const edge of edgesToRender) {
		if (edge.sourceId === edge.targetId) continue
		outgoingEdges.get(edge.sourceId)!.push(edge)
		incomingEdges.get(edge.targetId)!.push(edge)
		incomingCount.set(edge.targetId, incomingCount.get(edge.targetId)! + 1)
	}

	const depthByNode = new Map<string, number>(orderedNodeIds.map((id) => [id, 0]))
	const queue = orderedNodeIds.filter((id) => incomingCount.get(id) === 0)
	const visited = new Set<string>()

	while (queue.length) {
		const nodeId = queue.shift()!
		if (visited.has(nodeId)) continue
		visited.add(nodeId)

		const currentDepth = depthByNode.get(nodeId) ?? 0
		for (const edge of outgoingEdges.get(nodeId)!) {
			const nextDepth = currentDepth + 1
			depthByNode.set(edge.targetId, Math.max(depthByNode.get(edge.targetId) ?? 0, nextDepth))
			incomingCount.set(edge.targetId, incomingCount.get(edge.targetId)! - 1)
			if (incomingCount.get(edge.targetId) === 0) {
				queue.push(edge.targetId)
			}
		}
	}

	for (const nodeId of orderedNodeIds) {
		if (visited.has(nodeId)) continue

		let bestDepth = depthByNode.get(nodeId) ?? 0
		for (const edge of incomingEdges.get(nodeId)!) {
			bestDepth = Math.max(bestDepth, (depthByNode.get(edge.sourceId) ?? 0) + 1)
		}

		depthByNode.set(nodeId, bestDepth)
	}

	const layers = new Map<number, string[]>()
	for (const nodeId of orderedNodeIds) {
		const depth = depthByNode.get(nodeId) ?? 0
		if (!layers.has(depth)) layers.set(depth, [])
		layers.get(depth)!.push(nodeId)
	}

	const positionedLayouts = new Map<string, MermaidNodeLayout>()
	const sortedLayers = Array.from(layers.keys()).sort((a, b) => a - b)
	const isHorizontal = direction === 'left' || direction === 'right'
	const maxBreadthNodeSize = Math.max(
		...orderedNodeIds.map((nodeId) => {
			const layout = nodeLayouts.get(nodeId)!
			return isHorizontal ? layout.h : layout.w
		})
	)

	let depthCursor = 0

	for (const layer of sortedLayers) {
		const layerNodeIds = layers.get(layer)!

		const maxDepthSize = Math.max(
			...layerNodeIds.map((nodeId) => {
				const layout = nodeLayouts.get(nodeId)!
				return isHorizontal ? layout.w : layout.h
			})
		)

		for (let index = 0; index < layerNodeIds.length; index++) {
			const nodeId = layerNodeIds[index]
			const layout = nodeLayouts.get(nodeId)!
			const positionedLayout = { ...layout }
			const breadthCenter = index * (maxBreadthNodeSize + NODE_GAP) + maxBreadthNodeSize / 2

			if (isHorizontal) {
				positionedLayout.x = depthCursor + (maxDepthSize - layout.w) / 2
				positionedLayout.y = breadthCenter - layout.h / 2
			} else {
				positionedLayout.x = breadthCenter - layout.w / 2
				positionedLayout.y = depthCursor + (maxDepthSize - layout.h) / 2
			}

			positionedLayouts.set(nodeId, positionedLayout)
		}

		depthCursor += maxDepthSize + LAYER_GAP
	}

	if (direction === 'left') {
		for (const [nodeId, layout] of positionedLayouts) {
			positionedLayouts.set(nodeId, { ...layout, x: -layout.x - layout.w })
		}
	}

	if (direction === 'up') {
		for (const [nodeId, layout] of positionedLayouts) {
			positionedLayouts.set(nodeId, { ...layout, y: -layout.y - layout.h })
		}
	}

	return positionedLayouts
}

function centerNodeLayoutsOnPoint(nodeLayouts: Map<string, MermaidNodeLayout>, point: VecLike) {
	let minX = Infinity
	let minY = Infinity
	let maxX = -Infinity
	let maxY = -Infinity

	for (const layout of nodeLayouts.values()) {
		minX = Math.min(minX, layout.x)
		minY = Math.min(minY, layout.y)
		maxX = Math.max(maxX, layout.x + layout.w)
		maxY = Math.max(maxY, layout.y + layout.h)
	}

	const offsetX = point.x - (minX + maxX) / 2
	const offsetY = point.y - (minY + maxY) / 2

	for (const [nodeId, layout] of nodeLayouts) {
		nodeLayouts.set(nodeId, {
			...layout,
			x: layout.x + offsetX,
			y: layout.y + offsetY,
		})
	}
}

function inflateLabeledNodeLayouts(nodeLayouts: Map<string, MermaidNodeLayout>, increase: number) {
	if (increase <= 0) return

	const offset = increase / 2
	for (const [nodeId, layout] of nodeLayouts) {
		if (!layout.label.trim()) continue

		nodeLayouts.set(nodeId, {
			...layout,
			x: layout.x - offset,
			y: layout.y - offset,
			w: layout.w + increase,
			h: layout.h + increase,
		})
	}
}

function getGeoForMermaidNode(shape: string | undefined, isStartOrEnd: boolean) {
	if (isStartOrEnd) return 'ellipse' as const
	const normalizedShape = shape?.toLowerCase()

	switch (normalizedShape) {
		case 'choice':
			return 'diamond' as const
		case 'circle':
		case 'double-circle':
			return 'ellipse' as const
		case 'diamond':
			return 'diamond' as const
		case 'hexagon':
			return 'hexagon' as const
		case 'triangle':
			return 'triangle' as const
		case 'oval':
		case 'stadium':
			return 'oval' as const
		case 'trapezoid':
		case 'trapezoid-alt':
		case 'parallelogram':
		case 'parallelogram-alt':
			return 'trapezoid' as const
		case 'cloud':
			return 'cloud' as const
		default:
			return 'rectangle' as const
	}
}

function getMermaidNodeLabel(node: MermaidNode) {
	if (isRecord(node.data) && typeof node.data.description === 'string') {
		return normalizeMermaidLabel(node.data.description)
	}
	return normalizeMermaidLabel(node.label || node.id)
}

function getArrowheadsForEdge(edgeData: Record<string, unknown> | null): {
	arrowheadStart: TLArrowShapeArrowheadStyle
	arrowheadEnd: TLArrowShapeArrowheadStyle
} {
	const arrowheadStart = getArrowheadForMarker(
		edgeData?.startMarker,
		Boolean(edgeData?.bidirectional)
	)
	const arrowheadEnd = getArrowheadForMarker(edgeData?.endMarker, edgeData?.arrowType !== 'none')

	return { arrowheadStart, arrowheadEnd }
}

function getArrowheadForMarker(marker: unknown, hasArrow: boolean): TLArrowShapeArrowheadStyle {
	if (!hasArrow) return 'none'

	switch (marker) {
		case 'arrow':
			return 'arrow'
		case 'circle':
			return 'dot'
		case 'cross':
			return 'bar'
		default:
			return 'arrow'
	}
}

function getOpposingEdgeBend(edge: MermaidEdge, directedEdgeCountByPair: Map<string, number>) {
	const reverseEdgeKey = `${edge.targetId}__${edge.sourceId}`
	const hasReverseEdge = (directedEdgeCountByPair.get(reverseEdgeKey) ?? 0) > 0
	if (!hasReverseEdge) return 0

	// Bend direction is relative to each arrow's own start/end vector.
	// For A->B and B->A, using opposite signed bends can still overlap visually.
	// Using the same sign gives opposite visual offsets for reverse-direction pairs.
	return OPPOSING_EDGE_BEND
}

function getSelfEdgeBend(
	editor: Editor,
	layout: MermaidNodeLayout,
	edgeLabel: string,
	arrowDefaultProps: ReturnType<Editor['getShapeUtil']>['getDefaultProps']
) {
	const sizeDrivenBend = Math.max(SELF_EDGE_BASE_BEND, layout.w * 0.24, layout.h * 0.9)
	if (!edgeLabel.trim()) return -sizeDrivenBend

	const fontFamily = FONT_FAMILIES[arrowDefaultProps.font]
	const fontSize = FONT_SIZES[arrowDefaultProps.size]
	const measured = editor.textMeasure.measureText(edgeLabel, {
		...TEXT_PROPS,
		fontFamily,
		fontSize,
		maxWidth: MAX_TEXT_WIDTH,
	})

	return -Math.max(sizeDrivenBend, measured.w / 2 + SELF_EDGE_LABEL_PADDING)
}

function getDiagonalEdgeBend(sourcePoint: VecLike, targetPoint: VecLike) {
	const dx = targetPoint.x - sourcePoint.x
	const dy = targetPoint.y - sourcePoint.y
	const epsilon = 0.0001

	if (Math.abs(dx) <= epsilon || Math.abs(dy) <= epsilon) return 0

	if (dy > 0) {
		return dx > 0 ? DIAGONAL_EDGE_BEND : -DIAGONAL_EDGE_BEND
	}

	return dx > 0 ? -DIAGONAL_EDGE_BEND : DIAGONAL_EDGE_BEND
}

function getObstacleAvoidanceBend(
	sourcePoint: VecLike,
	targetPoint: VecLike,
	sourceId: string,
	targetId: string,
	obstacles: { id: string; layout: MermaidNodeLayout }[],
	preferredBend = 0
) {
	const relevantRects = obstacles
		.filter((entry) => entry.id !== sourceId && entry.id !== targetId)
		.map((entry) => inflateRect(entry.layout, OBSTACLE_AVOIDANCE_RECT_PADDING))

	if (!relevantRects.length) return preferredBend

	const straightHitCount = countPolylineRectIntersections([sourcePoint, targetPoint], relevantRects)
	const preferredHitCount =
		preferredBend === 0
			? 0
			: countPolylineRectIntersections(
					getBentCurveSamplePoints(
						sourcePoint,
						targetPoint,
						preferredBend,
						getObstacleAvoidanceSampleSegments(sourcePoint, targetPoint)
					),
					relevantRects
				)
	if (!straightHitCount && (!preferredBend || preferredHitCount === 0)) return preferredBend

	const candidates = getObstacleAvoidanceCandidates(sourcePoint, targetPoint, preferredBend)
	let bestBend = candidates[0] ?? preferredBend
	let bestHitCount = Number.POSITIVE_INFINITY
	const sampleSegments = getObstacleAvoidanceSampleSegments(sourcePoint, targetPoint)

	for (const bend of candidates) {
		const hitCount = countPolylineRectIntersections(
			getBentCurveSamplePoints(sourcePoint, targetPoint, bend, sampleSegments),
			relevantRects
		)
		if (hitCount === 0) return bend

		if (
			hitCount < bestHitCount ||
			(hitCount === bestHitCount && Math.abs(bend) < Math.abs(bestBend))
		) {
			bestHitCount = hitCount
			bestBend = bend
		}
	}

	return bestBend
}

function getObstacleAvoidanceCandidates(
	sourcePoint: VecLike,
	targetPoint: VecLike,
	preferredBend: number
) {
	const distance = Math.hypot(targetPoint.x - sourcePoint.x, targetPoint.y - sourcePoint.y)
	const maxBend = Math.min(
		OBSTACLE_AVOIDANCE_MAX_BEND,
		Math.max(OBSTACLE_AVOIDANCE_BEND * 2, distance * 2)
	)
	const step = Math.max(8, Math.round(OBSTACLE_AVOIDANCE_BEND / 2))

	const signs =
		preferredBend === 0
			? [1, -1]
			: [Math.sign(preferredBend) || 1, -(Math.sign(preferredBend) || 1)]
	const candidates = new Set<number>()
	if (preferredBend !== 0) candidates.add(preferredBend)

	for (let magnitude = OBSTACLE_AVOIDANCE_BEND; magnitude <= maxBend; magnitude += step) {
		const rounded = Math.round(magnitude)
		for (const sign of signs) {
			candidates.add(sign * rounded)
		}
	}

	return Array.from(candidates)
}

function getObstacleAvoidanceSampleSegments(sourcePoint: VecLike, targetPoint: VecLike) {
	const distance = Math.hypot(targetPoint.x - sourcePoint.x, targetPoint.y - sourcePoint.y)
	return clamp(
		Math.ceil(distance / 24),
		OBSTACLE_AVOIDANCE_MIN_SEGMENTS,
		OBSTACLE_AVOIDANCE_MAX_SEGMENTS
	)
}

function inflateRect(rect: { x: number; y: number; w: number; h: number }, padding: number) {
	return {
		x: rect.x - padding,
		y: rect.y - padding,
		w: rect.w + padding * 2,
		h: rect.h + padding * 2,
	}
}

function getBentCurveSamplePoints(start: VecLike, end: VecLike, bend: number, segments: number) {
	const dx = end.x - start.x
	const dy = end.y - start.y
	const length = Math.hypot(dx, dy)
	if (!length || segments < 1) return [start, end]

	const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }
	const perp = { x: -dy / length, y: dx / length }
	const control = { x: mid.x + perp.x * bend, y: mid.y + perp.y * bend }
	const points: VecLike[] = []

	for (let i = 0; i <= segments; i++) {
		const t = i / segments
		const omt = 1 - t
		points.push({
			x: omt * omt * start.x + 2 * omt * t * control.x + t * t * end.x,
			y: omt * omt * start.y + 2 * omt * t * control.y + t * t * end.y,
		})
	}

	return points
}

function countPolylineRectIntersections(
	points: VecLike[],
	rects: { x: number; y: number; w: number; h: number }[]
) {
	let intersections = 0

	for (const rect of rects) {
		if (polylineIntersectsRect(points, rect)) intersections++
	}

	return intersections
}

function polylineIntersectsRect(
	points: VecLike[],
	rect: { x: number; y: number; w: number; h: number }
) {
	for (let i = 0; i < points.length - 1; i++) {
		if (segmentIntersectsRect(points[i], points[i + 1], rect)) return true
	}
	return false
}

function segmentIntersectsRect(
	a: VecLike,
	b: VecLike,
	rect: { x: number; y: number; w: number; h: number }
) {
	if (pointInRect(a, rect) || pointInRect(b, rect)) return true

	const topLeft = { x: rect.x, y: rect.y }
	const topRight = { x: rect.x + rect.w, y: rect.y }
	const bottomRight = { x: rect.x + rect.w, y: rect.y + rect.h }
	const bottomLeft = { x: rect.x, y: rect.y + rect.h }

	return (
		segmentsIntersect(a, b, topLeft, topRight) ||
		segmentsIntersect(a, b, topRight, bottomRight) ||
		segmentsIntersect(a, b, bottomRight, bottomLeft) ||
		segmentsIntersect(a, b, bottomLeft, topLeft)
	)
}

function pointInRect(point: VecLike, rect: { x: number; y: number; w: number; h: number }) {
	return (
		point.x >= rect.x &&
		point.x <= rect.x + rect.w &&
		point.y >= rect.y &&
		point.y <= rect.y + rect.h
	)
}

function segmentsIntersect(a: VecLike, b: VecLike, c: VecLike, d: VecLike) {
	const o1 = orientation(a, b, c)
	const o2 = orientation(a, b, d)
	const o3 = orientation(c, d, a)
	const o4 = orientation(c, d, b)

	if (o1 !== o2 && o3 !== o4) return true

	if (o1 === 0 && onSegment(a, c, b)) return true
	if (o2 === 0 && onSegment(a, d, b)) return true
	if (o3 === 0 && onSegment(c, a, d)) return true
	if (o4 === 0 && onSegment(c, b, d)) return true

	return false
}

function orientation(a: VecLike, b: VecLike, c: VecLike) {
	const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y)
	if (Math.abs(value) < 0.00001) return 0
	return value > 0 ? 1 : 2
}

function onSegment(a: VecLike, b: VecLike, c: VecLike) {
	return (
		b.x <= Math.max(a.x, c.x) &&
		b.x >= Math.min(a.x, c.x) &&
		b.y <= Math.max(a.y, c.y) &&
		b.y >= Math.min(a.y, c.y)
	)
}

function getNodeCenter(layout: MermaidNodeLayout) {
	return {
		x: layout.x + layout.w / 2,
		y: layout.y + layout.h / 2,
	}
}

function getEdgeAnchors(
	sourceLayout: MermaidNodeLayout,
	targetLayout: MermaidNodeLayout,
	isSelfEdge: boolean,
	isParentToChildEdge: boolean
) {
	if (isSelfEdge) {
		return {
			sourceAnchor: { x: MERMAID_START_ANCHOR_MAX, y: SELF_EDGE_START_ANCHOR_Y },
			targetAnchor: { x: MERMAID_END_ANCHOR_MAX, y: SELF_EDGE_END_ANCHOR_Y },
		}
	}

	if (isParentToChildEdge) {
		return {
			sourceAnchor: getDirectionalAnchor(getNodeCenter(sourceLayout), getNodeCenter(targetLayout)),
			targetAnchor: { x: 0.5, y: 0.5 },
		}
	}

	return {
		sourceAnchor: { x: 0.5, y: 0.5 },
		targetAnchor: { x: 0.5, y: 0.5 },
	}
}

function getDirectionalAnchor(sourceCenter: VecLike, targetCenter: VecLike) {
	const dx = targetCenter.x - sourceCenter.x
	const dy = targetCenter.y - sourceCenter.y

	if (Math.abs(dx) >= Math.abs(dy)) {
		return { x: dx >= 0 ? MERMAID_START_ANCHOR_MAX : MERMAID_START_ANCHOR_MIN, y: 0.5 }
	}

	return { x: 0.5, y: dy >= 0 ? MERMAID_START_ANCHOR_MAX : MERMAID_START_ANCHOR_MIN }
}

function isNodeAncestorOf(ancestorId: string, nodeId: string, nodeById: Map<string, MermaidNode>) {
	let parentId = nodeById.get(nodeId)?.parentId ?? null
	while (parentId) {
		if (parentId === ancestorId) return true
		parentId = nodeById.get(parentId)?.parentId ?? null
	}
	return false
}

function getAnchorPoint(layout: MermaidNodeLayout, anchor: { x: number; y: number }) {
	return {
		x: layout.x + layout.w * anchor.x,
		y: layout.y + layout.h * anchor.y,
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}

function normalizeMermaidLabel(label: string) {
	let cleanedLabel = cleanupText(label)
	if (cleanedLabel.length >= 2 && cleanedLabel.startsWith('"') && cleanedLabel.endsWith('"')) {
		cleanedLabel = cleanedLabel.slice(1, -1)
	}

	// Flowchart class syntax (A:::foo) can leak into labels via parser output.
	cleanedLabel = cleanedLabel.replace(/:::[A-Za-z_][\w-]*/g, '').trim()

	return cleanedLabel
}

function getMermaidNodeColor(colorValue: string | undefined): TLDefaultColorStyle | null {
	if (!colorValue) return null

	const raw = colorValue.trim().toLowerCase()
	if (!raw || raw === 'none' || raw === 'transparent') return null

	const stripped = raw.replace(/['"]/g, '')
	const normalizedName = stripped.replace(/[\s_-]+/g, '')
	const mappedNameColor = MERMAID_COLOR_MAPPINGS[normalizedName]
	if (mappedNameColor) return mappedNameColor

	const parsedRgb = parseMermaidColorToRgb(stripped)
	if (!parsedRgb) return null

	return getNearestTldrawColor(parsedRgb)
}

function parseMermaidColorToRgb(colorValue: string): RGB | null {
	const hex = hexToRgb(colorValue)
	if (hex) return hex
	return rgbStringToRgb(colorValue)
}

function hexToRgb(value: string): RGB | null {
	const input = value.trim()
	if (!input.startsWith('#')) return null

	const hex = input.slice(1)
	if (hex.length === 3 || hex.length === 4) {
		const [r, g, b] = hex
		if (!r || !g || !b) return null
		const rgb = {
			r: parseInt(`${r}${r}`, 16),
			g: parseInt(`${g}${g}`, 16),
			b: parseInt(`${b}${b}`, 16),
		}
		if ([rgb.r, rgb.g, rgb.b].some(Number.isNaN)) return null
		return rgb
	}

	if (hex.length === 6 || hex.length === 8) {
		const r = Number.parseInt(hex.slice(0, 2), 16)
		const g = Number.parseInt(hex.slice(2, 4), 16)
		const b = Number.parseInt(hex.slice(4, 6), 16)
		if ([r, g, b].some(Number.isNaN)) return null
		return { r, g, b }
	}

	return null
}

function rgbStringToRgb(value: string): RGB | null {
	const match = value.match(/^rgba?\((.+)\)$/)
	if (!match) return null

	const inner = match[1].replace(/\//g, ' ').replace(/,/g, ' ')
	const parts = inner.split(/\s+/).filter(Boolean)
	if (parts.length < 3) return null

	const r = parseRgbChannel(parts[0])
	const g = parseRgbChannel(parts[1])
	const b = parseRgbChannel(parts[2])
	if (r == null || g == null || b == null) return null

	return { r, g, b }
}

function parseRgbChannel(value: string): number | null {
	if (value.endsWith('%')) {
		const percent = Number.parseFloat(value.slice(0, -1))
		if (!Number.isFinite(percent)) return null
		return clamp(Math.round((percent / 100) * 255), 0, 255)
	}

	const num = Number.parseFloat(value)
	if (!Number.isFinite(num)) return null
	return clamp(Math.round(num), 0, 255)
}

function getNearestTldrawColor(rgb: RGB): TLDefaultColorStyle {
	let nearestColor: TLDefaultColorStyle = 'black'
	let nearestDistance = Number.POSITIVE_INFINITY

	for (const candidate of MERMAID_COLOR_TARGETS) {
		const distance =
			(candidate.rgb.r - rgb.r) ** 2 +
			(candidate.rgb.g - rgb.g) ** 2 +
			(candidate.rgb.b - rgb.b) ** 2
		if (distance < nearestDistance) {
			nearestDistance = distance
			nearestColor = candidate.color
		}
	}

	return nearestColor
}
