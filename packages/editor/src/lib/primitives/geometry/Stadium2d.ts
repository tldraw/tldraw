import { Vec } from '../Vec'
import { HALF_PI, PI } from '../utils'
import { Ellipse2d } from './Ellipse2d'
import { Geometry2dOptions } from './Geometry2d'

/** @public */
export class Stadium2d extends Ellipse2d {
	constructor(
		public config: Omit<Geometry2dOptions, 'isClosed'> & { width: number; height: number }
	) {
		super({ ...config })
	}

	getVertices() {
		// Perimeter of the ellipse
		const w = Math.max(1, this.w)
		const h = Math.max(1, this.h)
		const cx = w / 2
		const cy = h / 2

		const len = 10
		const points: Vec[] = Array(len * 2 - 2)

		if (h > w) {
			for (let i = 0; i < len - 1; i++) {
				const t1 = -PI + (PI * i) / (len - 2)
				const t2 = (PI * i) / (len - 2)
				points[i] = new Vec(cx + cx * Math.cos(t1), cx + cx * Math.sin(t1))
				points[i + (len - 1)] = new Vec(cx + cx * Math.cos(t2), h - cx + cx * Math.sin(t2))
			}
		} else {
			for (let i = 0; i < len - 1; i++) {
				const t1 = -HALF_PI + (PI * i) / (len - 2)
				const t2 = HALF_PI + (PI * -i) / (len - 2)
				points[i] = new Vec(w - cy + cy * Math.cos(t1), h - cy + cy * Math.sin(t1))
				points[i + (len - 1)] = new Vec(cy - cy * Math.cos(t2), h - cy + cy * Math.sin(t2))
			}
		}

		return points
	}
}
