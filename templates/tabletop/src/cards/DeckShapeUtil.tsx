import {
	BaseBoxShapeUtil,
	HTMLContainer,
	RecordProps,
	T,
	TLShape,
	TLShapePartial,
	createShapeId,
} from 'tldraw'
import { CARD_H, CARD_W, RANKS, SUITS } from './card-data'
import { CARD_TYPE } from './CardShapeUtil'

// --- Shape type ---

export const CARD_BOX_TYPE = 'tabletop-card-box' as const

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[CARD_BOX_TYPE]: {
			w: number
			h: number
			isFull: boolean
		}
	}
}

type ICardBoxShape = TLShape<typeof CARD_BOX_TYPE>

// --- Component ---

function CardBoxComponent({ shape }: { shape: ICardBoxShape }) {
	const { w, h, isFull } = shape.props
	const radius = Math.max(3, w * 0.015)
	const depth = Math.max(6, w * 0.035)

	if (isFull) {
		const faceW = w - depth
		const faceH = h - depth
		const blueBand = Math.max(14, faceW * 0.1)

		return (
			<HTMLContainer style={{ width: w, height: h }}>
				<div style={{ position: 'relative', width: w, height: h }}>
					{/* Right depth edge */}
					<div
						style={{
							position: 'absolute',
							top: depth,
							right: 0,
							width: depth,
							height: faceH,
							background: 'linear-gradient(to right, #d0d0d0, #b8b8b8)',
							borderRadius: `0 ${radius}px ${radius}px 0`,
						}}
					/>
					{/* Bottom depth edge */}
					<div
						style={{
							position: 'absolute',
							bottom: 0,
							left: depth,
							width: faceW,
							height: depth,
							background: 'linear-gradient(to bottom, #c8c8c8, #a8a8a8)',
							borderRadius: `0 0 ${radius}px ${radius}px`,
						}}
					/>
					{/* Corner depth fill */}
					<div
						style={{
							position: 'absolute',
							bottom: 0,
							right: 0,
							width: depth,
							height: depth,
							background: '#b0b0b0',
							borderRadius: `0 0 ${radius}px 0`,
						}}
					/>
					{/* Front face */}
					<div
						style={{
							position: 'absolute',
							top: 0,
							left: 0,
							width: faceW,
							height: faceH,
							background: '#2955a0',
							borderRadius: radius,
							border: '1px solid #1e3d6e',
							overflow: 'hidden',
							boxSizing: 'border-box',
						}}
					>
						{/* Gold border trim */}
						<div
							style={{
								position: 'absolute',
								top: blueBand - 2,
								left: blueBand - 2,
								right: blueBand - 2,
								bottom: blueBand - 2,
								border: '2px solid #a8935e',
							}}
						/>
						{/* White center panel */}
						<div
							style={{
								position: 'absolute',
								top: blueBand,
								left: blueBand,
								right: blueBand,
								bottom: blueBand,
								background: '#fafafa',
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								justifyContent: 'center',
								gap: faceH * 0.015,
							}}
						>
							{/* Decorative line above */}
							<div
								style={{
									width: '60%',
									height: 1,
									background: '#a8935e',
								}}
							/>
							{/* Large red spade */}
							<div
								style={{
									fontSize: faceW * 0.3,
									lineHeight: 1,
									color: '#cc0000',
								}}
							>
								{'\u2660'}
							</div>
							{/* PLAYING CARDS text */}
							<div
								style={{
									fontSize: Math.max(8, faceW * 0.055),
									fontWeight: 600,
									letterSpacing: faceW * 0.008,
									color: '#2955a0',
									fontFamily: 'Georgia, "Times New Roman", serif',
									textTransform: 'uppercase',
								}}
							>
								Playing Cards
							</div>
							{/* Decorative line below */}
							<div
								style={{
									width: '40%',
									height: 1,
									background: '#a8935e',
								}}
							/>
						</div>
					</div>
				</div>
			</HTMLContainer>
		)
	}

	// Empty box
	const faceW = w - depth
	const faceH = h - depth

	return (
		<HTMLContainer style={{ width: w, height: h }}>
			<div style={{ position: 'relative', width: w, height: h }}>
				{/* Right depth edge */}
				<div
					style={{
						position: 'absolute',
						top: depth,
						right: 0,
						width: depth,
						height: faceH,
						background: 'linear-gradient(to right, #e0e0e0, #d0d0d0)',
						borderRadius: `0 ${radius}px ${radius}px 0`,
					}}
				/>
				{/* Bottom depth edge */}
				<div
					style={{
						position: 'absolute',
						bottom: 0,
						left: depth,
						width: faceW,
						height: depth,
						background: 'linear-gradient(to bottom, #ddd, #ccc)',
						borderRadius: `0 0 ${radius}px ${radius}px`,
					}}
				/>
				{/* Corner depth fill */}
				<div
					style={{
						position: 'absolute',
						bottom: 0,
						right: 0,
						width: depth,
						height: depth,
						background: '#d0d0d0',
						borderRadius: `0 0 ${radius}px 0`,
					}}
				/>
				{/* Front face */}
				<div
					style={{
						position: 'absolute',
						top: 0,
						left: 0,
						width: faceW,
						height: faceH,
						background: '#f5f5f5',
						borderRadius: radius,
						border: '2px dashed #bbb',
						boxSizing: 'border-box',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						color: '#aaa',
						fontSize: Math.max(10, faceW * 0.07),
						fontFamily: 'Inter, system-ui, sans-serif',
					}}
				>
					Empty
				</div>
			</div>
		</HTMLContainer>
	)
}

