import {
	CubicBezier2d,
	EASINGS,
	HALF_PI,
	PI,
	PI2,
	TLDefaultSizeStyle,
	Vec,
	VecModel,
	centerOfCircleFromThreePoints,
	getPointOnCircle,
	getPointsOnArc,
	perimeterOfEllipse,
	rng,
	toDomPrecision,
} from '@tldraw/editor'
import { getStrokePoints } from '../shared/freehand/getStrokePoints'
import { getSvgPathFromStrokePoints } from '../shared/freehand/svg'

/* ---------------------- Oval ---------------------- */

export function getOvalPerimeter(h: number, w: number) {
	if (h > w) return (PI * (w / 2) + (h - w)) * 2
	else return (PI * (h / 2) + (w - h)) * 2
}

/* ---------------------- Heart --------------------- */

export function getHeartPath(w: number, h: number) {
	return (
		getHeartParts(w, h)
			.map((c, i) => c.getSvgPathData(i === 0))
			.join(' ') + ' Z'
	)
}

export function getDrawHeartPath(w: number, h: number, sw: number, id: string) {
	const o = w / 4
	const k = h / 4
	const random = rng(id)
	const mutDistance = sw * 0.75
	const mut = (v: Vec) => v.addXY(random() * mutDistance, random() * mutDistance)

	const A = new Vec(w / 2, h)
	const B = new Vec(0, k * 1.2)
	const C = new Vec(w / 2, k * 0.9)
	const D = new Vec(w, k * 1.2)

	const Am = mut(new Vec(w / 2, h))
	const Bm = mut(new Vec(0, k * 1.2))
	const Cm = mut(new Vec(w / 2, k * 0.9))
	const Dm = mut(new Vec(w, k * 1.2))

	const parts = [
		new CubicBezier2d({
			start: A,
			cp1: new Vec(o * 1.5, k * 3),
			cp2: new Vec(0, k * 2.5),
			end: B,
		}),
		new CubicBezier2d({
			start: B,
			cp1: new Vec(0, -k * 0.32),
			cp2: new Vec(o * 1.85, -k * 0.32),
			end: C,
		}),
		new CubicBezier2d({
			start: C,
			cp1: new Vec(o * 2.15, -k * 0.32),
			cp2: new Vec(w, -k * 0.32),
			end: D,
		}),
		new CubicBezier2d({
			start: D,
			cp1: new Vec(w, k * 2.5),
			cp2: new Vec(o * 2.5, k * 3),
			end: Am,
		}),
		new CubicBezier2d({
			start: Am,
			cp1: new Vec(o * 1.5, k * 3),
			cp2: new Vec(0, k * 2.5),
			end: Bm,
		}),
		new CubicBezier2d({
			start: Bm,
			cp1: new Vec(0, -k * 0.32),
			cp2: new Vec(o * 1.85, -k * 0.32),
			end: Cm,
		}),
		new CubicBezier2d({
			start: Cm,
			cp1: new Vec(o * 2.15, -k * 0.32),
			cp2: new Vec(w, -k * 0.32),
			end: Dm,
		}),
		new CubicBezier2d({
			start: Dm,
			cp1: new Vec(w, k * 2.5),
			cp2: new Vec(o * 2.5, k * 3),
			end: A,
		}),
	]

	return parts.map((c, i) => c.getSvgPathData(i === 0)).join(' ') + ' Z'
}

export function getHeartPoints(w: number, h: number) {
	const points = [] as Vec[]
	const curves = getHeartParts(w, h)
	for (let i = 0; i < curves.length; i++) {
		for (let j = 0; j < 20; j++) {
			points.push(CubicBezier2d.GetAtT(curves[i], j / 20))
		}
		if (i === curves.length - 1) {
			points.push(CubicBezier2d.GetAtT(curves[i], 1))
		}
	}
}

