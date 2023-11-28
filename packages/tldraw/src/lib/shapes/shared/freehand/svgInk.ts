import {
	Vec2d,
	VecLike,
	assert,
	average,
	canonicalizeRotation,
	precise,
	shortAngleDist,
	toDomPrecision,
} from '@tldraw/editor'
import { getStrokeOutlineTracks } from './getStrokeOutlinePoints'
import { getStrokePoints } from './getStrokePoints'
import { setStrokePointRadii } from './setStrokePointRadii'
import { StrokeOptions, StrokePoint } from './types'

export function svgInk(rawInputPoints: VecLike[], options: StrokeOptions = {}) {
	const { start = {}, end = {} } = options
	const { cap: capStart = true } = start
	const { cap: capEnd = true } = end
	assert(!start.taper && !end.taper, 'cap taper not supported here')
	assert(!start.easing && !end.easing, 'cap easing not supported here')
	assert(capStart && capEnd, 'cap must be true')

	const points = getStrokePoints(rawInputPoints, options)
	setStrokePointRadii(points, options)
	const [elbowIndices, superElbowIndices] = getElbowIndices(points)
	const partitions = partitionByAngle(points, elbowIndices, superElbowIndices)
	let svg = ''
	for (const partition of partitions) {
		svg += renderPartition(partition, options)
	}

	return svg
}

function averageAngle(a: number, b: number) {
	const diff = shortAngleDist(a, b)
	return a + diff / 2
}

function getElbowIndices(points: StrokePoint[]): [number[], number[]] {
	if (points.length === 1) return [[0], []]
	if (points.length === 2) return [[0, 1], []]

	const withAngles = [
		{
			point: points[0],
			angle: Vec2d.Angle(points[0].point, points[1].point),
			acuteness: 1,
			angularDist: +Infinity,
		},
	] as { point: StrokePoint; angle: number; acuteness: number; angularDist: number }[]
	for (let i = 1; i < points.length - 1; i++) {
		const prevPoint = points[i - 1]
		const thisPoint = points[i]
		const nextPoint = points[i + 1]
		const prevAngle = Vec2d.Angle(prevPoint.point, thisPoint.point)
		const nextAngle = Vec2d.Angle(thisPoint.point, nextPoint.point)
		// acuteness is a normalized representation of how acute the angle is.
		// 1 is an infinitely thin wedge
		// 0 is a straight line
		const acuteness = Math.abs(shortAngleDist(prevAngle, nextAngle)) / Math.PI
		const avgRadius = (prevPoint.radius + thisPoint.radius + nextPoint.radius) / 3
		const incomingNormalizedDist = Vec2d.Dist(prevPoint.point, thisPoint.point) / avgRadius
		const outgoingNormalizedDist = Vec2d.Dist(thisPoint.point, nextPoint.point) / avgRadius
		// angular dist is a normalized representation of how far away the point is from it's neighbors
		// (normalized by the radius)
		// if it's far away from both neighbors and the angle is not particularly acute, it's probably
		// best to treat it as a soft curvy elbow rather than a hard elbow
		const angularDist = incomingNormalizedDist + outgoingNormalizedDist
		withAngles.push({
			point: thisPoint,
			angle: canonicalizeRotation(averageAngle(prevAngle, nextAngle)),
			acuteness,
			angularDist,
		})
	}
	withAngles.push({
		point: points[points.length - 1],
		angle: Vec2d.Angle(points[points.length - 2].point, points[points.length - 1].point),
		acuteness: 1,
		angularDist: +Infinity,
	})
	const elbowIndices = [0]
	const superElbowIndices = []
	for (let i = 1; i < withAngles.length - 1; i++) {
		const point = withAngles[i]
		if (point.acuteness > 0.8) {
			elbowIndices.push(i)
			superElbowIndices.push(i)
		} else if (point.acuteness > 0.25 && point.angularDist < 1.5) {
			elbowIndices.push(i)
		}
	}
	elbowIndices.push(points.length - 1)
	return [elbowIndices, superElbowIndices]
}

