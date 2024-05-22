import {
	PI,
	TLDefaultSizeStyle,
	Vec,
	VecModel,
	centerOfCircleFromThreePoints,
	getPointOnCircle,
	getPointsOnArc,
	rng,
	toDomPrecision,
} from '@tldraw/editor'
import { getOvalPerimeter } from './geo-shape-helpers'

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

type Arc = {
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
	let path = `M${toDomPrecision(arcs[0].leftPoint.x)},${toDomPrecision(arcs[0].leftPoint.y)}`

	// now draw arcs for each circle, starting where it intersects the previous circle, and ending where it intersects the next circle
	for (const { leftPoint, rightPoint, radius, center } of arcs) {
		if (center === null) {
			// draw a line to rightPoint instead
			path += ` L${toDomPrecision(rightPoint.x)},${toDomPrecision(rightPoint.y)}`
			continue
		}
		// use the large arc if the center of the circle is to the left of the line between the two points
		const arc = Vec.Clockwise(leftPoint, rightPoint, center) ? '0' : '1'
		path += ` A${toDomPrecision(radius)},${toDomPrecision(radius)} 0 ${arc},1 ${toDomPrecision(
			rightPoint.x
		)},${toDomPrecision(rightPoint.y)}`
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
	let pathA = `M${toDomPrecision(arcs[0].leftPoint.x)},${toDomPrecision(arcs[0].leftPoint.y)}`
	let leftMutPoint = mutPoint(arcs[0].leftPoint)
	let pathB = `M${toDomPrecision(leftMutPoint.x)},${toDomPrecision(leftMutPoint.y)}`

	for (const { leftPoint, center, rightPoint, radius, arcPoint } of arcs) {
		if (center === null) {
			// draw a line to rightPoint instead
			pathA += ` L${toDomPrecision(rightPoint.x)},${toDomPrecision(rightPoint.y)}`
			const rightMutPoint = mutPoint(rightPoint)
			pathB += ` L${toDomPrecision(rightMutPoint.x)},${toDomPrecision(rightMutPoint.y)}`
			leftMutPoint = rightMutPoint
			continue
		}
		const arc = Vec.Clockwise(leftPoint, rightPoint, center) ? '0' : '1'
		pathA += ` A${toDomPrecision(radius)},${toDomPrecision(radius)} 0 ${arc},1 ${toDomPrecision(
			rightPoint.x
		)},${toDomPrecision(rightPoint.y)}`
		const rightMutPoint = mutPoint(rightPoint)
		const mutArcPoint = mutPoint(arcPoint)
		const mutCenter = centerOfCircleFromThreePoints(leftMutPoint, rightMutPoint, mutArcPoint)

		// handle situations where the points are colinear (this happens when the cloud is very small)
		if (!Number.isFinite(mutCenter.x) || !Number.isFinite(mutCenter.y)) {
			// draw a line to rightMutPoint instead
			pathB += ` L${toDomPrecision(rightMutPoint.x)},${toDomPrecision(rightMutPoint.y)}`
			leftMutPoint = rightMutPoint
			continue
		}

		const mutRadius = Math.abs(Vec.Dist(mutCenter, leftMutPoint))
		pathB += ` A${toDomPrecision(mutRadius)},${toDomPrecision(
			mutRadius
		)} 0 ${arc},1 ${toDomPrecision(rightMutPoint.x)},${toDomPrecision(rightMutPoint.y)}`
		leftMutPoint = rightMutPoint
	}

	return pathA + pathB + ' Z'
}