export function getHeartParts(w: number, h: number) {
	const o = w / 4
	const k = h / 4
	return [
		new CubicBezier2d({
			start: new Vec(w / 2, h),
			cp1: new Vec(o * 1.5, k * 3),
			cp2: new Vec(0, k * 2.5),
			end: new Vec(0, k * 1.2),
		}),
		new CubicBezier2d({
			start: new Vec(0, k * 1.2),
			cp1: new Vec(0, -k * 0.32),
			cp2: new Vec(o * 1.85, -k * 0.32),
			end: new Vec(w / 2, k * 0.9),
		}),
		new CubicBezier2d({
			start: new Vec(w / 2, k * 0.9),
			cp1: new Vec(o * 2.15, -k * 0.32),
			cp2: new Vec(w, -k * 0.32),
			end: new Vec(w, k * 1.2),
		}),
		new CubicBezier2d({
			start: new Vec(w, k * 1.2),
			cp1: new Vec(w, k * 2.5),
			cp2: new Vec(o * 2.5, k * 3),
			end: new Vec(w / 2, h),
		}),
	]
}

/* --------------------- Ellipse -------------------- */

function getEllipseStrokeOptions(strokeWidth: number) {
	return {
		size: 1 + strokeWidth,
		thinning: 0.25,
		end: { taper: strokeWidth },
		start: { taper: strokeWidth },
		streamline: 0,
		smoothing: 1,
		simulatePressure: false,
	}
}

function getEllipseStrokePoints(id: string, width: number, height: number, strokeWidth: number) {
	const getRandom = rng(id)

	const rx = width / 2
	const ry = height / 2
	const perimeter = perimeterOfEllipse(rx, ry)

	const points: Vec[] = []

	const start = PI2 * getRandom()
	const length = PI2 + HALF_PI / 2 + Math.abs(getRandom()) * HALF_PI
	const count = Math.max(16, perimeter / 10)

	for (let i = 0; i < count; i++) {
		const t = i / (count - 1)
		const r = start + t * length
		const c = Math.cos(r)
		const s = Math.sin(r)
		points.push(
			new Vec(
				rx * c + width * 0.5 + 0.05 * getRandom(),
				ry * s + height / 2 + 0.05 * getRandom(),
				Math.min(
					1,
					0.5 +
						Math.abs(0.5 - (getRandom() > 0 ? EASINGS.easeInOutSine(t) : EASINGS.easeInExpo(t))) / 2
				)
			)
		)
	}

	return getStrokePoints(points, getEllipseStrokeOptions(strokeWidth))
}

export function getEllipseDrawIndicatorPath(
	id: string,
	width: number,
	height: number,
	strokeWidth: number
) {
	return getSvgPathFromStrokePoints(getEllipseStrokePoints(id, width, height, strokeWidth))
}

export function getEllipsePath(w: number, h: number) {
	const cx = w / 2
	const cy = h / 2
	const rx = Math.max(0, cx)
	const ry = Math.max(0, cy)
	return `M${cx - rx},${cy}a${rx},${ry},0,1,1,${rx * 2},0a${rx},${ry},0,1,1,-${rx * 2},0`
}

/* --------------------- Polygon -------------------- */

import { VecLike, precise } from '@tldraw/editor'

/** @public */
export function getRoundedInkyPolygonPath(points: VecLike[]) {
	let polylineA = `M`

	const len = points.length

	let p0: VecLike
	let p1: VecLike
	let p2: VecLike

	for (let i = 0, n = len; i < n; i += 3) {
		p0 = points[i]
		p1 = points[i + 1]
		p2 = points[i + 2]

		polylineA += `${precise(p0)}L${precise(p1)}Q${precise(p2)}`
	}

	polylineA += `${precise(points[0])}`

	return polylineA
}

