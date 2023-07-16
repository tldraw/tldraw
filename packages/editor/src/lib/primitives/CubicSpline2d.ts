import { BaseSpline2d } from './BaseSpline2d'
import { CubicSegment2d, CubicSegment2dModel } from './CubicSegment2d'
import { Vec2d, VecLike } from './Vec2d'

/** @public */
export class CubicSpline2d extends BaseSpline2d<CubicSegment2dModel> {
	constructor(points: VecLike[], k = 1.2, p = 20) {
		super(points, k, p)
		this.segments = this.getSegmentsFromPoints(points, k, p)
	}

	segments: CubicSegment2d[]

	getSegmentsFromPoints(points: VecLike[], k = 1.25, p = 20) {
		const len = points.length
		const last = len - 2
		const results: CubicSegment2d[] = []

		for (let i = 0; i < len - 1; i++) {
			const p0 = i === 0 ? points[0] : points[i - 1]
			const p1 = points[i]
			const p2 = points[i + 1]
			const p3 = i === last ? p2 : points[i + 2]

			results.push(
				new CubicSegment2d(
					p1,
					i === 0 ? p0 : new Vec2d(p1.x + ((p2.x - p0.x) / 6) * k, p1.y + ((p2.y - p0.y) / 6) * k),
					i === last
						? p2
						: new Vec2d(p2.x - ((p3.x - p1.x) / 6) * k, p2.y - ((p3.y - p1.y) / 6) * k),
					p2,
					p
				)
			)
		}

		return results
	}

	static FromPoints(points: Vec2d[]) {
		return new CubicSpline2d(points)
	}
}
