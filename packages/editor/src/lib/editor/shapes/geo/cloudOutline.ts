import { PI, Vec2d, getPointOnCircle, shortAngleDist } from '@tldraw/primitives'
import { TLDefaultSizeStyle, Vec2dModel } from '@tldraw/tlschema'
import { rng } from '@tldraw/utils'

function getPillCircumference(width: number, height: number) {
	const radius = Math.min(width, height) / 2
	const longSide = Math.max(width, height) - radius * 2

	return Math.PI * (radius * 2) + 2 * longSide
}

type PillSection =
	| {
			type: 'straight'
			start: Vec2dModel
			delta: Vec2dModel
	  }
	| {
			type: 'arc'
			center: Vec2dModel
			startAngle: number
	  }

export function getPillPoints(width: number, height: number, numPoints: number) {
	const radius = Math.min(width, height) / 2
	const longSide = Math.max(width, height) - radius * 2

	const circumference = Math.PI * (radius * 2) + 2 * longSide

	const spacing = circumference / numPoints

	const sections: PillSection[] =
		width > height
			? [
					{
						type: 'straight',
						start: new Vec2d(radius, 0),
						delta: new Vec2d(1, 0),
					},
					{
						type: 'arc',
						center: new Vec2d(width - radius, radius),
						startAngle: -PI / 2,
					},
					{
						type: 'straight',
						start: new Vec2d(width - radius, height),
						delta: new Vec2d(-1, 0),
					},
					{
						type: 'arc',
						center: new Vec2d(radius, radius),
						startAngle: PI / 2,
					},
			  ]
			: [
					{
						type: 'straight',
						start: new Vec2d(width, radius),
						delta: new Vec2d(0, 1),
					},
					{
						type: 'arc',
						center: new Vec2d(radius, height - radius),
						startAngle: 0,
					},
					{
						type: 'straight',
						start: new Vec2d(0, height - radius),
						delta: new Vec2d(0, -1),
					},
					{
						type: 'arc',
						center: new Vec2d(radius, radius),
						startAngle: PI,
					},
			  ]

	let sectionOffset = 0

	const points: Vec2d[] = []
	for (let i = 0; i < numPoints; i++) {
		const section = sections[0]
		if (section.type === 'straight') {
			points.push(Vec2d.Add(section.start, Vec2d.Mul(section.delta, sectionOffset)))
		} else {
			points.push(
				getPointOnCircle(
					section.center.x,
					section.center.y,
					radius,
					section.startAngle + sectionOffset / radius
				)
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

const switchSize = <T>(size: TLDefaultSizeStyle, s: T, m: T, l: T, xl: T) => {
	switch (size) {
		case 's':
			return s
		case 'm':
			return m
		case 'l':
			return l
		case 'xl':
			return xl
	}
}

export function getCloudArcs(
	width: number,
	height: number,
	seed: string,
	size: TLDefaultSizeStyle
) {
	const getRandom = rng(seed)
	const pillCircumference = getPillCircumference(width, height)
	const numBumps = Math.max(Math.ceil(pillCircumference / switchSize(size, 50, 70, 100, 130)), 6)
	const targetBumpProtrusion = (pillCircumference / numBumps) * 0.2

	// if the aspect ratio is high, innerWidth should be smaller
	const innerWidth = Math.max(width - targetBumpProtrusion * 2, 1)
	const innerHeight = Math.max(height - targetBumpProtrusion * 2, 1)
	const paddingX = (width - innerWidth) / 2
	const paddingY = (height - innerHeight) / 2

	const distanceBetweenPointsOnPerimeter = getPillCircumference(innerWidth, innerHeight) / numBumps

	const bumpPoints = getPillPoints(innerWidth, innerHeight, numBumps).map((p) => {
		return p.addXY(paddingX, paddingY)
	})

	const maxWiggle = targetBumpProtrusion * 0.3

	// wiggle the points from either end so that the bumps 'pop'
	// in at the bottom-right and the top-left looks relatively stable
	const wiggledPoints = bumpPoints.slice(0)
	for (let i = 0; i < Math.floor(numBumps / 2); i++) {
		wiggledPoints[i] = Vec2d.AddXY(
			wiggledPoints[i],
			getRandom() * maxWiggle,
			getRandom() * maxWiggle
		)
		wiggledPoints[numBumps - i - 1] = Vec2d.AddXY(
			wiggledPoints[numBumps - i - 1],
			getRandom() * maxWiggle,
			getRandom() * maxWiggle
		)
	}

	const arcs: Arc[] = []

	for (let i = 0; i < wiggledPoints.length; i++) {
		const j = i === wiggledPoints.length - 1 ? 0 : i + 1
		const leftWigglePoint = wiggledPoints[i]
		const rightWigglePoint = wiggledPoints[j]
		const leftPoint = bumpPoints[i]
		const rightPoint = bumpPoints[j]

		const midPoint = Vec2d.Average([leftPoint, rightPoint])
		const offsetAngle = Vec2d.Angle(leftPoint, rightPoint) - Math.PI / 2
		// when the points are on the curvy part of a pill, there is a natural arc that we need to extends past
		// otherwise it looks like the bumps get less bumpy on the curvy parts
		const distanceBetweenOriginalPoints = Vec2d.Dist(leftPoint, rightPoint)
		const curvatureOffset = distanceBetweenPointsOnPerimeter - distanceBetweenOriginalPoints
		const distanceBetweenWigglePoints = Vec2d.Dist(leftWigglePoint, rightWigglePoint)
		const relativeSize = distanceBetweenWigglePoints / distanceBetweenOriginalPoints
		const finalDistance = (Math.max(paddingX, paddingY) + curvatureOffset) * relativeSize

		const arcPoint = Vec2d.Add(midPoint, Vec2d.FromAngle(offsetAngle, finalDistance))
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

		const center = getCenterOfCircleGivenThreePoints(leftWigglePoint, rightWigglePoint, arcPoint)
		const radius = Vec2d.Dist(center, leftWigglePoint)

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
	leftPoint: Vec2d
	rightPoint: Vec2d
	arcPoint: Vec2d
	center: Vec2d
	radius: number
}

function getCenterOfCircleGivenThreePoints(a: Vec2d, b: Vec2d, c: Vec2d) {
	const A = a.x * (b.y - c.y) - a.y * (b.x - c.x) + b.x * c.y - c.x * b.y
	const B =
		(a.x * a.x + a.y * a.y) * (c.y - b.y) +
		(b.x * b.x + b.y * b.y) * (a.y - c.y) +
		(c.x * c.x + c.y * c.y) * (b.y - a.y)
	const C =
		(a.x * a.x + a.y * a.y) * (b.x - c.x) +
		(b.x * b.x + b.y * b.y) * (c.x - a.x) +
		(c.x * c.x + c.y * c.y) * (a.x - b.x)

	const x = -B / (2 * A)
	const y = -C / (2 * A)

	// handle situations where the points are colinear (this happens when the cloud is very small)
	if (!Number.isFinite(x) || !Number.isFinite(y)) {
		return Vec2d.Average([a, b, c])
	}

	return new Vec2d(x, y)
}

export function cloudOutline(
	width: number,
	height: number,
	seed: string,
	size: TLDefaultSizeStyle
) {
	const path: Vec2d[] = []

	const arcs = getCloudArcs(width, height, seed, size)

	for (const { center, radius, leftPoint, rightPoint } of arcs) {
		path.push(...pointsOnArc(leftPoint, rightPoint, center, radius, 10))
	}

	return path
}

export function cloudSvgPath(
	width: number,
	height: number,
	seed: string,
	size: TLDefaultSizeStyle
) {
	const arcs = getCloudArcs(width, height, seed, size)
	let path = `M${arcs[0].leftPoint.x},${arcs[0].leftPoint.y}`

	// now draw arcs for each circle, starting where it intersects the previous circle, and ending where it intersects the next circle
	for (const { rightPoint, radius } of arcs) {
		path += ` A${radius},${radius} 0 0,1 ${rightPoint.x},${rightPoint.y}`
	}

	path += ' Z'
	return path
}

export function inkyCloudSvgPath(
	width: number,
	height: number,
	seed: string,
	size: TLDefaultSizeStyle
) {
	const getRandom = rng(seed)
	const mut = (n: number) => {
		const multiplier = size === 's' ? 0.5 : size === 'm' ? 0.7 : size === 'l' ? 0.9 : 1.6
		return n + getRandom() * multiplier * 2
	}
	const mutPoint = (p: Vec2d) => new Vec2d(mut(p.x), mut(p.y))
	const arcs = getCloudArcs(width, height, seed, size)
	let pathA = `M${arcs[0].leftPoint.x},${arcs[0].leftPoint.y}`
	let leftMutPoint = mutPoint(arcs[0].leftPoint)
	let pathB = `M${leftMutPoint.x},${leftMutPoint.y}`

	for (const { rightPoint, radius, arcPoint } of arcs) {
		pathA += ` A${radius},${radius} 0 0,1 ${rightPoint.x},${rightPoint.y}`
		const rightMutPoint = mutPoint(rightPoint)
		const mutArcPoint = mutPoint(arcPoint)
		const mutCenter = getCenterOfCircleGivenThreePoints(leftMutPoint, rightMutPoint, mutArcPoint)
		const mutRadius = Math.abs(Vec2d.Dist(mutCenter, leftMutPoint))

		pathB += ` A${mutRadius},${mutRadius} 0 0,1 ${rightMutPoint.x},${rightMutPoint.y}`
		leftMutPoint = rightMutPoint
	}

	return pathA + pathB + ' Z'
}

export function pointsOnArc(
	startPoint: Vec2dModel,
	endPoint: Vec2dModel,
	center: Vec2dModel,
	radius: number,
	numPoints: number
): Vec2d[] {
	const results: Vec2d[] = []

	const startAngle = Vec2d.Angle(center, startPoint)
	const endAngle = Vec2d.Angle(center, endPoint)

	const l = shortAngleDist(startAngle, endAngle)

	for (let i = 0; i < numPoints; i++) {
		const t = i / (numPoints - 1)
		const angle = startAngle + l * t
		const point = getPointOnCircle(center.x, center.y, radius, angle)
		results.push(point)
	}

	return results
}
