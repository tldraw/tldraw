/**
 * Read tldraw shapes into a ParsedStateDiagram AST.
 */

import { Editor, renderPlaintextFromRichText, TLArrowShape, TLGeoShape } from 'tldraw'
import type { ParsedStateDiagram, StateDiagramState, StateDiagramTransition } from '../parseStateDiagram'

export function readStateDiagram(
	editor: Editor,
	geoShapes: TLGeoShape[],
	arrowShapes: TLArrowShape[]
): ParsedStateDiagram {
	const states: StateDiagramState[] = []
	const transitions: StateDiagramTransition[] = []
	const shapeIdToStateId = new Map<string, string>()

	// Build states from geo shapes
	for (const shape of geoShapes) {
		const stateData = shape.meta?.stateData as any
		if (stateData) {
			const label = renderPlaintextFromRichText(editor, shape.props.richText) || stateData.label || stateData.id
			states.push({
				id: stateData.id,
				label,
				isStart: stateData.isStart ?? false,
				isEnd: stateData.isEnd ?? false,
				stateType: stateData.stateType,
			})
			shapeIdToStateId.set(shape.id, stateData.id)
		} else {
			// Fallback: use label as ID
			const label = renderPlaintextFromRichText(editor, shape.props.richText) || ''
			if (!label) continue
			const id = label.replace(/\s+/g, '_')
			const isStart = shape.props.geo === 'ellipse' && shape.props.fill === 'solid'
			const isEnd = shape.props.geo === 'ellipse' && !isStart
			states.push({ id, label, isStart, isEnd })
			shapeIdToStateId.set(shape.id, id)
		}
	}

	// Build transitions from arrows
	for (const arrow of arrowShapes) {
		const transitionData = arrow.meta?.transitionData as any
		if (transitionData) {
			const label = renderPlaintextFromRichText(editor, arrow.props.richText) || transitionData.label || ''
			transitions.push({
				from: transitionData.from,
				to: transitionData.to,
				label: label || undefined,
			})
		} else {
			// Fallback: resolve via bindings
			const bindings = editor.getBindingsFromShape(arrow, 'arrow')
			const startBinding = bindings.find((b) => b.props.terminal === 'start')
			const endBinding = bindings.find((b) => b.props.terminal === 'end')
			if (!startBinding || !endBinding) continue

			const from = shapeIdToStateId.get(startBinding.toId)
			const to = shapeIdToStateId.get(endBinding.toId)
			if (!from || !to) continue

			const label = renderPlaintextFromRichText(editor, arrow.props.richText) || ''
			transitions.push({ from, to, label: label || undefined })
		}
	}

	return { states, transitions }
}
