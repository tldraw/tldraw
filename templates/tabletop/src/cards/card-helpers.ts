import { Editor, TLShapeId } from 'tldraw'
import { CARD_TYPE, ICardShape } from './CardShapeUtil'

/**
 * Fan (spread) selected cards in an arc.
 * Cards are repositioned around a center point with rotation.
 */
export function fanCards(editor: Editor, cardIds: TLShapeId[], center: { x: number; y: number }) {
	if (cardIds.length === 0) return

	const count = cardIds.length
	if (count === 1) {
		editor.updateShape({
			id: cardIds[0],
			type: CARD_TYPE,
			x: center.x,
			y: center.y,
			rotation: 0,
		})
		return
	}

	// Fan parameters
	const totalArc = Math.min(count * 8, 90) // degrees, capped at 90
	const startAngle = -totalArc / 2
	const angleStep = totalArc / (count - 1)
	const radius = Math.max(120, count * 15) // radius of the fan arc

	editor.updateShapes(
		cardIds.map((id, i) => {
			const angleDeg = startAngle + i * angleStep
			const angleRad = (angleDeg * Math.PI) / 180
			const x = center.x + Math.sin(angleRad) * radius
			const y = center.y - Math.cos(angleRad) * radius + radius
			return {
				id,
				type: CARD_TYPE,
				x,
				y,
				rotation: angleRad,
			}
		})
	)
}

/**
 * Flip all provided card shapes (toggle isFaceUp).
 */
export function flipCards(editor: Editor, cardIds: TLShapeId[]) {
	const cards = cardIds
		.map((id) => editor.getShape(id))
		.filter((s): s is ICardShape => s !== undefined && s.type === CARD_TYPE)

	if (cards.length === 0) return

	editor.updateShapes(
		cards.map((card) => ({
			id: card.id,
			type: CARD_TYPE,
			props: {
				isFaceUp: !card.props.isFaceUp,
				isFlipping: true,
			},
		}))
	)
}

/**
 * Get the IDs of selected card shapes.
 */
export function getSelectedCardIds(editor: Editor): TLShapeId[] {
	const selectedIds = editor.getSelectedShapeIds()
	const cardIds: TLShapeId[] = []

	for (const id of selectedIds) {
		const shape = editor.getShape(id)
		if (!shape) continue
		if (shape.type === CARD_TYPE) cardIds.push(id)
	}

	return cardIds
}
