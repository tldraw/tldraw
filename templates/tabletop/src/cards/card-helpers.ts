import { Editor, TLShapeId } from 'tldraw'
import { CARD_TYPE, ICardShape } from './CardShapeUtil'

/**
 * Fan (spread) selected cards in an arc.
 * Cards are repositioned around a center point with rotation.
 */
export function fanCards(editor: Editor, cardIds: TLShapeId[], center: { x: number; y: number }) {
	if (cardIds.length === 0) return

	const count = cardIds.length
	editor.markHistoryStoppingPoint('fan cards')

	if (count === 1) {
		const shape = editor.getShape<ICardShape>(cardIds[0])
		if (!shape) return
		editor.updateShape({
			id: cardIds[0],
			type: CARD_TYPE,
			x: center.x - shape.props.w / 2,
			y: center.y - shape.props.h / 2,
			rotation: 0,
		})
		return
	}

	// Fan parameters
	const totalArc = Math.min(count * 8, 90) // degrees, capped at 90
	const startAngle = -totalArc / 2
	const angleStep = totalArc / (count - 1)
	const radius = Math.max(120, count * 15) // radius of the fan arc

	// Compute fanned positions relative to origin
	const positions = cardIds.map((id, i) => {
		const angleDeg = startAngle + i * angleStep
		const angleRad = (angleDeg * Math.PI) / 180
		const x = Math.sin(angleRad) * radius
		const y = -Math.cos(angleRad) * radius + radius
		return { id, x, y, rotation: angleRad }
	})

	// Find the bounding box of the fanned cards (accounting for rotated card dimensions)
	let minX = Infinity
	let minY = Infinity
	let maxX = -Infinity
	let maxY = -Infinity

	for (const pos of positions) {
		const shape = editor.getShape<ICardShape>(pos.id)
		if (!shape) continue
		const { w, h } = shape.props
		const cos = Math.abs(Math.cos(pos.rotation))
		const sin = Math.abs(Math.sin(pos.rotation))
		const rotW = w * cos + h * sin
		const rotH = w * sin + h * cos
		minX = Math.min(minX, pos.x - (rotW - w) / 2)
		minY = Math.min(minY, pos.y - (rotH - h) / 2)
		maxX = Math.max(maxX, pos.x + w + (rotW - w) / 2)
		maxY = Math.max(maxY, pos.y + h + (rotH - h) / 2)
	}

	// Offset so the fan's bounding box is centered on `center`
	const offsetX = center.x - (minX + maxX) / 2
	const offsetY = center.y - (minY + maxY) / 2

	editor.updateShapes(
		positions.map((pos) => ({
			id: pos.id,
			type: CARD_TYPE,
			x: pos.x + offsetX,
			y: pos.y + offsetY,
			rotation: pos.rotation,
		}))
	)
}

/**
 * Arrange selected cards in a horizontal row (a "hand"), centered on the previous selection bounds.
 */
export function makeHand(editor: Editor, cardIds: TLShapeId[], center: { x: number; y: number }) {
	const cards = cardIds
		.map((id) => editor.getShape<ICardShape>(id))
		.filter((s): s is ICardShape => s !== undefined)

	if (cards.length === 0) return

	editor.markHistoryStoppingPoint('make hand')

	const gap = editor.options.adjacentShapeMargin

	// Compute total row width
	const totalWidth = cards.reduce((sum, card, i) => {
		return sum + card.props.w + (i < cards.length - 1 ? gap : 0)
	}, 0)
	const totalHeight = Math.max(...cards.map((c) => c.props.h))

	// Starting x so the row is centered on `center`
	let x = center.x - totalWidth / 2
	const y = center.y - totalHeight / 2

	editor.updateShapes(
		cards.map((card) => {
			const update = {
				id: card.id,
				type: CARD_TYPE as typeof CARD_TYPE,
				x,
				y,
				rotation: 0,
			}
			x += card.props.w + gap
			return update
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

	editor.markHistoryStoppingPoint('flip cards')

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