/** @public */
export function getRoundedPolygonPoints(
	id: string,
	outline: VecLike[],
	offset: number,
	roundness: number,
	passes: number
) {
	const results: VecLike[] = []

	const random = rng(id)
	let p0 = outline[0]
	let p1: VecLike

	const len = outline.length

	for (let i = 0, n = len * passes; i < n; i++) {
		p1 = Vec.AddXY(outline[(i + 1) % len], random() * offset, random() * offset)

		const delta = Vec.Sub(p1, p0)
		const distance = Vec.Len(delta)
		const vector = Vec.Div(delta, distance).mul(Math.min(distance / 4, roundness))
		results.push(Vec.Add(p0, vector), Vec.Add(p1, vector.neg()), p1)

		p0 = p1
	}

	return results
}

/* ---------------------- Cloud --------------------- */

type PillSection =
	| {
			type: 'straight'
			start: VecModel
			delta: VecModel
	  }
	| {
			type: 'arc'
			center: VecModel
			startAngle: number
	  }

function getPillPoints(width: number, height: number, numPoints: number) {
	const radius = Math.min(width, height) / 2
	const longSide = Math.max(width, height) - radius * 2
	const circumference = Math.PI * (radius * 2) + 2 * longSide
	const spacing = circumference / numPoints

	const sections: PillSection[] =
		width > height
			? [
					{
						type: 'straight',
						start: new Vec(radius, 0),
						delta: new Vec(1, 0),
					},
					{
						type: 'arc',
						center: new Vec(width - radius, radius),
						startAngle: -PI / 2,
					},
					{
						type: 'straight',
						start: new Vec(width - radius, height),
						delta: new Vec(-1, 0),
					},
					{
						type: 'arc',
						center: new Vec(radius, radius),
						startAngle: PI / 2,
					},
				]
			: [
					{
						type: 'straight',
						start: new Vec(width, radius),
						delta: new Vec(0, 1),
					},
					{
						type: 'arc',
						center: new Vec(radius, height - radius),
						startAngle: 0,
					},
					{
						type: 'straight',
						start: new Vec(0, height - radius),
						delta: new Vec(0, -1),
					},
					{
						type: 'arc',
						center: new Vec(radius, radius),
						startAngle: PI,
					},
				]

	let sectionOffset = 0

	const points: Vec[] = []
	for (let i = 0; i < numPoints; i++) {
		const section = sections[0]
		if (section.type === 'straight') {
			points.push(Vec.Add(section.start, Vec.Mul(section.delta, sectionOffset)))
		} else {
			points.push(
				getPointOnCircle(section.center, radius, section.startAngle + sectionOffset / radius)
			)
		}
		sectionOffset += spacing
		let sectionLength = section.type === 'straight' ? longSide : PI * radius
		while (sectionOffset > sectionLength) {
			sectionOffset -= sectionLength
			sections.push(sections.shift()!)
			sectionLength = sections[0].type === 'straight' ? longSide : PI * radius
		}
	}

	return points
}

const SIZES: Record<TLDefaultSizeStyle, number> = {
	s: 50,
	m: 70,
	l: 100,
	xl: 130,
}

const BUMP_PROTRUSION = 0.2

