import { useEffect, useRef } from 'react'
import {
	BaseBoxShapeUtil,
	Circle2d,
	DefaultColorStyle,
	HTMLContainer,
	Mat,
	RecordProps,
	T,
	TLDefaultColorStyle,
	TLShape,
	TLShapePartial,
	Vec,
	getColorValue,
	getDefaultColorTheme,
	useEditor,
	useIsDarkMode,
	useQuickReactor,
} from 'tldraw'

// --- Shape type ---

function getFaceColor(color: TLDefaultColorStyle, isDarkMode: boolean) {
	const theme = getDefaultColorTheme({ isDarkMode })
	if (color === 'black') {
		return theme.white.solid
	}
	return getColorValue(theme, color, 'solid')
}

function getPipColor(color: TLDefaultColorStyle, isDarkMode: boolean) {
	const theme = getDefaultColorTheme({ isDarkMode })
	if (color === 'black') {
		return theme.black.solid
	}
	return theme.white.solid
}

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

const DEG_TO_RAD = Math.PI / 180

/** Light direction (toward source): from above and slightly toward the viewer. */
const LIGHT_DIR: [number, number, number] = [0, -0.6, 0.8]
const MAX_SHADOW = 0.4

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
const PIP_PATTERNS: Record<number, boolean[]> = {
	1: [false, false, false, false, true, false, false, false, false],
	2: [false, false, true, false, false, false, true, false, false],
	3: [false, false, true, false, true, false, true, false, false],
	4: [true, false, true, false, false, false, true, false, true],
	5: [true, false, true, false, true, false, true, false, true],
	6: [true, false, true, true, false, true, true, false, true],
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

/** Rotate a point by RY then RX (matching the cube's CSS transform order). */
function rotateVert(
	x: number,
	y: number,
	z: number,
	cosRx: number,
	sinRx: number,
	cosRy: number,
	sinRy: number
): [number, number, number] {
	// RY
	const x1 = x * cosRy + z * sinRy
	const z1 = -x * sinRy + z * cosRy
	// RX
	const y2 = y * cosRx - z1 * sinRx
	const z2 = y * sinRx + z1 * cosRx
	return [x1, y2, z2]
}

/** Convex hull of 2D points (Andrew's monotone chain). Returns CW polygon. */
function convexHull(points: [number, number][]): [number, number][] {
	const pts = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1])
	if (pts.length <= 1) return pts
	const cross = (o: [number, number], a: [number, number], b: [number, number]) =>
		(a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
	const lower: [number, number][] = []
	for (const p of pts) {
		while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
			lower.pop()
		lower.push(p)
	}
	const upper: [number, number][] = []
	for (let i = pts.length - 1; i >= 0; i--) {
		while (
			upper.length >= 2 &&
			cross(upper[upper.length - 2], upper[upper.length - 1], pts[i]) <= 0
		)
			upper.pop()
		upper.push(pts[i])
	}
	lower.pop()
	upper.pop()
	return lower.concat(upper)
}

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
		const [rx, ry, rz] = rotateVert(vx, vy, vz, cosRx, sinRx, cosRy, sinRy)
		const cx = rx * half + half
		const cy = ry * half + half
		const cz = rz * half
		const scale = pd / (pd - cz)
		return [pox + (cx - pox) * scale, poy + (cy - poy) * scale] as [number, number]
	})

	const hull = convexHull(projected)
	return hull.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join('') + 'Z'
}

// --- Shake detection ---

interface ShakeState {
	directionChanges: number
	lastVelocityX: number
	lastVelocityY: number
	lastChangeTime: number
	hasRolled: boolean
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
	const theme = getDefaultColorTheme({ isDarkMode })
	const faceColor = getFaceColor(shape.props.color, isDarkMode)
	const borderColor = getColorValue(theme, shape.props.color, 'solid')
	const pipColor = getPipColor(shape.props.color, isDarkMode)
	const pipR = Math.max(2, size * 0.08)

	// Shared vanishing point based on viewport center
	useQuickReactor(
		'dice perspective',
		() => {
			const elm = containerRef.current
			if (!elm) return

			const viewport = editor.getViewportPageBounds()
			const transform = editor.getShapePageTransform(shape.id)
			const { x, y, rotation } = Mat.Decompose(transform)

			const vpCenter = viewport.center
			const originX = half + (vpCenter.x - x - half)
			const originY = half + (vpCenter.y - y - half)

			const origin = new Vec(originX, originY).rot(-rotation)
			const distance = Math.hypot(viewport.w, viewport.h)
			elm.style.perspectiveOrigin = `${origin.x}px ${origin.y}px`
			elm.style.perspective = `${distance}px`

			perspectiveRef.current = { ox: origin.x, oy: origin.y, d: distance }

			const outlineElm = outlineRef.current
			if (outlineElm) {
				const { x: rx, y: ry } = currentRotation.current
				outlineElm.setAttribute(
					'd',
					getCubeOutlineFromRotation(rx, ry, size, origin.x, origin.y, distance)
				)
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

			const endX = target.x + spinsX * dirX
			const endY = target.y + spinsY * dirY
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
			updateCube(target.x, target.y)
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

			const half = shape.props.w / 2
			const viewport = editor.getViewportPageBounds()
			const transform = editor.getShapePageTransform(shape.id)
			const { x, y, rotation } = Mat.Decompose(transform)
			const vpCenter = viewport.center
			const originX = half + (vpCenter.x - x - half)
			const originY = half + (vpCenter.y - y - half)
			const origin = new Vec(originX, originY).rot(-rotation)
			const distance = Math.hypot(viewport.w, viewport.h)

			const util = editor.getShapeUtil<DiceShapeUtil>(DICE_TYPE)
			const rot =
				util.rotations.get(shape.id) ?? FACE_ROTATIONS[shape.props.value] ?? FACE_ROTATIONS[1]

			el.setAttribute(
				'd',
				getCubeOutlineFromRotation(rot.x, rot.y, shape.props.w, origin.x, origin.y, distance)
			)
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
			value: Math.ceil(Math.random() * 6),
			isRolling: false,
			color: 'black',
		}
	}

	// --- Shake detection ---

	override onTranslateStart(shape: IDiceShape) {
		this.shakeStates.set(shape.id, {
			directionChanges: 0,
			lastVelocityX: 0,
			lastVelocityY: 0,
			lastChangeTime: Date.now(),
			hasRolled: false,
		})
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
		const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y)
		const now = Date.now()

		if (speed > 0.3) {
			if (
				state.lastVelocityX !== 0 &&
				velocity.x !== 0 &&
				Math.sign(velocity.x) !== Math.sign(state.lastVelocityX) &&
				Math.abs(velocity.x) > 0.15
			) {
				state.directionChanges++
				state.lastChangeTime = now
			}

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

		if (now - state.lastChangeTime > 500) {
			state.directionChanges = Math.max(0, state.directionChanges - 1)
			state.lastChangeTime = now
		}

		if (state.directionChanges >= 4) {
			state.hasRolled = true
			return {
				id: current.id,
				type: DICE_TYPE,
				props: { isRolling: true, value: Math.ceil(Math.random() * 6) },
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
				value: Math.ceil(Math.random() * 6),
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
