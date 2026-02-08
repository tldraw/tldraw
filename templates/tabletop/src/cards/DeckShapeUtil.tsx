import {
	BaseBoxShapeUtil,
	HTMLContainer,
	RecordProps,
	T,
	TLShape,
	TLShapeId,
	TLShapePartial,
} from 'tldraw'
import { CARD_H, CARD_W } from './card-data'
import { CARD_TYPE, ICardShape } from './CardShapeUtil'

// --- Shape type ---

export const DECK_TYPE = 'tabletop-deck' as const

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[DECK_TYPE]: {
			w: number
			h: number
			cardCount: number
		}
	}
}

type IDeckShape = TLShape<typeof DECK_TYPE>

// --- Component ---

function DeckComponent({ shape }: { shape: IDeckShape }) {
	const { w, h, cardCount } = shape.props
	const borderRadius = w * 0.06

	// Show stacked card backs with slight offsets to convey depth
	const layers = Math.min(cardCount, 5)

	return (
		<HTMLContainer
			style={{
				width: w,
				height: h,
			}}
		>
			<div style={{ position: 'relative', width: w, height: h }}>
				{/* Stack layers */}
				{Array.from({ length: layers }, (_, i) => {
					const offset = (layers - 1 - i) * 1.5
					return (
						<div
							key={i}
							style={{
								position: 'absolute',
								left: -offset,
								top: -offset,
								width: w,
								height: h,
								borderRadius,
								background: i === layers - 1 ? '#1a4d8f' : '#15417a',
								border: '1px solid #0d2b52',
								boxSizing: 'border-box',
							}}
						/>
					)
				})}
				{/* Inner pattern on top card */}
				{cardCount > 0 && (
					<div
						style={{
							position: 'absolute',
							left: -(layers - 1) * 1.5,
							top: -(layers - 1) * 1.5,
							width: w,
							height: h,
							borderRadius,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							pointerEvents: 'none',
						}}
					>
						<div
							style={{
								position: 'absolute',
								top: w * 0.06,
								left: w * 0.06,
								right: w * 0.06,
								bottom: w * 0.06,
								borderRadius: w * 0.04,
								border: '2px solid rgba(255,255,255,0.3)',
								background:
									'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.05) 4px, rgba(255,255,255,0.05) 8px)',
							}}
						/>
					</div>
				)}
				{/* Card count badge */}
				<div
					style={{
						position: 'absolute',
						left: -(layers - 1) * 1.5,
						top: -(layers - 1) * 1.5,
						width: w,
						height: h,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						pointerEvents: 'none',
					}}
				>
					<div
						style={{
							background: 'rgba(0,0,0,0.5)',
							color: '#fff',
							borderRadius: '50%',
							width: Math.max(24, w * 0.32),
							height: Math.max(24, w * 0.32),
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							fontSize: Math.max(11, w * 0.16),
							fontWeight: 700,
							fontFamily: 'Inter, system-ui, sans-serif',
						}}
					>
						{cardCount}
					</div>
				</div>
				{/* Empty deck placeholder */}
				{cardCount === 0 && (
					<div
						style={{
							position: 'absolute',
							inset: 0,
							borderRadius,
							border: '2px dashed #aaa',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							color: '#aaa',
							fontSize: Math.max(10, w * 0.12),
							fontFamily: 'Inter, system-ui, sans-serif',
						}}
					>
						Empty
					</div>
				)}
			</div>
		</HTMLContainer>
	)
}

// --- ShapeUtil ---

export class DeckShapeUtil extends BaseBoxShapeUtil<IDeckShape> {
	static override type = DECK_TYPE
	static override props: RecordProps<IDeckShape> = {
		w: T.number,
		h: T.number,
		cardCount: T.number,
	}

	override isAspectRatioLocked() {
		return true
	}

	override hideResizeHandles() {
		return true
	}

	override hideRotateHandle() {
		return true
	}

	override canEdit() {
		return false
	}

	getDefaultProps(): IDeckShape['props'] {
		return {
			w: CARD_W,
			h: CARD_H,
			cardCount: 0,
		}
	}

	// --- Container behavior ---

	override canReceiveNewChildrenOfType(_shape: IDeckShape, type: string) {
		return type === CARD_TYPE
	}

	override onDragShapesIn(shape: IDeckShape, shapes: TLShape[]) {
		const cards = shapes.filter((s): s is ICardShape => s.type === CARD_TYPE)
		if (cards.length === 0) return

		// Skip if already children of this deck
		if (cards.every((c) => c.parentId === shape.id)) return

		// Reparent cards into the deck, stacked at origin
		this.editor.reparentShapes(cards, shape.id)
		for (const card of cards) {
			this.editor.updateShape<ICardShape>({
				id: card.id,
				type: CARD_TYPE,
				x: 0,
				y: 0,
				props: { isFaceUp: false },
			})
		}
	}

	override onDragShapesOut(shape: IDeckShape, shapes: TLShape[]) {
		const leavingCards = shapes.filter((s) => s.type === CARD_TYPE && s.parentId === shape.id)
		if (leavingCards.length === 0) return

		this.editor.reparentShapes(leavingCards, this.editor.getCurrentPageId())
	}

	// Keep cardCount in sync with actual children
	override onChildrenChange(shape: IDeckShape): TLShapePartial[] | void {
		const childCount = this.editor.getSortedChildIdsForParent(shape.id).length
		if (childCount !== shape.props.cardCount) {
			return [
				{
					id: shape.id,
					type: DECK_TYPE,
					props: { cardCount: childCount },
				},
			]
		}
	}

	// Double-click to deal the top card
	override onDoubleClick(shape: IDeckShape): TLShapePartial<IDeckShape> | void {
		const childIds = this.editor.getSortedChildIdsForParent(shape.id)
		if (childIds.length === 0) return

		const topCardId = childIds[childIds.length - 1]
		this.dealCard(shape, topCardId)
		return undefined
	}

	private dealCard(deck: IDeckShape, cardId: TLShapeId) {
		// Reparent to the page
		this.editor.reparentShapes([cardId], this.editor.getCurrentPageId())

		// Position to the right of the deck
		const deckBounds = this.editor.getShapePageBounds(deck.id)
		if (deckBounds) {
			this.editor.updateShape<ICardShape>({
				id: cardId,
				type: CARD_TYPE,
				x: deckBounds.maxX + 20,
				y: deckBounds.y,
				props: { isFaceUp: true, isFlipping: false },
			})
		}
	}

	component(shape: IDeckShape) {
		return <DeckComponent shape={shape} />
	}

	indicator(shape: IDeckShape) {
		return (
			<rect
				width={shape.props.w}
				height={shape.props.h}
				rx={shape.props.w * 0.06}
				ry={shape.props.w * 0.06}
			/>
		)
	}
}
