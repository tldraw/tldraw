import { Vec, VecLike } from '@tldraw/editor'
import { ElbowArrowRoute } from '../definitions'
import { ElbowArrowWorkingInfo } from './ElbowArrowWorkingInfo'

const MIN_DISTANCE = 0.01

export class ElbowArrowRouteBuilder2 {
	points: Vec[] = []

	constructor(
		private readonly info: ElbowArrowWorkingInfo,
		public readonly name: string
	) {}

	add(x: number, y: number): this {
		const p0 = this.info.vec(x, y)
		const p1 = this.points[this.points.length - 1]
		const p2 = this.points[this.points.length - 2]

		if (!p1 || !p2) {
			this.points.push(p0)
		} else {
			const d1x = Math.abs(p0.x - p1.x)
			const d1y = Math.abs(p0.y - p1.y)
			const d2x = Math.abs(p0.x - p2.x)
			const d2y = Math.abs(p0.y - p2.y)

			if (d1x < MIN_DISTANCE && d1y < MIN_DISTANCE) {
				// this point is basically in the same place as the last one, so ignore it
			} else if (d1x < MIN_DISTANCE && d2x < MIN_DISTANCE) {
				// this coord is extending the same vertical line as the last two, so update the
				// last point to this one.
				p1.y = p0.y
			} else if (d1y < MIN_DISTANCE && d2y < MIN_DISTANCE) {
				// this coord is extending the same horizontal line as the last two, so update the
				// last point to this one.
				p1.x = p0.x
			} else {
				// this coord is changing direction, so add it to the points
				this.points.push(p0)
			}
		}

		return this
	}

	build(): ElbowArrowRoute {
		return {
			name: this.name,
			points: this.points,
			distance: measureRouteManhattanDistance(this.points),
			aEdgePicking: 'manual',
			bEdgePicking: 'manual',
		}
	}
}

function measureRouteManhattanDistance(path: VecLike[]): number {
	let distance = 0
	for (let i = 0; i < path.length - 1; i++) {
		const start = path[i]
		const end = path[i + 1]
		distance += Math.abs(end.x - start.x) + Math.abs(end.y - start.y)
	}
	return distance
}