export function getCloudArcs(
	width: number,
	height: number,
	seed: string,
	size: TLDefaultSizeStyle
) {
	const getRandom = rng(seed)
	const pillCircumference = getOvalPerimeter(width, height)
	const numBumps = Math.max(
		Math.ceil(pillCircumference / SIZES[size]),
		6,
		Math.ceil(pillCircumference / Math.min(width, height))
	)
	const targetBumpProtrusion = (pillCircumference / numBumps) * BUMP_PROTRUSION

	// if the aspect ratio is high, innerWidth should be smaller
	const innerWidth = Math.max(width - targetBumpProtrusion * 2, 1)
	const innerHeight = Math.max(height - targetBumpProtrusion * 2, 1)
	const innerCircumference = getOvalPerimeter(innerWidth, innerHeight)

	const distanceBetweenPointsOnPerimeter = innerCircumference / numBumps

	const paddingX = (width - innerWidth) / 2
	const paddingY = (height - innerHeight) / 2
	const bumpPoints = getPillPoints(innerWidth, innerHeight, numBumps).map((p) => {
		return p.addXY(paddingX, paddingY)
	})
	const maxWiggleX = width < 20 ? 0 : targetBumpProtrusion * 0.3
	const maxWiggleY = height < 20 ? 0 : targetBumpProtrusion * 0.3

	// wiggle the points from either end so that the bumps 'pop'
	// in at the bottom-right and the top-left looks relatively stable
	// note: it's important that we don't mutate here! these points are also the bump points
	const wiggledPoints = bumpPoints.slice(0)
	for (let i = 0; i < Math.floor(numBumps / 2); i++) {
		wiggledPoints[i] = Vec.AddXY(
			wiggledPoints[i],
			getRandom() * maxWiggleX,
			getRandom() * maxWiggleY
		)
		wiggledPoints[numBumps - i - 1] = Vec.AddXY(
			wiggledPoints[numBumps - i - 1],
			getRandom() * maxWiggleX,
			getRandom() * maxWiggleY
		)
	}

	const arcs: Arc[] = []

	for (let i = 0; i < wiggledPoints.length; i++) {
		const j = i === wiggledPoints.length - 1 ? 0 : i + 1
		const leftWigglePoint = wiggledPoints[i]
		const rightWigglePoint = wiggledPoints[j]
		const leftPoint = bumpPoints[i]
		const rightPoint = bumpPoints[j]

		// when the points are on the curvy part of a pill, there is a natural arc that we need to extends past
		// otherwise it looks like the bumps get less bumpy on the curvy parts
		const distanceBetweenOriginalPoints = Vec.Dist(leftPoint, rightPoint)
		const curvatureOffset = distanceBetweenPointsOnPerimeter - distanceBetweenOriginalPoints
		const distanceBetweenWigglePoints = Vec.Dist(leftWigglePoint, rightWigglePoint)
		const relativeSize = distanceBetweenWigglePoints / distanceBetweenOriginalPoints
		const finalDistance = (Math.max(paddingX, paddingY) + curvatureOffset) * relativeSize

		const arcPoint = Vec.Lrp(leftPoint, rightPoint, 0.5).add(
			Vec.Sub(rightPoint, leftPoint).uni().per().mul(finalDistance)
		)
		if (arcPoint.x < 0) {
			arcPoint.x = 0
		} else if (arcPoint.x > width) {
			arcPoint.x = width
		}
		if (arcPoint.y < 0) {
			arcPoint.y = 0
		} else if (arcPoint.y > height) {
			arcPoint.y = height
		}

		const center = centerOfCircleFromThreePoints(leftWigglePoint, rightWigglePoint, arcPoint)
		const radius = Vec.Dist(
			center ? center : Vec.Average([leftWigglePoint, rightWigglePoint]),
			leftWigglePoint
		)

		// todo: could use Arc2d here

		arcs.push({
			leftPoint: leftWigglePoint,
			rightPoint: rightWigglePoint,
			arcPoint,
			center,
			radius,
		})
	}

	return arcs
}

interface Arc {
	leftPoint: Vec
	rightPoint: Vec
	arcPoint: Vec
	center: Vec | null
	radius: number
}

export function cloudOutline(
	width: number,
	height: number,
	seed: string,
	size: TLDefaultSizeStyle
) {
	const path: Vec[] = []

	const arcs = getCloudArcs(width, height, seed, size)

	for (const { center, radius, leftPoint, rightPoint } of arcs) {
		path.push(...getPointsOnArc(leftPoint, rightPoint, center, radius, 10))
	}

	return path
}

