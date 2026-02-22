import {
	Geometry2d,
	Group2d,
	Polygon2d,
	RecordProps,
	ShapeUtil,
	T,
	TLShape,
	Vec,
	VecLike,
} from 'tldraw'
import {
	PETAL_LAYERS,
	Stain,
	StrokeOptions,
	TRAIL_LAYERS,
	generateStains,
	getStrokeWithEffects,
	getSvgPathFromPoints,
	noise1D,
} from './watercolor'

// ============================================================================
// Type declarations
// ============================================================================

declare module 'tldraw' {
	interface TLGlobalShapePropsMap {
		'watercolor-trail': {
			points: VecLike[]
			color: string
		}
		flower: {
			size: number
			rotation: number
			color: string
			seed: number
		}
	}
}

export type WatercolorTrailShape = TLShape<'watercolor-trail'>
export type FlowerShape = TLShape<'flower'>

// ============================================================================
// Color palettes
// ============================================================================

const TRAIL_HEX: Record<string, string> = {
	'light-blue': '#a0d0ff',
	'light-violet': '#d0b0ff',
	'light-green': '#a0e8b0',
	'light-red': '#ffb0c0',
	peach: '#ffd0a0',
}

const PETAL_HEX: Record<string, string> = {
	pink: '#ff90a8',
	lavender: '#c8a0f0',
	peach: '#ffb888',
	coral: '#ff8080',
	rose: '#ff6088',
	blush: '#ffa0b8',
	lilac: '#b888e0',
	mauve: '#d898c0',
}

// ============================================================================
// WatercolorTrailShapeUtil
// ============================================================================

export class WatercolorTrailShapeUtil extends ShapeUtil<WatercolorTrailShape> {
	static override type = 'watercolor-trail' as const
	static override props: RecordProps<WatercolorTrailShape> = {
		points: T.arrayOf(T.object({ x: T.number, y: T.number })),
		color: T.string,
	}

	override getDefaultProps(): WatercolorTrailShape['props'] {
		return { points: [], color: 'light-blue' }
	}

	getGeometry(shape: WatercolorTrailShape): Geometry2d {
		const { points } = shape.props
		if (points.length < 2) {
			return new Polygon2d({
				points: [new Vec(0, 0), new Vec(1, 0), new Vec(1, 1)],
				isFilled: false,
			})
		}
		const allVecs: Vec[] = []
		const pad = 30
		for (const p of points) {
			allVecs.push(new Vec(p.x - pad, p.y - pad))
			allVecs.push(new Vec(p.x + pad, p.y + pad))
		}
		return new Group2d({
			children: [new Polygon2d({ points: convexHull(allVecs), isFilled: false })],
		})
	}

	component(shape: WatercolorTrailShape) {
		const { points, color } = shape.props
		if (points.length < 2) return null

		const hexColor = TRAIL_HEX[color] || color || '#a0d0ff'
		const seedBase = shape.id.charCodeAt(0) + shape.id.charCodeAt(1) * 256
		const sw = 24

		const baseOptions: StrokeOptions = {
			size: sw,
			thinning: 0.4,
			smoothing: 0.5,
			streamline: 0.5,
			simulatePressure: true,
			capStart: false,
			capEnd: false,
		}

		const stains = generateStains(points, seedBase, 30, 0.2, sw * 1.5, sw * 0.05)

		return (
			<svg className="tl-svg-container" style={{ overflow: 'visible' }}>
				<g style={{ mixBlendMode: 'multiply' }}>
					{stains.map((s: Stain, i: number) => (
						<circle key={`s-${i}`} cx={s.x} cy={s.y} r={s.r} fill={hexColor} opacity={s.opacity} />
					))}
					{TRAIL_LAYERS.map((layer, i) => {
						const outline = getStrokeWithEffects(points, baseOptions, layer.effects)
						const path = getSvgPathFromPoints(outline)
						if (!path) return null
						return <path key={i} d={path} fill={hexColor} stroke="none" opacity={layer.opacity} />
					})}
				</g>
			</svg>
		)
	}

