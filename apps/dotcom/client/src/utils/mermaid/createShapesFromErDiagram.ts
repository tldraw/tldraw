/**
 * Create tldraw shapes from a parsed Mermaid ER diagram
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
import { ErEntity, ParsedErDiagram } from './parseErDiagram'

interface EntityLayout {
	name: string
	x: number
	y: number
	width: number
	height: number
}

/**
 * Create tldraw shapes from a parsed ER diagram
 */
export function createShapesFromErDiagram(
	editor: Editor,
	diagram: ParsedErDiagram,
	position: Vec
): void {
	// Calculate layout for entities
	const layouts = calculateLayout(diagram, position)

	// Create entity shapes
	const entityShapeIds = new Map<string, TLShapeId>()

	for (const entity of diagram.entities) {
		const layout = layouts.find((l) => l.name === entity.name)
		if (!layout) continue

		const shapeId = createShapeId()
		entityShapeIds.set(entity.name, shapeId)

		// Create label text: Entity name + attributes
		const labelParts = [entity.name]
		if (entity.attributes.length > 0) {
			labelParts.push('---')
			labelParts.push(...entity.attributes)
		}
		const label = labelParts.join('\n')

		// Use rectangles for entities
		editor.createShape<TLGeoShape>({
			id: shapeId,
			type: 'geo',
			x: layout.x,
			y: layout.y,
			props: {
				geo: 'rectangle',
				w: layout.width,
				h: layout.height,
				richText: toRichText(label),
				align: 'start',
				verticalAlign: 'start',
				color: 'blue',
			},
		})
	}

	// Create arrow shapes for relationships
	for (const relationship of diagram.relationships) {
		const fromShapeId = entityShapeIds.get(relationship.from)
		const toShapeId = entityShapeIds.get(relationship.to)

		if (!fromShapeId || !toShapeId) continue

		const arrowId = createShapeId()

		// Determine arrow style based on cardinality
		// || = exactly one (use arrow)
		// }o, }| = many (use arrow)
		// |o, o| = zero or one (use arrow)
		const fromArrowhead: TLArrowShapeArrowheadStyle = 'none'
		const toArrowhead: TLArrowShapeArrowheadStyle = 'arrow'

		// Create arrow shape
		editor.createShape<TLArrowShape>({
			id: arrowId,
			type: 'arrow',
			props: {
				start: { x: 0, y: 0 },
				end: { x: 100, y: 100 },
				arrowheadStart: fromArrowhead,
				arrowheadEnd: toArrowhead,
				dash: relationship.relType === 'identifying' ? 'solid' : 'dashed',
				richText: toRichText(relationship.label || ''),
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
 * Calculate layout positions for entities
 * Uses a simple grid layout
 */
function calculateLayout(diagram: ParsedErDiagram, startPosition: Vec): EntityLayout[] {
	const layouts: EntityLayout[] = []
	const baseWidth = 180
	const baseHeight = 60
	const attrHeight = 20 // Height per attribute
	const spacing = { x: 80, y: 100 }

	// Arrange entities in a grid (2-3 per row)
	const entitiesPerRow = Math.min(3, Math.max(2, Math.ceil(Math.sqrt(diagram.entities.length))))

	let currentX = startPosition.x
	let currentY = startPosition.y
	let rowIndex = 0

	for (let i = 0; i < diagram.entities.length; i++) {
		const entity = diagram.entities[i]

		// Calculate height based on attributes
		const height = baseHeight + entity.attributes.length * attrHeight

		layouts.push({
			name: entity.name,
			x: currentX,
			y: currentY,
			width: baseWidth,
			height,
		})

		rowIndex++
		if (rowIndex >= entitiesPerRow) {
			// Move to next row
			currentX = startPosition.x
			currentY += height + spacing.y
			rowIndex = 0
		} else {
			// Move to next column
			currentX += baseWidth + spacing.x
		}
	}

	return layouts
}