export function getCloudPath(
	width: number,
	height: number,
	seed: string,
	size: TLDefaultSizeStyle
) {
	// const points = cloudOutline(width, height, seed, size)
	// {
	// 	let path = `M${toDomPrecision(points[0].x)},${toDomPrecision(points[0].y)}`
	// 	for (const point of points.slice(1)) {
	// 		path += ` L${toDomPrecision(point.x)},${toDomPrecision(point.y)}`
	// 	}
	// 	return path
	// }

	const arcs = getCloudArcs(width, height, seed, size)
	let path = `M${arcs[0].leftPoint.toFixed()}`

	// now draw arcs for each circle, starting where it intersects the previous circle, and ending where it intersects the next circle
	for (const { leftPoint, rightPoint, radius, center } of arcs) {
		if (center === null) {
			// draw a line to rightPoint instead
			path += ` L${rightPoint.toFixed()}`
			continue
		}
		// use the large arc if the center of the circle is to the left of the line between the two points
		const arc = Vec.Clockwise(leftPoint, rightPoint, center) ? '0' : '1'
		path += ` A${toDomPrecision(radius)},${toDomPrecision(radius)} 0 ${arc},1 ${rightPoint.toFixed()}`
	}

	path += ' Z'
	return path
}

const DRAW_OFFSETS: Record<TLDefaultSizeStyle, number> = {
	s: 0.5,
	m: 0.7,
	l: 0.9,
	xl: 1.6,
}

export function inkyCloudSvgPath(
	width: number,
	height: number,
	seed: string,
	size: TLDefaultSizeStyle
) {
	const getRandom = rng(seed)
	const mutMultiplier = DRAW_OFFSETS[size]
	const arcs = getCloudArcs(width, height, seed, size)
	const avgArcLengthSquared =
		arcs.reduce((sum, arc) => sum + Vec.Dist2(arc.leftPoint, arc.rightPoint), 0) / arcs.length
	const shouldMutatePoints = avgArcLengthSquared > (mutMultiplier * 15) ** 2
	const mutPoint = shouldMutatePoints
		? (p: Vec) => p.addXY(getRandom() * mutMultiplier * 2, getRandom() * mutMultiplier * 2)
		: (p: Vec) => p
	let pathA = `M${arcs[0].leftPoint.toFixed()}`
	let leftMutPoint = mutPoint(arcs[0].leftPoint)
	let pathB = `M${leftMutPoint.toFixed()}`

	for (const { leftPoint, center, rightPoint, radius, arcPoint } of arcs) {
		if (center === null) {
			// draw a line to rightPoint instead
			pathA += ` L${rightPoint.toFixed()}`
			const rightMutPoint = mutPoint(rightPoint)
			pathB += ` L${rightMutPoint.toFixed()}`
			leftMutPoint = rightMutPoint
			continue
		}
		const arc = Vec.Clockwise(leftPoint, rightPoint, center) ? '0' : '1'
		pathA += ` A${toDomPrecision(radius)},${toDomPrecision(radius)} 0 ${arc},1 ${rightPoint.toFixed()}`
		const rightMutPoint = mutPoint(rightPoint)
		const mutArcPoint = mutPoint(arcPoint)
		const mutCenter = centerOfCircleFromThreePoints(leftMutPoint, rightMutPoint, mutArcPoint)

		// handle situations where the points are colinear (this happens when the cloud is very small)
		if (!Number.isFinite(mutCenter.x) || !Number.isFinite(mutCenter.y)) {
			// draw a line to rightMutPoint instead
			pathB += ` L${rightMutPoint.toFixed()}`
			leftMutPoint = rightMutPoint
			continue
		}

		const mutRadius = Math.abs(Vec.Dist(mutCenter, leftMutPoint))
		pathB += ` A${toDomPrecision(mutRadius)},${toDomPrecision(
			mutRadius
		)} 0 ${arc},1 ${rightMutPoint.toFixed()}`
		leftMutPoint = rightMutPoint
	}

	return pathA + pathB + ' Z'
}
