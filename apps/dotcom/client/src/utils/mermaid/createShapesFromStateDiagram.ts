/**
 * Create tldraw shapes from a parsed Mermaid state diagram
 */

import {
	TLArrowShapeArrowheadStyle,
	Editor,
	TLArrowShape,
	TLGeoShape,
	TLShapeId,
	Vec,
	createBindingId,
	createShapeId,
	toRichText,
} from 'tldraw'
import { ParsedStateDiagram, StateDiagramState } from './parseStateDiagram'

interface StateLayout {
	id: string
	x: number
	y: number
	width: number
	height: number
}

/**
 * Create tldraw shapes from a parsed state diagram
 */
export function createShapesFromStateDiagram(
	editor: Editor,
	diagram: ParsedStateDiagram,
	position: Vec
): void {

	// Calculate layout for states (includes start/end markers)
	const layouts = calculateLayout(diagram, position)

	// Create state shapes (including start/end markers)
	const stateShapeIds = new Map<string, TLShapeId>()

	// Check if we need to create start/end markers
	const hasStartTransitions = diagram.transitions.some((t) => t.from === 'start')
	const hasEndTransitions = diagram.transitions.some((t) => t.to === 'end')

	// Create start marker ([*]) if needed
	if (hasStartTransitions) {
		const layout = layouts.find((l) => l.id === 'start')
		if (layout) {
			const shapeId = createShapeId()
			stateShapeIds.set('start', shapeId)

			// Create filled circle for start state
			editor.createShape<TLGeoShape>({
				id: shapeId,
				type: 'geo',
				x: layout.x,
				y: layout.y,
				props: {
					geo: 'ellipse',
					w: layout.width,
					h: layout.height,
					richText: toRichText(''),
					fill: 'solid',
					color: 'black',
				},
			})
		}
	}

	// Create end marker ([*]) if needed
	if (hasEndTransitions) {
		const layout = layouts.find((l) => l.id === 'end')
		if (layout) {
			const shapeId = createShapeId()
			stateShapeIds.set('end', shapeId)

			// Create circle with dot for end state (use donut/ring shape)
			editor.createShape<TLGeoShape>({
				id: shapeId,
				type: 'geo',
				x: layout.x,
				y: layout.y,
				props: {
					geo: 'ellipse',
					w: layout.width,
					h: layout.height,
					richText: toRichText('⊙'),
					align: 'middle',
					verticalAlign: 'middle',
					fill: 'none',
					color: 'black',
				},
			})
		}
	}

	// Create regular state shapes
	for (const state of diagram.states) {
		const layout = layouts.find((l) => l.id === state.id)
		if (!layout) continue

		const shapeId = createShapeId()
		stateShapeIds.set(state.id, shapeId)

		// Use rounded rectangles for states (all same color)
		editor.createShape<TLGeoShape>({
			id: shapeId,
			type: 'geo',
			x: layout.x,
			y: layout.y,
			props: {
				geo: 'rectangle',
				w: layout.width,
				h: layout.height,
				richText: toRichText(state.label),
				align: 'middle',
				verticalAlign: 'middle',
				color: 'violet',
			},
		})
	}

	// Create arrow shapes for ALL transitions (including to/from start/end)
	for (const transition of diagram.transitions) {
		const fromShapeId = stateShapeIds.get(transition.from)
		const toShapeId = stateShapeIds.get(transition.to)

		if (!fromShapeId || !toShapeId) continue

		const arrowId = createShapeId()

		// Create arrow shape
		editor.createShape<TLArrowShape>({
			id: arrowId,
			type: 'arrow',
			props: {
				start: { x: 0, y: 0 },
				end: { x: 100, y: 100 },
				arrowheadStart: 'none' as TLArrowShapeArrowheadStyle,
				arrowheadEnd: 'arrow' as TLArrowShapeArrowheadStyle,
				richText: toRichText(transition.label || ''),
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
 * Calculate layout positions for states (including start/end markers)
 * Uses a simple top-to-bottom flow layout
 */
function calculateLayout(diagram: ParsedStateDiagram, startPosition: Vec): StateLayout[] {
	const layouts: StateLayout[] = []
	const stateSize = { width: 160, height: 80 }
	const markerSize = { width: 40, height: 40 } // Smaller for start/end markers
	const spacing = { x: 100, y: 100 }

	// Build adjacency list for layout (including start/end)
	const adjacency = new Map<string, string[]>()
	for (const transition of diagram.transitions) {
		if (!adjacency.has(transition.from)) adjacency.set(transition.from, [])
		adjacency.get(transition.from)!.push(transition.to)
	}

	// Find root states (states that come from 'start' or have no incoming edges)
	const hasIncoming = new Set<string>()
	for (const transition of diagram.transitions) {
		if (transition.to !== 'end' && transition.to !== 'start') {
			hasIncoming.add(transition.to)
		}
	}

	// Get states that connect from start
	const startConnections = diagram.transitions
		.filter((t) => t.from === 'start')
		.map((t) => t.to)

	const roots = startConnections.length > 0
		? diagram.states.filter((s) => startConnections.includes(s.id))
		: diagram.states.filter((s) => !hasIncoming.has(s.id))
	const startStates = roots.length > 0 ? roots : diagram.states

	// Simple level-based layout starting with 'start' at level -1
	const levels = new Map<string, number>()
	const visited = new Set<string>()

	function assignLevel(stateId: string, level: number) {
		if (visited.has(stateId)) return
		visited.add(stateId)
		levels.set(stateId, Math.max(levels.get(stateId) || 0, level))

		const children = adjacency.get(stateId) || []
		for (const child of children) {
			if (child !== 'end') {
				assignLevel(child, level + 1)
			}
		}
	}

	// Check if we have start/end transitions
	const hasStart = diagram.transitions.some((t) => t.from === 'start')
	const hasEnd = diagram.transitions.some((t) => t.to === 'end')

	// Assign level -1 to start marker and propagate from there
	if (hasStart) {
		levels.set('start', 0)
		assignLevel('start', 0)
	} else {
		// Assign levels starting from roots
		for (const root of startStates) {
			assignLevel(root.id, 0)
		}
	}

	// Assign level 0 to any unvisited states
	for (const state of diagram.states) {
		if (!levels.has(state.id)) {
			levels.set(state.id, 0)
		}
	}

	// Find the maximum level for end marker
	const maxLevel = Math.max(...Array.from(levels.values())) + 1
	if (hasEnd) {
		levels.set('end', maxLevel)
	}

	// Group items by level (including start/end)
	const itemsByLevel = new Map<number, string[]>()

	// Add start if present
	if (hasStart && levels.has('start')) {
		const level = levels.get('start')!
		if (!itemsByLevel.has(level)) itemsByLevel.set(level, [])
		itemsByLevel.get(level)!.push('start')
	}

	// Add regular states
	for (const state of diagram.states) {
		const level = levels.get(state.id) || 0
		if (!itemsByLevel.has(level)) itemsByLevel.set(level, [])
		itemsByLevel.get(level)!.push(state.id)
	}

	// Add end if present
	if (hasEnd && levels.has('end')) {
		const level = levels.get('end')!
		if (!itemsByLevel.has(level)) itemsByLevel.set(level, [])
		itemsByLevel.get(level)!.push('end')
	}

	// Position items in a top-to-bottom layout
	const centerX = startPosition.x
	let currentY = startPosition.y

	const sortedLevels = Array.from(itemsByLevel.keys()).sort((a, b) => a - b)

	for (const level of sortedLevels) {
		const itemsInLevel = itemsByLevel.get(level)!

		// Position each item centered horizontally
		for (const itemId of itemsInLevel) {
			const isMarker = itemId === 'start' || itemId === 'end'
			const width = isMarker ? markerSize.width : stateSize.width
			const height = isMarker ? markerSize.height : stateSize.height

			layouts.push({
				id: itemId,
				x: centerX - width / 2, // Center horizontally
				y: currentY,
				width,
				height,
			})
		}

		// Move down for next level (use max height of current level)
		const maxHeightInLevel = itemsInLevel.some((id) => id === 'start' || id === 'end')
			? Math.max(markerSize.height, stateSize.height)
			: stateSize.height
		currentY += maxHeightInLevel + spacing.y
	}

	return layouts
}
