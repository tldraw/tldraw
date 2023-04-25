import { BaseSpline2d } from './BaseSpline2d'
import { LineSegment2d, LineSegment2dModel } from './LineSegment2d'
import { VecLike } from './Vec2d'

/** @public */
export class Polyline2d extends BaseSpline2d<LineSegment2dModel> {
	constructor(points: VecLike[], k = 1.2, p = 20) {
		super(points, k, p)
		this.segments = this.getSegmentsFromPoints(points, p)
	}

	segments: LineSegment2d[]

	getSegmentsFromPoints(points: VecLike[], p = 50): LineSegment2d[] {
		const segments: LineSegment2d[] = []

		for (let i = 0; i < points.length - 1; i++) {
			segments.push(new LineSegment2d(points[i], points[i + 1], p))
		}

		return segments
	}

	static FromPoints(points: VecLike[]) {
		return new Polyline2d(points)
	}
}
