/**
 * Create tldraw shapes from a parsed Mermaid class diagram
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
import type { ClassDefinition, ParsedClassDiagram } from './parseClassDiagramAdvanced'

interface ClassLayout {
	classDef: ClassDefinition
	x: number
	y: number
	width: number
	height: number
}

/**
 * Create tldraw shapes from a parsed class diagram
 */
export function createShapesFromClassDiagram(
	editor: Editor,
	diagram: ParsedClassDiagram,
	position: Vec
): void {
	// Calculate layout for classes
	const layouts = calculateLayout(diagram, position)

	// Create class shapes
	const classShapeIds = new Map<string, TLShapeId>()
	const noteShapes: { text: string; attachedTo?: string; x: number; y: number }[] = []

	for (const layout of layouts) {
		const cls = layout.classDef
		const shapeId = createShapeId()
		classShapeIds.set(cls.name, shapeId)

		// Create label text: Class name + stereotype + members
		const labelParts: string[] = []

		// Add stereotype if present
		if (cls.stereotype) {
			labelParts.push(`<<${cls.stereotype}>>`)
		}

		// Add class name
		labelParts.push(cls.name)
		labelParts.push('---')

		// Add properties
		for (const prop of cls.properties) {
			const visibility = prop.visibility || ''
			const modifiers = (prop.isStatic ? 'static ' : '') + (prop.isAbstract ? 'abstract ' : '')
			const type = prop.type ? `${prop.type} ` : ''
			labelParts.push(`${visibility}${modifiers}${type}${prop.name}`)
		}

		if (cls.properties.length > 0) {
			labelParts.push('---')
		}

		// Add methods
		for (const method of cls.methods) {
			const visibility = method.visibility || ''
			const modifiers = (method.isStatic ? 'static ' : '') + (method.isAbstract ? 'abstract ' : '')
			const type = method.type ? `${method.type} ` : ''
			labelParts.push(`${visibility}${modifiers}${type}${method.name}`)
		}

		const label = labelParts.join('\n')

		// Use rectangles for classes and store full class metadata
		// Ensure metadata is JSON-serializable by creating a plain object
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
				color: 'violet',
			},
			meta: {
				classData: JSON.parse(JSON.stringify(cls)), // Ensure JSON-serializable
			},
		})
	}

	// Create arrow shapes for relationships
	for (const relationship of diagram.relationships) {
		const fromShapeId = classShapeIds.get(relationship.from)
		const toShapeId = classShapeIds.get(relationship.to)

		if (!fromShapeId || !toShapeId) continue

		const arrowId = createShapeId()

		// Determine arrow style based on relationship type
		let fromArrowhead: TLArrowShapeArrowheadStyle = 'none'
		let toArrowhead: TLArrowShapeArrowheadStyle = 'arrow'
		let dash: 'draw' | 'dashed' | 'dotted' | 'solid' = 'draw'

		switch (relationship.type) {
			case 'inheritance':
				toArrowhead = 'triangle'
				dash = 'solid'
				break
			case 'realization':
				toArrowhead = 'triangle'
				dash = 'dashed'
				break
			case 'composition':
				fromArrowhead = 'diamond'
				dash = 'solid'
				break
			case 'aggregation':
				fromArrowhead = 'diamond'
				dash = 'solid'
				break
			case 'dependency':
				toArrowhead = 'arrow'
				dash = 'dashed'
				break
			case 'association':
				toArrowhead = 'arrow'
				dash = 'solid'
				break
		}

		// Create arrow shape and store relationship metadata
		// Ensure metadata is JSON-serializable
		editor.createShape<TLArrowShape>({
			id: arrowId,
			type: 'arrow',
			props: {
				start: { x: 0, y: 0 },
				end: { x: 100, y: 100 },
				arrowheadStart: fromArrowhead,
				arrowheadEnd: toArrowhead,
				dash,
				richText: toRichText(relationship.label || ''),
			},
			meta: {
				relationshipData: JSON.parse(JSON.stringify(relationship)), // Ensure JSON-serializable
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

	// Create note shapes
	for (const note of diagram.notes) {
		const noteId = createShapeId()
		let noteX = position.x
		let noteY = position.y - 100 // Default: above the diagram

		// If attached to a class, position it near that class
		if (note.attachedTo) {
			const classShapeId = classShapeIds.get(note.attachedTo)
			if (classShapeId) {
				const classShape = editor.getShape(classShapeId)
				if (classShape) {
					noteX = classShape.x + 250 // To the right of the class
					noteY = classShape.y
				}
			}
		}

		editor.createShape({
			type: 'text',
			x: noteX,
			y: noteY,
			props: {
				richText: toRichText(note.text),
				w: 200,
				color: 'grey',
				size: 's',
			},
		})
	}
}

/**
 * Calculate layout positions for classes
 * Uses a simple grid layout
 */
function calculateLayout(diagram: ParsedClassDiagram, startPosition: Vec): ClassLayout[] {
	const layouts: ClassLayout[] = []
	const baseWidth = 200
	const baseHeight = 80
	const memberHeight = 18 // Height per member
	const spacing = { x: 80, y: 100 }

	// Arrange classes in a grid (2-3 per row)
	const classesPerRow = Math.min(3, Math.max(2, Math.ceil(Math.sqrt(diagram.classes.length))))

	let currentX = startPosition.x
	let currentY = startPosition.y
	let maxHeightInRow = 0
	let rowIndex = 0

	for (const cls of diagram.classes) {
		// Calculate height based on members (+1 for name, +1 for stereotype if present, +2 for dividers)
		const extraLines = (cls.stereotype ? 1 : 0) + 1 + 2
		const totalMembers = cls.properties.length + cls.methods.length
		const height = baseHeight + (totalMembers + extraLines) * memberHeight

		layouts.push({
			classDef: cls,
			x: currentX,
			y: currentY,
			width: baseWidth,
			height,
		})

		maxHeightInRow = Math.max(maxHeightInRow, height)

		rowIndex++
		if (rowIndex >= classesPerRow) {
			// Move to next row
			currentX = startPosition.x
			currentY += maxHeightInRow + spacing.y
			maxHeightInRow = 0
			rowIndex = 0
		} else {
			// Move to next column
			currentX += baseWidth + spacing.x
		}
	}

	return layouts
}
