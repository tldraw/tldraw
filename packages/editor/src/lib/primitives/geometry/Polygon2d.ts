import { Vec } from '../Vec'
import { Geometry2dOptions, Geometry2d } from './Geometry2d'
import { Polyline2d } from './Polyline2d'
import { SVGProps } from 'react'

/** @public */
export class Polygon2d extends Polyline2d implements Geometry2d {
	constructor(config: Omit<Geometry2dOptions, 'isClosed'> & { points: Vec[] }) {
		super({ ...config })
		this.isClosed = true
	}

	// Implementing abstract method toSvg for rendering polygon geometry as SVG
	abstract toSvg(props?: SVGProps<SVGSVGElement>): JSX.Element
}
