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

// --- Shape type ---

export const DICE_TYPE = 'tabletop-dice' as const

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[DICE_TYPE]: {
			w: number
			h: number
			value: number
			isRolling: boolean
		}
	}
}

type IDiceShape = TLShape<typeof DICE_TYPE>

// --- Constants ---

/** Cube rotation (degrees) to bring each face value toward the viewer. */
const FACE_ROTATIONS: Record<number, { x: number; y: number }> = {
	1: { x: 0, y: 0 },
	2: { x: 0, y: -90 },
	3: { x: 90, y: 0 },
	4: { x: -90, y: 0 },
	5: { x: 0, y: 90 },
	6: { x: 0, y: 180 },
}

/**
 * How each face is placed on the cube. The transform positions each face
 * in 3D space around the cube center, then translateZ pushes it outward.
 *
 * Standard die layout: opposite faces sum to 7.
 *   Front=1, Back=6, Right=2, Left=5, Top=3, Bottom=4
 */
const FACE_PLACEMENTS = [
	{ value: 1, transform: (h: number) => `translateZ(${h}px)` },
	{ value: 6, transform: (h: number) => `rotateY(180deg) translateZ(${h}px)` },
	{ value: 2, transform: (h: number) => `rotateY(90deg) translateZ(${h}px)` },
	{ value: 5, transform: (h: number) => `rotateY(-90deg) translateZ(${h}px)` },
	{ value: 3, transform: (h: number) => `rotateX(-90deg) translateZ(${h}px)` },
	{ value: 4, transform: (h: number) => `rotateX(90deg) translateZ(${h}px)` },
]

/**
 * Pip patterns for each face as a 3x3 grid (row-major order).
 * true = show pip at that grid position, false = empty.
 *
 * Grid positions:
 *   [0][1][2]
 *   [3][4][5]
 *   [6][7][8]
 */
const PIP_PATTERNS: Record<number, boolean[]> = {
	1: [false, false, false, false, true, false, false, false, false],
	2: [false, false, true, false, false, false, true, false, false],
	3: [false, false, true, false, true, false, true, false, false],
	4: [true, false, true, false, false, false, true, false, true],
	5: [true, false, true, false, true, false, true, false, true],
	6: [true, false, true, true, false, true, true, false, true],
}

// --- Shake detection ---

interface ShakeState {
	directionChanges: number
	lastVelocityX: number
	lastVelocityY: number
	lastChangeTime: number
	shakeTriggered: boolean
}

// --- Components ---

function DiceFace({ value, size }: { value: number; size: number }) {
	const pips = PIP_PATTERNS[value] || PIP_PATTERNS[1]
	const pipSize = Math.max(4, size * 0.16)

	return (
		<div
			style={{
				display: 'grid',
				gridTemplateColumns: '1fr 1fr 1fr',
				gridTemplateRows: '1fr 1fr 1fr',
				width: '100%',
				height: '100%',
				padding: '15%',
				boxSizing: 'border-box',
			}}
		>
			{pips.map((hasPip, i) => (
				<div
					key={i}
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
					}}
				>
					{hasPip && (
						<div
							style={{
								width: pipSize,
								height: pipSize,
								borderRadius: '50%',
								backgroundColor: '#2b2b2b',
							}}
						/>
					)}
				</div>
			))}
		</div>
	)
}

function DiceComponent({ shape }: { shape: IDiceShape }) {
	const editor = useEditor()
	const cubeRef = useRef<HTMLDivElement>(null)
	const animRef = useRef(0)
	const currentRotation = useRef({ x: 0, y: 0 })
	const isAnimating = useRef(false)
	const prevIsRolling = useRef(false)

	const size = shape.props.w
	const half = size / 2

	const applyRotation = useCallback((x: number, y: number) => {
		currentRotation.current = { x, y }
		if (cubeRef.current) {
			cubeRef.current.style.transform = `rotateX(${x}deg) rotateY(${y}deg)`
		}
	}, [])

	useEffect(() => {
		// Detect transition from not-rolling to rolling
		if (shape.props.isRolling && !prevIsRolling.current) {
			prevIsRolling.current = true
			isAnimating.current = true

			const target = FACE_ROTATIONS[shape.props.value] || FACE_ROTATIONS[1]
			const startX = currentRotation.current.x
			const startY = currentRotation.current.y

			// Add extra full rotations for a satisfying spin effect
			const spinsX = (2 + Math.random() * 3) * 360
			const spinsY = (2 + Math.random() * 3) * 360
			const dirX = Math.random() > 0.5 ? 1 : -1
			const dirY = Math.random() > 0.5 ? 1 : -1

			const endX = target.x + spinsX * dirX
			const endY = target.y + spinsY * dirY
			const duration = 1200 + Math.random() * 600
			const startTime = performance.now()

			const animate = (time: number) => {
				const elapsed = time - startTime
				const t = Math.min(elapsed / duration, 1)
				// Ease-out quartic for natural deceleration
				const eased = 1 - Math.pow(1 - t, 4)

				applyRotation(startX + (endX - startX) * eased, startY + (endY - startY) * eased)

				if (t < 1) {
					animRef.current = requestAnimationFrame(animate)
				} else {
					isAnimating.current = false
					prevIsRolling.current = false
					editor.updateShape<IDiceShape>({
						id: shape.id,
						type: DICE_TYPE,
						props: { isRolling: false },
					})
				}
			}

			animRef.current = requestAnimationFrame(animate)
		} else if (!shape.props.isRolling && !isAnimating.current) {
			// Static display: show the correct face
			prevIsRolling.current = false
			const target = FACE_ROTATIONS[shape.props.value] || FACE_ROTATIONS[1]
			applyRotation(target.x, target.y)
		}

		return () => {
			if (animRef.current) cancelAnimationFrame(animRef.current)
		}
	}, [shape.props.isRolling, shape.props.value, editor, shape.id, applyRotation])

	const borderWidth = Math.max(1, size * 0.02)
	const borderRadius = size * 0.16

	const faceStyle: React.CSSProperties = {
		position: 'absolute',
		width: size,
		height: size,
		borderRadius,
		background: '#fefefe',
		border: `${borderWidth}px solid #c0c0c0`,
		boxShadow: 'inset 0 0 10px rgba(0,0,0,0.06)',
		backfaceVisibility: 'hidden',
		boxSizing: 'border-box',
	}

	return (
		<HTMLContainer
			style={{
				width: size,
				height: size,
				perspective: size * 3,
			}}
		>
			<div
				ref={cubeRef}
				style={{
					width: size,
					height: size,
					position: 'relative',
					transformStyle: 'preserve-3d',
					transform: `rotateX(${currentRotation.current.x}deg) rotateY(${currentRotation.current.y}deg)`,
				}}
			>
				{FACE_PLACEMENTS.map(({ value, transform }) => (
					<div key={value} style={{ ...faceStyle, transform: transform(half) }}>
						<DiceFace value={value} size={size} />
					</div>
				))}
			</div>
		</HTMLContainer>
	)
}

