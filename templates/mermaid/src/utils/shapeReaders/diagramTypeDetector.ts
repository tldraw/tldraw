/**
 * Detect diagram type from tldraw shapes using multiple strategies.
 */

import { Editor, renderPlaintextFromRichText, TLArrowShape, TLGeoShape } from 'tldraw'

/**
 * Detect diagram type using:
 * 1. Explicit meta.diagramType (majority vote across all shapes)
 * 2. Specific meta fields (participantData, stateData, etc.)
 * 3. Visual heuristics (duplicate label pairs = sequence diagram)
 * 4. Default: flowchart
 */
export function detectDiagramType(
	editor: Editor,
	geoShapes: TLGeoShape[],
	arrowShapes: TLArrowShape[]
): string {
	// Strategy 1: Majority vote on explicit diagramType meta
	const typeCounts = new Map<string, number>()
	for (const shape of [...geoShapes, ...arrowShapes]) {
		const dt = shape.meta?.diagramType as string | undefined
		if (dt) typeCounts.set(dt, (typeCounts.get(dt) || 0) + 1)
	}
	if (typeCounts.size > 0) {
		let best = ''
		let bestCount = 0
		for (const [type, count] of typeCounts) {
			if (count > bestCount) { best = type; bestCount = count }
		}
		return best
	}

	// Strategy 2: Infer from specific meta fields
	for (const shape of geoShapes) {
		if (shape.meta?.participantData || shape.meta?.isParticipant) return 'sequenceDiagram'
		if (shape.meta?.stateData) return 'stateDiagram'
		if (shape.meta?.entityData) return 'erDiagram'
		if (shape.meta?.classData) return 'classDiagram'
	}
	for (const arrow of arrowShapes) {
		if (arrow.meta?.messageData || arrow.meta?.isLifeline) return 'sequenceDiagram'
		if (arrow.meta?.transitionData) return 'stateDiagram'
		if (arrow.meta?.relationshipData) return 'erDiagram'
	}

	// Strategy 3: Visual heuristic — duplicate label pairs = sequence diagram
	if (geoShapes.length >= 2) {
		const labelGroups = new Map<string, TLGeoShape[]>()
		for (const shape of geoShapes) {
			const label = shape.props.richText
				? renderPlaintextFromRichText(editor, shape.props.richText)
				: ''
			if (label) {
				const group = labelGroups.get(label) || []
				group.push(shape)
				labelGroups.set(label, group)
			}
		}
		const duplicateCount = [...labelGroups.values()].filter((g) => g.length === 2).length
		if (duplicateCount >= 2 && duplicateCount >= labelGroups.size * 0.5) {
			return 'sequenceDiagram'
		}
	}

	return 'flowchart'
}