// --- ShapeUtil ---

export class CardBoxShapeUtil extends BaseBoxShapeUtil<ICardBoxShape> {
	static override type = CARD_BOX_TYPE
	static override props: RecordProps<ICardBoxShape> = {
		w: T.number,
		h: T.number,
		isFull: T.boolean,
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

	getDefaultProps(): ICardBoxShape['props'] {
		return {
			w: CARD_W,
			h: CARD_H,
			isFull: true,
		}
	}

	override onDoubleClick(shape: ICardBoxShape): TLShapePartial<ICardBoxShape> | void {
		if (shape.props.isFull) {
			// Create 52 shuffled face-down cards next to the box
			const cards: Parameters<typeof this.editor.createShapes>[0] = []
			for (const suit of SUITS) {
				for (const rank of RANKS) {
					cards.push({
						id: createShapeId(),
						type: CARD_TYPE,
						x: 0,
						y: 0,
						props: {
							w: CARD_W,
							h: CARD_H,
							suit,
							rank,
							isFaceUp: false,
							isFlipping: false,
						},
					})
				}
			}

			// Fisher-Yates shuffle
			for (let i = cards.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1))
				;[cards[i], cards[j]] = [cards[j], cards[i]]
			}

			// Position stacked next to the box, offset up and to the left so shadows fall bottom-right
			const boxBounds = this.editor.getShapePageBounds(shape.id)
			const baseX = boxBounds ? boxBounds.maxX + 30 : shape.x + CARD_W + 30
			const baseY = boxBounds ? boxBounds.y : shape.y
			for (let i = 0; i < cards.length; i++) {
				cards[i].x = baseX - i * 0.5
				cards[i].y = baseY - i * 0.5
			}

			this.editor.createShapes(cards)

			return {
				id: shape.id,
				type: CARD_BOX_TYPE,
				props: { isFull: false },
			}
		} else {
			// Delete all card shapes on the current page
			const pageId = this.editor.getCurrentPageId()
			const allShapes = this.editor.getSortedChildIdsForParent(pageId)
			const cardIds = allShapes.filter((id) => {
				const s = this.editor.getShape(id)
				return s?.type === CARD_TYPE
			})

			if (cardIds.length > 0) {
				this.editor.deleteShapes(cardIds)
			}

			return {
				id: shape.id,
				type: CARD_BOX_TYPE,
				props: { isFull: true },
			}
		}
	}

	component(shape: ICardBoxShape) {
		return <CardBoxComponent shape={shape} />
	}

	indicator(shape: ICardBoxShape) {
		return (
			<rect
				width={shape.props.w}
				height={shape.props.h}
				rx={Math.max(3, shape.props.w * 0.015)}
				ry={Math.max(3, shape.props.w * 0.015)}
			/>
		)
	}
}
