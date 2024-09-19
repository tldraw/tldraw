import { TLBaseShape } from '@tldraw/tlschema'
import { lerp } from '@tldraw/utils'
import { Geometry2d } from '../../primitives/geometry/Geometry2d'
import { Rectangle2d } from '../../primitives/geometry/Rectangle2d'
import { HandleSnapGeometry } from '../managers/SnapManager/HandleSnaps'
import { ShapeUtil, TLResizeInfo } from './ShapeUtil'
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

	override onResize(shape: any, info: TLResizeInfo<any>) {
		return resizeBox(shape, info)
	}

	override getHandleSnapGeometry(shape: Shape): HandleSnapGeometry {
		return {
			points: this.getGeometry(shape).bounds.cornersAndCenter,
		}
	}

	override getInterpolatedProps(startShape: Shape, endShape: Shape, t: number): Shape['props'] {
		return {
			...endShape.props,
			w: lerp(startShape.props.w, endShape.props.w, t),
			h: lerp(startShape.props.h, endShape.props.h, t),
		}
	}
}
