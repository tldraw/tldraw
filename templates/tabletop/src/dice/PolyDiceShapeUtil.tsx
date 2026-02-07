import { useEffect, useRef } from 'react'
import {
	BaseBoxShapeUtil,
	Circle2d,
	DefaultColorStyle,
	HTMLContainer,
	RecordProps,
	StyleProp,
	T,
	TLDefaultColorStyle,
	TLShape,
	TLShapePartial,
	useEditor,
	useIsDarkMode,
	useQuickReactor,
	useUniqueSafeId,
} from 'tldraw'
import { DieGeometry, FaceDefinition, GEOMETRIES } from './geometries'
import {
	DEG_TO_RAD,
	LIGHT_DIR,
	MAX_SHADOW,
	ShakeState,
	computePerspective,
	createShakeState,
	getBorderColor,
	getFaceColor,
	getOutlineFromRotation,
	getStrokeColor,
	getTextColor,
	rotateVert3,
	updateShakeState,
} from './shared'

// --- Sides style ---

export const DiceSidesStyle = StyleProp.defineEnum('tabletop:diceSides', {
	defaultValue: 20,
	values: [4, 6, 8, 10, 12, 20, 100],
})

export type DiceSidesStyleType = T.TypeOf<typeof DiceSidesStyle>

// --- Shape type ---

export const POLY_DICE_TYPE = 'tabletop-poly-dice' as const

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[POLY_DICE_TYPE]: {
			w: number
			h: number
			sides: DiceSidesStyleType
			value: number | string
			isRolling: boolean
			color: TLDefaultColorStyle
		}
	}
}

type IPolyDiceShape = TLShape<typeof POLY_DICE_TYPE>

// --- Helpers ---

function rollValue(sides: number): number | string {
	if (sides === 100) {
		return String(Math.floor(Math.random() * 10) * 10).padStart(2, '0')
	}
	if (sides === 10) {
		return Math.floor(Math.random() * 10)
	}
	return Math.ceil(Math.random() * sides)
}

// --- PolyFace component ---

function PolyFace({
	face,
	scale,
	faceColor,
	strokeColor,
	textColor,
	faceIndex,
	overlayRef,
}: {
	face: FaceDefinition
	scale: number
	faceColor: string
	strokeColor: string
	textColor: string
	faceIndex: number
	overlayRef: (el: SVGPolygonElement | null) => void
}) {
	const { polygon, polygonSize } = face
	const clipId = useUniqueSafeId(`face-${faceIndex}`)

	// Scale polygon slightly to eliminate sub-pixel gaps between adjacent faces
	const FACE_BLEED = 1.01
	const bleedPolygon = polygon.map(([x, y]) => [x * FACE_BLEED, y * FACE_BLEED] as [number, number])

	// Compute symmetric extent from origin so (0,0) stays at SVG center
	let extX = 0,
		extY = 0
	for (const [x, y] of bleedPolygon) {
		extX = Math.max(extX, Math.abs(x))
		extY = Math.max(extY, Math.abs(y))
	}
	// Add small padding
	extX *= 1.05
	extY *= 1.05

	const vbW = extX * 2
	const vbH = extY * 2
	const pxW = vbW * scale
	const pxH = vbH * scale

	// Font size in model-space units (scaled by viewBox → pixel mapping)
	const label = String(face.value)
	const baseFontSize = Math.min(polygonSize.w, polygonSize.h) * 0.4
	const fontSize = label.length > 1 ? baseFontSize * 0.9 : baseFontSize
	const needs69Dot = label === '6' || label === '9'
	const vertexFontSize = Math.min(polygonSize.w, polygonSize.h) * 0.32

	const pointsStr = bleedPolygon.map(([x, y]) => `${x},${y}`).join(' ')

	return (
		<svg
			viewBox={`${-extX} ${-extY} ${vbW} ${vbH}`}
			width={pxW}
			height={pxH}
			style={{
				position: 'absolute',
				left: '50%',
				top: '50%',
				marginLeft: -pxW / 2,
				marginTop: -pxH / 2,
				backfaceVisibility: 'hidden',
				transform: face.getTransform(scale),
				overflow: 'hidden',
			}}
		>
			<defs>
				<clipPath id={clipId}>
					<polygon points={pointsStr} />
				</clipPath>
			</defs>
			<g clipPath={`url(#${clipId})`}>
				<polygon
					points={pointsStr}
					fill={faceColor}
					stroke={strokeColor}
					strokeWidth={Math.min(polygonSize.w, polygonSize.h) * 0.02}
					strokeLinejoin="round"
				/>
				{face.vertexLabels ? (
					face.vertexLabels.map((vl, j) => (
						<text
							key={j}
							x={vl.x}
							y={vl.y}
							textAnchor="middle"
							dominantBaseline="central"
							fill={textColor}
							fontSize={vertexFontSize}
							fontFamily="Arial, Helvetica, sans-serif"
							fontWeight="bold"
							transform={`rotate(${vl.rotation}, ${vl.x}, ${vl.y})`}
						>
							{String(vl.value)}
						</text>
					))
				) : (
					<>
						<text
							x={0}
							y={0}
							textAnchor="middle"
							dominantBaseline="central"
							fill={textColor}
							fontSize={fontSize}
							fontFamily="Arial, Helvetica, sans-serif"
							fontWeight="bold"
						>
							{label}
						</text>
						{needs69Dot && (
							<circle cx={0} cy={fontSize * 0.45} r={fontSize * 0.06} fill={textColor} />
						)}
					</>
				)}
				<polygon
					ref={overlayRef}
					points={pointsStr}
					fill="black"
					opacity={0}
					style={{ pointerEvents: 'none' }}
				/>
			</g>
		</svg>
	)
}