// --- ShapeUtil ---

export class DiceShapeUtil extends BaseBoxShapeUtil<IDiceShape> {
	static override type = DICE_TYPE
	static override props: RecordProps<IDiceShape> = {
		w: T.number,
		h: T.number,
		value: T.number,
		isRolling: T.boolean,
	}

	private shakeStates = new Map<string, ShakeState>()

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

	getDefaultProps(): IDiceShape['props'] {
		return {
			w: 100,
			h: 100,
			value: Math.ceil(Math.random() * 6),
			isRolling: false,
		}
	}

	// --- Shake detection ---
	// Tracks rapid direction reversals in pointer velocity during translation.
	// When the user "shakes" a die back and forth quickly, we detect the
	// velocity sign changes and trigger a roll once we see enough of them.

	override onTranslateStart(shape: IDiceShape) {
		if (shape.props.isRolling) return
		this.shakeStates.set(shape.id, {
			directionChanges: 0,
			lastVelocityX: 0,
			lastVelocityY: 0,
			lastChangeTime: Date.now(),
			shakeTriggered: false,
		})
		return undefined
	}

	override onTranslate(
		_initial: IDiceShape,
		current: IDiceShape
	): TLShapePartial<IDiceShape> | void {
		const state = this.shakeStates.get(current.id)
		if (!state || state.shakeTriggered || current.props.isRolling) return

		const velocity = this.editor.inputs.getPointerVelocity()
		const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y)
		const now = Date.now()

		if (speed > 0.3) {
			// Detect X-axis direction reversal
			if (
				state.lastVelocityX !== 0 &&
				velocity.x !== 0 &&
				Math.sign(velocity.x) !== Math.sign(state.lastVelocityX) &&
				Math.abs(velocity.x) > 0.15
			) {
				state.directionChanges++
				state.lastChangeTime = now
			}

			// Detect Y-axis direction reversal
			if (
				state.lastVelocityY !== 0 &&
				velocity.y !== 0 &&
				Math.sign(velocity.y) !== Math.sign(state.lastVelocityY) &&
				Math.abs(velocity.y) > 0.15
			) {
				state.directionChanges++
				state.lastChangeTime = now
			}

			if (velocity.x !== 0) state.lastVelocityX = velocity.x
			if (velocity.y !== 0) state.lastVelocityY = velocity.y
		}

		// Decay accumulated shakes if too much time passes between direction changes
		if (now - state.lastChangeTime > 500) {
			state.directionChanges = Math.max(0, state.directionChanges - 1)
			state.lastChangeTime = now
		}

		// Trigger a roll after enough direction reversals
		if (state.directionChanges >= 4) {
			state.shakeTriggered = true
		}

		return undefined
	}

	override onTranslateEnd(
		_initial: IDiceShape,
		current: IDiceShape
	): TLShapePartial<IDiceShape> | void {
		const state = this.shakeStates.get(current.id)
		this.shakeStates.delete(current.id)

		if (state?.shakeTriggered) {
			return {
				id: current.id,
				type: DICE_TYPE,
				props: {
					isRolling: true,
					value: Math.ceil(Math.random() * 6),
				},
			}
		}

		return undefined
	}

	// --- Double-click to roll ---

	override onDoubleClick(shape: IDiceShape): TLShapePartial<IDiceShape> | void {
		if (shape.props.isRolling) return

		return {
			id: shape.id,
			type: DICE_TYPE,
			props: {
				isRolling: true,
				value: Math.ceil(Math.random() * 6),
			},
		}
	}

	// --- Rendering ---

	component(shape: IDiceShape) {
		return <DiceComponent shape={shape} />
	}

	indicator(shape: IDiceShape) {
		return (
			<rect
				width={shape.props.w}
				height={shape.props.h}
				rx={shape.props.w * 0.16}
				ry={shape.props.h * 0.16}
			/>
		)
	}
}
