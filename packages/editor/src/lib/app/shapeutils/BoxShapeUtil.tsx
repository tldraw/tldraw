import { Box2d, linesIntersect, pointInPolygon, Vec2d, VecLike } from '@tldraw/primitives'
import { TLBoxLike } from '../tools/BaseBoxShapeTool/BaseBoxShapeTool'
import { ShapeUtil, TLOnResizeHandler } from './ShapeUtil'
import { resizeBox } from './shared/resizeBox'

/** @public */
export abstract class BoxShapeUtil<Shape extends TLBoxLike> extends ShapeUtil<Shape> {
	override getBounds(shape: Shape) {
		return new Box2d(0, 0, shape.props.w, shape.props.h)
	}

	override getCenter(shape: Shape) {
		return new Vec2d(shape.props.w / 2, shape.props.h / 2)
	}

	override getOutline(shape: Shape) {
		return this.bounds(shape).corners
	}

	hitTestPoint(shape: Shape, point: VecLike): boolean {
		return pointInPolygon(point, this.outline(shape))
	}

	hitTestLineSegment(shape: Shape, A: VecLike, B: VecLike): boolean {
		const outline = this.outline(shape)

		for (let i = 0; i < outline.length; i++) {
			const C = outline[i]
			const D = outline[(i + 1) % outline.length]
			if (linesIntersect(A, B, C, D)) return true
		}

		return false
	}

	onResize: TLOnResizeHandler<any> = (shape, info) => {
		return resizeBox(shape, info)
	}
}
