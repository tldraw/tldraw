/**
 * Create tldraw shapes from a parsed Mermaid sequence diagram
 */

import {
	TLArrowShapeArrowheadStyle,
	Editor,
	TLArrowShape,
	TLGeoShape,
	TLShapeId,
	Vec,
	createShapeId,
	toRichText,
} from 'tldraw'
import { ParsedSequenceDiagram } from './parseSequenceDiagram'

interface ParticipantLayout {
	id: string
	x: number
	topY: number
	bottomY: number
	width: number
	height: number
}

/**
 * Create tldraw shapes from a parsed sequence diagram
 */
export function createShapesFromSequenceDiagram(
	editor: Editor,
	diagram: ParsedSequenceDiagram,
	position: Vec
): void {
	const participantWidth = 140
		const participantHeight = 60
		const participantSpacing = 120
		const messageSpacing = 100

		// Calculate participant positions (horizontal layout at top)
		const participantLayouts = new Map<string, ParticipantLayout>()
		let currentX = position.x

		for (const participant of diagram.participants) {
			const layout: ParticipantLayout = {
				id: participant.id,
				x: currentX,
				topY: position.y,
				bottomY: position.y + participantHeight + diagram.messages.length * messageSpacing,
				width: participantWidth,
				height: participantHeight,
			}
			participantLayouts.set(participant.id, layout)
			currentX += participantWidth + participantSpacing
		}

		// Create participant shapes at top and bottom
		const participantShapeIds = new Map<string, { top: TLShapeId; bottom: TLShapeId }>()

		for (const participant of diagram.participants) {
			const layout = participantLayouts.get(participant.id)
			if (!layout) continue

			// Create top box
			try {
				const topShapeId = createShapeId()
				editor.createShape<TLGeoShape>({
					id: topShapeId,
					type: 'geo',
					x: layout.x,
					y: layout.topY,
					props: {
						geo: 'rectangle',
						w: layout.width,
						h: layout.height,
						richText: toRichText(participant.label),
						align: 'middle',
						verticalAlign: 'middle',
						color: 'light-blue',
					},
				})

				// Create bottom box
				const bottomShapeId = createShapeId()
				editor.createShape<TLGeoShape>({
					id: bottomShapeId,
					type: 'geo',
					x: layout.x,
					y: layout.bottomY,
					props: {
						geo: 'rectangle',
						w: layout.width,
						h: layout.height,
						richText: toRichText(participant.label),
						align: 'middle',
						verticalAlign: 'middle',
						color: 'light-blue',
					},
				})

				// Create lifeline (vertical dotted line)
				const lifelineId = createShapeId()
				const centerX = layout.x + layout.width / 2
				editor.createShape<TLArrowShape>({
					id: lifelineId,
					type: 'arrow',
					x: centerX,
					y: layout.topY + layout.height,
					props: {
						start: { x: 0, y: 0 },
						end: { x: 0, y: layout.bottomY - (layout.topY + layout.height) },
						arrowheadStart: 'none' as TLArrowShapeArrowheadStyle,
						arrowheadEnd: 'none' as TLArrowShapeArrowheadStyle,
						dash: 'dotted',
					},
				})

				participantShapeIds.set(participant.id, { top: topShapeId, bottom: bottomShapeId })
			} catch (err) {
				throw err
			}
		}


		// Create message arrows
		let currentY = position.y + participantHeight + messageSpacing / 2


		// Track message Y positions for loop boxes
		const messageYPositions: number[] = []

		for (const message of diagram.messages) {
			messageYPositions.push(currentY)

			const fromLayout = participantLayouts.get(message.from)
			const toLayout = participantLayouts.get(message.to)

			if (!fromLayout || !toLayout) {
				continue
			}

			const fromX = fromLayout.x + fromLayout.width / 2
			const toX = toLayout.x + toLayout.width / 2

			// Check for self-referencing message (John->>John)
			if (message.from === message.to) {
				// Create a loop-back arrow that goes out to the right and back
				const loopWidth = 60
				const loopHeight = 40
				const arrowId = createShapeId()

				const dash = message.messageType === 'dotted' ? 'dashed' : 'draw'

				// Create curved arrow going right and then down
				editor.createShape<TLArrowShape>({
					id: arrowId,
					type: 'arrow',
					x: fromX,
					y: currentY,
					props: {
						start: { x: 0, y: 0 },
						end: { x: 0, y: loopHeight },
						bend: loopWidth,  // Positive bend curves to the right
						arrowheadStart: 'none' as TLArrowShapeArrowheadStyle,
						arrowheadEnd: 'arrow' as TLArrowShapeArrowheadStyle,
						dash,
						richText: toRichText(message.text || ''),
					},
				})
			} else {
				// Normal message between different participants
				const fromX = fromLayout.x + fromLayout.width / 2
				const toX = toLayout.x + toLayout.width / 2

				// Determine arrow style
				let arrowheadEnd: TLArrowShapeArrowheadStyle = 'arrow'
				if (message.arrowType === 'cross') arrowheadEnd = 'none'
				else if (message.arrowType === 'open') arrowheadEnd = 'arrow'

				const dash = message.messageType === 'dotted' ? 'dashed' : 'draw'

				// Create arrow
				const arrowId = createShapeId()
				editor.createShape<TLArrowShape>({
					id: arrowId,
					type: 'arrow',
					x: fromX,
					y: currentY,
					props: {
						start: { x: 0, y: 0 },
						end: { x: toX - fromX, y: 0 },
						arrowheadStart: 'none' as TLArrowShapeArrowheadStyle,
						arrowheadEnd,
						dash,
						richText: toRichText(message.text || ''),
					},
				})
			}

			currentY += messageSpacing
		}

		// Create loop boxes
		for (const loop of diagram.loops) {
			if (loop.endIndex === -1 || loop.startIndex >= messageYPositions.length) continue

			const startY = messageYPositions[loop.startIndex]
			const endY = loop.endIndex < messageYPositions.length
				? messageYPositions[loop.endIndex]
				: currentY

			// Find participants involved in messages within this loop
			const participantsInLoop = new Set<string>()
			for (let i = loop.startIndex; i < Math.min(loop.endIndex, diagram.messages.length); i++) {
				const message = diagram.messages[i]
				participantsInLoop.add(message.from)
				participantsInLoop.add(message.to)
			}

			// Find leftmost and rightmost participants in the loop
			let minX = Infinity
			let maxX = -Infinity
			let maxWidth = 0

			for (const participantId of participantsInLoop) {
				const layout = participantLayouts.get(participantId)
				if (layout) {
					minX = Math.min(minX, layout.x)
					if (layout.x > maxX) {
						maxX = layout.x
						maxWidth = layout.width
					}
				}
			}

			// Calculate box dimensions to encompass only involved participants
			const boxX = minX - 30
			const boxY = startY - messageSpacing / 2.5
			const boxWidth = (maxX + maxWidth) - minX + 60
			const boxHeight = endY - startY + messageSpacing / 2

			// Create loop box
			const loopBoxId = createShapeId()
			const loopLabel = loop.label ? `${loop.type} [${loop.label}]` : loop.type

			editor.createShape<TLGeoShape>({
				id: loopBoxId,
				type: 'geo',
				x: boxX,
				y: boxY,
				props: {
					geo: 'rectangle',
					w: boxWidth,
					h: boxHeight,
					richText: toRichText(loopLabel),
					align: 'start',
					verticalAlign: 'start',
					dash: 'dashed',
					fill: 'none',
					color: 'grey',
				},
			})

		}

		// Create notes
		for (let i = 0; i < diagram.notes.length; i++) {
			const note = diagram.notes[i]

			const participant = participantLayouts.get(note.participants[0])

			if (!participant) {
				continue
			}

			let noteX = participant.x
			// Position notes at the bottom, below all messages
			let noteY = currentY + messageSpacing

			// Adjust position based on note position
			if (note.position === 'left') {
				noteX -= 80
			} else if (note.position === 'right') {
				noteX += participant.width + 20
			} else if (note.position === 'over' && note.participants.length > 1) {
				// Center over multiple participants
				const lastParticipant = participantLayouts.get(
					note.participants[note.participants.length - 1]
				)
				if (lastParticipant) {
					noteX = (participant.x + lastParticipant.x + lastParticipant.width) / 2 - 70
				}
			}

			// Create note shape
			const noteId = createShapeId()
			editor.createShape<TLGeoShape>({
				id: noteId,
				type: 'geo',
				x: noteX,
				y: noteY,
				props: {
					geo: 'rectangle',
					w: 140,
					h: 60,
					richText: toRichText(note.text),
					align: 'start',
					verticalAlign: 'start',
					color: 'yellow',
				},
			})
		}
}
