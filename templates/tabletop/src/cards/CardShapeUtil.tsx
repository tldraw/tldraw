import { useCallback, useEffect, useRef } from 'react'
import {
	BaseBoxShapeUtil,
	HTMLContainer,
	RecordProps,
	T,
	TLShape,
	TLShapePartial,
	useEditor,
} from 'tldraw'
import { SUIT_COLORS, SUIT_SYMBOLS, Suit } from './card-data'

// --- Shape type ---

export const CARD_TYPE = 'tabletop-card' as const

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[CARD_TYPE]: {
			w: number
			h: number
			suit: string
			rank: string
			isFaceUp: boolean
			isFlipping: boolean
		}
	}
}

export type ICardShape = TLShape<typeof CARD_TYPE>

// --- Card face rendering ---

function CardFront({ suit, rank, w, h }: { suit: string; rank: string; w: number; h: number }) {
	const symbol = SUIT_SYMBOLS[suit as Suit] || '\u2660'
	const color = SUIT_COLORS[suit as Suit] || '#1a1a1a'
	const fontSize = Math.max(10, h * 0.14)
	const symbolFontSize = Math.max(14, h * 0.28)

	return (
		<div
			style={{
				width: w,
				height: h,
				background: '#fff',
				borderRadius: w * 0.06,
				border: '1px solid #ccc',
				boxSizing: 'border-box',
				position: 'relative',
				color,
				userSelect: 'none',
				overflow: 'hidden',
			}}
		>
			{/* Top-left rank + suit */}
			<div
				style={{
					position: 'absolute',
					top: h * 0.04,
					left: w * 0.08,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					lineHeight: 1.1,
				}}
			>
				<span style={{ fontSize, fontWeight: 700 }}>{rank}</span>
				<span style={{ fontSize: fontSize * 0.9 }}>{symbol}</span>
			</div>
			{/* Bottom-right rank + suit (rotated) */}
			<div
				style={{
					position: 'absolute',
					bottom: h * 0.04,
					right: w * 0.08,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					lineHeight: 1.1,
					transform: 'rotate(180deg)',
				}}
			>
				<span style={{ fontSize, fontWeight: 700 }}>{rank}</span>
				<span style={{ fontSize: fontSize * 0.9 }}>{symbol}</span>
			</div>
			{/* Center symbol */}
			<div
				style={{
					position: 'absolute',
					inset: 0,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					fontSize: symbolFontSize,
				}}
			>
				{symbol}
			</div>
		</div>
	)
}

function CardBack({ w, h }: { w: number; h: number }) {
	const inset = Math.max(3, w * 0.06)
	return (
		<div
			style={{
				width: w,
				height: h,
				background: '#1a4d8f',
				borderRadius: w * 0.06,
				border: '1px solid #0d2b52',
				boxSizing: 'border-box',
				position: 'relative',
				overflow: 'hidden',
			}}
		>
			{/* Inner border pattern */}
			<div
				style={{
					position: 'absolute',
					top: inset,
					left: inset,
					right: inset,
					bottom: inset,
					borderRadius: w * 0.04,
					border: '2px solid rgba(255,255,255,0.3)',
					background:
						'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.05) 4px, rgba(255,255,255,0.05) 8px)',
				}}
			/>
		</div>
	)
}

// --- Flip animation component ---

function CardComponent({ shape }: { shape: ICardShape }) {
	const editor = useEditor()
	const containerRef = useRef<HTMLDivElement>(null)
	const animRef = useRef(0)
	const isAnimating = useRef(false)
	const prevIsFlipping = useRef(false)
	// Track the visual Y rotation. 0 = face-up showing, 180 = face-down showing.
	const currentRotY = useRef(shape.props.isFaceUp ? 0 : 180)

	const { w, h, suit, rank, isFaceUp, isFlipping } = shape.props

	const applyFlip = useCallback((rotY: number) => {
		currentRotY.current = rotY
		if (containerRef.current) {
			containerRef.current.style.transform = `rotateY(${rotY}deg)`
		}
	}, [])

	useEffect(() => {
		if (isFlipping && !prevIsFlipping.current) {
			prevIsFlipping.current = true
			isAnimating.current = true

			const startRot = currentRotY.current
			// Flip 180 degrees in the direction that reveals the new face
			const endRot = isFaceUp ? startRot - 180 : startRot + 180
			const duration = 400
			const startTime = performance.now()

			const animate = (time: number) => {
				const elapsed = time - startTime
				const t = Math.min(elapsed / duration, 1)
				// Ease-out cubic
				const eased = 1 - Math.pow(1 - t, 3)
				applyFlip(startRot + (endRot - startRot) * eased)

				if (t < 1) {
					animRef.current = requestAnimationFrame(animate)
				} else {
					isAnimating.current = false
					prevIsFlipping.current = false
					editor.updateShape<ICardShape>({
						id: shape.id,
						type: CARD_TYPE,
						props: { isFlipping: false },
					})
				}
			}

			animRef.current = requestAnimationFrame(animate)
		} else if (!isFlipping && !isAnimating.current) {
			prevIsFlipping.current = false
			applyFlip(isFaceUp ? 0 : 180)
		}

		return () => {
			if (animRef.current) cancelAnimationFrame(animRef.current)
		}
	}, [isFlipping, isFaceUp, editor, shape.id, applyFlip])

	return (
		<HTMLContainer
			style={{
				width: w,
				height: h,
				perspective: w * 4,
			}}
		>
			<div
				ref={containerRef}
				style={{
					width: w,
					height: h,
					position: 'relative',
					transformStyle: 'preserve-3d',
					transform: `rotateY(${currentRotY.current}deg)`,
				}}
			>
				{/* Front face (visible when rotateY ~= 0 mod 360) */}
				<div
					style={{
						position: 'absolute',
						width: w,
						height: h,
						backfaceVisibility: 'hidden',
					}}
				>
					<CardFront suit={suit} rank={rank} w={w} h={h} />
				</div>
				{/* Back face (rotated 180deg, visible when rotateY ~= 180 mod 360) */}
				<div
					style={{
						position: 'absolute',
						width: w,
						height: h,
						backfaceVisibility: 'hidden',
						transform: 'rotateY(180deg)',
					}}
				>
					<CardBack w={w} h={h} />
				</div>
			</div>
		</HTMLContainer>
	)
}

// --- ShapeUtil ---

export class CardShapeUtil extends BaseBoxShapeUtil<ICardShape> {
	static override type = CARD_TYPE
	static override props: RecordProps<ICardShape> = {
		w: T.number,
		h: T.number,
		suit: T.string,
		rank: T.string,
		isFaceUp: T.boolean,
		isFlipping: T.boolean,
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

	getDefaultProps(): ICardShape['props'] {
		return {
			w: 90,
			h: 126,
			suit: 'spades',
			rank: 'A',
			isFaceUp: false,
			isFlipping: false,
		}
	}

	// Bring card to front when picked up
	override onTranslateStart(shape: ICardShape) {
		this.editor.bringToFront([shape.id])
		return undefined
	}

	// Double-click to flip
	override onDoubleClick(shape: ICardShape): TLShapePartial<ICardShape> | void {
		if (shape.props.isFlipping) return
		return {
			id: shape.id,
			type: CARD_TYPE,
			props: {
				isFaceUp: !shape.props.isFaceUp,
				isFlipping: true,
			},
		}
	}

	component(shape: ICardShape) {
		return <CardComponent shape={shape} />
	}

	indicator(shape: ICardShape) {
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
