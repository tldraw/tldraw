import { Vec2d } from '../Vec2d'
import { Polyline2d } from './Polyline2d'

/** @public */
export class Polygon2d extends Polyline2d {
	type = 'polyline' as const
	constructor(config: { margin: number; points: Vec2d[]; isFilled: boolean }) {
		super(config)
		this.isFilled = config.isFilled
		this.isClosed = true
	}
}
