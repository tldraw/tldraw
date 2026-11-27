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

/**
 * Joins a parent to a child at the middle of the sides that face each other, as pele does, so a
 * branch fans out from one point. Aimed at their centers instead, a steep line meets a short,
 * wide text label at its corner, on top of the first or last letter.
 */
function getFacingSideAnchors(parent: MermaidBlueprintNode, child: MermaidBlueprintNode) {
	const side = (from: MermaidBlueprintNode, to: MermaidBlueprintNode) => {
		if (to.x >= from.x + from.w) return { x: 1, y: 0.5 }
		if (to.x + to.w <= from.x) return { x: 0, y: 0.5 }
		return { x: 0.5, y: to.y > from.y ? 1 : 0 }
	}
	const start = side(parent, child)
	const end = side(child, parent)
	return {
		anchorStartX: start.x,
		anchorStartY: start.y,
		anchorEndX: end.x,
		anchorEndY: end.y,
		isExact: false,
		isPrecise: true,
	}
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
	const nodeById = new Map<string, MermaidBlueprintNode>()
	function visit(node: MindmapNode, parent: MindmapNode | undefined, depth: number) {
		const id = String(node.id)
		const svgNode = layout.nodes.get(id)
		if (svgNode) {
			// A node drawn as bare text has no outline to read a color from; it takes its branch's.
			const color = nodeColors.get(id) ?? (parent && colorOf.get(String(parent.id))) ?? 'black'
			colorOf.set(id, color)

			const size = node.isRoot ? 'l' : 'm'
			// Pele keeps the quotes around a quoted label, which Mermaid strips. Its line breaks are
			// kept: drawn on one line, a label it wrapped runs into its neighbours.
			const lines = svgNode.lines && !node.isRoot ? svgNode.lines.join('\n') : node.descr
			const label = lines.replace(/^"(.*)"$/s, '$1') || undefined
			let { width: w, height: h } = svgNode
			// Wide enough for each line in tldraw's font: the layout pads a box a little less than
			// tldraw pads its label. The root is drawn larger than the layout measured it, so it only
			// fits its longest word and wraps; a circle grown to the whole line crowds its children.
			if (label && measureLabelWidth) {
				const fitted = node.isRoot ? label.split(/\s+/) : label.split('\n')
				for (const line of fitted) w = Math.max(w, measureLabelWidth(line, size))
			}
			if (node.type === MERMAID_MINDMAP_NODE_TYPE.CIRCLE) {
				w = h = Math.max(w, h)
			}

			const isBareText = node.type === MERMAID_MINDMAP_NODE_TYPE.DEFAULT && bareText.has(id)
			// Bare text reads from its branch, as pele draws it: a label left of its branch ends where
			// the line arrives and one to the right starts there, so a label wider than the layout
			// measured grows away from the line instead of over it.
			const parentCenter = parent && layout.nodes.get(String(parent.id))?.center
			const align =
				!isBareText || !parentCenter
					? 'middle'
					: svgNode.center.x < parentCenter.x
						? 'end'
						: 'start'
			const left = svgNode.center.x - svgNode.width / 2
			const x =
				align === 'start'
					? left
					: align === 'end'
						? left + svgNode.width - w
						: svgNode.center.x - w / 2

			nodes.push({
				id,
				kind: String(
					node.type === MERMAID_MINDMAP_NODE_TYPE.DEFAULT && !isBareText
						? MERMAID_MINDMAP_NODE_TYPE.ROUNDED_RECT
						: node.type
				),
				x,
				y: svgNode.center.y - h / 2,
				w,
				h,
				label,
				fill: 'solid',
				color,
				size,
				align,
				verticalAlign: 'middle',
			})
			nodeById.set(id, nodes[nodes.length - 1])

			const parentNode = parent && nodeById.get(String(parent.id))
			if (parentNode) {
				edges.push({
					startNodeId: parentNode.id,
					endNodeId: id,
					bend: 0,
					...getFacingSideAnchors(parentNode, nodeById.get(id)!),
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
