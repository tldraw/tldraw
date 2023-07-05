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
			offset: number
	  }
	| {
			type: 'arc'
			center: Vec2dModel
			startAngle: number
			offset: number
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
						start: new Vec2d(radius, 0),
						delta: new Vec2d(1, 0),
						offset: 0,
					},
					{
						type: 'arc',
						center: new Vec2d(width - radius, radius),
						startAngle: -PI / 2,
						offset: longSide,
					},
					{
						type: 'straight',
						start: new Vec2d(width - radius, height),
						delta: new Vec2d(-1, 0),
						offset: longSide + PI * radius,
					},
					{
						type: 'arc',
						center: new Vec2d(radius, radius),
						startAngle: PI / 2,
						offset: longSide * 2 + PI * radius,
					},
			  ]
			: [
					{
						type: 'straight',
						start: new Vec2d(width, radius),
						delta: new Vec2d(0, 1),
						offset: 0,
					},
					{
						type: 'arc',
						center: new Vec2d(radius, height - radius),
						startAngle: 0,
						offset: longSide,
					},
					{
						type: 'straight',
						start: new Vec2d(0, height - radius),
						delta: new Vec2d(0, -1),
						offset: longSide + PI * radius,
					},
					{
						type: 'arc',
						center: new Vec2d(radius, radius),
						startAngle: PI,
						offset: longSide * 2 + PI * radius,
					},
			  ]

	const points: Vec2d[] = []
	for (let i = 0; i < numPoints; i++) {
		const dist = i * spacing
		let section = sections[0]
		if (sections[1] && dist > sections[1].offset) {
			sections.shift()
			section = sections[0]
		}

		const distFromOffset = dist - section.offset
		if (section.type === 'straight') {
			points.push(Vec2d.Add(section.start, Vec2d.Mul(section.delta, distFromOffset)))
		} else {
			points.push(
				getPointOnCircle(
					section.center.x,
					section.center.y,
					radius,
					section.startAngle + distFromOffset / radius
				)
			)
		}
	}
	return points
}

function getCloudArcPoints(width: number, height: number, seed: string, size: TLDefaultSizeStyle) {
	const getRandom = rng(seed)
	const radius = Math.max(Math.min((width + height) / 13, 50), 1)
	const spacingModifier = size === 's' ? 1.5 : size === 'm' ? 1.8 : size === 'l' ? 2.6 : 3.6
	const goalSpacing = radius * spacingModifier + getRandom() * radius * 0.4
	const pillCircumference = getPillCircumference(width, height)

	const numBalls = Math.max(Math.ceil(pillCircumference / goalSpacing), 9)

	const wiggle = radius / 6

	return getPillPoints(width, height, numBalls).map((p) => {
		return new Vec2d(p.x + getRandom() * wiggle, p.y + getRandom() * wiggle)
	})
}

export function getCloudArc(leftPoint: Vec2d, rightPoint: Vec2d) {
	const center = Vec2d.Average([leftPoint, rightPoint])
	const offsetAngle = Vec2d.Angle(center, leftPoint) - Math.PI / 2
	const actualCenter = Vec2d.Add(
		center,
		Vec2d.FromAngle(offsetAngle, Vec2d.Dist(leftPoint, rightPoint) / 3)
	)

	const radius = Vec2d.Dist(actualCenter, leftPoint)

	return {
		leftPoint,
		rightPoint,
		center: actualCenter,
		radius,
	}
}

type Arc = ReturnType<typeof getCloudArc>

export function getCloudArcs(
	width: number,
	height: number,
	seed: string,
	size: TLDefaultSizeStyle
) {
	const points = getCloudArcPoints(width, height, seed, size)
	const arcs: Arc[] = []
	for (let i = 0; i < points.length; i++) {
		const leftPoint = points[i]
		const rightPoint = points[i === points.length - 1 ? 0 : i + 1]

		arcs.push(getCloudArc(leftPoint, rightPoint))
	}
	return arcs
}

export function cloudOutline(
	width: number,
	height: number,
	seed: string,
	size: TLDefaultSizeStyle
) {
	const path: Vec2d[] = []

	for (const { center, radius, leftPoint, rightPoint } of getCloudArcs(width, height, seed, size)) {
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
	const arcs = getCloudArcs(width, height, seed, size)
	let pathA = `M${arcs[0].leftPoint.x},${arcs[0].leftPoint.y}`
	let pathB = `M${mut(arcs[0].leftPoint.x)},${mut(arcs[0].leftPoint.y)}`

	// now draw arcs for each circle, starting where it intersects the previous circle, and ending where it intersects the next circle
	for (const { rightPoint, radius } of arcs) {
		pathA += ` A${radius},${radius} 0 0,1 ${rightPoint.x},${rightPoint.y}`
		pathB += ` A${radius},${radius} 0 0,1 ${mut(rightPoint.x)},${mut(rightPoint.y)}`
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
