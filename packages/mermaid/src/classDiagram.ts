import type {
	ClassMember,
	ClassNode,
	ClassRelation,
} from 'mermaid/dist/diagrams/class/classTypes.js'
import type { TLArrowShapeArrowheadStyle } from 'tldraw'
import type {
	DiagramMermaidBlueprint,
	MermaidBlueprintEdge,
	MermaidBlueprintNode,
	MermaidClassBox,
	MermaidClassMember,
} from './blueprint'
import {
	buildNodeCentersFromSvg,
	claimEdge,
	getSelfLoopEdgeLayout,
	parseAllEdgePointsFromSvg,
	parseClustersFromSvg,
	parseDomId,
	parseEdgeId,
	parseEdgeLabelsFromSvg,
	type ParsedDiagramLayout,
	type ParsedEdge,
	type ParsedNode,
	parseNodesFromSvg,
	scaleLayout,
	stripDiagramIdPrefix,
} from './svgParsing'
import {
	dropDanglingEdges,
	escapeHtml,
	FRAME_TOP_PAD,
	getArrowBend,
	LAYOUT_SCALE,
	orderTopDown,
	sanitizeDiagramText,
} from './utils'

const NODE_ID = /^classId-(.+)-\d+$/
const EDGE_ID = /(?:^|-)id_(.+)_\d+$/
// A self-relation is three paths, `-1`, `-mid` (which carries the label) and `-2`, joined in that order.
const SELF_LOOP_SEGMENT_ID = /^(?:mermaid-\d+-)?(.+)-cyclic-special-(1|mid|2)$/

// Mermaid's `relationType` values. A relation end with no marker is the string `'none'`.
const AGGREGATION = 0
const EXTENSION = 1
const COMPOSITION = 2
const DEPENDENCY = 3

const DOTTED_LINE = 1

function mapRelationTypeToArrowhead(type: number | string): TLArrowShapeArrowheadStyle {
	switch (type) {
		case AGGREGATION:
		case COMPOSITION:
			return 'diamond'
		case EXTENSION:
			return 'triangle'
		case DEPENDENCY:
			return 'arrow'
		default:
			return 'none'
	}
}

/** Parse class diagram SVG layout data for use by {@link classToBlueprint}. */
export function parseClassDiagramLayout(root: Element): ParsedDiagramLayout {
	const nodes = parseNodesFromSvg(root, '.node', (domId) => parseDomId(domId, NODE_ID))
	const clusters = parseClustersFromSvg(root, '.cluster', stripDiagramIdPrefix)
	const centers = buildNodeCentersFromSvg(nodes, clusters)
	const edges = parseAllEdgePointsFromSvg(root, (dataId, points) => {
		const selfLoop = dataId.match(SELF_LOOP_SEGMENT_ID)
		if (selfLoop) return { start: selfLoop[1], end: selfLoop[1] }
		return parseEdgeId(dataId, points, centers, EDGE_ID)
	})
	const layout = {
		nodes,
		clusters,
		edges: joinSelfLoopSegments(edges),
		edgeLabels: parseEdgeLabelsFromSvg(root),
	}
	scaleLayout(layout, LAYOUT_SCALE)
	return layout
}

/** Join each self-loop's paths into one edge, so it claims and bends like any other relation. */
function joinSelfLoopSegments(edges: ParsedEdge[]): ParsedEdge[] {
	const out: ParsedEdge[] = []
	const loops = new Map<string, ParsedEdge>()
	for (const edge of edges) {
		const segment = edge.id.match(SELF_LOOP_SEGMENT_ID)?.[2]
		if (!segment) {
			out.push(edge)
			continue
		}
		let loop = loops.get(edge.start)
		if (!loop) {
			loop = { ...edge, points: [] }
			loops.set(edge.start, loop)
			out.push(loop)
		}
		loop.points.push(...edge.points)
		if (segment === 'mid') loop.id = edge.id
	}
	return out
}

function toClassMember(member: ClassMember): MermaidClassMember {
	const { displayText } = member.getDisplayDetails()
	if (member.classifier === '$') return { text: displayText, classifier: 'static' }
	if (member.classifier === '*') return { text: displayText, classifier: 'abstract' }
	return { text: displayText }
}

function getClassBox(classNode: ClassNode): MermaidClassBox {
	return {
		annotations: classNode.annotations,
		// Escaped by mermaid, with any generic type appended: `Box&lt;T&gt;`.
		name: sanitizeDiagramText(classNode.text || classNode.id),
		attributes: classNode.members.map(toClassMember),
		methods: classNode.methods.map(toClassMember),
	}
}

// Read as HTML, where member text such as `List<int> items` would lose its generic.
function getClassLabel({ annotations, name, attributes, methods }: MermaidClassBox): string {
	const header = [...annotations.map((annotation) => `«${annotation}»`), name]
	const sections = [attributes, methods]
		.filter((members) => members.length > 0)
		.map((members) => members.map((member) => member.text))
	return [header, ...sections].map((lines) => lines.map(escapeHtml).join('<br>')).join('<br><br>')
}

function getMultiplicity(title: string) {
	return title && title !== 'none' ? title : undefined
}

/**
 * The frames and parents mermaid drew, from `ClassDB.getData().nodes`. It has already resolved
 * `hierarchicalNamespaces`: nested frames with short names, or only the declared namespaces with
 * their full dotted names.
 */
export interface ClassDiagramHierarchyNode {
	id: string
	label?: string
	isGroup: boolean
	parentId?: string
}

