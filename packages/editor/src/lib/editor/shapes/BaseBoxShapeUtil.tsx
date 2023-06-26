import { Box2d, linesIntersect, pointInPolygon, Vec2d, VecLike } from '@tldraw/primitives'
import { TLBaseShape } from '@tldraw/tlschema'
import { ShapeUtil, TLOnResizeHandler } from './ShapeUtil'
import { resizeBox } from './shared/resizeBox'

/** @public */
export type TLBaseBoxShape = TLBaseShape<string, { w: number; h: number }>

/** @public */
export abstract class BaseBoxShapeUtil<Shape extends TLBaseBoxShape> extends ShapeUtil<Shape> {
	override getBounds(shape: Shape) {
		return new Box2d(0, 0, shape.props.w, shape.props.h)
	}

	override getCenter(shape: Shape) {
		return new Vec2d(shape.props.w / 2, shape.props.h / 2)
	}

	override getOutline(shape: Shape) {
		return this.editor.getBounds(shape).corners
	}

	override hitTestPoint(shape: Shape, point: VecLike): boolean {
		return pointInPolygon(point, this.editor.getOutline(shape))
	}

	override hitTestLineSegment(shape: Shape, A: VecLike, B: VecLike): boolean {
		const outline = this.editor.getOutline(shape)

		for (let i = 0; i < outline.length; i++) {
			const C = outline[i]
			const D = outline[(i + 1) % outline.length]
			if (linesIntersect(A, B, C, D)) return true
		}

		return false
	}

	override onResize: TLOnResizeHandler<any> = (shape, info) => {
		return resizeBox(shape, info)
	}
}
