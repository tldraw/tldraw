import {
	Geometry2d,
	Group2d,
	Polygon2d,
	RecordProps,
	ShapeUtil,
	T,
	TLDefaultColorStyle,
	TLDefaultSizeStyle,
	TLShape,
	Vec,
	VecLike,
} from 'tldraw'

export type WatercolorStyleName = 'soft' | 'bold' | 'ethereal' | 'textured'

const WATERCOLOR_TYPE = 'watercolor'

declare module 'tldraw' {
	export interface TLGlobalShapePropsMap {
		[WATERCOLOR_TYPE]: {
			points: VecLike[]
			color: TLDefaultColorStyle
			size: TLDefaultSizeStyle
			style: WatercolorStyleName
		}
	}
}

export type WatercolorShape = TLShape<typeof WATERCOLOR_TYPE>

// Size to stroke width mapping
const SIZE_TO_WIDTH: Record<TLDefaultSizeStyle, number> = {
	s: 8,
	m: 16,
	l: 28,
	xl: 44,
}

// Color palette mapping
const COLOR_MAP: Record<string, string> = {
	black: '#1d1d1d',
	grey: '#9aa0a6',
	'light-violet': '#e0d0ff',
	violet: '#ae6dff',
	blue: '#4285f4',
	'light-blue': '#a0d0ff',
	yellow: '#ffdd33',
	orange: '#ff9100',
	green: '#34a853',
	'light-green': '#93e088',
	'light-red': '#ffb0b0',
	red: '#ea4335',
	white: '#ffffff',
}

// ============================================================================
// Vector operations
// ============================================================================

interface WVec {
	x: number
	y: number
	z: number
}

const wvec = (x: number, y: number, z = 0.5): WVec => ({ x, y, z })

const V = {
	add: (a: WVec, b: WVec): WVec => wvec(a.x + b.x, a.y + b.y, a.z),
	sub: (a: WVec, b: WVec): WVec => wvec(a.x - b.x, a.y - b.y, a.z),
	mul: (v: WVec, s: number): WVec => wvec(v.x * s, v.y * s, v.z),
	len: (v: WVec): number => Math.sqrt(v.x * v.x + v.y * v.y),
	dist: (a: WVec, b: WVec): number => V.len(V.sub(a, b)),
	dist2: (a: WVec, b: WVec): number => (a.x - b.x) ** 2 + (a.y - b.y) ** 2,
	uni: (v: WVec): WVec => {
		const l = V.len(v)
		return l === 0 ? wvec(1, 0, v.z) : wvec(v.x / l, v.y / l, v.z)
	},
	per: (v: WVec): WVec => wvec(-v.y, v.x, v.z),
	neg: (v: WVec): WVec => wvec(-v.x, -v.y, v.z),
	lrp: (a: WVec, b: WVec, t: number): WVec =>
		wvec(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t),
	eq: (a: WVec, b: WVec): boolean => a.x === b.x && a.y === b.y,
	rotWith: (point: WVec, center: WVec, angle: number): WVec => {
		const cos = Math.cos(angle),
			sin = Math.sin(angle)
		const dx = point.x - center.x,
			dy = point.y - center.y
		return wvec(center.x + dx * cos - dy * sin, center.y + dx * sin + dy * cos, point.z)
	},
	dot: (a: WVec, b: WVec): number => a.x * b.x + a.y * b.y,
}

// ============================================================================
// Stroke types
// ============================================================================

interface StrokePoint {
	point: WVec
	input: WVec
	pressure: number
	vector: WVec
	distance: number
	runningLength: number
	radius: number
}

interface StrokeOptions {
	size?: number
	thinning?: number
	smoothing?: number
	streamline?: number
	simulatePressure?: boolean
	easing?: (t: number) => number
	capStart?: boolean
	capEnd?: boolean
}

type StrokeEffect = (points: StrokePoint[]) => StrokePoint[]

// ============================================================================
// Noise utilities
// ============================================================================

function noise1D(x: number, seed: number = 0): number {
	const n = Math.sin(x * 12.9898 + seed * 78.233) * 43758.5453
	return n - Math.floor(n)
}