// --- Component ---

function PolyDiceComponent({ shape }: { shape: IPolyDiceShape }) {
	const sides = shape.props.sides
	const geometry = GEOMETRIES[sides]
	if (!geometry) return null

	return <DiceGeometryShape geometry={geometry} shape={shape} />
}

function DiceGeometryShape({ shape, geometry }: { shape: IPolyDiceShape; geometry: DieGeometry }) {
	const editor = useEditor()
	const containerRef = useRef<HTMLDivElement>(null)
	const dieRef = useRef<HTMLDivElement>(null)
	const overlayRefs = useRef<(SVGPolygonElement | null)[]>([])
	const outlineRef = useRef<SVGPathElement>(null)
	const animRef = useRef(0)
	const currentRotation = useRef({ x: 0, y: 0, z: 0 })
	const perspectiveRef = useRef({ ox: 0, oy: 0, d: 1000 })
	const isAnimating = useRef(false)
	const prevIsRolling = useRef(false)

	const isDarkMode = useIsDarkMode()
	const faceColor = getFaceColor(shape.props.color, isDarkMode)
	const borderColor = getBorderColor(shape.props.color, isDarkMode)
	const textColor = getTextColor(shape.props.color, isDarkMode)
	const strokeColor = getStrokeColor(shape.props.color, isDarkMode)

	const shapeW = shape.props.w
	const scale = (shapeW * geometry.visualScale) / 2
	const sides = geometry.sides

	useQuickReactor(
		'poly dice perspective',
		() => {
			const elm = containerRef.current
			if (!elm) return

			const { ox, oy, d } = computePerspective(editor, shape.id, shape.props.w / 2)
			elm.style.perspectiveOrigin = `${ox}px ${oy}px`
			elm.style.perspective = `${d}px`

			perspectiveRef.current = { ox, oy, d }

			const outlineElm = outlineRef.current
			if (outlineElm) {
				const { x: rx, y: ry, z: rz } = currentRotation.current
				outlineElm.setAttribute(
					'd',
					getOutlineFromRotation(
						geometry.vertices,
						rx,
						ry,
						rz,
						scale,
						shapeW / 2,
						shapeW / 2,
						ox,
						oy,
						d
					)
				)
			}
		},
		[editor, shape.props.w, shape.props.value, sides]
	)

	useEffect(() => {
		const dieElm = dieRef.current
		if (!dieElm) return

		const updateDie = (rx: number, ry: number, rz: number) => {
			currentRotation.current = { x: rx, y: ry, z: rz }
			const util = editor.getShapeUtil<PolyDiceShapeUtil>(POLY_DICE_TYPE)
			util.rotations.set(shape.id, { x: rx, y: ry, z: rz })
			dieElm.style.transform = `rotateZ(${rz}deg) rotateX(${rx}deg) rotateY(${ry}deg)`

			// Per-face lighting
			const rxR = rx * DEG_TO_RAD
			const ryR = ry * DEG_TO_RAD
			const rzR = rz * DEG_TO_RAD
			const cosRx = Math.cos(rxR),
				sinRx = Math.sin(rxR)
			const cosRy = Math.cos(ryR),
				sinRy = Math.sin(ryR)
			const cosRz = Math.cos(rzR),
				sinRz = Math.sin(rzR)

			for (let i = 0; i < geometry.faces.length; i++) {
				const overlay = overlayRefs.current[i]
				if (!overlay) continue
				const [nx, ny, nz] = geometry.faces[i].normal
				const [rnx, rny, rnz] = rotateVert3(nx, ny, nz, cosRx, sinRx, cosRy, sinRy, cosRz, sinRz)
				const dot = rnx * LIGHT_DIR[0] + rny * LIGHT_DIR[1] + rnz * LIGHT_DIR[2]
				overlay.style.opacity = String((1 - Math.max(0, dot)) * MAX_SHADOW)
			}

			// Update outline and indicator
			const { ox, oy, d } = perspectiveRef.current
			const path = getOutlineFromRotation(
				geometry.vertices,
				rx,
				ry,
				rz,
				scale,
				shapeW / 2,
				shapeW / 2,
				ox,
				oy,
				d
			)
			const outlineElm = outlineRef.current
			if (outlineElm) {
				outlineElm.setAttribute('d', path)
			}
			const indicatorElm = util.indicatorPaths.get(shape.id)
			if (indicatorElm) {
				indicatorElm.setAttribute('d', path)
			}
		}

		if (shape.props.isRolling && !prevIsRolling.current) {
			prevIsRolling.current = true
			isAnimating.current = true

			const target = geometry.faceRotations[shape.props.value] ??
				geometry.faceRotations[1] ?? { x: 0, y: 0, z: 0 }
			const startX = currentRotation.current.x
			const startY = currentRotation.current.y
			const startZ = currentRotation.current.z

			const spinsX = (1 + Math.floor(Math.random() * 2)) * 360
			const spinsY = (1 + Math.floor(Math.random() * 2)) * 360
			const spinsZ = (Math.random() > 0.5 ? 1 : 0) * 360
			const dirX = Math.random() > 0.5 ? 1 : -1
			const dirY = Math.random() > 0.5 ? 1 : -1
			const dirZ = Math.random() > 0.5 ? 1 : -1

			const endX = target.x + spinsX * dirX
			const endY = target.y + spinsY * dirY
			const endZ = target.z + spinsZ * dirZ
			const duration = 1200 + Math.random() * 600
			const startTime = performance.now()

			const animate = (time: number) => {
				const elapsed = time - startTime
				const t = Math.min(elapsed / duration, 1)
				const eased = 1 - Math.pow(1 - t, 4)

				updateDie(
					startX + (endX - startX) * eased,
					startY + (endY - startY) * eased,
					startZ + (endZ - startZ) * eased
				)

				if (t < 1) {
					animRef.current = requestAnimationFrame(animate)
				} else {
					isAnimating.current = false
					prevIsRolling.current = false
					editor.updateShape<IPolyDiceShape>({
						id: shape.id,
						type: POLY_DICE_TYPE,
						props: { isRolling: false },
					})
				}
			}

			animRef.current = requestAnimationFrame(animate)
		} else if (!shape.props.isRolling && !isAnimating.current) {
			prevIsRolling.current = false
			const target = geometry.faceRotations[shape.props.value] ??
				geometry.faceRotations[1] ?? { x: 0, y: 0, z: 0 }
			updateDie(target.x, target.y, target.z)
		}

		return () => {
			if (animRef.current) {
				cancelAnimationFrame(animRef.current)
				isAnimating.current = false
			}
		}
	}, [
		shape.props.isRolling,
		shape.props.value,
		editor,
		shape.id,
		shape.props.w,
		geometry.faceRotations,
		geometry.faces,
		geometry.vertices,
		scale,
		shapeW,
	])

	return (
		<HTMLContainer style={{ width: shapeW, height: shapeW }}>
			<div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
				<div
					ref={dieRef}
					style={{
						width: shapeW,
						height: shapeW,
						position: 'relative',
						transformStyle: 'preserve-3d',
					}}
				>
					{geometry.faces.map((face, i) => (
						<PolyFace
							key={i}
							face={face}
							scale={scale}
							faceColor={faceColor}
							strokeColor={strokeColor}
							textColor={textColor}
							faceIndex={i}
							overlayRef={(el) => {
								overlayRefs.current[i] = el
							}}
						/>
					))}
				</div>
				<svg
					width={shapeW}
					height={shapeW}
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

function PolyDiceIndicator({ shape }: { shape: IPolyDiceShape }) {
	const editor = useEditor()
	const pathRef = useRef<SVGPathElement>(null)

	useEffect(() => {
		const el = pathRef.current
		if (!el) return
		const util = editor.getShapeUtil<PolyDiceShapeUtil>(POLY_DICE_TYPE)
		util.indicatorPaths.set(shape.id, el)
		return () => {
			util.indicatorPaths.delete(shape.id)
		}
	}, [editor, shape.id])

	useQuickReactor(
		'poly dice indicator',
		() => {
			const el = pathRef.current
			if (!el) return

			const geometry = GEOMETRIES[shape.props.sides]
			if (!geometry) return

			const { ox, oy, d } = computePerspective(editor, shape.id, shape.props.w / 2)
			const vertScale = (shape.props.w * geometry.visualScale) / 2
			const center = shape.props.w / 2

			const util = editor.getShapeUtil<PolyDiceShapeUtil>(POLY_DICE_TYPE)
			const rot = util.rotations.get(shape.id) ??
				geometry.faceRotations[shape.props.value] ??
				geometry.faceRotations[1] ?? { x: 0, y: 0, z: 0 }

			el.setAttribute(
				'd',
				getOutlineFromRotation(
					geometry.vertices,
					rot.x,
					rot.y,
					rot.z,
					vertScale,
					center,
					center,
					ox,
					oy,
					d
				)
			)
		},
		[editor, shape.id, shape.props.value, shape.props.w, shape.props.sides]
	)

	return <path ref={pathRef} />
}

// --- ShapeUtil ---

export class PolyDiceShapeUtil extends BaseBoxShapeUtil<IPolyDiceShape> {
	static override type = POLY_DICE_TYPE
	static override props: RecordProps<IPolyDiceShape> = {
		w: T.number,
		h: T.number,
		sides: DiceSidesStyle,
		value: T.any,
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
	rotations = new Map<string, { x: number; y: number; z: number }>()
	indicatorPaths = new Map<string, SVGPathElement>()

	override getGeometry(shape: IPolyDiceShape) {
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

	getDefaultProps(): IPolyDiceShape['props'] {
		return {
			w: 100,
			h: 100,
			sides: 20,
			value: Math.ceil(Math.random() * 20),
			isRolling: false,
			color: 'black',
		}
	}

	// --- Shake detection ---

	override onTranslateStart(shape: IPolyDiceShape) {
		this.shakeStates.set(shape.id, createShakeState())
		if (shape.props.isRolling) {
			return {
				id: shape.id,
				type: POLY_DICE_TYPE,
				props: { isRolling: false },
			}
		}
		return undefined
	}

	override onTranslate(
		_initial: IPolyDiceShape,
		current: IPolyDiceShape
	): TLShapePartial<IPolyDiceShape> | void {
		const state = this.shakeStates.get(current.id)
		if (!state || state.hasRolled || current.props.isRolling) return

		const velocity = this.editor.inputs.getPointerVelocity()
		const shouldRoll = updateShakeState(state, velocity)

		if (shouldRoll) {
			state.hasRolled = true
			return {
				id: current.id,
				type: POLY_DICE_TYPE,
				props: { isRolling: true, value: rollValue(current.props.sides) },
			}
		}

		return undefined
	}

	override onTranslateEnd(
		_initial: IPolyDiceShape,
		current: IPolyDiceShape
	): TLShapePartial<IPolyDiceShape> | void {
		this.shakeStates.delete(current.id)
	}

	// --- Double-click to roll ---

	override onDoubleClick(shape: IPolyDiceShape): TLShapePartial<IPolyDiceShape> | void {
		if (shape.props.isRolling) return

		return {
			id: shape.id,
			type: POLY_DICE_TYPE,
			props: {
				isRolling: true,
				value: rollValue(shape.props.sides),
			},
		}
	}

	// --- Rendering ---

	component(shape: IPolyDiceShape) {
		return <PolyDiceComponent shape={shape} />
	}

	indicator(shape: IPolyDiceShape) {
		return <PolyDiceIndicator shape={shape} />
	}
}
