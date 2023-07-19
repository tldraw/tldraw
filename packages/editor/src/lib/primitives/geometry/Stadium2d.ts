import { Vec2d } from '../Vec2d'
import { PI, TAU } from '../utils'
import { Ellipse2d } from './Ellipse2d'

/** @public */
export class Stadium2d extends Ellipse2d {
	constructor(public config: { width: number; height: number; margin: number; isFilled: boolean }) {
		super(config)
	}

	getVertices() {
		// Perimeter of the ellipse
		const w = Math.max(1, this.w)
		const h = Math.max(1, this.h)
		const cx = w / 2
		const cy = h / 2

		const len = 10
		const points: Vec2d[] = Array(len * 2)

		if (h > w) {
			for (let i = 0; i < len; i++) {
				const t1 = -PI + (PI * i) / (len - 2)
				const t2 = (PI * i) / (len - 2)
				points[i] = new Vec2d(cx + cx * Math.cos(t1), cx + cx * Math.sin(t1))
				points[i + len] = new Vec2d(cx + cx * Math.cos(t2), h - cx + cx * Math.sin(t2))
			}
		} else {
			for (let i = 0; i < len; i++) {
				const t1 = -TAU + (PI * i) / (len - 2)
				const t2 = TAU + (PI * -i) / (len - 2)
				points[i] = new Vec2d(w - cy + cy * Math.cos(t1), h - cy + cy * Math.sin(t1))
				points[i + len] = new Vec2d(cy - cy * Math.cos(t2), h - cy + cy * Math.sin(t2))
			}
		}

		return points
	}
}
