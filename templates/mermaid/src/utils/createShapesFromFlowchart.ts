/**
 * Create tldraw shapes from a parsed Mermaid flowchart
 */

import {
	Editor,
	TLArrowShape,
	TLArrowShapeArrowheadStyle,
	TLGeoShape,
	TLShapeId,
	Vec,
	createBindingId,
	createShapeId,
	toRichText,
} from 'tldraw'
import { MermaidNode, ParsedFlowchart } from './parseMermaidFlowchart'

interface NodeLayout {
	id: string
	x: number
	y: number
	width: number
	height: number
}

/**
 * Create tldraw shapes from a parsed flowchart
 */
export function createShapesFromFlowchart(
	editor: Editor,
	flowchart: ParsedFlowchart,
	position: Vec
): void {
	// Calculate layout for nodes
	const layouts = calculateLayout(flowchart, position)

	// Create node shapes
	const nodeShapeIds = new Map<string, TLShapeId>()

	for (const node of flowchart.nodes) {
		const layout = layouts.find((l) => l.id === node.id)
		if (!layout) continue

		const shapeId = createShapeId()
		nodeShapeIds.set(node.id, shapeId)

		// Map Mermaid shape types to tldraw geo types
		let geo: TLGeoShape['props']['geo'] = 'rectangle'
		switch (node.shape) {
			case 'rectangle':
				geo = 'rectangle'
				break
			case 'diamond':
				geo = 'diamond'
				break
			case 'ellipse':
				geo = 'ellipse'
				break
			case 'oval':
			case 'rounded':
				geo = 'oval'
				break
			case 'hexagon':
				geo = 'hexagon'
				break
			case 'stadium':
			case 'cylinder':
				geo = 'oval' // Use oval for stadium and cylinder shapes
				break
			case 'trapezoid':
				geo = 'trapezoid'
				break
			case 'parallelogram':
				geo = 'rhombus' // Use rhombus for parallelogram (closest match)
				break
			case 'subroutine':
				geo = 'rectangle' // Use rectangle with note that it should have double border
				break
			case 'double-circle':
				geo = 'ellipse' // Use ellipse with note that it should have double border
				break
			case 'flag':
				geo = 'arrow-right' // Use arrow for flag/asymmetric shape
				break
		}

		// Create the geo shape
		editor.createShape<TLGeoShape>({
			id: shapeId,
			type: 'geo',
			x: layout.x,
			y: layout.y,
			props: {
				geo,
				w: layout.width,
				h: layout.height,
				richText: toRichText(node.label),
				align: 'middle',
				verticalAlign: 'middle',
			},
		})
	}

	// Create arrow shapes with bindings
	for (const edge of flowchart.edges) {
		const fromShapeId = nodeShapeIds.get(edge.from)
		const toShapeId = nodeShapeIds.get(edge.to)

		if (!fromShapeId || !toShapeId) continue

		const arrowId = createShapeId()

		// Get shape positions for arrow endpoints
		const fromShape = editor.getShape(fromShapeId)
		const toShape = editor.getShape(toShapeId)

		if (!fromShape || !toShape) continue

		// Map line style to dash style
		let dashStyle: TLArrowShape['props']['dash'] = 'draw'
		if (edge.lineStyle === 'dotted') {
			dashStyle = 'dotted'
		} else if (edge.lineStyle === 'dashed') {
			dashStyle = 'dashed'
		}

		// Create arrow shape
		editor.createShape<TLArrowShape>({
			id: arrowId,
			type: 'arrow',
			props: {
				start: { x: 0, y: 0 },
				end: { x: 100, y: 100 },
				arrowheadStart: edge.arrowStart as TLArrowShapeArrowheadStyle,
				arrowheadEnd: edge.arrowEnd as TLArrowShapeArrowheadStyle,
				dash: dashStyle,
				richText: toRichText(edge.label || ''),
			},
		})

		// Create bindings
		editor.createBinding({
			id: createBindingId(),
			type: 'arrow',
			fromId: arrowId,
			toId: fromShapeId,
			props: {
				terminal: 'start',
				normalizedAnchor: { x: 0.5, y: 0.5 },
				isPrecise: false,
				isExact: false,
			},
		})

		editor.createBinding({
			id: createBindingId(),
			type: 'arrow',
			fromId: arrowId,
			toId: toShapeId,
			props: {
				terminal: 'end',
				normalizedAnchor: { x: 0.5, y: 0.5 },
				isPrecise: false,
				isExact: false,
			},
		})
	}
}

