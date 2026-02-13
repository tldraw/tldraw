import { Box } from '../Box'
import { Vec } from '../Vec'
import { Geometry2dOptions } from './Geometry2d'
import { Polygon2d } from './Polygon2d'

/** @public */
export class Rectangle2d extends Polygon2d {
	private _x: number
	private _y: number
	private _w: number
	private _h: number

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
		this._x = x
		this._y = y
		this._w = width
		this._h = height
	}

	getBounds() {
		return new Box(this._x, this._y, this._w, this._h)
	}

	getSvgPathData(): string {
		const { _x: x, _y: y, _w: w, _h: h } = this
		this.negativeZeroFix()
		return `M${x},${y} h${w} v${h} h${-w}z`
	}

	private negativeZeroFix() {
		this._x = zeroFix(this._x)
		this._y = zeroFix(this._y)
		this._w = zeroFix(this._w)
		this._h = zeroFix(this._h)
	}
}

function zeroFix(value: number) {
	if (Object.is(value, -0)) return 0
	return value
}
