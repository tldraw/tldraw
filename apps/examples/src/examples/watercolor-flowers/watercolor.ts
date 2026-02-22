import { VecLike } from 'tldraw'

// ============================================================================
// Vector operations
// ============================================================================

export interface WVec {
	x: number
	y: number
	z: number
}

export const wvec = (x: number, y: number, z = 0.5): WVec => ({ x, y, z })

export const V = {
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
}

// ============================================================================
// Noise
// ============================================================================

export function noise1D(x: number, seed: number = 0): number {
	const n = Math.sin(x * 12.9898 + seed * 78.233) * 43758.5453
	return n - Math.floor(n)
}

export function fractalNoise(x: number, seed: number, octaves: number = 3): number {
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

export interface StrokeOptions {
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
// Wetness model
// ============================================================================

function getWetness(runningLength: number, totalLength: number, dryingDistance: number): number {
	const distanceFromEnd = totalLength - runningLength
	const wetness = Math.max(0, 1 - distanceFromEnd / dryingDistance)
	return wetness * wetness * (3 - 2 * wetness)
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
			return {
				...sp,
				point: {
					x: sp.point.x + (noise1D(px, seed) - 0.5) * amount,
					y: sp.point.y + (noise1D(py, seed + 50) - 0.5) * amount,
					z: sp.point.z,
				},
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
				curvature = 1 - Math.abs(prev.vector.x * next.vector.x + prev.vector.y * next.vector.y)
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

	if (result.length > 1) result[0].vector = result[1].vector
	return result
}

function setStrokePointRadii(
	strokePoints: StrokePoint[],
	options: StrokeOptions = {}
): StrokePoint[] {
	const { size = 16, thinning = 0.5, simulatePressure = false, easing = (t: number) => t } = options
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
	}

	return [...leftPts, ...endCap, ...rightPts.reverse(), ...startCap]
}

function compose(...effects: StrokeEffect[]): StrokeEffect {
	return (points) => effects.reduce((pts, effect) => effect(pts), points)
}

export function getStrokeWithEffects(
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

export function getSvgPathFromPoints(points: WVec[]): string {
	if (points.length === 0) return ''
	if (points.length < 3) {
		return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)} L ${(points[1]?.x ?? points[0].x).toFixed(2)} ${(points[1]?.y ?? points[0].y).toFixed(2)}`
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
		const mid = { x: (p.x + next.x) / 2, y: (p.y + next.y) / 2 }
		d += ` Q ${p.x.toFixed(2)} ${p.y.toFixed(2)} ${mid.x.toFixed(2)} ${mid.y.toFixed(2)}`
	}

	const last = points[points.length - 1]
	d += ` L ${last.x.toFixed(2)} ${last.y.toFixed(2)}`
	return d + ' Z'
}

// ============================================================================
// Stain particles
// ============================================================================

export interface Stain {
	x: number
	y: number
	r: number
	opacity: number
}

export function generateStains(
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
		const prev = points[i - 1],
			curr = points[i]
		const dx = curr.x - prev.x,
			dy = curr.y - prev.y
		accumulated += Math.sqrt(dx * dx + dy * dy)

		while (accumulated >= spacing) {
			accumulated -= spacing
			const positionSeed = Math.floor(curr.x * 0.1) * 1000 + Math.floor(curr.y * 0.1) + seed
			if (noise1D(positionSeed, seed) > probability) continue
			const angle = noise1D(positionSeed, seed + 1) * Math.PI * 2
			const dist = Math.pow(noise1D(positionSeed, seed + 2), 0.7) * spread
			stains.push({
				x: curr.x + Math.cos(angle) * dist,
				y: curr.y + Math.sin(angle) * dist,
				r: size * (0.3 + noise1D(positionSeed, seed + 3) * 1.4),
				opacity: 0.02 + noise1D(positionSeed, seed + 4) * 0.04,
			})
		}
	}
	return stains
}

// ============================================================================
// Layer generation
// ============================================================================

export interface LayerConfig {
	effects: StrokeEffect[]
	opacity: number
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
): LayerConfig[] {
	const layers: LayerConfig[] = []

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

		if (softenAmount > 0.1) effects.push(soften(softenAmount))

		if (t < config.wetnessStart) {
			if (jitterAmount > 0.1) effects.push(staticJitter(jitterAmount, i + 1))
		} else {
			const wetness = (t - config.wetnessStart) / (1 - config.wetnessStart)
			const staticAmount = jitterAmount * (1 - wetness) * 0.5
			const wetAmount = jitterAmount * wetness
			if (staticAmount > 0.1) effects.push(staticJitter(staticAmount, i + 1))
			if (wetAmount > 0.1)
				effects.push(wetJitter(wetAmount, i + 100, config.dryingDistance * (1 - wetness * 0.5)))
			if (wetness > 0.3) effects.push(wetEdgeExpansion(wetness * 0.12, config.dryingDistance))
		}

		if (poolingAmount > 0.05) effects.push(pigmentPooling(poolingAmount))
		effects.push(ribbon(ribbonSize, ribbonSize * 0.95))

		layers.push({ effects, opacity })
	}

	return layers
}

// Trail: faint, wide, dreamy watercolor wash
export const TRAIL_LAYERS = generateGradientLayers(12, {
	ribbonStart: 80,
	ribbonEnd: 25,
	softenStart: 3.5,
	softenEnd: 0.5,
	jitterStart: 3,
	jitterEnd: 0.8,
	opacityStart: 0.008,
	opacityEnd: 0.065,
	poolingStart: 0.05,
	poolingEnd: 0.3,
	wetnessStart: 0.4,
	dryingDistance: 180,
})

// Petals: shorter stroke, more visible per-layer
export const PETAL_LAYERS = generateGradientLayers(6, {
	ribbonStart: 12,
	ribbonEnd: 6,
	softenStart: 1.8,
	softenEnd: 0.4,
	jitterStart: 0.8,
	jitterEnd: 0.2,
	opacityStart: 0.025,
	opacityEnd: 0.14,
	poolingStart: 0.1,
	poolingEnd: 0.35,
	wetnessStart: 0.5,
	dryingDistance: 30,
})
