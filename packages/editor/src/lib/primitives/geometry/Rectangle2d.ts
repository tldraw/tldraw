import { Box2d } from '../Box2d'
import { Vec2d } from '../Vec2d'
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
				new Vec2d(x, y),
				new Vec2d(x + width, y),
				new Vec2d(x + width, y + height),
				new Vec2d(x, y + height),
			],
		})
		this.x = x
		this.y = y
		this.w = width
		this.h = height
	}

	getBounds() {
		return new Box2d(this.x, this.y, this.w, this.h)
	}
}
