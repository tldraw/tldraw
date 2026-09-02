import { VecLike } from '@tldraw/editor'
import type { StrokeOptions, StrokePoint } from './types'

// The stroke pipeline's internal representation: one module-level set of reusable
// struct-of-arrays buffers instead of per-point objects. Like fmt.ts's byte buffer, the
// buffers are non-reentrant: each public entry point fully consumes them before returning,
// and the next call overwrites them.
//
// A stroke point's vector is not stored; it is derived on the fly from consecutive points
// (the unit vector pointing back at the predecessor). A point's distance is stored rather
// than derived from running lengths because `runningLength[i] - runningLength[i - 1]` is
// not bit-identical to the accumulated distance in floating point.
//
// Hot loops capture the array bindings into locals: the arrays never grow mid-fill
// (capacity is ensured up front), and locals avoid re-reading the module binding on
// every access.

const MIN_PRESSURE = 0.025

// This is the rate of change for simulated pressure. It could be an option.
const RATE_OF_PRESSURE_CHANGE = 0.275

// Default taper easings, mirroring `EASINGS.easeOutQuad` and `EASINGS.easeOutCubic`
// from `@tldraw/editor`.
const easeOutQuad = (t: number) => t * (2 - t)
const easeOutCubic = (t: number) => --t * t * t + 1

const { min } = Math

// ---------------------------------------------------------------------------------
// Pipeline buffers: one slot per stroke point, filled by `ingest`, radii filled in by
// `computeRadii`. Callers ensure capacity before filling, so growth never copies.
// ---------------------------------------------------------------------------------

let pointCapacity = 256
/** Streamlined (smoothed) point coordinates. */
export let pointX = new Float64Array(pointCapacity)
export let pointY = new Float64Array(pointCapacity)
/** The original input coordinates (used for elbows and sharp corners). */
export let inputX = new Float64Array(pointCapacity)
export let inputY = new Float64Array(pointCapacity)
/** The input z (pressure channel) after clamping; kept for materializing StrokePoints. */
export let inputZ = new Float64Array(pointCapacity)
export let pressures = new Float64Array(pointCapacity)
export let distances = new Float64Array(pointCapacity)
export let runningLengths = new Float64Array(pointCapacity)
export let radii = new Float64Array(pointCapacity)
export let pointCount = 0

function ensurePointCapacity(n: number) {
	if (n <= pointCapacity) return
	while (pointCapacity < n) pointCapacity *= 2
	pointX = new Float64Array(pointCapacity)
	pointY = new Float64Array(pointCapacity)
	inputX = new Float64Array(pointCapacity)
	inputY = new Float64Array(pointCapacity)
	inputZ = new Float64Array(pointCapacity)
	pressures = new Float64Array(pointCapacity)
	distances = new Float64Array(pointCapacity)
	runningLengths = new Float64Array(pointCapacity)
	radii = new Float64Array(pointCapacity)
}

// Staging buffers for the effective input sequence in `ingest` (after stripping
// near-start/near-end points, the two-point interpolation, and the duplicated last
// point) — replaces the cloned `pts` array of the object pipeline.
let stageCapacity = 256
let stageX = new Float64Array(stageCapacity)
let stageY = new Float64Array(stageCapacity)
let stageZ = new Float64Array(stageCapacity)

function ensureStageCapacity(n: number) {
	if (n <= stageCapacity) return
	while (stageCapacity < n) stageCapacity *= 2
	stageX = new Float64Array(stageCapacity)
	stageY = new Float64Array(stageCapacity)
	stageZ = new Float64Array(stageCapacity)
}

/** The z of a raw input point as `Vec.From` plus the pressure clamp would produce it. */
function zOf(p: VecLike, clampZ: boolean): number {
	const z = p.z === undefined ? 1 : p.z
	// Some pens or OSes report z=0 even while the pen is touching, so we clamp rather
	// than strip to avoid removing real input.
	return clampZ && z < MIN_PRESSURE ? MIN_PRESSURE : z
}

/**
 * Phase 1: ingest and streamline raw input points straight into the pipeline buffers.
 * Mirrors what getStrokePoints used to do with per-point objects, keeping every
 * order-sensitive step: the pressure clamp, near-start/near-end stripping, the two-point
 * simulated-pressure interpolation, the early-noise skip, and the short-stroke pressure
 * fixup.
 *
 * @internal
 */
