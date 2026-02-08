import { useEffect, useRef } from 'react'
import {
	BaseBoxShapeUtil,
	Circle2d,
	DefaultColorStyle,
	HTMLContainer,
	RecordProps,
	T,
	TLDefaultColorStyle,
	TLShape,
	TLShapePartial,
	useEditor,
	useIsDarkMode,
	useQuickReactor,
} from 'tldraw'
import {
	DEG_TO_RAD,
	LIGHT_DIR,
	MAX_SHADOW,
	ShakeState,
	computePerspective,
	convexHull,
	createShakeState,
	getBorderColor,
	getFaceColor,
	getTextColor,
	rotateVert2,
	updateShakeState,
} from './shared'

// --- Shape type ---

export const DICE_TYPE = 'tabletop-dice' as const

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[DICE_TYPE]: {
			w: number
			h: number
			value: number
			isRolling: boolean
			color: TLDefaultColorStyle
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
 * Face definitions for CSS 3D positioning. Each face is an SVG element
 * positioned via CSS transforms with `backface-visibility: hidden`.
 * The browser handles perspective projection, so circles on angled
 * faces are naturally foreshortened into ellipses.
 *
 * Standard die: opposite faces sum to 7.
 */
const FACE_DATA = [
	{ value: 1, normal: [0, 0, 1] as const, transform: (h: number) => `translateZ(${h}px)` },
	{
		value: 6,
		normal: [0, 0, -1] as const,
		transform: (h: number) => `rotateY(180deg) translateZ(${h}px)`,
	},
	{
		value: 2,
		normal: [1, 0, 0] as const,
		transform: (h: number) => `rotateY(90deg) translateZ(${h}px)`,
	},
	{
		value: 5,
		normal: [-1, 0, 0] as const,
		transform: (h: number) => `rotateY(-90deg) translateZ(${h}px)`,
	},
	{
		value: 3,
		normal: [0, 1, 0] as const,
		transform: (h: number) => `rotateX(-90deg) translateZ(${h}px)`,
	},
	{
		value: 4,
		normal: [0, -1, 0] as const,
		transform: (h: number) => `rotateX(90deg) translateZ(${h}px)`,
	},
]

/**
 * Pip patterns for each face as a 3x3 grid (row-major).
 * Grid: [0][1][2] / [3][4][5] / [6][7][8]
 */
const PIP_PATTERNS: Record<number, number[]> = {
	1: [0, 0, 0, 0, 1, 0, 0, 0, 0],
	2: [0, 0, 1, 0, 0, 0, 1, 0, 0],
	3: [0, 0, 1, 0, 1, 0, 1, 0, 0],
	4: [1, 0, 1, 0, 0, 0, 1, 0, 1],
	5: [1, 0, 1, 0, 1, 0, 1, 0, 1],
	6: [1, 0, 1, 1, 0, 1, 1, 0, 1],
}

/** Pip grid center positions as fraction of face size (~15% padding). */
const PIP_POS = [0.267, 0.5, 0.733]

/** Unit cube vertices (±1 on each axis). */
const CUBE_VERTS: [number, number, number][] = [
	[-1, -1, -1],
	[1, -1, -1],
	[1, 1, -1],
	[-1, 1, -1],
	[-1, -1, 1],
	[1, -1, 1],
	[1, 1, 1],
	[-1, 1, 1],
]

/** Get the perspective-projected 2D convex hull outline of the cube at a given rotation. */
function getCubeOutlineFromRotation(
	rotX: number,
	rotY: number,
	size: number,
	pox: number,
	poy: number,
	pd: number
): string {
	const half = size / 2
	const rxR = rotX * DEG_TO_RAD
	const ryR = rotY * DEG_TO_RAD
	const cosRx = Math.cos(rxR),
		sinRx = Math.sin(rxR)
	const cosRy = Math.cos(ryR),
		sinRy = Math.sin(ryR)

	const projected: [number, number][] = CUBE_VERTS.map(([vx, vy, vz]) => {
		const [rx, ry, rz] = rotateVert2(vx, vy, vz, cosRx, sinRx, cosRy, sinRy)
		const cx = rx * half + half
		const cy = ry * half + half
		const cz = rz * half
		const scale = pd / (pd - cz)
		return [pox + (cx - pox) * scale, poy + (cy - poy) * scale] as [number, number]
	})

	const hull = convexHull(projected)
	return hull.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join('') + 'Z'
}

// --- Component ---

function DiceComponent({ shape }: { shape: IDiceShape }) {
	const editor = useEditor()
	const containerRef = useRef<HTMLDivElement>(null)
	const cubeRef = useRef<HTMLDivElement>(null)
	const overlayRefs = useRef<(SVGRectElement | null)[]>([])
	const outlineRef = useRef<SVGPathElement>(null)
	const animRef = useRef(0)
	const currentRotation = useRef({ x: 0, y: 0 })
	const perspectiveRef = useRef({ ox: 0, oy: 0, d: 1000 })
	const isAnimating = useRef(false)
	const prevIsRolling = useRef(false)

	const size = shape.props.w
	const half = size / 2
	const isDarkMode = useIsDarkMode()
	const faceColor = getFaceColor(shape.props.color, isDarkMode)
	const borderColor = getBorderColor(shape.props.color, isDarkMode)
	const pipColor = getTextColor(shape.props.color, isDarkMode)
	const pipR = Math.max(2, size * 0.08)

	// Shared vanishing point based on viewport center
	useQuickReactor(
		'dice perspective',
		() => {
			const elm = containerRef.current
			if (!elm) return

			const { ox, oy, d } = computePerspective(editor, shape.id, half)
			elm.style.perspectiveOrigin = `${ox}px ${oy}px`
			elm.style.perspective = `${d}px`

			perspectiveRef.current = { ox, oy, d }

			const outlineElm = outlineRef.current
			if (outlineElm) {
				const { x: rx, y: ry } = currentRotation.current
				outlineElm.setAttribute('d', getCubeOutlineFromRotation(rx, ry, size, ox, oy, d))
			}
		},
		[editor, half, shape.props.value, size]
	)

	useEffect(() => {
		const cubeElm = cubeRef.current
		if (!cubeElm) return

		const updateCube = (rx: number, ry: number) => {
			currentRotation.current = { x: rx, y: ry }
			const util = editor.getShapeUtil<DiceShapeUtil>(DICE_TYPE)
			util.rotations.set(shape.id, { x: rx, y: ry })
			cubeElm.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`

			// Per-face lighting
			const rxR = rx * DEG_TO_RAD
			const ryR = ry * DEG_TO_RAD
			const cosRx = Math.cos(rxR),
				sinRx = Math.sin(rxR)
			const cosRy = Math.cos(ryR),
				sinRy = Math.sin(ryR)

			for (let i = 0; i < FACE_DATA.length; i++) {
				const overlay = overlayRefs.current[i]
				if (!overlay) continue
				const [nx, ny, nz] = FACE_DATA[i].normal
				// RY then RX
				const x1 = nx * cosRy + nz * sinRy
				const y1 = ny
				const z1 = -nx * sinRy + nz * cosRy
				const y2 = y1 * cosRx - z1 * sinRx
				const z2 = y1 * sinRx + z1 * cosRx
				const dot = x1 * LIGHT_DIR[0] + y2 * LIGHT_DIR[1] + z2 * LIGHT_DIR[2]
				overlay.style.opacity = String((1 - Math.max(0, dot)) * MAX_SHADOW)
			}

			// Update outline and indicator to match current rotation
			const { ox, oy, d } = perspectiveRef.current
			const path = getCubeOutlineFromRotation(rx, ry, size, ox, oy, d)
			const outlineElm = outlineRef.current
			if (outlineElm) {
				outlineElm.setAttribute('d', path)
			}
			const indicatorElm = util.indicatorPaths.get(shape.id)
			if (indicatorElm) {
				indicatorElm.setAttribute('d', path)
			}
		}

		// Detect transition from not-rolling to rolling
		if (shape.props.isRolling && !prevIsRolling.current) {
			prevIsRolling.current = true
			isAnimating.current = true

			const target = FACE_ROTATIONS[shape.props.value] || FACE_ROTATIONS[1]
			const startX = currentRotation.current.x
			const startY = currentRotation.current.y

			const spinsX = (1 + Math.floor(Math.random() * 2)) * 360
			const spinsY = (1 + Math.floor(Math.random() * 2)) * 360
			const dirX = Math.random() > 0.5 ? 1 : -1
			const dirY = Math.random() > 0.5 ? 1 : -1

			const jitterX = (Math.random() - 0.5) * 6
			const jitterY = (Math.random() - 0.5) * 6
			const util = editor.getShapeUtil<DiceShapeUtil>(DICE_TYPE)
			util.jitters.set(shape.id, { x: jitterX, y: jitterY })

			const endX = target.x + jitterX + spinsX * dirX
			const endY = target.y + jitterY + spinsY * dirY
			const duration = 1200 + Math.random() * 600
			const startTime = performance.now()

			const animate = (time: number) => {
				const elapsed = time - startTime
				const t = Math.min(elapsed / duration, 1)
				const eased = 1 - Math.pow(1 - t, 4)

				updateCube(startX + (endX - startX) * eased, startY + (endY - startY) * eased)

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
			prevIsRolling.current = false
			const target = FACE_ROTATIONS[shape.props.value] || FACE_ROTATIONS[1]
			const util = editor.getShapeUtil<DiceShapeUtil>(DICE_TYPE)
			const jitter = util.jitters.get(shape.id) ?? { x: 0, y: 0 }
			updateCube(target.x + jitter.x, target.y + jitter.y)
		}

		return () => {
			if (animRef.current) {
				cancelAnimationFrame(animRef.current)
				isAnimating.current = false
			}
		}
	}, [shape.props.isRolling, shape.props.value, editor, shape.id, size])

	return (
		<HTMLContainer style={{ width: size, height: size }}>
			<div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
				<div
					ref={cubeRef}
					style={{
						width: size,
						height: size,
						position: 'relative',
						transformStyle: 'preserve-3d',
					}}
				>
					{FACE_DATA.map(({ value, transform }, i) => {
						const pips = PIP_PATTERNS[value] || PIP_PATTERNS[1]
						return (
							<svg
								key={value}
								viewBox={`0 0 ${size} ${size}`}
								width={size}
								height={size}
								style={{
									position: 'absolute',
									backfaceVisibility: 'hidden',
									transform: transform(half),
								}}
							>
								<rect width={size} height={size} fill={faceColor} />
								{pips.map((hasPip, pi) =>
									hasPip ? (
										<circle
											key={pi}
											cx={PIP_POS[pi % 3] * size}
											cy={PIP_POS[Math.floor(pi / 3)] * size}
											r={pipR}
											fill={pipColor}
										/>
									) : null
								)}
								<rect
									ref={(el) => {
										overlayRefs.current[i] = el
									}}
									width={size}
									height={size}
									fill="black"
									opacity={0}
									style={{ pointerEvents: 'none' }}
								/>
							</svg>
						)
					})}
				</div>
				<svg
					width={size}
					height={size}
					style={{
						position: 'absolute',
						top: 0,
						left: 0,
						overflow: 'visible',
						pointerEvents: 'none',
					}}
				>
					<path
						ref={outlineRef}
						fill="none"
						stroke={borderColor}
						strokeWidth={2}
						strokeLinejoin="round"
					/>
				</svg>
			</div>
		</HTMLContainer>
	)
}

function DiceIndicator({ shape }: { shape: IDiceShape }) {
	const editor = useEditor()
	const pathRef = useRef<SVGPathElement>(null)

	useEffect(() => {
		const el = pathRef.current
		if (!el) return
		const util = editor.getShapeUtil<DiceShapeUtil>(DICE_TYPE)
		util.indicatorPaths.set(shape.id, el)
		return () => {
			util.indicatorPaths.delete(shape.id)
		}
	}, [editor, shape.id])

	useQuickReactor(
		'dice indicator',
		() => {
			const el = pathRef.current
			if (!el) return

			const { ox, oy, d } = computePerspective(editor, shape.id, shape.props.w / 2)

			const util = editor.getShapeUtil<DiceShapeUtil>(DICE_TYPE)
			const rot =
				util.rotations.get(shape.id) ?? FACE_ROTATIONS[shape.props.value] ?? FACE_ROTATIONS[1]

			el.setAttribute('d', getCubeOutlineFromRotation(rot.x, rot.y, shape.props.w, ox, oy, d))
		},
		[editor, shape.id, shape.props.value, shape.props.w]
	)

	return <path ref={pathRef} />
}

// --- ShapeUtil ---

export class DiceShapeUtil extends BaseBoxShapeUtil<IDiceShape> {
	static override type = DICE_TYPE
	static override props: RecordProps<IDiceShape> = {
		w: T.number,
		h: T.number,
		value: T.number,
		isRolling: T.boolean,
		color: DefaultColorStyle,
	}

	override hideSelectionBoundsBg() {
		return true
	}

	override hideSelectionBoundsFg() {
		return true
	}

	private shakeStates = new Map<string, ShakeState>()
	rotations = new Map<string, { x: number; y: number }>()
	jitters = new Map<string, { x: number; y: number }>()
	indicatorPaths = new Map<string, SVGPathElement>()

	override getGeometry(shape: IDiceShape) {
		return new Circle2d({
			radius: shape.props.w * 0.6,
			x: -shape.props.w * 0.1,
			y: -shape.props.w * 0.1,
			isFilled: true,
		})
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

	getDefaultProps(): IDiceShape['props'] {
		return {
			w: 100,
			h: 100,
			value: Math.floor(Math.random() * 6) + 1,
			isRolling: false,
			color: 'black',
		}
	}

	// --- Shake detection ---

	override onTranslateStart(shape: IDiceShape) {
		this.shakeStates.set(shape.id, createShakeState())
		if (shape.props.isRolling) {
			return {
				id: shape.id,
				type: DICE_TYPE,
				props: { isRolling: false },
			}
		}
		return undefined
	}

	override onTranslate(
		_initial: IDiceShape,
		current: IDiceShape
	): TLShapePartial<IDiceShape> | void {
		const state = this.shakeStates.get(current.id)
		if (!state || state.hasRolled || current.props.isRolling) return

		const velocity = this.editor.inputs.getPointerVelocity()
		const shouldRoll = updateShakeState(state, velocity)

		if (shouldRoll) {
			state.hasRolled = true
			return {
				id: current.id,
				type: DICE_TYPE,
				props: { isRolling: true, value: Math.floor(Math.random() * 6) + 1 },
			}
		}

		return undefined
	}

	override onTranslateEnd(
		_initial: IDiceShape,
		current: IDiceShape
	): TLShapePartial<IDiceShape> | void {
		this.shakeStates.delete(current.id)
	}

	// --- Double-click to roll ---

	override onDoubleClick(shape: IDiceShape): TLShapePartial<IDiceShape> | void {
		if (shape.props.isRolling) return

		return {
			id: shape.id,
			type: DICE_TYPE,
			props: {
				isRolling: true,
				value: Math.floor(Math.random() * 6) + 1,
			},
		}
	}

	// --- Rendering ---

	component(shape: IDiceShape) {
		return <DiceComponent shape={shape} />
	}

	indicator(shape: IDiceShape) {
		return <DiceIndicator shape={shape} />
	}
}