/**
 * Calculate layout positions for nodes
 * Uses a simple grid/tree layout based on diagram direction
 */
function calculateLayout(flowchart: ParsedFlowchart, startPosition: Vec): NodeLayout[] {
	const layouts: NodeLayout[] = []
	const nodeSize = { width: 160, height: 80 }
	const spacing = { x: 80, y: 100 }

	// Build adjacency list for layout
	const adjacency = new Map<string, string[]>()
	for (const edge of flowchart.edges) {
		if (!adjacency.has(edge.from)) adjacency.set(edge.from, [])
		adjacency.get(edge.from)!.push(edge.to)
	}

	// Find root nodes (nodes with no incoming edges)
	const hasIncoming = new Set<string>()
	for (const edge of flowchart.edges) {
		hasIncoming.add(edge.to)
	}
	const roots = flowchart.nodes.filter((n) => !hasIncoming.has(n.id))

	// If no clear roots, use all nodes
	const startNodes = roots.length > 0 ? roots : flowchart.nodes

	// Simple level-based layout
	const levels = new Map<string, number>()
	const visited = new Set<string>()

	function assignLevel(nodeId: string, level: number) {
		if (visited.has(nodeId)) return
		visited.add(nodeId)
		levels.set(nodeId, Math.max(levels.get(nodeId) || 0, level))

		const children = adjacency.get(nodeId) || []
		for (const child of children) {
			assignLevel(child, level + 1)
		}
	}

	// Assign levels starting from roots
	for (const root of startNodes) {
		assignLevel(root.id, 0)
	}

	// Assign level 0 to any unvisited nodes
	for (const node of flowchart.nodes) {
		if (!levels.has(node.id)) {
			levels.set(node.id, 0)
		}
	}

	// Group nodes by level
	const nodesByLevel = new Map<number, MermaidNode[]>()
	for (const node of flowchart.nodes) {
		const level = levels.get(node.id) || 0
		if (!nodesByLevel.has(level)) nodesByLevel.set(level, [])
		nodesByLevel.get(level)!.push(node)
	}

	// Position nodes based on direction
	const isHorizontal = flowchart.direction === 'LR' || flowchart.direction === 'RL'

	let currentX = startPosition.x
	let currentY = startPosition.y

	const sortedLevels = Array.from(nodesByLevel.keys()).sort((a, b) => a - b)

	for (const level of sortedLevels) {
		const nodesInLevel = nodesByLevel.get(level)!
		const levelStartY = currentY

		for (let i = 0; i < nodesInLevel.length; i++) {
			const node = nodesInLevel[i]

			if (isHorizontal) {
				// Horizontal layout (LR or RL)
				layouts.push({
					id: node.id,
					x: flowchart.direction === 'RL' ? -currentX : currentX,
					y: currentY,
					width: nodeSize.width,
					height: nodeSize.height,
				})
				currentY += nodeSize.height + spacing.y
			} else {
				// Vertical layout (TB, TD, or BT)
				layouts.push({
					id: node.id,
					x: currentX,
					y: flowchart.direction === 'BT' ? -currentY : currentY,
					width: nodeSize.width,
					height: nodeSize.height,
				})
				currentX += nodeSize.width + spacing.x
			}
		}

		if (isHorizontal) {
			currentX += nodeSize.width + spacing.x * 2
			currentY = levelStartY
		} else {
			currentY += nodeSize.height + spacing.y * 2
			currentX = startPosition.x
		}
	}

	return layouts
}