export function ingest(rawInputPoints: VecLike[], options: StrokeOptions = {}): void {
	const { streamline = 0.5, size = 16, simulatePressure = false } = options

	pointCount = 0
	const rawLen = rawInputPoints.length
	if (rawLen === 0) return

	// Find the interpolation level between points.
	const t = 0.15 + (1 - streamline) * 0.85

	ensureStageCapacity(rawLen + 8)
	ensurePointCapacity(rawLen + 8)

	const stX = stageX
	const stY = stageY
	const stZ = stageZ

	const minDist2 = (size / 3) ** 2
	const clampZ = !simulatePressure

	// Strip points that are too close to the first point, accumulating the maximum
	// pressure among them into the first point.
	const first = rawInputPoints[0]
	let firstZ = zOf(first, clampZ)
	let startIdx = 1
	while (startIdx < rawLen) {
		const pt = rawInputPoints[startIdx]
		const dx = pt.x - first.x
		const dy = pt.y - first.y
		if (dx * dx + dy * dy > minDist2) break
		firstZ = Math.max(firstZ, zOf(pt, clampZ))
		startIdx++
	}

	// Stage the surviving points.
	stX[0] = first.x
	stY[0] = first.y
	stZ[0] = firstZ
	let m = 1
	for (let i = startIdx; i < rawLen; i++) {
		const pt = rawInputPoints[i]
		stX[m] = pt.x
		stY[m] = pt.y
		stZ[m] = zOf(pt, clampZ)
		m++
	}

	// Strip points that are too close to the last point. This can consume the whole
	// sequence, leaving just the last point.
	let pointsRemovedFromNearEnd = 0
	if (m > 1) {
		const lastX = stX[m - 1]
		const lastY = stY[m - 1]
		let j = m - 2
		while (j >= 0) {
			const dx = stX[j] - lastX
			const dy = stY[j] - lastY
			if (dx * dx + dy * dy > minDist2) break
			j--
			pointsRemovedFromNearEnd++
		}
		if (j < m - 2) {
			stX[j + 1] = lastX
			stY[j + 1] = lastY
			stZ[j + 1] = stZ[m - 1]
			m = j + 2
		}
	}

	const isComplete =
		options.last ||
		!options.simulatePressure ||
		(m > 1 &&
			(stX[m - 1] - stX[m - 2]) * (stX[m - 1] - stX[m - 2]) +
				(stY[m - 1] - stY[m - 2]) * (stY[m - 1] - stY[m - 2]) <
				size ** 2) ||
		pointsRemovedFromNearEnd > 0

	// Add extra points between the two, to help avoid "dash" lines for strokes with
	// tapered start and ends.
	if (m === 2 && options.simulatePressure) {
		const x0 = stX[0]
		const y0 = stY[0]
		const z0 = stZ[0]
		const x1 = stX[1]
		const y1 = stY[1]
		const z1 = stZ[1]
		for (let i = 1; i < 5; i++) {
			const u = i / 4
			stX[i] = x0 + (x1 - x0) * u
			stY[i] = y0 + (y1 - y0) * u
			stZ[i] = ((z0 + (z1 - z0)) * i) / 4
		}
		m = 5
	}

	const ptX = pointX
	const ptY = pointY
	const inX = inputX
	const inY = inputY
	const inZ = inputZ
	const press = pressures
	const dists = distances
	const runs = runningLengths
	const rads = radii

	// The first point needs no adjustment.
	ptX[0] = stX[0]
	ptY[0] = stY[0]
	inX[0] = stX[0]
	inY[0] = stY[0]
	inZ[0] = stZ[0]
	press[0] = simulatePressure ? 0.5 : stZ[0]
	dists[0] = 0
	runs[0] = 0
	rads[0] = 1
	let count = 1

	if (isComplete && streamline > 0) {
		stX[m] = stX[m - 1]
		stY[m] = stY[m - 1]
		stZ[m] = stZ[m - 1]
		m++
	}

	// We use the totalLength to keep track of the total distance, and prevX/prevY as the
	// latest streamlined point, to calculate the next point's distance.
	let totalLength = 0
	let prevX = stX[0]
	let prevY = stY[0]
	const u = 1 - t
	const isLast = options.last

	for (let i = 1; i < m; i++) {
		let x: number, y: number
		if (!t || (isLast && i === m - 1)) {
			x = stX[i]
			y = stY[i]
		} else {
			x = stX[i] + (prevX - stX[i]) * u
			y = stY[i] + (prevY - stY[i]) * u
		}

		// If the new point is the same as the previous point, skip ahead.
		if (Math.abs(prevX - x) < 0.0001 && Math.abs(prevY - y) < 0.0001) continue

		// How far is the new point from the previous point?
		const distance = ((y - prevY) ** 2 + (x - prevX) ** 2) ** 0.5

		// Add this distance to the total "running length" of the line.
		totalLength += distance

		// At the start of the line, we wait until the new point is a certain distance
		// away from the original point, to avoid noise.
		if (i < 4 && totalLength < size) continue

		ptX[count] = x
		ptY[count] = y
		inX[count] = stX[i]
		inY[count] = stY[i]
		inZ[count] = stZ[i]
		press[count] = simulatePressure ? 0.5 : stZ[i]
		dists[count] = distance
		runs[count] = totalLength
		rads[count] = 1
		count++
		prevX = x
		prevY = y
	}

	if (totalLength < 1) {
		let max = 0.5
		for (let i = 0; i < count; i++) max = Math.max(max, press[i])
		for (let i = 0; i < count; i++) press[i] = max
	}

	pointCount = count
}

