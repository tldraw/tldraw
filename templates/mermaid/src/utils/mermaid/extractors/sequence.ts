import { parseSequenceDiagram } from '../../parseSequenceDiagram'
import { getNodeBounds } from '../svgUtils'
import { DiagramLayout, EdgeLayout, NodeLayout } from '../types'

export function extractSequenceLayout(svgEl: Element, code: string): DiagramLayout {
	const ast = parseSequenceDiagram(code)
	const nodes: NodeLayout[] = []
	const edges: EdgeLayout[] = []

	if (!ast) return { type: 'sequenceDiagram', nodes, edges }

	// Mermaid renders participant top boxes as rect.actor (or use g.actor)
	// Rects appear in pairs (top + bottom), so even indices are top boxes
	const actorRects = Array.from(svgEl.querySelectorAll('rect.actor, .actor rect'))
	const topActorRects = actorRects.filter((_, i) => i % 2 === 0)

	// Also try g.actor approach
	const actorGroups = Array.from(svgEl.querySelectorAll('g.actor'))

	// Match participants to SVG elements by index
	for (let i = 0; i < ast.participants.length; i++) {
		const participant = ast.participants[i]

		// Try to find position from actor elements
		let x = i * 260
		let y = 0
		let width = 150
		let height = 65

		const actorEl =
			actorGroups[i] ?? (topActorRects[i] ? topActorRects[i].closest('g') : null)
		if (actorEl) {
			try {
				const bounds = getNodeBounds(actorEl)
				x = bounds.x
				y = bounds.y
				width = bounds.width
				height = bounds.height
			} catch {}
		}

		nodes.push({
			id: participant.id,
			x,
			y,
			width,
			height,
			geoShape: 'rectangle',
			label: participant.label,
			meta: {
				diagramType: 'sequenceDiagram',
				participantData: { id: participant.id, label: participant.label },
				participantOrder: i,
				isParticipant: true,
			},
		})
	}

	// Add lifelines as separate shapes (vertical dotted lines, no arrowheads, decorative)
	const messageSpacingPx = 80
	const lifelineHeight = Math.max(ast.messages.length * messageSpacingPx + 40, 100)

	for (let i = 0; i < ast.participants.length; i++) {
		const participant = ast.participants[i]
		const participantNode = nodes[i]
		const centerX = participantNode.x + participantNode.width / 2

		edges.push({
			id: `lifeline-${participant.id}`,
			from: participant.id,
			to: participant.id,
			label: '',
			meta: {
				diagramType: 'sequenceDiagram',
				isLifeline: true,
				lifelineX: centerX,
				lifelineStartY: participantNode.y + participantNode.height,
				lifelineEndY: participantNode.y + participantNode.height + lifelineHeight,
			},
		})
	}

	// Extract messages as edges
	for (let i = 0; i < ast.messages.length; i++) {
		const msg = ast.messages[i]

		const lineStyle: string = msg.messageType === 'dotted' ? 'dotted' : 'solid'

		edges.push({
			id: `msg-${i}`,
			from: msg.from,
			to: msg.to,
			label: msg.text ?? '',
			meta: {
				diagramType: 'sequenceDiagram',
				messageData: {
					from: msg.from,
					to: msg.to,
					messageType: msg.messageType,
					arrowType: msg.arrowType,
					text: msg.text ?? '',
				},
				messageIndex: i,
				lineStyle,
				isSelfLoop: msg.from === msg.to,
			},
		})
	}

	return { type: 'sequenceDiagram', nodes, edges }
}
