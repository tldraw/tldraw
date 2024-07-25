import { Vec, VecLike, assert, average, precise, toDomPrecision } from '@tldraw/editor'
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
	const partitions = partitionAtElbows(points)
	let svg = ''
	for (const partition of partitions) {
		svg += renderPartition(partition, options)
	}

	return svg
}

function partitionAtElbows(points: StrokePoint[]): StrokePoint[][] {
	if (points.length <= 2) return [points]

	const result: StrokePoint[][] = []
	let currentPartition: StrokePoint[] = [points[0]]
	let prevV = Vec.Sub(points[1].point, points[0].point).uni()
	let nextV: Vec
	let dpr: number
	let prevPoint: StrokePoint, thisPoint: StrokePoint, nextPoint: StrokePoint
	for (let i = 1, n = points.length; i < n - 1; i++) {
		prevPoint = points[i - 1]
		thisPoint = points[i]
		nextPoint = points[i + 1]

		nextV = Vec.Sub(nextPoint.point, thisPoint.point).uni()
		dpr = Vec.Dpr(prevV, nextV)
		prevV = nextV

		if (dpr < -0.8) {
			// always treat such acute angles as elbows
			// and use the extended .input point as the elbow point for swooshiness in fast zaggy lines
			const elbowPoint = {
				...thisPoint,
				point: thisPoint.input,
			}
			currentPartition.push(elbowPoint)
			result.push(cleanUpPartition(currentPartition))
			currentPartition = [elbowPoint]
			continue
		}
		currentPartition.push(thisPoint)

		if (dpr > 0.7) {
			// Not an elbow
			continue
		}

		// so now we have a reasonably acute angle but it might not be an elbow if it's far
		// away from it's neighbors, angular dist is a normalized representation of how far away the point is from it's neighbors
		// (normalized by the radius)
		if (
			(Vec.Dist2(prevPoint.point, thisPoint.point) + Vec.Dist2(thisPoint.point, nextPoint.point)) /
				((prevPoint.radius + thisPoint.radius + nextPoint.radius) / 3) ** 2 <
			1.5
		) {
			// if this point is kinda close to its neighbors and it has a reasonably
			// acute angle, it's probably a hard elbow
			currentPartition.push(thisPoint)
			result.push(cleanUpPartition(currentPartition))
			currentPartition = [thisPoint]
			continue
		}
	}
	currentPartition.push(points[points.length - 1])
	result.push(cleanUpPartition(currentPartition))

	return result
}

function cleanUpPartition(partition: StrokePoint[]) {
	// clean up start of partition (remove points that are too close to the start)
	const startPoint = partition[0]
	let nextPoint: StrokePoint
	while (partition.length > 2) {
		nextPoint = partition[1]
		if (
			Vec.Dist2(startPoint.point, nextPoint.point) <
			(((startPoint.radius + nextPoint.radius) / 2) * 0.5) ** 2
		) {
			partition.splice(1, 1)
		} else {
			break
		}
	}
	// clean up end of partition in the same fashion
	const endPoint = partition[partition.length - 1]
	let prevPoint: StrokePoint
	while (partition.length > 2) {
		prevPoint = partition[partition.length - 2]
		if (
			Vec.Dist2(endPoint.point, prevPoint.point) <
			(((endPoint.radius + prevPoint.radius) / 2) * 0.5) ** 2
		) {
			partition.splice(partition.length - 2, 1)
		} else {
			break
		}
	}
	// now readjust the cap point vectors to point to their nearest neighbors
	if (partition.length > 1) {
		partition[0] = {
			...partition[0],
			vector: Vec.Sub(partition[0].point, partition[1].point).uni(),
		}
		partition[partition.length - 1] = {
			...partition[partition.length - 1],
			vector: Vec.Sub(
				partition[partition.length - 2].point,
				partition[partition.length - 1].point
			).uni(),
		}
	}
	return partition
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

function renderPartition(strokePoints: StrokePoint[], options: StrokeOptions = {}): string {
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
		const arcStart = Vec.Add(point.point, Vec.Mul(direction, radius))
		const arcEnd = Vec.Add(point.point, Vec.Mul(direction, -radius))
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
		const arcStart = Vec.Add(point.point, Vec.Mul(direction, radius))
		const arcEnd = Vec.Add(point.point, Vec.Mul(direction, -radius))
		svg += `${precise(arcStart)}A${toDomPrecision(radius)},${toDomPrecision(
			radius
		)} 0 0 1 ${precise(arcEnd)}Z`
	}
	return svg
}