/**
 * Resolve a taper option to a distance: `true` tapers over the whole stroke, `false` or
 * `undefined` not at all.
 *
 * @internal
 */
export function resolveTaper(
	taper: number | boolean | undefined,
	size: number,
	totalLength: number
): number {
	if (!taper) return 0
	return taper === true ? Math.max(size, totalLength) : taper
}

/**
 * Phase 2: compute each point's radius from its pressure, distance and running length.
 * Same recurrences as the object pipeline, with the taper pass folded into the main
 * radius loop.
 *
 * @internal
 */
export function computeRadii(options: StrokeOptions): void {
	const {
		size = 16,
		thinning = 0.5,
		simulatePressure = true,
		easing = (t) => t,
		start = {},
		end = {},
	} = options

	const { easing: taperStartEase = easeOutQuad } = start
	const { easing: taperEndEase = easeOutCubic } = end

	const n = pointCount
	const press = pressures
	const dists = distances
	const runs = runningLengths
	const rads = radii

	const totalLength = runs[n - 1]

	if (!simulatePressure && totalLength < size) {
		let max = 0.5
		for (let i = 0; i < n; i++) max = Math.max(max, press[i])
		for (let i = 0; i < n; i++) {
			press[i] = max
			rads[i] = size * easing(0.5 - thinning * (0.5 - max))
		}
		return
	}

	// Calculate initial pressure based on the average of the first n number of points.
	// This prevents "dots" at the start of the line. Drawn lines almost always start slow!
	let prevPressure = press[0]
	for (let i = 0; i < n; i++) {
		if (runs[i] > size * 5) break
		const sp = min(1, dists[i] / size)
		let p: number
		if (simulatePressure) {
			const rp = min(1, 1 - sp)
			p = min(1, prevPressure + (rp - prevPressure) * (sp * RATE_OF_PRESSURE_CHANGE))
		} else {
			p = min(1, prevPressure + (press[i] - prevPressure) * 0.5)
		}
		prevPressure = prevPressure + (p - prevPressure) * 0.5
	}

	const taperStart = resolveTaper(start.taper, size, totalLength)
	const taperEnd = resolveTaper(end.taper, size, totalLength)

	const hasTaper = taperStart || taperEnd

	// Now calculate pressure and radius for each point. If the point falls within a taper
	// distance from either end, scale its radius by the smaller taper strength.
	for (let i = 0; i < n; i++) {
		let radius: number
		if (thinning) {
			let pressure = press[i]
			const sp = min(1, dists[i] / size)
			if (simulatePressure) {
				// If we're simulating pressure, then do so based on the distance between the
				// current point and the previous point, and the size of the stroke.
				const rp = min(1, 1 - sp)
				pressure = min(1, prevPressure + (rp - prevPressure) * (sp * RATE_OF_PRESSURE_CHANGE))
			} else {
				// Otherwise, use the input pressure slightly smoothed based on the distance
				// between the current point and the previous point.
				pressure = min(1, prevPressure + (pressure - prevPressure) * (sp * RATE_OF_PRESSURE_CHANGE))
			}
			radius = size * easing(0.5 - thinning * (0.5 - pressure))
			prevPressure = pressure
		} else {
			radius = size / 2
		}

		if (hasTaper) {
			const runningLength = runs[i]
			const ts = runningLength < taperStart ? taperStartEase(runningLength / taperStart) : 1
			const te =
				totalLength - runningLength < taperEnd
					? taperEndEase((totalLength - runningLength) / taperEnd)
					: 1
			radius = Math.max(0.01, radius * Math.min(ts, te))
		}

		rads[i] = radius
	}
}

// ---------------------------------------------------------------------------------
// Track-source buffers: the (sub)sequence of stroke points the outline tracks are built
// from — the whole stroke for getStroke/getStrokeOutlinePoints, one elbow partition at a
// time for svgInk. `srcIsCap` marks points to treat as the first/last point when placing
// the outline (the identity check `point === first || point === last` of the object
// pipeline). Elbow points are loaded with their input coordinates as their point.
// ---------------------------------------------------------------------------------

let srcCapacity = 256
export let srcX = new Float64Array(srcCapacity)
export let srcY = new Float64Array(srcCapacity)
export let srcZ = new Float64Array(srcCapacity)
export let srcInputX = new Float64Array(srcCapacity)
export let srcInputY = new Float64Array(srcCapacity)
export let srcRadius = new Float64Array(srcCapacity)
export let srcRunningLength = new Float64Array(srcCapacity)
export let srcIsCap = new Uint8Array(srcCapacity)
export let srcCount = 0