function fractalNoise(x: number, seed: number, octaves: number = 3): number {
	let value = 0,
		amplitude = 1,
		frequency = 1,
		maxValue = 0
	for (let i = 0; i < octaves; i++) {
		value += noise1D(x * frequency, seed + i * 100) * amplitude
		maxValue += amplitude
		amplitude *= 0.5
		frequency *= 2
	}
	return value / maxValue
}

// ============================================================================
// Wetness - key to realistic watercolor physics
// ============================================================================

function getWetness(runningLength: number, totalLength: number, dryingDistance: number): number {
	const distanceFromEnd = totalLength - runningLength
	const wetness = Math.max(0, 1 - distanceFromEnd / dryingDistance)
	return wetness * wetness * (3 - 2 * wetness) // smoothstep
}

// ============================================================================
// Effects
// ============================================================================

function wetJitter(baseAmount: number, seed: number, dryingDistance: number): StrokeEffect {
	return (strokePoints) => {
		if (strokePoints.length === 0) return strokePoints
		const totalLength = strokePoints[strokePoints.length - 1].runningLength || 1

		return strokePoints.map((sp, i) => {
			const wetness = getWetness(sp.runningLength, totalLength, dryingDistance)
			const noiseVal = fractalNoise(sp.runningLength * 0.02, seed, 4)
			const amount = baseAmount * (0.3 + noiseVal * 1.2) * wetness

			const offsetX = (noise1D(i * 2, seed) - 0.5) * amount
			const offsetY = (noise1D(i * 2 + 1, seed) - 0.5) * amount

			return {
				...sp,
				point: { x: sp.point.x + offsetX, y: sp.point.y + offsetY, z: sp.point.z },
			}
		})
	}
}

function staticJitter(amount: number, seed: number): StrokeEffect {
	return (strokePoints) =>
		strokePoints.map((sp) => {
			const px = sp.point.x * 0.1 + seed
			const py = sp.point.y * 0.1 + seed * 1.7
			const offsetX = (noise1D(px, seed) - 0.5) * amount
			const offsetY = (noise1D(py, seed + 50) - 0.5) * amount

			return {
				...sp,
				point: { x: sp.point.x + offsetX, y: sp.point.y + offsetY, z: sp.point.z },
			}
		})
}

function pigmentPooling(strength: number): StrokeEffect {
	return (strokePoints) => {
		if (strokePoints.length < 3) return strokePoints
		const totalLength = strokePoints[strokePoints.length - 1].runningLength || 1

		return strokePoints.map((sp, i) => {
			const t = sp.runningLength / totalLength
			const endpointFactor = Math.pow(Math.min(t, 1 - t) * 4, 0.5)

			let curvature = 0
			if (i > 0 && i < strokePoints.length - 1) {
				const prev = strokePoints[i - 1]
				const next = strokePoints[i + 1]
				const dot = prev.vector.x * next.vector.x + prev.vector.y * next.vector.y
				curvature = 1 - Math.abs(dot)
			}

			const pooling = 1 + (curvature * 0.5 + (1 - endpointFactor) * 0.3) * strength
			return { ...sp, radius: sp.radius * pooling }
		})
	}
}

function wetEdgeExpansion(amount: number, dryingDistance: number): StrokeEffect {
	return (strokePoints) => {
		if (strokePoints.length === 0) return strokePoints
		const totalLength = strokePoints[strokePoints.length - 1].runningLength || 1

		return strokePoints.map((sp) => {
			const wetness = getWetness(sp.runningLength, totalLength, dryingDistance)
			return { ...sp, radius: sp.radius * (1 + wetness * amount) }
		})
	}
}

function soften(amount: number): StrokeEffect {
	return (strokePoints) => strokePoints.map((sp) => ({ ...sp, radius: sp.radius * amount }))
}

function ribbon(taperStart: number, taperEnd: number): StrokeEffect {
	return (strokePoints) => {
		if (strokePoints.length === 0) return []
		const totalLength = strokePoints[strokePoints.length - 1].runningLength || 1

		return strokePoints.map((sp) => {
			const startFactor = Math.min(1, sp.runningLength / taperStart)
			const endFactor = Math.min(1, (totalLength - sp.runningLength) / taperEnd)
			const t = startFactor * endFactor
			const eased = t * t * (3 - 2 * t)
			return { ...sp, radius: sp.radius * Math.max(0.01, eased) }
		})
	}
}

// ============================================================================
// Stroke pipeline
// ============================================================================

