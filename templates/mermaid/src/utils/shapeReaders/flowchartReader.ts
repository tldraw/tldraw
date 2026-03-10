/**
 * Read tldraw shapes into a ParsedFlowchart AST.
 * Uses metadata when available, falls back to shape property mapping.
 */

import { Editor, renderPlaintextFromRichText, TLArrowShape, TLGeoShape } from 'tldraw'
import type { MermaidEdge, MermaidNode, LinkStyleOverride, ParsedFlowchart } from '../parseMermaidFlowchart'
import { arrowheadToMermaid, dashToLineStyle, geoToMermaidShape } from './propertyMappings'

export function readFlowchart(
	editor: Editor,
	geoShapes: TLGeoShape[],
	arrowShapes: TLArrowShape[]
): ParsedFlowchart {
	// Build node ID map: shape.id -> Mermaid node ID
	const nodeLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
	const usedIds = new Set<string>()
	const shapeIdToNodeId = new Map<string, string>()

	geoShapes.forEach((shape, index) => {
		const originalId = shape.meta?.originalId as string | undefined
		let nodeId = originalId && /^\w+$/.test(originalId) ? originalId : ''
		if (!nodeId || usedIds.has(nodeId)) {
			nodeId = index < 26 ? nodeLetters[index] : `Node${index + 1}`
		}
		usedIds.add(nodeId)
		shapeIdToNodeId.set(shape.id, nodeId)
	})

	// Build nodes
	const nodes: MermaidNode[] = geoShapes.map((shape) => {
		const nodeId = shapeIdToNodeId.get(shape.id)!
		const label = renderPlaintextFromRichText(editor, shape.props.richText) || nodeId

		// Prefer metadata, fall back to property mapping
		const mermaidShape = (shape.meta?.mermaidGeoType as string) || geoToMermaidShape(shape.props.geo)

		return {
			id: nodeId,
			label,
			shape: mermaidShape as MermaidNode['shape'],
		}
	})

	// Build edges from arrows with bindings
	const edges: MermaidEdge[] = []
	const linkStyles: LinkStyleOverride[] = []

	for (const arrow of arrowShapes) {
		const bindings = editor.getBindingsFromShape(arrow, 'arrow')
		const startBinding = bindings.find((b) => b.props.terminal === 'start')
		const endBinding = bindings.find((b) => b.props.terminal === 'end')
		if (!startBinding || !endBinding) continue

		const fromNodeId = shapeIdToNodeId.get(startBinding.toId)
		const toNodeId = shapeIdToNodeId.get(endBinding.toId)
		if (!fromNodeId || !toNodeId) continue

		// Line style: read from tldraw dash property (authoritative visual state)
		const lineStyle = dashToLineStyle(arrow.props.dash)

		// Arrowheads: read from tldraw properties (authoritative visual state)
		const arrowEnd = arrowheadToMermaid(arrow.props.arrowheadEnd)
		const arrowStart = arrowheadToMermaid(arrow.props.arrowheadStart)

		// Label from richText (always authoritative — it's what the user sees)
		const label = renderPlaintextFromRichText(editor, arrow.props.richText) || undefined

		// Color: read from tldraw property (authoritative visual state)
		const color = arrow.props.color !== 'black' ? arrow.props.color : undefined

		const edge: MermaidEdge & { color?: string } = {
			from: fromNodeId,
			to: toNodeId,
			label,
			arrowStart,
			arrowEnd,
			lineStyle,
		}
		if (color) (edge as any).color = color

		edges.push(edge)

		// Track linkStyle for this edge
		if (color) {
			linkStyles.push({ index: edges.length - 1, stroke: color })
		}
	}

	// Infer direction from layout positions
	const direction = inferDirection(geoShapes)

	return { direction, nodes, edges, linkStyles }
}

function inferDirection(shapes: TLGeoShape[]): ParsedFlowchart['direction'] {
	if (shapes.length < 2) return 'LR'
	let totalDx = 0, totalDy = 0, count = 0
	for (let i = 0; i < shapes.length; i++) {
		for (let j = i + 1; j < shapes.length; j++) {
			totalDx += Math.abs(shapes[j].x - shapes[i].x)
			totalDy += Math.abs(shapes[j].y - shapes[i].y)
			count++
		}
	}
	return (totalDx / count) > (totalDy / count) ? 'LR' : 'TB'
}