function ensureSrcCapacity(n: number) {
	if (n <= srcCapacity) return
	while (srcCapacity < n) srcCapacity *= 2
	srcX = new Float64Array(srcCapacity)
	srcY = new Float64Array(srcCapacity)
	srcZ = new Float64Array(srcCapacity)
	srcInputX = new Float64Array(srcCapacity)
	srcInputY = new Float64Array(srcCapacity)
	srcRadius = new Float64Array(srcCapacity)
	srcRunningLength = new Float64Array(srcCapacity)
	srcIsCap = new Uint8Array(srcCapacity)
}

/** Load the track source from materialized StrokePoints. @internal */
export function loadSrcFromStrokePoints(strokePoints: StrokePoint[]): void {
	const n = strokePoints.length
	ensureSrcCapacity(n)
	const sx = srcX
	const sy = srcY
	const sz = srcZ
	const six = srcInputX
	const siy = srcInputY
	const sr = srcRadius
	const srl = srcRunningLength
	const scap = srcIsCap
	const first = strokePoints[0]
	const last = strokePoints[n - 1]
	for (let i = 0; i < n; i++) {
		const sp = strokePoints[i]
		const point = sp.point
		const input = sp.input
		sx[i] = point.x
		sy[i] = point.y
		sz[i] = point.z
		six[i] = input.x
		siy[i] = input.y
		sr[i] = sp.radius
		srl[i] = sp.runningLength
		scap[i] = sp === first || sp === last ? 1 : 0
	}
	srcCount = n
}

/** Load the track source from the whole pipeline. @internal */
export function loadSrcFromPipeline(): void {
	const n = pointCount
	ensureSrcCapacity(n)
	const sx = srcX
	const sy = srcY
	const sz = srcZ
	const six = srcInputX
	const siy = srcInputY
	const sr = srcRadius
	const srl = srcRunningLength
	const scap = srcIsCap
	const ptX = pointX
	const ptY = pointY
	const inX = inputX
	const inY = inputY
	const inZ = inputZ
	const runs = runningLengths
	const rads = radii
	for (let i = 0; i < n; i++) {
		sx[i] = ptX[i]
		sy[i] = ptY[i]
		sz[i] = inZ[i]
		six[i] = inX[i]
		siy[i] = inY[i]
		sr[i] = rads[i]
		srl[i] = runs[i]
		scap[i] = i === 0 || i === n - 1 ? 1 : 0
	}
	srcCount = n
}

/**
 * Load one elbow partition from the pipeline as the track source: boundary point `a`,
 * the surviving inner points `innerStart..innerEnd`, and boundary point `b`. Elbow
 * boundaries read the input coordinates instead of the streamlined ones. When a hard
 * elbow's duplicated end point survived cleanup (`dupQuirk`), the inner copy of `b` is
 * also marked as a cap point, matching the object pipeline where both array slots held
 * the same point object.
 *
 * @internal
 */
export function loadSrcPartition(
	a: number,
	aElbow: boolean,
	innerStart: number,
	innerEnd: number,
	b: number,
	bElbow: boolean,
	dupQuirk: boolean
): void {
	ensureSrcCapacity(innerEnd - innerStart + 3)
	const sx = srcX
	const sy = srcY
	const sz = srcZ
	const six = srcInputX
	const siy = srcInputY
	const sr = srcRadius
	const srl = srcRunningLength
	const scap = srcIsCap
	const ptX = pointX
	const ptY = pointY
	const inX = inputX
	const inY = inputY
	const inZ = inputZ
	const runs = runningLengths
	const rads = radii

	sx[0] = aElbow ? inX[a] : ptX[a]
	sy[0] = aElbow ? inY[a] : ptY[a]
	sz[0] = inZ[a]
	six[0] = inX[a]
	siy[0] = inY[a]
	sr[0] = rads[a]
	srl[0] = runs[a]
	scap[0] = 1
	let w = 1
	for (let i = innerStart; i <= innerEnd; i++) {
		sx[w] = ptX[i]
		sy[w] = ptY[i]
		sz[w] = inZ[i]
		six[w] = inX[i]
		siy[w] = inY[i]
		sr[w] = rads[i]
		srl[w] = runs[i]
		scap[w] = 0
		w++
	}
	if (dupQuirk) scap[w - 1] = 1
	sx[w] = bElbow ? inX[b] : ptX[b]
	sy[w] = bElbow ? inY[b] : ptY[b]
	sz[w] = inZ[b]
	six[w] = inX[b]
	siy[w] = inY[b]
	sr[w] = rads[b]
	srl[w] = runs[b]
	scap[w] = 1
	srcCount = w + 1
}
