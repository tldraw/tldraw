import { assert, Vec, VecLike } from '@tldraw/editor'
import { ElbowArrowMidpointHandle, ElbowArrowRoute } from '../definitions'
import { ElbowArrowWorkingInfo } from './ElbowArrowWorkingInfo'

const MIN_DISTANCE = 0.01

export class ElbowArrowRouteBuilder {
	points: Vec[] = []

	constructor(
		private readonly info: ElbowArrowWorkingInfo,
		public readonly name: string
	) {}

	add(x: number, y: number): this {
		this.points.push(this.info.vec(x, y))

		return this
	}

	private _midpointHandle: ElbowArrowMidpointHandle | null = null
	midpointHandle(axis: 'x' | 'y'): this {
		assert(this._midpointHandle === null, 'midX/midY called multiple times')

		const point = Vec.Lrp(
			this.points[this.points.length - 2],
			this.points[this.points.length - 1],
			0.5
		)

		this._midpointHandle = {
			axis: this.info.transform.transpose ? (axis === 'x' ? 'y' : 'x') : axis,
			point,
			segmentStart: this.points[this.points.length - 2].clone(),
			segmentEnd: this.points[this.points.length - 1].clone(),
		}

		return this
	}

	build(): ElbowArrowRoute {
		const finalPoints = []
		for (let i = 0; i < this.points.length; i++) {
			const p0 = this.points[i]
			const p1 = finalPoints[finalPoints.length - 1]
			const p2 = finalPoints[finalPoints.length - 2]

			if (!p1 || !p2) {
				finalPoints.push(p0)
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
					finalPoints.push(p0)
				}
			}
		}

		return {
			name: this.name,
			points: finalPoints,
			distance: measureRouteManhattanDistance(finalPoints),
			aEdgePicking: 'manual',
			bEdgePicking: 'manual',
			skipPointsWhenDrawing: new Set(),
			midpointHandle: this._midpointHandle,
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