/**
 * Mermaid can route a class's relation to itself as a hairpin hundreds of pixels long. A tldraw arc
 * that deep swells into a circle over the rest of the diagram.
 */
function capSelfLoop<T extends { bend: number }>(loop: T | undefined, node: ParsedNode) {
	if (!loop) return undefined
	const maxBend = Math.max(node.width, node.height) * SELF_LOOP_MAX_DEPTH
	return { ...loop, bend: Math.sign(loop.bend) * Math.min(Math.abs(loop.bend), maxBend) }
}

// How far a self-loop may reach past its class, as a fraction of the class's larger side.
const SELF_LOOP_MAX_DEPTH = 0.5

// Mermaid leaves less room above a nested namespace than tldraw's frame label takes, so the child
// frame would hide its parent's name.
const NAMESPACE_LABEL_ROOM = 50

/** Grow each namespace upward until its child namespaces clear its label, innermost first. */
function makeRoomForNamespaceLabels(nodes: MermaidBlueprintNode[]) {
	const frames = nodes.filter((node) => node.kind === 'namespace')
	const byId = new Map(frames.map((frame) => [frame.id, frame]))
	const depth = (frame: MermaidBlueprintNode) => {
		let count = 0
		for (let id = frame.parentId; id && byId.has(id); id = byId.get(id)!.parentId) count++
		return count
	}
	for (const frame of [...frames].sort((a, b) => depth(b) - depth(a))) {
		const children = frames.filter((child) => child.parentId === frame.id)
		if (children.length === 0) continue
		const top = Math.min(...children.map((child) => child.y)) - NAMESPACE_LABEL_ROOM
		if (top >= frame.y) continue
		frame.h += frame.y - top
		frame.y = top
	}
}

/** Convert a parsed Mermaid class diagram into a tldraw blueprint of nodes and edges. */
export function classToBlueprint(
	layout: ParsedDiagramLayout,
	classes: Map<string, ClassNode>,
	relations: ClassRelation[],
	hierarchy: ClassDiagramHierarchyNode[] = []
): DiagramMermaidBlueprint {
	const { nodes: svgNodes, edges: svgEdges } = layout
	const nodeCenters = buildNodeCentersFromSvg(svgNodes, layout.clusters)
	const parentOf = new Map(hierarchy.map((node) => [node.id, node.parentId]))

	const nodes: MermaidBlueprintNode[] = []
	const blueprintEdges: MermaidBlueprintEdge[] = []

	const namespaces = hierarchy.filter((node) => node.isGroup)
	for (const namespace of orderTopDown(
		namespaces,
		(node) => node.id,
		(node) => node.parentId
	)) {
		const cluster = layout.clusters.get(namespace.id)
		if (!cluster) continue
		nodes.push({
			id: namespace.id,
			kind: 'namespace',
			x: cluster.topLeft.x,
			y: cluster.topLeft.y - FRAME_TOP_PAD,
			w: cluster.width,
			h: cluster.height + FRAME_TOP_PAD,
			parentId: namespace.parentId,
			label: namespace.label || namespace.id,
			fill: 'semi',
			color: 'black',
			dash: 'draw',
			size: 's',
			align: 'middle',
			verticalAlign: 'start',
		})
	}

	for (const [id, classNode] of classes) {
		const svgNode = svgNodes.get(id)
		if (!svgNode) continue

		const classBox = getClassBox(classNode)
		const hasMembers = classBox.attributes.length > 0 || classBox.methods.length > 0
		nodes.push({
			id,
			kind: 'class',
			x: svgNode.center.x - svgNode.width / 2,
			y: svgNode.center.y - svgNode.height / 2,
			w: svgNode.width,
			h: svgNode.height,
			parentId: parentOf.get(id),
			label: getClassLabel(classBox),
			classBox,
			align: hasMembers ? 'start' : 'middle',
			verticalAlign: hasMembers ? 'start' : 'middle',
			size: 'm',
		})
	}

	const claimed = new Set<number>()
	for (const relation of relations) {
		const svgEdge = claimEdge(svgEdges, claimed, {
			startId: relation.id1,
			endId: relation.id2,
			startCenter: nodeCenters.get(relation.id1),
			endCenter: nodeCenters.get(relation.id2),
		})
		const svgNode = svgNodes.get(relation.id1)
		const selfLoop =
			relation.id1 === relation.id2 && svgEdge && svgNode
				? capSelfLoop(getSelfLoopEdgeLayout(svgEdge, svgNode, layout.edgeLabels), svgNode)
				: undefined
		const { type1, type2, lineType } = relation.relation

		blueprintEdges.push({
			startNodeId: relation.id1,
			endNodeId: relation.id2,
			label: relation.title || undefined,
			startLabel: getMultiplicity(relation.relationTitle1),
			endLabel: getMultiplicity(relation.relationTitle2),
			bend: svgEdge ? getArrowBend(svgEdge) : 0,
			...selfLoop,
			arrowheadStart: mapRelationTypeToArrowhead(type1),
			arrowheadEnd: mapRelationTypeToArrowhead(type2),
			// An arrow has one fill for both ends, so a composition's filled diamond also fills a
			// triangle or aggregation diamond at the other end. Relations rarely mix the two.
			fill: type1 === COMPOSITION || type2 === COMPOSITION ? 'fill' : 'none',
			dash: lineType === DOTTED_LINE ? 'dashed' : 'solid',
			size: 'm',
		})
	}

	makeRoomForNamespaceLabels(nodes)
	return { diagramKind: 'class', nodes, edges: dropDanglingEdges(nodes, blueprintEdges) }
}
