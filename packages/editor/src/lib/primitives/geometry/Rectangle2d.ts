import { Vec2d } from '../Vec2d'
import { Polygon2d } from './Polygon2d'

/** @public */
export class Rectangle2d extends Polygon2d {
	x: number
	y: number
	w: number
	h: number

	constructor(config: {
		x?: number
		y?: number
		width: number
		height: number
		isFilled: boolean
		margin: number
	}) {
		const { x = 0, y = 0, width, height, isFilled, margin } = config
		const points = [
			new Vec2d(x, y),
			new Vec2d(x + width, y),
			new Vec2d(x + width, y + height),
			new Vec2d(x, y + height),
		]
		super({
			points,
			isFilled,
			margin,
		})
		this.x = x
		this.y = y
		this.w = width
		this.h = height
		this.isClosed = true
	}
}