	indicator(shape: WatercolorTrailShape) {
		const { points } = shape.props
		if (points.length < 2) return null
		const outline = getStrokeWithEffects(
			points,
			{ size: 24, thinning: 0.4, smoothing: 0.5, streamline: 0.5, simulatePressure: true },
			[]
		)
		return <path d={getSvgPathFromPoints(outline)} />
	}

	override expandSelectionOutlinePx(): number {
		return 60
	}
}

// ============================================================================
// FlowerShapeUtil
// ============================================================================

export class FlowerShapeUtil extends ShapeUtil<FlowerShape> {
	static override type = 'flower' as const
	static override props: RecordProps<FlowerShape> = {
		size: T.number,
		rotation: T.number,
		color: T.string,
		seed: T.number,
	}

	override getDefaultProps(): FlowerShape['props'] {
		return { size: 12, rotation: 0, color: 'pink', seed: 0 }
	}

	getGeometry(shape: FlowerShape): Geometry2d {
		const r = shape.props.size
		const pts: Vec[] = []
		for (let i = 0; i < 8; i++) {
			const a = (i / 8) * Math.PI * 2
			pts.push(new Vec(Math.cos(a) * r, Math.sin(a) * r))
		}
		return new Polygon2d({ points: pts, isFilled: true })
	}

	component(shape: FlowerShape) {
		const { size, rotation, color, seed } = shape.props
		const hexColor = PETAL_HEX[color] || color || '#ff90a8'
		const petalCount = 5 + Math.floor(noise1D(seed, 0) * 2)

		const petalOptions: StrokeOptions = {
			size: size * 0.55,
			thinning: 0.3,
			smoothing: 0.5,
			streamline: 0.4,
			simulatePressure: true,
			capStart: true,
			capEnd: true,
		}

		return (
			<svg className="tl-svg-container" style={{ overflow: 'visible' }}>
				<g style={{ mixBlendMode: 'multiply' }}>
					{Array.from({ length: petalCount }).map((_, pi) => {
						const angle = rotation + (pi / petalCount) * Math.PI * 2
						const petalLength = size * (0.8 + noise1D(pi, seed + 1) * 0.4)
						const curve = (noise1D(pi, seed + 2) - 0.5) * size * 0.3

						// Petal centerline: base → tip with a slight curve
						const rawPoints = [
							{ x: 0, y: 0 },
							{ x: petalLength * 0.35, y: curve },
							{ x: petalLength * 0.7, y: curve * 0.4 },
							{ x: petalLength, y: 0 },
						]

						// Rotate around origin
						const cos = Math.cos(angle),
							sin = Math.sin(angle)
						const points = rawPoints.map((p) => ({
							x: p.x * cos - p.y * sin,
							y: p.x * sin + p.y * cos,
						}))

						return PETAL_LAYERS.map((layer, li) => {
							const outline = getStrokeWithEffects(points, petalOptions, layer.effects)
							const path = getSvgPathFromPoints(outline)
							if (!path) return null
							return (
								<path
									key={`p${pi}-l${li}`}
									d={path}
									fill={hexColor}
									stroke="none"
									opacity={layer.opacity}
								/>
							)
						})
					})}
					{/* Center - warm dot */}
					<circle cx={0} cy={0} r={size * 0.18} fill="#ffe060" opacity={0.7} />
					<circle cx={0} cy={0} r={size * 0.1} fill="#ffb830" opacity={0.5} />
				</g>
			</svg>
		)
	}

	indicator(shape: FlowerShape) {
		const r = shape.props.size
		return <circle cx={0} cy={0} r={r} />
	}

	override expandSelectionOutlinePx(): number {
		return 20
	}
}

// ============================================================================
// Convex hull utility
// ============================================================================

function convexHull(points: Vec[]): Vec[] {
	if (points.length < 3) return points
	const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y)
	const cross = (o: Vec, a: Vec, b: Vec) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)

	const lower: Vec[] = []
	for (const p of sorted) {
		while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
			lower.pop()
		lower.push(p)
	}
	const upper: Vec[] = []
	for (let i = sorted.length - 1; i >= 0; i--) {
		const p = sorted[i]
		while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0)
			upper.pop()
		upper.push(p)
	}
	lower.pop()
	upper.pop()
	return [...lower, ...upper]
}