function partitionByAngle(
	points: StrokePoint[],
	elbowIndices: number[],
	superElbowIndices: number[]
): StrokePoint[][] {
	if (points.length <= 2) return [points]

	if (superElbowIndices.length) {
		points = points.map((point, i) => {
			if (!superElbowIndices.includes(i)) {
				return point
			}
			return {
				...point,
				point: point.input,
			}
		})
	}

	const partitions: StrokePoint[][] = []

	for (let i = 0; i < elbowIndices.length - 1; i++) {
		const start = elbowIndices[i]
		const end = elbowIndices[i + 1]
		const partition = points.slice(start, end + 1)
		// clean up start of partition
		const startPoint = partition[0]
		while (partition.length > 2) {
			const nextPoint = partition[1]
			// if the two are very close to each other
			const dist = Vec2d.Dist(startPoint.point, nextPoint.point)
			const avgRadius = (startPoint.radius + nextPoint.radius) / 2
			if (dist < avgRadius * 0.5) {
				partition.splice(1, 1)
			} else {
				break
			}
		}
		// clean up end of partition
		const endPoint = partition[partition.length - 1]
		while (partition.length > 2) {
			const prevPoint = partition[partition.length - 2]
			const dist = Vec2d.Dist(endPoint.point, prevPoint.point)
			const avgRadius = (endPoint.radius + prevPoint.radius) / 2
			if (dist < avgRadius * 0.5) {
				partition.splice(partition.length - 2, 1)
			} else {
				break
			}
		}
		if (partition.length > 1) {
			partition[0] = {
				...partition[0],
				vector: Vec2d.FromAngle(Vec2d.Angle(partition[1].point, partition[0].point)),
			}
			partition[partition.length - 1] = {
				...partition[partition.length - 1],
				vector: Vec2d.FromAngle(
					Vec2d.Angle(partition[partition.length - 1].point, partition[partition.length - 2].point)
				),
			}
		}
		partitions.push(partition)
	}

	return partitions
}

function circlePath(cx: number, cy: number, r: number) {
	return (
		'M ' +
		cx +
		' ' +
		cy +
		' m -' +
		r +
		', 0 a ' +
		r +
		',' +
		r +
		' 0 1,1 ' +
		r * 2 +
		',0 a ' +
		r +
		',' +
		r +
		' 0 1,1 -' +
		r * 2 +
		',0'
	)
}

export function renderPartition(strokePoints: StrokePoint[], options: StrokeOptions = {}): string {
	if (strokePoints.length === 0) return ''
	if (strokePoints.length === 1) {
		return circlePath(strokePoints[0].point.x, strokePoints[0].point.y, strokePoints[0].radius)
	}

	const { left, right } = getStrokeOutlineTracks(strokePoints, options)
	right.reverse()
	let svg = `M${precise(left[0])}T`

	// draw left track
	for (let i = 1; i < left.length; i++) {
		svg += average(left[i - 1], left[i])
	}
	// draw end cap arc
	{
		const point = strokePoints[strokePoints.length - 1]
		const radius = point.radius
		const direction = point.vector.clone().per().neg()
		const arcStart = Vec2d.Add(point.point, Vec2d.Mul(direction, radius))
		const arcEnd = Vec2d.Add(point.point, Vec2d.Mul(direction, -radius))
		svg += `${precise(arcStart)}A${toDomPrecision(radius)},${toDomPrecision(
			radius
		)} 0 0 1 ${precise(arcEnd)}T`
	}
	// draw right track
	for (let i = 1; i < right.length; i++) {
		svg += average(right[i - 1], right[i])
	}
	// draw start cap arc
	{
		const point = strokePoints[0]
		const radius = point.radius
		const direction = point.vector.clone().per()
		const arcStart = Vec2d.Add(point.point, Vec2d.Mul(direction, radius))
		const arcEnd = Vec2d.Add(point.point, Vec2d.Mul(direction, -radius))
		svg += `${precise(arcStart)}A${toDomPrecision(radius)},${toDomPrecision(
			radius
		)} 0 0 1 ${precise(arcEnd)}Z`
	}
	return svg
}
