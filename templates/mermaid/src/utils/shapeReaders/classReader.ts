/**
 * Read tldraw shapes into ParsedClassDiagram data (classes + relationships).
 */

import { Editor, renderPlaintextFromRichText, TLArrowShape, TLGeoShape } from 'tldraw'
import type { ClassDefinition, ClassRelationship } from '../parseClassDiagramAdvanced'

export function readClassDiagram(
	editor: Editor,
	geoShapes: TLGeoShape[],
	arrowShapes: TLArrowShape[]
): { classes: ClassDefinition[]; relationships: ClassRelationship[] } {
	const classes: ClassDefinition[] = []
	const relationships: ClassRelationship[] = []

	// Reconstruct classes from shape metadata
	for (const shape of geoShapes) {
		if (shape.meta?.classData) {
			classes.push(shape.meta.classData as unknown as ClassDefinition)
		} else {
			// Fallback: create a minimal class from the shape label
			const label = renderPlaintextFromRichText(editor, shape.props.richText) || ''
			if (label) {
				classes.push({ name: label.split('\n')[0].trim(), properties: [], methods: [] })
			}
		}
	}

	// Reconstruct relationships from arrow metadata
	for (const arrow of arrowShapes) {
		if (arrow.meta?.relationshipData) {
			relationships.push(arrow.meta.relationshipData as unknown as ClassRelationship)
		}
	}

	return { classes, relationships }
}
