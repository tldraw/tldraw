/**
 * Read tldraw shapes into a ParsedErDiagram AST.
 */

import { Editor, renderPlaintextFromRichText, TLArrowShape, TLGeoShape } from 'tldraw'
import type { ErEntity, ErRelationship, ParsedErDiagram } from '../parseErDiagram'

export function readErDiagram(
	editor: Editor,
	geoShapes: TLGeoShape[],
	arrowShapes: TLArrowShape[]
): ParsedErDiagram {
	const entities: ErEntity[] = []
	const relationships: ErRelationship[] = []

	for (const shape of geoShapes) {
		if (shape.meta?.entityData) {
			entities.push(shape.meta.entityData as unknown as ErEntity)
		} else {
			const label = renderPlaintextFromRichText(editor, shape.props.richText) || ''
			if (label) {
				const lines = label.split('\n')
				const name = lines[0].trim()
				const attrs = lines.slice(1).filter((l) => l.trim() && l.trim() !== '---')
				entities.push({ name, attributes: attrs.map((a) => a.trim()) })
			}
		}
	}

	for (const arrow of arrowShapes) {
		if (arrow.meta?.relationshipData) {
			const data = arrow.meta.relationshipData as unknown as ErRelationship & { label?: string }
			const label = renderPlaintextFromRichText(editor, arrow.props.richText) || data.label || ''
			relationships.push({
				from: data.from,
				to: data.to,
				fromCardinality: data.fromCardinality,
				toCardinality: data.toCardinality,
				label: label || undefined,
				relType: data.relType,
			})
		}
	}

	return { entities, relationships }
}