const RATE_OF_PRESSURE_CHANGE = 0.275
const FIXED_PI = Math.PI + 0.0001

function getStrokePoints(rawPoints: VecLike[], options: StrokeOptions = {}): StrokePoint[] {
	const { streamline = 0.5, simulatePressure = false } = options
	const t = 0.15 + (1 - streamline) * 0.85
	const pts = rawPoints.map((p) => wvec(p.x, p.y, (p as WVec).z ?? 0.5))

	if (pts.length === 0) return []
	if (pts.length === 1) {
		return [
			{
				point: pts[0],
				input: pts[0],
				pressure: simulatePressure ? 0.5 : pts[0].z,
				vector: wvec(1, 1),
				distance: 0,
				runningLength: 0,
				radius: 1,
			},
		]
	}

	const result: StrokePoint[] = []
	let prevPoint = pts[0]
	let totalLength = 0

	result.push({
		point: pts[0],
		input: pts[0],
		pressure: simulatePressure ? 0.5 : pts[0].z,
		vector: wvec(1, 1),
		distance: 0,
		runningLength: 0,
		radius: 1,
	})

	for (let i = 1; i < pts.length; i++) {
		const rawPt = pts[i]
		const pt = V.lrp(rawPt, prevPoint, 1 - t)
		if (V.eq(pt, prevPoint)) continue

		const dist = V.dist(pt, prevPoint)
		totalLength += dist

		result.push({
			point: pt,
			input: rawPt,
			pressure: simulatePressure ? 0.5 : rawPt.z,
			vector: V.uni(V.sub(prevPoint, pt)),
			distance: dist,
			runningLength: totalLength,
			radius: 1,
		})

		prevPoint = pt
	}

	if (result.length > 1) {
		result[0].vector = result[1].vector
	}

	return result
}

function setStrokePointRadii(
	strokePoints: StrokePoint[],
	options: StrokeOptions = {}
): StrokePoint[] {
	const { size = 16, thinning = 0.5, simulatePressure = false, easing = (t) => t } = options

	if (strokePoints.length === 0) return []

	const computeRadius = (pressure: number) => size * easing(0.5 - thinning * (0.5 - pressure))
	let prevPressure = strokePoints[0].pressure

	return strokePoints.map((sp) => {
		const speedFactor = Math.min(1, sp.distance / size)
		let pressure: number

		if (simulatePressure) {
			const target = Math.min(1, 1 - speedFactor)
			pressure = Math.min(
				1,
				prevPressure + (target - prevPressure) * speedFactor * RATE_OF_PRESSURE_CHANGE
			)
		} else {
			pressure = Math.min(
				1,
				prevPressure + (sp.pressure - prevPressure) * speedFactor * RATE_OF_PRESSURE_CHANGE
			)
		}

		prevPressure = pressure
		return { ...sp, pressure, radius: computeRadius(pressure) }
	})
}

function getStrokeOutlinePoints(strokePoints: StrokePoint[], options: StrokeOptions = {}): WVec[] {
	const { size = 16, smoothing = 0.5, capStart = true, capEnd = true } = options

	if (strokePoints.length === 0) return []

	const minDistSq = (size * smoothing * 0.3) ** 2
	const leftPts: WVec[] = []
	const rightPts: WVec[] = []
	let prevLeft = wvec(0, 0)
	let prevRight = wvec(0, 0)

	for (const sp of strokePoints) {
		const offset = V.mul(V.per(sp.vector), sp.radius)
		const left = V.sub(sp.point, offset)
		const right = V.add(sp.point, offset)

		if (leftPts.length === 0 || V.dist2(left, prevLeft) > minDistSq) {
			leftPts.push(left)
			prevLeft = left
		}
		if (rightPts.length === 0 || V.dist2(right, prevRight) > minDistSq) {
			rightPts.push(right)
			prevRight = right
		}
	}

	const firstSp = strokePoints[0]
	const lastSp = strokePoints[strokePoints.length - 1]

	const startCap: WVec[] = []
	if (capStart && rightPts.length > 0) {
		for (let t = 0.0625; t < 1; t += 0.0625) {
			startCap.push(V.rotWith(rightPts[0], firstSp.point, FIXED_PI * t))
		}
	}

	const endCap: WVec[] = []
	if (capEnd) {
		const dir = V.neg(V.per(lastSp.vector))
		const start = V.add(lastSp.point, V.mul(dir, lastSp.radius))
		for (let t = 0.02; t < 1; t += 0.02) {
			endCap.push(V.rotWith(start, lastSp.point, FIXED_PI * 3 * t))
		}
	} else {
		endCap.push(lastSp.point)
	}

	return [...leftPts, ...endCap, ...rightPts.reverse(), ...startCap]
}

