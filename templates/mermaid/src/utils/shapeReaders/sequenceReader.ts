/**
 * Read tldraw shapes into a ParsedSequenceDiagram AST.
 * Handles both metadata-rich shapes (from code) and manually drawn shapes.
 */

import { Editor, renderPlaintextFromRichText, TLArrowShape, TLGeoShape } from 'tldraw'
import type { ParsedSequenceDiagram, SequenceMessage, SequenceNote, SequenceParticipant } from '../parseSequenceDiagram'

export function readSequenceDiagram(
	editor: Editor,
	geoShapes: TLGeoShape[],
	arrowShapes: TLArrowShape[]
): ParsedSequenceDiagram {
	const participants: SequenceParticipant[] = []
	const messages: SequenceMessage[] = []
	const notes: SequenceNote[] = []

	// Maps shape ID -> participant ID for resolving arrow endpoints
	const shapeIdToParticipantId = new Map<string, string>()

	// ---- Participants ----
	// Try metadata path first
	const metaParticipants = geoShapes
		.filter((s) => s.meta?.participantData)
		.sort((a, b) => (a.meta.participantOrder as number) - (b.meta.participantOrder as number))

	if (metaParticipants.length > 0) {
		for (const shape of metaParticipants) {
			const data = shape.meta.participantData as { id: string; label: string }
			const currentLabel = renderPlaintextFromRichText(editor, shape.props.richText) || data.label
			participants.push({ id: data.id, label: currentLabel })
			shapeIdToParticipantId.set(shape.id, data.id)
			// Map mirror boxes (same label, different shape) to same participant
			for (const s of geoShapes) {
				const sLabel = renderPlaintextFromRichText(editor, s.props.richText) || ''
				if (sLabel === currentLabel || sLabel === data.id) {
					shapeIdToParticipantId.set(s.id, data.id)
				}
			}
		}
	} else {
		// Fallback: deduplicate by label, keep topmost box per unique label
		const labelToShape = new Map<string, TLGeoShape>()
		for (const shape of geoShapes) {
			const label = renderPlaintextFromRichText(editor, shape.props.richText) || ''
			if (!label) continue
			const existing = labelToShape.get(label)
			if (!existing || shape.y < existing.y) {
				labelToShape.set(label, shape)
			}
		}

		const sorted = [...labelToShape.entries()].sort((a, b) => a[1].x - b[1].x)
		for (const [label, shape] of sorted) {
			participants.push({ id: label, label })
			shapeIdToParticipantId.set(shape.id, label)
			// Map all same-label boxes
			for (const s of geoShapes) {
				const sLabel = renderPlaintextFromRichText(editor, s.props.richText) || ''
				if (sLabel === label) shapeIdToParticipantId.set(s.id, label)
			}
		}
	}

	// ---- Messages ----
	// Try metadata path first
	const metaMessages = arrowShapes
		.filter((s) => s.meta?.messageData)
		.sort((a, b) => (a.meta.messageIndex as number) - (b.meta.messageIndex as number))

	if (metaMessages.length > 0) {
		for (const arrow of metaMessages) {
			const data = arrow.meta.messageData as {
				from: string; to: string; messageType: string; arrowType: string; text: string
			}
			const text = renderPlaintextFromRichText(editor, arrow.props.richText) || data.text || ''
			messages.push({
				from: data.from,
				to: data.to,
				messageType: data.messageType as SequenceMessage['messageType'],
				arrowType: data.arrowType as SequenceMessage['arrowType'],
				text,
			})
		}
	} else {
		// Fallback: resolve from bindings or geometric proximity
		const candidateArrows = arrowShapes
			.filter((a) => {
				if (a.props.arrowheadEnd === 'none' && a.props.arrowheadStart === 'none') return false
				if (a.meta?.isLifeline) return false
				// Skip vertical arrows (lifelines)
				const dx = Math.abs(a.props.end.x - a.props.start.x)
				const dy = Math.abs(a.props.end.y - a.props.start.y)
				if (dy > dx * 3) return false
				return true
			})
			.sort((a, b) => a.y - b.y)

		for (const arrow of candidateArrows) {
			const { fromName, toName } = resolveArrowEndpoints(
				editor, arrow, geoShapes, shapeIdToParticipantId
			)
			if (!fromName || !toName || fromName === toName) continue

			const text = renderPlaintextFromRichText(editor, arrow.props.richText) || ''
			const messageType: SequenceMessage['messageType'] = arrow.props.dash === 'dashed' ? 'dotted' : 'solid'

			messages.push({
				from: fromName,
				to: toName,
				messageType,
				arrowType: 'arrow',
				text,
			})
		}
	}

	// ---- Notes ----
	const noteShapes = geoShapes.filter((s) => s.meta?.noteData)
	for (const shape of noteShapes) {
		const data = shape.meta.noteData as { position: string; participants: string[]; text: string }
		const currentText = renderPlaintextFromRichText(editor, shape.props.richText) || data.text
		notes.push({
			position: data.position as SequenceNote['position'],
			participants: data.participants,
			text: currentText,
		})
	}

	return { participants, messages, notes, loops: [] }
}

/**
 * Resolve an arrow's start/end to participant names, trying bindings then geometric proximity.
 */
function resolveArrowEndpoints(
	editor: Editor,
	arrow: TLArrowShape,
	geoShapes: TLGeoShape[],
	shapeIdToParticipantId: Map<string, string>
): { fromName?: string; toName?: string } {
	// Try bindings
	const bindings = editor.getBindingsFromShape(arrow, 'arrow')
	const startBinding = bindings.find((b) => b.props.terminal === 'start')
	const endBinding = bindings.find((b) => b.props.terminal === 'end')

	if (startBinding && endBinding) {
		const fromName = shapeIdToParticipantId.get(startBinding.toId)
		const toName = shapeIdToParticipantId.get(endBinding.toId)
		if (fromName && toName) return { fromName, toName }
	}

	// Fall back to geometric proximity
	const transform = editor.getShapePageTransform(arrow)
	if (!transform) return {}

	const pageStart = transform.applyToPoint(arrow.props.start)
	const pageEnd = transform.applyToPoint(arrow.props.end)

	const fromName = findNearestParticipantByX(editor, pageStart.x, geoShapes, shapeIdToParticipantId)
	const toName = findNearestParticipantByX(editor, pageEnd.x, geoShapes, shapeIdToParticipantId)

	return { fromName, toName }
}

function findNearestParticipantByX(
	editor: Editor,
	x: number,
	geoShapes: TLGeoShape[],
	map: Map<string, string>
): string | undefined {
	let bestName: string | undefined
	let bestDist = Infinity
	for (const shape of geoShapes) {
		const name = map.get(shape.id)
		if (!name) continue
		const bounds = editor.getShapePageBounds(shape)
		if (!bounds) continue
		const dist = Math.abs(bounds.x + bounds.w / 2 - x)
		if (dist < bestDist) { bestDist = dist; bestName = name }
	}
	return bestName
}
