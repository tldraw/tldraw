import type { ClassModel } from 'pele'
import type { TLArrowShapeArrowheadStyle } from 'tldraw'
import type {
	DiagramMermaidBlueprint,
	MermaidBlueprintEdge,
	MermaidBlueprintNode,
	MermaidClassBox,
	MermaidClassMember,
} from './blueprint'
import { parsePeleLayout } from './peleDiagram'
import {
	claimEdge,
	getLayoutBox,
	getPositionAlongRoute,
	getRouteEndAnchors,
	getSelfLoopEdgeLayout,
	type ParsedDiagramLayout,
} from './svgParsing'
import {
	dropDanglingEdges,
	escapeHtml,
	FRAME_TOP_PAD,
	getRouteArcBend,
	orderTopDown,
} from './utils'

type ClassNode = ClassModel['classes'] extends Map<string, infer T> ? T : never
type ClassMember = ClassNode['members'][number]

// The model's `relationType` values. A relation end with no marker is the string `'none'`.
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

/** Parse pele's class diagram SVG for use by {@link classToBlueprint}. */
export function parseClassDiagramLayout(root: Element, model: ClassModel): ParsedDiagramLayout {
	// pele names the nth relation's path `id_<id1>_<id2>_<n>`, counting from 1.
	const relationsByPathId = new Map(
		model.relations.map((relation, i) => [`id_${relation.id1}_${relation.id2}_${i + 1}`, relation])
	)
	return parsePeleLayout(root, {
		edgeEnds(id) {
			const relation = relationsByPathId.get(id)
			return relation && { start: relation.id1, end: relation.id2 }
		},
	})
}

function toClassMember(member: ClassMember): MermaidClassMember {
	const { displayText } = member.getDisplayDetails()
	if (member.classifier === '$') return { text: displayText, classifier: 'static' }
	if (member.classifier === '*') return { text: displayText, classifier: 'abstract' }
	return { text: displayText }
}

function getClassBox(classNode: ClassNode): MermaidClassBox {
	const name = classNode.label || classNode.id
	return {
		annotations: classNode.annotations,
		// pele keeps a generic apart from the name: `class Box~T~` is `Box` of type `T`.
		name: classNode.type ? `${name}<${classNode.type}>` : name,
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

// The layout leaves less room above a nested namespace than tldraw's frame label takes, so the
// child frame would hide its parent's name.
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

/** Convert a parsed class diagram into a tldraw blueprint of nodes and edges. */
export function classToBlueprint(
	layout: ParsedDiagramLayout,
	model: Pick<ClassModel, 'classes' | 'relations' | 'namespaces'>
): DiagramMermaidBlueprint {
	const { nodes: svgNodes, clusters, edges: svgEdges } = layout
	const nodes: MermaidBlueprintNode[] = []
	const blueprintEdges: MermaidBlueprintEdge[] = []

	// The model nests every dotted namespace, but with `hierarchicalNamespaces: false` pele draws
	// only the declared ones, side by side and named in full. Frames follow what was drawn.
	const drawn = (id: string | undefined) => (id && clusters.has(id) ? id : undefined)
	const namespaces = [...model.namespaces.values()].filter((namespace) =>
		clusters.has(namespace.id)
	)
	for (const namespace of orderTopDown(
		namespaces,
		(node) => node.id,
		(node) => drawn(node.parent)
	)) {
		const cluster = clusters.get(namespace.id)!
		const parentId = drawn(namespace.parent)
		nodes.push({
			id: namespace.id,
			kind: 'namespace',
			x: cluster.topLeft.x,
			y: cluster.topLeft.y - FRAME_TOP_PAD,
			w: cluster.width,
			h: cluster.height + FRAME_TOP_PAD,
			parentId,
			label: parentId ? namespace.label : namespace.id,
			fill: 'semi',
			color: 'black',
			dash: 'draw',
			size: 's',
			align: 'middle',
			verticalAlign: 'start',
		})
	}

	for (const [id, classNode] of model.classes) {
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
			parentId: drawn(classNode.parent),
			label: getClassLabel(classBox),
			classBox,
			align: hasMembers ? 'start' : 'middle',
			verticalAlign: hasMembers ? 'start' : 'middle',
			size: 'm',
		})
	}

	const nodeById = new Map(nodes.map((node) => [node.id, node]))
	const claimed = new Set<number>()
	for (const relation of model.relations) {
		const startBox = getLayoutBox(layout, relation.id1)
		const endBox = getLayoutBox(layout, relation.id2)
		const svgEdge = claimEdge(svgEdges, claimed, {
			startId: relation.id1,
			endId: relation.id2,
			startBox,
			endBox,
		})
		const svgNode = svgNodes.get(relation.id1)
		const selfLoop =
			relation.id1 === relation.id2 && svgEdge && svgNode
				? getSelfLoopEdgeLayout(svgEdge, svgNode, layout.edgeLabels)
				: undefined
		const label = svgEdge && layout.edgeLabels.get(svgEdge.id)
		// Where the layout drew the label along the route; a loop places its label with its bend.
		const labelPosition =
			label && svgEdge && !selfLoop
				? getPositionAlongRoute(svgEdge.points, {
						x: label.x + label.w / 2,
						y: label.y + label.h / 2,
					})
				: undefined
		const anchors =
			svgEdge && !selfLoop && startBox && endBox
				? getRouteEndAnchors(svgEdge, startBox, endBox)
				: undefined
		const bend =
			svgEdge && anchors
				? getRouteArcBend(
						svgEdge.points,
						nodeById.get(relation.id1),
						nodeById.get(relation.id2),
						anchors,
						{ hasLabel: !!label }
					)
				: 0
		const { type1, type2, lineType } = relation.relation

		blueprintEdges.push({
			startNodeId: relation.id1,
			endNodeId: relation.id2,
			label: label?.lines?.join('\n') ?? (relation.title || undefined),
			startLabel: getMultiplicity(relation.relationTitle1),
			endLabel: getMultiplicity(relation.relationTitle2),
			bend,
			...anchors,
			labelPosition,
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
