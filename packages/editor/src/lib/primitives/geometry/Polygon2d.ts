import { Vec } from '../Vec'
import { Geometry2dOptions } from './Geometry2d'
import { Polyline2d } from './Polyline2d'

/** @public */
export class Polygon2d extends Polyline2d {
	constructor(config: Omit<Geometry2dOptions, 'isClosed'> & { points: Vec[] }) {
		super({ ...config })
		this.isClosed = true

		if (config.points.length < 3) {
			throw new Error('Polygon2d: points must be an array of at least 3 points')
		}
	}
}