function compose(...effects: StrokeEffect[]): StrokeEffect {
	return (points) => effects.reduce((pts, effect) => effect(pts), points)
}

function getStrokeWithEffects(
	points: VecLike[],
	options: StrokeOptions = {},
	effects: StrokeEffect[] = []
): WVec[] {
	const pipeline = compose(...effects)
	return getStrokeOutlinePoints(
		pipeline(setStrokePointRadii(getStrokePoints(points, options), options)),
		options
	)
}

function getSvgPathFromPoints(points: WVec[]): string {
	if (points.length === 0) return ''
	if (points.length === 1) {
		return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)} L ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`
	}
	if (points.length === 2) {
		return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)} L ${points[1].x.toFixed(2)} ${points[1].y.toFixed(2)}`
	}

	let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`

	const mid0 = {
		x: (points[0].x + points[1].x) / 2,
		y: (points[0].y + points[1].y) / 2,
	}
	d += ` L ${mid0.x.toFixed(2)} ${mid0.y.toFixed(2)}`

	for (let i = 1; i < points.length - 1; i++) {
		const p = points[i]
		const next = points[i + 1]
		const midNext = {
			x: (p.x + next.x) / 2,
			y: (p.y + next.y) / 2,
		}
		d += ` Q ${p.x.toFixed(2)} ${p.y.toFixed(2)} ${midNext.x.toFixed(2)} ${midNext.y.toFixed(2)}`
	}

	const last = points[points.length - 1]
	d += ` L ${last.x.toFixed(2)} ${last.y.toFixed(2)}`

	return d + ' Z'
}

// ============================================================================
// Stain particles - permanent marks like dried pigment
// ============================================================================

interface Stain {
	x: number
	y: number
	r: number
	opacity: number
}

function generateStains(
	points: VecLike[],
	seed: number,
	spacing: number,
	probability: number,
	spread: number,
	size: number
): Stain[] {
	if (points.length < 2) return []
	const stains: Stain[] = []

	let accumulated = 0
	for (let i = 1; i < points.length; i++) {
		const prev = points[i - 1]
		const curr = points[i]
		const dx = curr.x - prev.x
		const dy = curr.y - prev.y
		const segmentLen = Math.sqrt(dx * dx + dy * dy)

		accumulated += segmentLen

		while (accumulated >= spacing) {
			accumulated -= spacing

			const positionSeed = Math.floor(curr.x * 0.1) * 1000 + Math.floor(curr.y * 0.1) + seed

			if (noise1D(positionSeed, seed) > probability) continue

			const angle = noise1D(positionSeed, seed + 1) * Math.PI * 2
			const dist = Math.pow(noise1D(positionSeed, seed + 2), 0.7) * spread
			const stainSize = size * (0.3 + noise1D(positionSeed, seed + 3) * 1.4)
			const stainOpacity = 0.02 + noise1D(positionSeed, seed + 4) * 0.06

			stains.push({
				x: curr.x + Math.cos(angle) * dist,
				y: curr.y + Math.sin(angle) * dist,
				r: stainSize,
				opacity: stainOpacity,
			})
		}
	}
	return stains
}

// ============================================================================
// Dots for pointillist effects
// ============================================================================

interface Dot {
	x: number
	y: number
	r: number
	opacity: number
}

function generateDots(
	points: VecLike[],
	seed: number,
	baseSize: number,
	density: number,
	spread: number,
	sizeVariation: number,
	opacityRange: [number, number]
): Dot[] {
	if (points.length < 2) return []
	const dots: Dot[] = []

	let accumulated = 0
	const spacing = 1 / density

	for (let i = 1; i < points.length; i++) {
		const prev = points[i - 1]
		const curr = points[i]
		const dx = curr.x - prev.x
		const dy = curr.y - prev.y
		const segmentLen = Math.sqrt(dx * dx + dy * dy)
		if (segmentLen === 0) continue

		const nx = -dy / segmentLen
		const ny = dx / segmentLen

		accumulated += segmentLen

		while (accumulated >= spacing) {
			accumulated -= spacing

			const dotsHere = 2 + Math.floor(noise1D(i * 7, seed) * 3)
			for (let d = 0; d < dotsHere; d++) {
				const dotSeed = i * 100 + d + seed

				const u1 = noise1D(dotSeed, seed)
				const u2 = noise1D(dotSeed + 1, seed)
				const gaussian = Math.sqrt(-2 * Math.log(u1 + 0.001)) * Math.cos(2 * Math.PI * u2)
				const perpOffset = gaussian * spread * 0.4

				const alongOffset = (noise1D(dotSeed + 2, seed) - 0.5) * spacing * 2

				const x = curr.x + nx * perpOffset + (dx / segmentLen) * alongOffset
				const y = curr.y + ny * perpOffset + (dy / segmentLen) * alongOffset

				const sizeMult = 1 - sizeVariation + noise1D(dotSeed + 3, seed) * sizeVariation * 2
				const r = baseSize * sizeMult * (0.3 + Math.abs(gaussian) * 0.4)

				const centeredness = 1 - Math.min(1, Math.abs(gaussian) / 2)
				const opacity =
					opacityRange[0] +
					(opacityRange[1] - opacityRange[0]) * centeredness * noise1D(dotSeed + 4, seed)

				dots.push({ x, y, r: Math.max(0.3, r), opacity })
			}
		}
	}
	return dots
}

// ============================================================================
// Style definitions
// ============================================================================

interface BristleConfig {
	count: number
	spread: number
	thickness: number
	gapFrequency: number
	gapThreshold: number
	wander: number
	thicknessVariation: number
	clumping: number
	opacity?: number
}

interface WatercolorStyleConfig {
	layers: {
		effects: StrokeEffect[]
		opacity: number
	}[]
	stains: (points: VecLike[], seed: number, size: number) => Stain[]
	dots?: (points: VecLike[], seed: number, size: number) => Dot[]
	bristles?: BristleConfig
}

function generateGradientLayers(
	layerCount: number,
	config: {
		ribbonStart: number
		ribbonEnd: number
		softenStart: number
		softenEnd: number
		jitterStart: number
		jitterEnd: number
		opacityStart: number
		opacityEnd: number
		poolingStart: number
		poolingEnd: number
		wetnessStart: number
		dryingDistance: number
	}
): { effects: StrokeEffect[]; opacity: number }[] {
	const layers: { effects: StrokeEffect[]; opacity: number }[] = []

	for (let i = 0; i < layerCount; i++) {
		const t = i / (layerCount - 1)
		const tOpacity = Math.pow(t, 0.4)
		const tLinear = t
		const tSmooth = t * t * (3 - 2 * t)

		const ribbonSize = config.ribbonStart + (config.ribbonEnd - config.ribbonStart) * tLinear
		const softenAmount = config.softenStart + (config.softenEnd - config.softenStart) * tLinear
		const jitterAmount = config.jitterStart + (config.jitterEnd - config.jitterStart) * tLinear
		const poolingAmount = config.poolingStart + (config.poolingEnd - config.poolingStart) * tSmooth
		const opacity = config.opacityStart + (config.opacityEnd - config.opacityStart) * tOpacity

		const effects: StrokeEffect[] = []

		if (softenAmount > 0.1) {
			effects.push(soften(softenAmount))
		}

		if (t < config.wetnessStart) {
			if (jitterAmount > 0.1) {
				effects.push(staticJitter(jitterAmount, i + 1))
			}
		} else {
			const wetness = (t - config.wetnessStart) / (1 - config.wetnessStart)
			const staticAmount = jitterAmount * (1 - wetness) * 0.5
			const wetAmount = jitterAmount * wetness

			if (staticAmount > 0.1) {
				effects.push(staticJitter(staticAmount, i + 1))
			}
			if (wetAmount > 0.1) {
				effects.push(wetJitter(wetAmount, i + 100, config.dryingDistance * (1 - wetness * 0.5)))
			}
			if (wetness > 0.3) {
				effects.push(wetEdgeExpansion(wetness * 0.12, config.dryingDistance))
			}
		}

		if (poolingAmount > 0.05) {
			effects.push(pigmentPooling(poolingAmount))
		}

		effects.push(ribbon(ribbonSize, ribbonSize * 0.95))

		layers.push({ effects, opacity })
	}

	return layers
}

const STYLE_CONFIGS: Record<WatercolorStyleName, WatercolorStyleConfig> = {
	soft: {
		layers: generateGradientLayers(18, {
			ribbonStart: 65,
			ribbonEnd: 26,
			softenStart: 2.2,
			softenEnd: 0.2,
			jitterStart: 1.8,
			jitterEnd: 1,
			opacityStart: 0.011,
			opacityEnd: 0.065,
			poolingStart: 0.15,
			poolingEnd: 0.42,
			wetnessStart: 0.28,
			dryingDistance: 120,
		}),
		stains: (points, seed, size) =>
			generateStains(points, seed, 22, 0.22, size * 1.25, size * 0.045),
		dots: (points, seed, size) =>
			generateDots(points, seed, size * 0.065, 0.045, size * 5, 0.85, [0.018, 0.07]),
		bristles: {
			count: 24,
			spread: 0.42,
			thickness: 0.012,
			gapFrequency: 0.9,
			gapThreshold: 0.26,
			wander: 1,
			thicknessVariation: 0.48,
			clumping: 0.68,
			opacity: 0.38,
		},
	},
	bold: {
		layers: generateGradientLayers(20, {
			ribbonStart: 70,
			ribbonEnd: 28,
			softenStart: 2.5,
			softenEnd: 0.3,
			jitterStart: 2,
			jitterEnd: 1.2,
			opacityStart: 0.01,
			opacityEnd: 0.065,
			poolingStart: 0.12,
			poolingEnd: 0.4,
			wetnessStart: 0.3,
			dryingDistance: 140,
		}),
		stains: (points, seed, size) => generateStains(points, seed, 35, 0.25, size * 1.5, size * 0.08),
		dots: (points, seed, size) =>
			generateDots(points, seed, size * 0.06, 0.8, size * 1.2, 0.7, [0.03, 0.12]),
		bristles: {
			count: 14,
			spread: 0.55,
			thickness: 0.075,
			gapFrequency: 0.055,
			gapThreshold: 0.28,
			wander: 0.6,
			thicknessVariation: 0.5,
			clumping: 0.7,
		},
	},
	ethereal: {
		layers: generateGradientLayers(40, {
			ribbonStart: 150,
			ribbonEnd: 25,
			softenStart: 6,
			softenEnd: 0.8,
			jitterStart: 5,
			jitterEnd: 1,
			opacityStart: 0.004,
			opacityEnd: 0.045,
			poolingStart: 0,
			poolingEnd: 0.35,
			wetnessStart: 0.5,
			dryingDistance: 250,
		}),
		stains: (points, seed, size) => generateStains(points, seed, 140, 0.08, size * 3, size * 0.1),
	},
	textured: {
		layers: generateGradientLayers(16, {
			ribbonStart: 60,
			ribbonEnd: 24,
			softenStart: 2,
			softenEnd: 0.15,
			jitterStart: 1.5,
			jitterEnd: 0.8,
			opacityStart: 0.015,
			opacityEnd: 0.075,
			poolingStart: 0.18,
			poolingEnd: 0.5,
			wetnessStart: 0.25,
			dryingDistance: 100,
		}),
		stains: (points, seed, size) => generateStains(points, seed, 25, 0.35, size * 1.3, size * 0.05),
		dots: (points, seed, size) =>
			generateDots(points, seed, size * 0.045, 0.5, size * 0.9, 0.55, [0.02, 0.08]),
		bristles: {
			count: 18,
			spread: 0.48,
			thickness: 0.07,
			gapFrequency: 0.045,
			gapThreshold: 0.22,
			wander: 0.55,
			thicknessVariation: 0.4,
			clumping: 0.68,
		},
	},
}

// ============================================================================
// Shape util
// ============================================================================

export class WatercolorShapeUtil extends ShapeUtil<WatercolorShape> {
	static override type = WATERCOLOR_TYPE
	static override props: RecordProps<WatercolorShape> = {
		points: T.arrayOf(T.object({ x: T.number, y: T.number })),
		color: T.string as any,
		size: T.string as any,
		style: T.string as any,
	}

	override getDefaultProps(): WatercolorShape['props'] {
		return {
			points: [
				{ x: 0, y: 0 },
				{ x: 100, y: 50 },
			],
			color: 'blue',
			size: 'm',
			style: 'soft',
		}
	}

	getGeometry(shape: WatercolorShape): Geometry2d {
		const { points, size } = shape.props
		if (points.length === 0) {
			return new Polygon2d({
				points: [new Vec(0, 0)],
				isFilled: false,
			})
		}

		const strokeWidth = SIZE_TO_WIDTH[size] || 16
		const halfWidth = strokeWidth / 2

		const allPoints: Vec[] = []
		for (const point of points) {
			allPoints.push(new Vec(point.x - halfWidth, point.y - halfWidth))
			allPoints.push(new Vec(point.x + halfWidth, point.y - halfWidth))
			allPoints.push(new Vec(point.x + halfWidth, point.y + halfWidth))
			allPoints.push(new Vec(point.x - halfWidth, point.y + halfWidth))
		}

		if (allPoints.length < 3) {
			return new Polygon2d({
				points: [new Vec(0, 0), new Vec(1, 0), new Vec(1, 1)],
				isFilled: false,
			})
		}

		const hull = this.convexHull(allPoints)
		return new Group2d({
			children: [
				new Polygon2d({
					points: hull,
					isFilled: false,
				}),
			],
		})
	}

	private convexHull(points: Vec[]): Vec[] {
		if (points.length < 3) return points

		const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y)

		const cross = (o: Vec, a: Vec, b: Vec) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)

		const lower: Vec[] = []
		for (const p of sorted) {
			while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
				lower.pop()
			}
			lower.push(p)
		}

		const upper: Vec[] = []
		for (let i = sorted.length - 1; i >= 0; i--) {
			const p = sorted[i]
			while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
				upper.pop()
			}
			upper.push(p)
		}

		lower.pop()
		upper.pop()

		return [...lower, ...upper]
	}

	component(shape: WatercolorShape) {
		const { points, color, size, style } = shape.props
		if (points.length < 2) return null

		const sw = SIZE_TO_WIDTH[size] || 16
		const fillColor = COLOR_MAP[color] || color || '#4285f4'
		const styleConfig = STYLE_CONFIGS[style] || STYLE_CONFIGS.soft
		const seedBase = shape.id.charCodeAt(0) + shape.id.charCodeAt(1) * 256

		const baseOptions: StrokeOptions = {
			size: sw,
			thinning: 0.5,
			smoothing: 0.5,
			streamline: 0.5,
			simulatePressure: true,
			capStart: false,
			capEnd: false,
		}

		const stains = styleConfig.stains(points, seedBase, sw)
		const dots = styleConfig.dots?.(points, seedBase, sw) || []

		// Generate bristle strokes
		const bristlePaths: { path: string; opacity: number }[] = []
		if (styleConfig.bristles && points.length >= 2) {
			const {
				count,
				spread,
				thickness,
				gapFrequency,
				gapThreshold,
				wander = 0.5,
				thicknessVariation = 0.5,
				clumping = 0.5,
				opacity: bristleOpacity = 0.5,
			} = styleConfig.bristles

			const bristlePositions: number[] = []
			for (let b = 0; b < count; b++) {
				let t = count === 1 ? 0 : (b / (count - 1)) * 2 - 1
				const clumpNoise = noise1D(b * 13, seedBase) - 0.5
				const clumpOffset = clumpNoise * clumping * 0.8
				const randomOffset = (noise1D(b * 29, seedBase + 50) - 0.5) * (1 - clumping) * 0.6
				bristlePositions.push(t + clumpOffset + randomOffset)
			}

			for (let b = 0; b < count; b++) {
				const baseOffset = bristlePositions[b] * sw * spread * 0.5
				const bristleThickness =
					thickness * (1 - thicknessVariation * 0.5 + noise1D(b * 7, seedBase) * thicknessVariation)
				const bristleSize = sw * bristleThickness
				const wanderAmount = wander * sw * 0.3
				const wanderFreq = 0.02 + noise1D(b * 11, seedBase) * 0.03

				const bristlePoints: VecLike[] = []
				let inGap = false

				for (let i = 0; i < points.length; i++) {
					const p = points[i]

					let nx = 0,
						ny = 1
					if (i < points.length - 1) {
						const next = points[i + 1]
						const dx = next.x - p.x
						const dy = next.y - p.y
						const len = Math.sqrt(dx * dx + dy * dy) || 1
						nx = -dy / len
						ny = dx / len
					} else if (i > 0) {
						const prev = points[i - 1]
						const dx = p.x - prev.x
						const dy = p.y - prev.y
						const len = Math.sqrt(dx * dx + dy * dy) || 1
						nx = -dy / len
						ny = dx / len
					}

					const wanderNoise = fractalNoise(i * wanderFreq, seedBase + b * 100, 3) - 0.5
					const currentWander = wanderNoise * wanderAmount

					const edgeFactor = Math.abs(bristlePositions[b])
					const gapNoise = fractalNoise(i * gapFrequency + b * 7, seedBase + b, 2)
					const adjustedThreshold = gapThreshold * (0.7 + edgeFactor * 0.6)
					const shouldGap = gapNoise < adjustedThreshold

					if (shouldGap && !inGap) {
						inGap = true
						if (bristlePoints.length > 2) {
							const segmentThickness =
								bristleSize * (0.8 + noise1D(bristlePoints.length, seedBase + b) * 0.4)
							const bristleOptions = { ...baseOptions, size: segmentThickness, thinning: 0.35 }
							const outline = getStrokeWithEffects(bristlePoints, bristleOptions, [ribbon(25, 25)])
							bristlePaths.push({
								path: getSvgPathFromPoints(outline),
								opacity: bristleOpacity + noise1D(b * 3 + bristlePoints.length, seedBase) * 0.35,
							})
						}
						bristlePoints.length = 0
					} else if (!shouldGap) {
						inGap = false
						bristlePoints.push({
							x: p.x + nx * (baseOffset + currentWander),
							y: p.y + ny * (baseOffset + currentWander),
						})
					}
				}

				if (bristlePoints.length > 2) {
					const segmentThickness =
						bristleSize * (0.8 + noise1D(bristlePoints.length + 99, seedBase + b) * 0.4)
					const bristleOptions = { ...baseOptions, size: segmentThickness, thinning: 0.35 }
					const outline = getStrokeWithEffects(bristlePoints, bristleOptions, [ribbon(25, 25)])
					bristlePaths.push({
						path: getSvgPathFromPoints(outline),
						opacity: bristleOpacity + noise1D(b * 3, seedBase) * 0.35,
					})
				}
			}
		}

		return (
			<svg className="tl-svg-container" style={{ overflow: 'visible' }}>
				<g style={{ mixBlendMode: 'multiply' }}>
					{/* Stains - dried marks on paper */}
					{stains.map((s, i) => (
						<circle key={`s-${i}`} cx={s.x} cy={s.y} r={s.r} fill={fillColor} opacity={s.opacity} />
					))}
					{/* Dots for pointillist effect */}
					{dots.map((d, i) => (
						<circle key={`d-${i}`} cx={d.x} cy={d.y} r={d.r} fill={fillColor} opacity={d.opacity} />
					))}
					{/* Bristle strokes */}
					{bristlePaths.map((bp, i) => (
						<path key={`b-${i}`} d={bp.path} fill={fillColor} stroke="none" opacity={bp.opacity} />
					))}
					{/* Watercolor layers */}
					{styleConfig.layers.map((layer, i) => {
						const outline = getStrokeWithEffects(points, baseOptions, layer.effects)
						const path = getSvgPathFromPoints(outline)
						return <path key={i} d={path} fill={fillColor} stroke="none" opacity={layer.opacity} />
					})}
				</g>
			</svg>
		)
	}

	indicator(shape: WatercolorShape) {
		const { points, size } = shape.props
		if (points.length < 2) return null

		const sw = SIZE_TO_WIDTH[size] || 16
		const baseOptions: StrokeOptions = {
			size: sw,
			thinning: 0.5,
			smoothing: 0.5,
			streamline: 0.5,
			simulatePressure: true,
			capStart: false,
			capEnd: false,
		}
		const outline = getStrokeWithEffects(points, baseOptions, [ribbon(40, 40)])
		return <path d={getSvgPathFromPoints(outline)} />
	}

	override expandSelectionOutlinePx(shape: WatercolorShape): number {
		const sw = SIZE_TO_WIDTH[shape.props.size] || 16
		return sw * 2.5
	}
}
