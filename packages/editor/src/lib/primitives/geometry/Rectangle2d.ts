import { Box } from '../Box'
import { Vec } from '../Vec'
import { Geometry2dOptions } from './Geometry2d'
import { Polygon2d } from './Polygon2d'

/** @public */
export class Rectangle2d extends Polygon2d {
	x: number
	y: number
	w: number
	h: number

	constructor(
		config: Omit<Geometry2dOptions, 'isClosed'> & {
			x?: number
			y?: number
			width: number
			height: number
		}
	) {
		const { x = 0, y = 0, width, height } = config
		super({
			...config,
			points: [
				new Vec(x, y),
				new Vec(x + width, y),
				new Vec(x + width, y + height),
				new Vec(x, y + height),
			],
		})
		this.x = x
		this.y = y
		this.w = width
		this.h = height
	}

	getBounds() {
		return new Box(this.x, this.y, this.w, this.h)
	}

	getSvgPathData(): string {
		const { x, y, w, h } = this
		return `M${x},${y} h${w} v${h} h-${w}z`
	}
}
