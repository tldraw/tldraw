import { TLBaseShape } from '@tldraw/tlschema'
import { Geometry2d } from '../../primitives/geometry/Geometry2d'
import { Rectangle2d } from '../../primitives/geometry/Rectangle2d'
import { ShapeUtil, TLOnResizeHandler } from './ShapeUtil'
import { resizeBox } from './shared/resizeBox'

/** @public */
export type TLBaseBoxShape = TLBaseShape<string, { w: number; h: number }>

/** @public */
export abstract class BaseBoxShapeUtil<Shape extends TLBaseBoxShape> extends ShapeUtil<Shape> {
	getGeometry(shape: Shape): Geometry2d {
		return new Rectangle2d({
			width: shape.props.w,
			height: shape.props.h,
			isFilled: true,
		})
	}

	override onResize: TLOnResizeHandler<any> = (shape, info) => {
		return resizeBox(shape, info)
	}
}
