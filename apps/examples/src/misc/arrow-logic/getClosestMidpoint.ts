import { Box, Vec } from 'tldraw'
import { DIRS } from './constants'

export function getClosestMidpoint(box: Box, otherPoint: Vec) {
	let minDist = Infinity
	let result: Vec | undefined

	for (const dir of DIRS) {
		let point: Vec | undefined
		if (dir.x === 1 && dir.y === 0) {
			point = new Vec(box.maxX, box.midY)
		} else if (dir.x === -1 && dir.y === 0) {
			point = new Vec(box.minX, box.midY)
		} else if (dir.x === 0 && dir.y === 1) {
			point = new Vec(box.midX, box.maxY)
		} else if (dir.x === 0 && dir.y === -1) {
			point = new Vec(box.midX, box.minY)
		}

		if (!point) throw Error()

		const dist = Vec.Dist2(point, otherPoint)
		if (dist < minDist) {
			minDist = dist
			result = point
		}
	}

	if (!result) throw Error()

	return result
}
