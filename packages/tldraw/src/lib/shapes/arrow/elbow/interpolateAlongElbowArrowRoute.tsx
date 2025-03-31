import { assert, invLerp, Vec } from '@tldraw/editor'
import { ElbowArrowRoute } from './elbowArrowRoutes'

export function interpolateAlongElbowArrowRoute(route: ElbowArrowRoute, point: number) {
	if (point <= 0) return route.points[0]

	const targetDistance = route.distance * point

	let traveledSoFar = 0
	for (let i = 1; i < route.points.length; i++) {
		const prev = route.points[i - 1]
		const next = route.points[i]

		const segmentDistance = Vec.ManhattanDist(prev, next)
		if (segmentDistance + traveledSoFar < targetDistance) {
			traveledSoFar += segmentDistance
			continue
		}

		const targetPosInSegment = invLerp(
			traveledSoFar,
			traveledSoFar + segmentDistance,
			targetDistance
		)
		return Vec.Lrp(prev, next, targetPosInSegment)
	}

	return route.points[route.points.length - 1]
}

export function uninterpolateAlongElbowArrowRoute(route: ElbowArrowRoute, point: Vec) {
	let closestSegment = null
	let closestDistance = Infinity
	let distanceTraveled = 0

	for (let i = 1; i < route.points.length; i++) {
		const prev = route.points[i - 1]
		const next = route.points[i]

		const nearestPoint = Vec.NearestPointOnLineSegment(prev, next, point, true)
		const distance = Vec.Dist(nearestPoint, point)

		if (distance < closestDistance) {
			closestDistance = distance
			closestSegment = {
				start: prev,
				end: next,
				nearestPoint,
				distanceToStart: distanceTraveled,
			}
		}

		distanceTraveled += Vec.ManhattanDist(prev, next)
	}

	assert(closestSegment)

	const distanceAlongRoute =
		closestSegment.distanceToStart +
		Vec.ManhattanDist(closestSegment.start, closestSegment.nearestPoint)

	return distanceAlongRoute / route.distance
}
