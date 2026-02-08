import { Editor, TLShapeId, getIndicesBetween } from 'tldraw'
import { CARD_TYPE, ICardShape } from './CardShapeUtil'
import { DECK_TYPE } from './DeckShapeUtil'

/** Fisher-Yates shuffle of the children of a deck shape. */
export function shuffleDeck(editor: Editor, deckId: TLShapeId) {
	const childIds = editor.getSortedChildIdsForParent(deckId)
	if (childIds.length < 2) return

	// Fisher-Yates
	const shuffled = [...childIds]
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
	}

	// Assign new indices in order
	const indices = getIndicesBetween(undefined, undefined, shuffled.length)
	editor.updateShapes(
		shuffled.map((id, i) => ({
			id,
			type: CARD_TYPE,
			index: indices[i],
		}))
	)
}

/** Deal the top card from a deck to a page position. */
export function dealTopCard(
	editor: Editor,
	deckId: TLShapeId,
	position?: { x: number; y: number }
) {
	const childIds = editor.getSortedChildIdsForParent(deckId)
	if (childIds.length === 0) return null

	const topCardId = childIds[childIds.length - 1]

	editor.reparentShapes([topCardId], editor.getCurrentPageId())

	const pos = position || getDealPosition(editor, deckId)
	editor.updateShape<ICardShape>({
		id: topCardId,
		type: CARD_TYPE,
		x: pos.x,
		y: pos.y,
		props: { isFaceUp: true, isFlipping: false },
	})

	return topCardId
}

/** Get a default dealing position to the right of a deck. */
function getDealPosition(editor: Editor, deckId: TLShapeId): { x: number; y: number } {
	const deckBounds = editor.getShapePageBounds(deckId)
	if (deckBounds) {
		return { x: deckBounds.maxX + 20, y: deckBounds.y }
	}
	return { x: 200, y: 200 }
}

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
 * Collect loose cards into a deck. Cards are reparented into the deck
 * and stacked face-down.
 */
export function collectIntoDeck(editor: Editor, cardIds: TLShapeId[], deckId: TLShapeId) {
	const cards = cardIds
		.map((id) => editor.getShape(id))
		.filter((s): s is ICardShape => s !== undefined && s.type === CARD_TYPE)

	if (cards.length === 0) return

	editor.reparentShapes(cards, deckId)

	// Stack all at deck origin, face down, no rotation
	editor.updateShapes(
		cards.map((card) => ({
			id: card.id,
			type: CARD_TYPE,
			x: 0,
			y: 0,
			rotation: 0,
			props: { isFaceUp: false, isFlipping: false },
		}))
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
 * Get the IDs of selected card shapes and deck shapes separately.
 */
export function getSelectedCardAndDeckIds(editor: Editor) {
	const selectedIds = editor.getSelectedShapeIds()
	const cardIds: TLShapeId[] = []
	const deckIds: TLShapeId[] = []

	for (const id of selectedIds) {
		const shape = editor.getShape(id)
		if (!shape) continue
		if (shape.type === CARD_TYPE) cardIds.push(id)
		else if (shape.type === DECK_TYPE) deckIds.push(id)
	}

	return { cardIds, deckIds }
}
