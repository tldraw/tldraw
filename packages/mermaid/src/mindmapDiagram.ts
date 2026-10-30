import type { MindmapModel } from 'pele'
import type { TLDefaultColorStyle, TLDefaultSizeStyle } from 'tldraw'
import type {
	DiagramMermaidBlueprint,
	MermaidBlueprintEdge,
	MermaidBlueprintNode,
} from './blueprint'
import { parseRgbToTldrawColor } from './colors'
import type { MeasureLabelWidth } from './mermaidNodeCreateShape'
import { parsePeleLayout } from './peleDiagram'
import type { ParsedNode } from './svgParsing'
import { dropDanglingEdges } from './utils'

type MindmapNode = MindmapModel['nodes'][number]

/** Mermaid mindmap node `type` integers (`kind` on blueprint nodes is `String(type)`). @public */
export const MERMAID_MINDMAP_NODE_TYPE = {
	DEFAULT: 0,
	ROUNDED_RECT: 1,
	RECT: 2,
	CIRCLE: 3,
	CLOUD: 4,
	BANG: 5,
	HEXAGON: 6,
} as const

function getEdgeSizeForDepth(parentDepth: number): TLDefaultSizeStyle {
	if (parentDepth <= 0) return 'l'
	if (parentDepth === 1) return 'm'
	return 's'
}

/**
 * Pre-parsed SVG layout for mindmap diagram converters.
 * Contains already-scaled node positions extracted from the SVG.
 */
export interface ParsedMindmapLayout {
	nodes: Map<string, ParsedNode>
}

/**
 * Maps each node element's `data-id`, in document order, to the model's numeric id. Pele marks a
 * node with the name written in the source, so repeated names (a `Breakfast` under every day) share
 * one; it draws them in the model's order with the root last, so the nth element with a name is
 * the nth node with it.
 */
function createSvgNodeIdResolver(model: MindmapModel) {
	const ids = new Map<string, string[]>()
	const inDrawOrder = [
		...model.nodes.filter((n) => !n.isRoot),
		...model.nodes.filter((n) => n.isRoot),
	]
	for (const node of inDrawOrder) {
		const list = ids.get(node.nodeId) ?? []
		list.push(String(node.id))
		ids.set(node.nodeId, list)
	}
	const seen = new Map<string, number>()
	return (dataId: string) => {
		const index = seen.get(dataId) ?? 0
		seen.set(dataId, index + 1)
		return ids.get(dataId)?.[index]
	}
}

/**
 * Parse pele's mindmap SVG for use by {@link mindmapToBlueprint}, keyed by the model's numeric id,
 * which stays unique when the same text appears twice.
 */
export function parseMindmapLayout(root: Element, model: MindmapModel): ParsedMindmapLayout {
	const resolve = createSvgNodeIdResolver(model)
	const { nodes } = parsePeleLayout(root, { nodeId: (dataId) => resolve(dataId) ?? dataId })
	return { nodes }
}

/** Convert a parsed mindmap into a tldraw blueprint of nodes and edges. */
export function mindmapToBlueprint(
	layout: ParsedMindmapLayout,
	model: MindmapModel,
	svgRoot: Element,
	measureLabelWidth?: MeasureLabelWidth
): DiagramMermaidBlueprint {
	const resolve = createSvgNodeIdResolver(model)
	// Pele draws some unbracketed nodes as text alone and others (the root, first branches) as pills.
	const bareText = new Set<string>()
	// Each branch takes its color from pele's series palette, which only a live element resolves.
	const nodeColors = new Map<string, TLDefaultColorStyle>()
	for (const el of svgRoot.querySelectorAll('.pele-node[data-id]')) {
		const id = resolve(el.getAttribute('data-id')!)
		if (!id) continue
		if (el.classList.contains('pele-shape-text')) bareText.add(id)
		const shape = el.querySelector('rect, circle, ellipse, polygon, path')
		const parsed = shape && parseRgbToTldrawColor(getComputedStyle(shape).stroke)
		if (parsed) nodeColors.set(id, parsed.color)
	}

	const nodes: MermaidBlueprintNode[] = []
	const edges: MermaidBlueprintEdge[] = []

	const colorOf = new Map<string, TLDefaultColorStyle>()
	function visit(node: MindmapNode, parent: MindmapNode | undefined, depth: number) {
		const id = String(node.id)
		const svgNode = layout.nodes.get(id)
		if (svgNode) {
			// A node drawn as bare text has no outline to read a color from; it takes its branch's.
			const color = nodeColors.get(id) ?? (parent && colorOf.get(String(parent.id))) ?? 'black'
			colorOf.set(id, color)

			const size = node.isRoot ? 'l' : 'm'
			// Pele keeps the quotes around a quoted label, which Mermaid strips.
			const label = node.descr.replace(/^"(.*)"$/s, '$1') || undefined
			let { width: w, height: h } = svgNode
			// Wide enough for the label's longest word in tldraw's font at the size it's drawn, which
			// for the root is larger than the layout measured. Only the longest word: pele wraps long
			// labels, and widening to the whole line would run the box into its neighbours.
			if (label && measureLabelWidth) {
				const longestWord = label.split(/\s+/).reduce((a, b) => (b.length > a.length ? b : a), '')
				w = Math.max(w, measureLabelWidth(longestWord, size))
			}
			if (node.type === MERMAID_MINDMAP_NODE_TYPE.CIRCLE) {
				w = h = Math.max(w, h)
			}

			nodes.push({
				id,
				kind: String(
					node.type === MERMAID_MINDMAP_NODE_TYPE.DEFAULT && !bareText.has(id)
						? MERMAID_MINDMAP_NODE_TYPE.ROUNDED_RECT
						: node.type
				),
				x: svgNode.center.x - w / 2,
				y: svgNode.center.y - h / 2,
				w,
				h,
				label,
				fill: 'solid',
				color,
				size,
				align: 'middle',
				verticalAlign: 'middle',
			})

			// Edge from parent to this node
			if (parent) {
				edges.push({
					startNodeId: String(parent.id),
					endNodeId: id,
					bend: 0,
					arrowheadEnd: 'none',
					arrowheadStart: 'none',
					size: getEdgeSizeForDepth(depth - 1),
					color,
				})
			}
		}
		for (const child of node.children) visit(child, node, depth + 1)
	}
	const root = model.nodes.find((node) => node.isRoot) ?? model.nodes[0]
	if (root) visit(root, undefined, 0)

	return { diagramKind: 'mindmap', nodes, edges: dropDanglingEdges(nodes, edges) }
}
