import { useCallback, useEffect, useRef, useState } from 'react'
import {
	BaseBoxShapeUtil,
	HTMLContainer,
	RecordProps,
	T,
	TLShape,
	TLShapePartial,
	useEditor,
	useSharedSafeId,
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
	const fontSize = Math.max(10, h * 0.1)
	const symbolFontSize = Math.max(14, h * 0.2)

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
	const borderRadius = w * 0.06
	const whiteMargin = Math.max(6, w * 0.04)
	const blueRadius = borderRadius * 0.6
	const frameInset = Math.max(5, w * 0.03)
	const frameGap = Math.max(3, w * 0.02)
	const fine = Math.max(3, w * 0.016)
	const coarse = Math.max(8, w * 0.047)

	const pattern = [
		`repeating-linear-gradient(45deg, transparent, transparent ${fine}px, rgba(255,255,255,0.05) ${fine}px, rgba(255,255,255,0.05) ${fine + 0.5}px)`,
		`repeating-linear-gradient(-45deg, transparent, transparent ${fine}px, rgba(255,255,255,0.05) ${fine}px, rgba(255,255,255,0.05) ${fine + 0.5}px)`,
		`repeating-linear-gradient(45deg, transparent, transparent ${coarse}px, rgba(255,255,255,0.09) ${coarse}px, rgba(255,255,255,0.09) ${coarse + 1}px)`,
		`repeating-linear-gradient(-45deg, transparent, transparent ${coarse}px, rgba(255,255,255,0.09) ${coarse}px, rgba(255,255,255,0.09) ${coarse + 1}px)`,
		'radial-gradient(ellipse 45% 38% at 50% 50%, rgba(255,255,255,0.12) 0%, transparent 70%)',
	].join(', ')

	return (
		<div
			style={{
				width: w,
				height: h,
				background: '#fafafa',
				borderRadius,
				border: '1px solid #d4d4d4',
				boxSizing: 'border-box',
				position: 'relative',
				overflow: 'hidden',
			}}
		>
			{/* Blue field */}
			<div
				style={{
					position: 'absolute',
					top: whiteMargin,
					left: whiteMargin,
					right: whiteMargin,
					bottom: whiteMargin,
					background: '#1a4d8f',
					borderRadius: blueRadius,
					overflow: 'hidden',
				}}
			>
				{/* Outer decorative frame */}
				<div
					style={{
						position: 'absolute',
						inset: frameInset,
						border: '2px solid rgba(255,255,255,0.7)',
						borderRadius: blueRadius * 0.6,
					}}
				>
					{/* Inner decorative frame */}
					<div
						style={{
							position: 'absolute',
							inset: frameGap,
							border: '1px solid rgba(255,255,255,0.4)',
							borderRadius: blueRadius * 0.4,
							overflow: 'hidden',
						}}
					>
						{/* Diamond lattice pattern */}
						<div style={{ position: 'absolute', inset: 0, background: pattern }} />
						{/* Central medallion */}
						<div
							style={{
								position: 'absolute',
								left: '50%',
								top: '50%',
								transform: 'translate(-50%, -50%)',
								width: w * 0.22,
								height: w * 0.22,
								borderRadius: '50%',
								border: '2px solid rgba(255,255,255,0.5)',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
							}}
						>
							<div
								style={{
									width: w * 0.14,
									height: w * 0.14,
									borderRadius: '50%',
									border: '1.5px solid rgba(255,255,255,0.35)',
									background: 'rgba(255,255,255,0.06)',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									fontSize: w * 0.06,
									color: 'rgba(255,255,255,0.4)',
								}}
							>
								{'\u2660'}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

// --- Peek geometry ---
// The bottom-right corner of the card folds up to reveal the face value.

const FOLD_PCT = 30 // how far up the right edge (%) the fold line reaches

function computePeekGeometry(w: number, h: number) {
	const fh = (FOLD_PCT * h) / 100
	const D = w * w + fh * fh
	const cos2t = (w * w - fh * fh) / D
	const sin2t = (-2 * w * fh) / D

	function reflect(px: number, py: number, e: number, f: number) {
		return {
			x: cos2t * px + sin2t * py + e,
			y: sin2t * px + -cos2t * py + f,
		}
	}

	// Fold line: (0, h) → (w, h-fh). Pivot: (0, h)
	const e = (2 * w * fh * h) / D
	const f = (2 * h * w * w) / D
	const apex = reflect(w, h, e, f)
	const textPos = reflect(w * 0.88, h * 0.92, e, f)
	const textAngle = -45
	return {
		foldLine: `0,${h} ${w},${h - fh}`,
		reflectedTriangle: `0,${h} ${w},${h - fh} ${apex.x},${apex.y}`,
		remainingRegion: `0,0 ${w},0 ${w},${h - fh} 0,${h}`,
		textPos,
		foldAngle: textAngle,
	}
}

// --- Flip animation + peek component ---

function CardComponent({ shape }: { shape: ICardShape }) {
	const editor = useEditor()
	const containerRef = useRef<HTMLDivElement>(null)
	const animRef = useRef(0)
	const isAnimating = useRef(false)
	const prevIsFlipping = useRef(false)
	const currentRotY = useRef(shape.props.isFaceUp ? 0 : 180)
	const isPeekingRef = useRef(false)
	const [isPeeking, setIsPeeking] = useState(false)

	const { w, h, suit, rank, isFaceUp, isFlipping } = shape.props

	// --- Flip logic ---

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
			const endRot = isFaceUp ? startRot - 180 : startRot + 180
			const duration = 400
			const startTime = performance.now()

			const animate = (time: number) => {
				const elapsed = time - startTime
				const t = Math.min(elapsed / duration, 1)
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

	// --- Peek logic (Shift key, client-side only) ---

	useEffect(() => {
		if (isFaceUp) {
			if (isPeekingRef.current) {
				isPeekingRef.current = false
				setIsPeeking(false)
			}
			return
		}

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key !== 'Shift' || e.repeat || isPeekingRef.current) return
			if (editor.getCurrentToolId() !== 'select') return
			if (!editor.getSelectedShapeIds().includes(shape.id)) return

			isPeekingRef.current = true
			setIsPeeking(true)
		}

		const handleKeyUp = (e: KeyboardEvent) => {
			if (e.key !== 'Shift') return
			isPeekingRef.current = false
			setIsPeeking(false)
		}

		document.addEventListener('keydown', handleKeyDown)
		document.addEventListener('keyup', handleKeyUp)
		return () => {
			document.removeEventListener('keydown', handleKeyDown)
			document.removeEventListener('keyup', handleKeyUp)
			if (isPeekingRef.current) {
				isPeekingRef.current = false
				setIsPeeking(false)
			}
		}
	}, [editor, shape.id, isFaceUp])

	const peek = isPeeking ? computePeekGeometry(w, h) : null
	const clipId = shape.id.replace(/[^a-zA-Z0-9]/g, '_')
	const r = w * 0.06

	const clipPathId1 = useSharedSafeId(`remaining-${clipId}`)
	const clipPathId2 = useSharedSafeId(`reflected-${clipId}`)
	const clipPathId3 = useSharedSafeId(`shadow-${clipId}`)
	const clipPathId4 = useSharedSafeId(`card-bounds-${clipId}`)

	return (
		<HTMLContainer style={{ width: w, height: h }}>
			<div
				style={{
					width: w,
					height: h,
					position: 'relative',
					perspective: w * 4,
				}}
			>
				{/* Normal card with CSS 3D flip */}
				<div
					ref={containerRef}
					style={{
						width: w,
						height: h,
						position: 'relative',
						transformStyle: 'preserve-3d',
						transform: `rotateY(${currentRotY.current}deg)`,
						visibility: peek ? 'hidden' : 'visible',
					}}
				>
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

				{/* Peek overlay — SVG with three clipped groups */}
				{peek && (
					<svg
						width={w}
						height={h}
						style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
					>
						<defs>
							<clipPath id={clipPathId4}>
								<rect width={w} height={h} rx={r} ry={r} />
							</clipPath>
							<clipPath id={clipPathId1}>
								<polygon points={peek.remainingRegion} />
							</clipPath>
							<clipPath id={clipPathId2}>
								<polygon points={peek.reflectedTriangle} />
							</clipPath>
							<filter id={clipPathId3}>
								<feDropShadow dx="1" dy="2" stdDeviation="3" floodOpacity="0.3" />
							</filter>
						</defs>

						{/* Clip everything to the card's rounded rect */}
						<g clipPath={`url(#${clipPathId4})`}>
							{/* Remaining card back (B + other triangle) */}
							<g clipPath={`url(#${clipPathId1})`}>
								<foreignObject width={w} height={h}>
									<CardBack w={w} h={h} />
								</foreignObject>
							</g>

							{/* Reflected triangle flap — white with rank/suit at reflected position */}
							<g clipPath={`url(#${clipPathId2})`} filter={`url(#${clipPathId3})`}>
								<polygon
									points={peek.reflectedTriangle}
									fill="white"
									stroke="#ddd"
									strokeWidth={0.5}
								/>
								<g
									transform={`rotate(${peek.foldAngle}, ${peek.textPos.x}, ${peek.textPos.y + h * 0.045})`}
								>
									<text
										x={peek.textPos.x}
										y={peek.textPos.y}
										textAnchor="middle"
										dominantBaseline="central"
										fontSize={Math.max(14, h * 0.09)}
										fontWeight={700}
										fontFamily="Inter, system-ui, sans-serif"
										fill={SUIT_COLORS[suit as Suit] || '#1a1a1a'}
									>
										{rank}
									</text>
									<text
										x={peek.textPos.x}
										y={peek.textPos.y + h * 0.09}
										textAnchor="middle"
										dominantBaseline="central"
										fontSize={Math.max(16, h * 0.11)}
										fontFamily="Inter, system-ui, sans-serif"
										fill={SUIT_COLORS[suit as Suit] || '#1a1a1a'}
									>
										{SUIT_SYMBOLS[suit as Suit] || '\u2660'}
									</text>
								</g>
							</g>

							{/* Fold crease line */}
							<polyline
								points={peek.foldLine}
								fill="none"
								stroke="rgba(0,0,0,0.12)"
								strokeWidth={1}
							/>
						</g>
					</svg>
				)}
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
			w: 256,
			h: 356,
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
