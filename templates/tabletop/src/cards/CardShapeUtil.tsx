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

// --- Peek configuration (corner fold via clip-path) ---

const FOLD_PCT = 55

function getPeekClips(corner: string) {
	const f = FOLD_PCT
	const r = 100 - f
	switch (corner) {
		case 'top-left':
			return {
				backInit: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%)',
				backFold: `polygon(${f}% 0%, 100% 0%, 100% 100%, 0% 100%, 0% ${f}%)`,
				flapInit: 'polygon(0% 0%, 0% 0%, 0% 0%)',
				flapFold: `polygon(${f}% 0%, ${f}% ${f}%, 0% ${f}%)`,
				flapGradient: 'linear-gradient(135deg, #f0f0f0 0%, #d8d8d8 100%)',
			}
		case 'bottom-right':
			return {
				backInit: 'polygon(0% 0%, 100% 0%, 100% 100%, 100% 100%, 0% 100%)',
				backFold: `polygon(0% 0%, 100% 0%, 100% ${r}%, ${r}% 100%, 0% 100%)`,
				flapInit: 'polygon(100% 100%, 100% 100%, 100% 100%)',
				flapFold: `polygon(${r}% ${r}%, 100% ${r}%, ${r}% 100%)`,
				flapGradient: 'linear-gradient(315deg, #f0f0f0 0%, #d8d8d8 100%)',
			}
		default:
			return null
	}
}

// --- Flip animation + peek component ---

function CardComponent({ shape }: { shape: ICardShape }) {
	const editor = useEditor()
	const containerRef = useRef<HTMLDivElement>(null)
	const animRef = useRef(0)
	const isAnimating = useRef(false)
	const prevIsFlipping = useRef(false)
	// Track the visual Y rotation. 0 = face-up showing, 180 = face-down showing.
	const currentRotY = useRef(shape.props.isFaceUp ? 0 : 180)

	// Peek refs (client-side only — no shape state changes)
	const peekOverlayRef = useRef<HTMLDivElement>(null)
	const peekBackRef = useRef<HTMLDivElement>(null)
	const peekFlapRef = useRef<HTMLDivElement>(null)
	const isPeekingRef = useRef(false)
	const peekQuadrantRef = useRef<string | null>(null)

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

	// --- Peek logic (Shift+hover, client-side only) ---

	const startPeek = useCallback((quadrant: string) => {
		const clips = getPeekClips(quadrant)
		if (!clips) return
		isPeekingRef.current = true
		peekQuadrantRef.current = quadrant

		if (peekOverlayRef.current) {
			peekOverlayRef.current.style.display = 'block'
		}

		// Set initial (flat) clip paths
		if (peekBackRef.current) {
			peekBackRef.current.style.clipPath = clips.backInit
		}
		if (peekFlapRef.current) {
			peekFlapRef.current.style.clipPath = clips.flapInit
			peekFlapRef.current.style.background = clips.flapGradient
		}

		// Force reflow, then animate to folded state
		void peekBackRef.current?.offsetHeight

		if (peekBackRef.current) {
			peekBackRef.current.style.clipPath = clips.backFold
		}
		if (peekFlapRef.current) {
			peekFlapRef.current.style.clipPath = clips.flapFold
		}
	}, [])

	const stopPeek = useCallback(() => {
		isPeekingRef.current = false
		const clips = peekQuadrantRef.current ? getPeekClips(peekQuadrantRef.current) : null

		if (clips) {
			if (peekBackRef.current) {
				peekBackRef.current.style.clipPath = clips.backInit
			}
			if (peekFlapRef.current) {
				peekFlapRef.current.style.clipPath = clips.flapInit
			}
		}

		peekQuadrantRef.current = null
		setTimeout(() => {
			if (!isPeekingRef.current && peekOverlayRef.current) {
				peekOverlayRef.current.style.display = 'none'
			}
		}, 300)
	}, [])

	useEffect(() => {
		if (isFaceUp) {
			if (isPeekingRef.current) stopPeek()
			return
		}

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key !== 'Shift' || e.repeat || isPeekingRef.current) return
			if (editor.getCurrentToolId() !== 'select') return

			const pagePoint = editor.inputs.currentPagePoint
			const bounds = editor.getShapePageBounds(shape.id)
			if (!bounds) return
			if (
				pagePoint.x < bounds.x ||
				pagePoint.x > bounds.x + bounds.w ||
				pagePoint.y < bounds.y ||
				pagePoint.y > bounds.y + bounds.h
			)
				return

			const relY = (pagePoint.y - bounds.y) / bounds.h
			const quadrant = relY < 0.5 ? 'top-left' : 'bottom-right'

			startPeek(quadrant)
		}

		const handleKeyUp = (e: KeyboardEvent) => {
			if (e.key !== 'Shift') return
			if (isPeekingRef.current) stopPeek()
		}

		document.addEventListener('keydown', handleKeyDown)
		document.addEventListener('keyup', handleKeyUp)
		return () => {
			document.removeEventListener('keydown', handleKeyDown)
			document.removeEventListener('keyup', handleKeyUp)
			if (isPeekingRef.current) stopPeek()
		}
	}, [editor, shape.id, isFaceUp, startPeek, stopPeek])

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
				{/* Normal card flip container */}
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

				{/* Peek overlay — corner fold, client-side only */}
				{!isFaceUp && (
					<div
						ref={peekOverlayRef}
						style={{
							position: 'absolute',
							inset: 0,
							display: 'none',
							pointerEvents: 'none',
						}}
					>
						{/* Revealed card face */}
						<div style={{ position: 'absolute', inset: 0 }}>
							<CardFront suit={suit} rank={rank} w={w} h={h} />
						</div>
						{/* Card back with corner clipped away */}
						<div
							ref={peekBackRef}
							style={{
								position: 'absolute',
								inset: 0,
								transition: 'clip-path 0.25s ease-out',
							}}
						>
							<CardBack w={w} h={h} />
						</div>
						{/* Fold flap (paper underside) */}
						<div
							ref={peekFlapRef}
							style={{
								position: 'absolute',
								inset: 0,
								transition: 'clip-path 0.25s ease-out',
								filter: 'drop-shadow(1px 1px 4px rgba(0,0,0,0.25))',
							}}
						/>
					</div>
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
