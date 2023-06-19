/* eslint-disable @typescript-eslint/no-unused-vars */
import { Box2d, linesIntersect, Vec2d, VecLike } from '@tldraw/primitives'
import { ComputedCache } from '@tldraw/store'
import { StyleProp, TLHandle, TLShape, TLShapePartial, TLUnknownShape } from '@tldraw/tlschema'
import { computed, EMPTY_ARRAY } from 'signia'
import type { Editor } from '../Editor'
import { TLResizeHandle } from '../types/selection-types'

/** @public */
export interface TLShapeUtilConstructor<
	T extends TLUnknownShape,
	U extends ShapeUtil<T> = ShapeUtil<T>
> {
	new (editor: Editor, type: T['type'], styleProps: ReadonlyMap<StyleProp<unknown>, string>): U
	type: T['type']
}

/** @public */
export type TLShapeUtilFlag<T> = (shape: T) => boolean

/** @public */
export abstract class ShapeUtil<Shape extends TLUnknownShape = TLUnknownShape> {
	constructor(
		public editor: Editor,
		public readonly type: Shape['type'],
		public readonly styleProps: ReadonlyMap<StyleProp<unknown>, string>
	) {}

	/**
	 * The type of the shape util, which should match the shape's type.
	 *
	 * @public
	 */
	static type: string

	/**
	 * Whether the shape can be snapped to by another shape.
	 *
	 * @public
	 */
	canSnap: TLShapeUtilFlag<Shape> = () => true

	/**
	 * Whether the shape can be scrolled while editing.
	 *
	 * @public
	 */
	canScroll: TLShapeUtilFlag<Shape> = () => false

	/**
	 * Whether the shape should unmount when not visible in the editor. Consider keeping this to false if the shape's `component` has local state.
	 *
	 * @public
	 */
	canUnmount: TLShapeUtilFlag<Shape> = () => true

	/**
	 * Whether the shape can be bound to by an arrow.
	 *
	 * @param _otherShape - The other shape attempting to bind to this shape.
	 * @public
	 */
	canBind = <K>(_shape: Shape, _otherShape?: K) => true

	/**
	 * Whether the shape can be double clicked to edit.
	 *
	 * @public
	 */
	canEdit: TLShapeUtilFlag<Shape> = () => false

	/**
	 * Whether the shape can be resized.
	 *
	 * @public
	 */
	canResize: TLShapeUtilFlag<Shape> = () => true

	/**
	 * Whether the shape can be cropped.
	 *
	 * @public
	 */
	canCrop: TLShapeUtilFlag<Shape> = () => false

	/**
	 * Bounds of the shape to edit.
	 *
	 * Note: this could be a text area within a shape for example arrow labels.
	 *
	 * @public
	 */
	getEditingBounds = (shape: Shape) => {
		return this.bounds(shape)
	}

	/**
	 * Whether the shape's outline is closed.
	 *
	 * @public
	 */
	isClosed: TLShapeUtilFlag<Shape> = () => true

	/**
	 * Whether the shape should hide its resize handles when selected.
	 *
	 * @public
	 */
	hideResizeHandles: TLShapeUtilFlag<Shape> = () => false

	/**
	 * Whether the shape should hide its resize handles when selected.
	 *
	 * @public
	 */
	hideRotateHandle: TLShapeUtilFlag<Shape> = () => false

	/**
	 * Whether the shape should hide its selection bounds background when selected.
	 *
	 * @public
	 */
	hideSelectionBoundsBg: TLShapeUtilFlag<Shape> = () => false

	/**
	 * Whether the shape should hide its selection bounds foreground when selected.
	 *
	 * @public
	 */
	hideSelectionBoundsFg: TLShapeUtilFlag<Shape> = () => false

	/**
	 * Whether the shape's aspect ratio is locked.
	 *
	 * @public
	 */
	isAspectRatioLocked: TLShapeUtilFlag<Shape> = () => false

	/**
	 * Get the default props for a shape.
	 *
	 * @public
	 */
	abstract defaultProps(): Shape['props']

	/**
	 * Get a JSX element for the shape (as an HTML element).
	 *
	 * @param shape - The shape.
	 * @public
	 */
	abstract render(shape: Shape): any

	/**
	 * Get JSX describing the shape's indicator (as an SVG element).
	 *
	 * @param shape - The shape.
	 * @public
	 */
	abstract indicator(shape: Shape): any

	/**
	 * Get a JSX element for the shape (as an HTML element) to be rendered as part of the canvas background - behind any other shape content.
	 *
	 * @param shape - The shape.
	 * @internal
	 */
	renderBackground?(shape: Shape): any

	/**
	 * Get an array of handle models for the shape. This is an optional method.
	 *
	 * @example
	 *
	 * ```ts
	 * util.getHandles?.(myShape)
	 * ```
	 *
	 * @param shape - The shape.
	 * @public
	 */
	protected getHandles?(shape: Shape): TLHandle[]

	@computed
	private get handlesCache(): ComputedCache<TLHandle[], TLShape> {
		return this.editor.store.createComputedCache('handles:' + this.type, (shape) => {
			return this.getHandles!(shape as any)
		})
	}

	/**
	 * Get the cached handles (this should not be overridden!)
	 *
	 * @param shape - The shape.
	 * @public
	 */
	handles(shape: Shape): TLHandle[] {
		if (!this.getHandles) return EMPTY_ARRAY
		return this.handlesCache.get(shape.id) ?? EMPTY_ARRAY
	}

	/**
	 * Get an array of outline segments for the shape. For most shapes,
	 * this will be a single segment that includes the entire outline.
	 * For shapes with handles, this might be segments of the outline
	 * between each handle.
	 *
	 * @example
	 *
	 * ```ts
	 * util.getOutlineSegments(myShape)
	 * ```
	 *
	 * @param shape - The shape.
	 * @public
	 */
	protected getOutlineSegments(shape: Shape): Vec2d[][] {
		return [this.outline(shape)]
	}

	@computed
	private get outlineSegmentsCache(): ComputedCache<Vec2d[][], TLShape> {
		return this.editor.store.createComputedCache('outline-segments:' + this.type, (shape) => {
			return this.getOutlineSegments!(shape as any)
		})
	}

	/**
	 * Get the cached outline segments (this should not be overridden!)
	 *
	 * @param shape - The shape.
	 * @public
	 */
	outlineSegments(shape: Shape): Vec2d[][] {
		if (!this.getOutlineSegments) return EMPTY_ARRAY
		return this.outlineSegmentsCache.get(shape.id) ?? EMPTY_ARRAY
	}

	/**
	 * Get the (not cached) bounds for the shape.
	 *
	 * @param shape - The shape.
	 * @public
	 */
	protected abstract getBounds(shape: Shape): Box2d

	@computed
	private get boundsCache(): ComputedCache<Box2d, TLShape> {
		return this.editor.store.createComputedCache('bounds:' + this.type, (shape) => {
			return this.getBounds(shape as any)
		})
	}

	/**
	 * Get the cached bounds for the shape.
	 *
	 * @param shape - The shape.
	 * @public
	 */
	bounds(shape: Shape): Box2d {
		const result = this.boundsCache.get(shape.id) ?? new Box2d()
		if (result.width === 0 || result.height === 0) {
			return new Box2d(result.x, result.y, Math.max(result.width, 1), Math.max(result.height, 1))
		}
		return result
	}

	/**
	 * Get the shape's (not cached) outline. Do not override this method!
	 *
	 * @param shape - The shape.
	 * @public
	 */
	protected abstract getOutline(shape: Shape): Vec2d[]

	@computed
	private get outlineCache(): ComputedCache<Vec2d[], TLShape> {
		return this.editor.store.createComputedCache('outline:' + this.type, (shape) => {
			return this.getOutline(shape as any)
		})
	}

	/**
	 * Get the shape's outline. Do not override this method!
	 *
	 * @param shape - The shape.
	 * @public
	 */
	outline(shape: Shape): Vec2d[] {
		return this.outlineCache.get(shape.id) ?? EMPTY_ARRAY
	}

	/**
	 * Get the shape's snap points.
	 *
	 * @param shape - The shape.
	 * @public
	 */
	snapPoints(shape: Shape) {
		return this.bounds(shape).snapPoints
	}

	/**
	 * Get the shape's cached center.
	 *
	 * @param shape - The shape.
	 * @public
	 */
	center(shape: Shape): Vec2d {
		return this.getCenter(shape)
	}

	/**
	 * Get the shape's (not cached) center.
	 *
	 * @param shape - The shape.
	 * @public
	 */
	abstract getCenter(shape: Shape): Vec2d

	/**
	 * Get whether the shape can receive children of a given type.
	 *
	 * @param type - The shape type.
	 * @public
	 */
	canReceiveNewChildrenOfType(shape: Shape, type: TLShape['type']) {
		return false
	}

	/**
	 * Get whether the shape can receive children of a given type.
	 *
	 * @param shape - The shape type.
	 * @param shapes - The shapes that are being dropped.
	 * @public
	 */
	canDropShapes(shape: Shape, shapes: TLShape[]) {
		return false
	}

	/**
	 * Get the shape as an SVG object.
	 *
	 * @param shape - The shape.
	 * @param color - The shape's CSS color (actual).
	 * @param font - The shape's CSS font (actual).
	 * @returns An SVG element.
	 * @public
	 */
	toSvg?(shape: Shape, font: string | undefined): SVGElement | Promise<SVGElement>

	/**
	 * Get the shape's background layer as an SVG object.
	 *
	 * @param shape - The shape.
	 * @param color - The shape's CSS color (actual).
	 * @param font - The shape's CSS font (actual).
	 * @returns An SVG element.
	 * @public
	 */
	toBackgroundSvg?(shape: Shape, font: string | undefined): SVGElement | Promise<SVGElement> | null

	/**
	 * Get whether a point intersects the shape.
	 *
	 * @param shape - The shape.
	 * @param point - The point to test.
	 * @returns Whether the point intersects the shape.
	 * @public
	 */
	hitTestPoint(shape: Shape, point: VecLike): boolean {
		return this.bounds(shape).containsPoint(point)
	}

	/**
	 * Get whether a point intersects the shape.
	 *
	 * @param shape - The shape.
	 * @param A - The line segment's first point.
	 * @param B - The line segment's second point.
	 * @returns Whether the line segment intersects the shape.
	 * @public
	 */
	hitTestLineSegment(shape: Shape, A: VecLike, B: VecLike): boolean {
		const outline = this.outline(shape)

		for (let i = 0; i < outline.length; i++) {
			const C = outline[i]
			const D = outline[(i + 1) % outline.length]
			if (linesIntersect(A, B, C, D)) return true
		}

		return false
	}

	/** @internal */
	expandSelectionOutlinePx(shape: Shape): number {
		return 0
	}

	/**
	 * Does this shape provide a background for its children? If this is true,
	 * then any children with a `renderBackground` method will have their
	 * backgrounds rendered _above_ this shape. Otherwise, the children's
	 * backgrounds will be rendered above either the next ancestor that provides
	 * a background, or the canvas background.
	 *
	 * @internal
	 */
	providesBackgroundForChildren(shape: Shape): boolean {
		return false
	}

	//  Events

	/**
	 * A callback called just before a shape is created. This method provides a last chance to modify
	 * the created shape.
	 *
	 * @example
	 *
	 * ```ts
	 * onBeforeCreate = (next) => {
	 * 	return { ...next, x: next.x + 1 }
	 * }
	 * ```
	 *
	 * @param next - The next shape.
	 * @returns The next shape or void.
	 * @public
	 */
	onBeforeCreate?: TLOnBeforeCreateHandler<Shape>

	/**
	 * A callback called just before a shape is updated. This method provides a last chance to modify
	 * the updated shape.
	 *
	 * @example
	 *
	 * ```ts
	 * onBeforeUpdate = (prev, next) => {
	 * 	if (prev.x === next.x) {
	 * 		return { ...next, x: next.x + 1 }
	 * 	}
	 * }
	 * ```
	 *
	 * @param prev - The previous shape.
	 * @param next - The next shape.
	 * @returns The next shape or void.
	 * @public
	 */
	onBeforeUpdate?: TLOnBeforeUpdateHandler<Shape>

	/**
	 * A callback called when some other shapes are dragged over this one.
	 *
	 * @example
	 *
	 * ```ts
	 * onDragShapesOver = (shape, shapes) => {
	 * 	return { shouldHint: true }
	 * }
	 * ```
	 *
	 * @param shape - The shape.
	 * @param shapes - The shapes that are being dragged over this one.
	 * @returns An object specifying whether the shape should hint that it can receive the dragged shapes.
	 * @public
	 */
	onDragShapesOver?: TLOnDragHandler<Shape, { shouldHint: boolean }>

	/**
	 * A callback called when some other shapes are dragged out of this one.
	 *
	 * @param shape - The shape.
	 * @param shapes - The shapes that are being dragged out.
	 * @public
	 */
	onDragShapesOut?: TLOnDragHandler<Shape>

	/**
	 * A callback called when some other shapes are dropped over this one.
	 *
	 * @param shape - The shape.
	 * @param shapes - The shapes that are being dropped over this one.
	 * @public
	 */
	onDropShapesOver?: TLOnDragHandler<Shape>

	/**
	 * A callback called when a shape starts being resized.
	 *
	 * @param shape - The shape.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onResizeStart?: TLOnResizeStartHandler<Shape>

	/**
	 * A callback called when a shape changes from a resize.
	 *
	 * @param shape - The shape at the start of the resize.
	 * @param info - Info about the resize.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onResize?: TLOnResizeHandler<Shape>

	/**
	 * A callback called when a shape finishes resizing.
	 *
	 * @param initial - The shape at the start of the resize.
	 * @param current - The current shape.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onResizeEnd?: TLOnResizeEndHandler<Shape>

	/**
	 * A callback called when a shape starts being translated.
	 *
	 * @param shape - The shape.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onTranslateStart?: TLOnTranslateStartHandler<Shape>

	/**
	 * A callback called when a shape changes from a translation.
	 *
	 * @param initial - The shape at the start of the translation.
	 * @param current - The current shape.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onTranslate?: TLOnTranslateHandler<Shape>

	/**
	 * A callback called when a shape finishes translating.
	 *
	 * @param initial - The shape at the start of the translation.
	 * @param current - The current shape.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onTranslateEnd?: TLOnTranslateEndHandler<Shape>

	/**
	 * A callback called when a shape starts being rotated.
	 *
	 * @param shape - The shape.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onRotateStart?: TLOnRotateStartHandler<Shape>

	/**
	 * A callback called when a shape changes from a rotation.
	 *
	 * @param initial - The shape at the start of the rotation.
	 * @param current - The current shape.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onRotate?: TLOnRotateHandler<Shape>

	/**
	 * A callback called when a shape finishes rotating.
	 *
	 * @param initial - The shape at the start of the rotation.
	 * @param current - The current shape.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onRotateEnd?: TLOnRotateEndHandler<Shape>

	/**
	 * A callback called when a shape's handle changes.
	 *
	 * @param shape - The shape.
	 * @param info - An object containing the handle and whether the handle is 'precise' or not.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onHandleChange?: TLOnHandleChangeHandler<Shape>

	/**
	 * Not currently used.
	 *
	 * @internal
	 */
	onBindingChange?: TLOnBindingChangeHandler<Shape>

	/**
	 * A callback called when a shape's children change.
	 *
	 * @param shape - The shape.
	 * @returns An array of shape updates, or void.
	 * @public
	 */
	onChildrenChange?: TLOnChildrenChangeHandler<Shape>

	/**
	 * A callback called when a shape's handle is double clicked.
	 *
	 * @param shape - The shape.
	 * @param handle - The handle that is double-clicked.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onDoubleClickHandle?: TLOnDoubleClickHandleHandler<Shape>

	/**
	 * A callback called when a shape's edge is double clicked.
	 *
	 * @param shape - The shape.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onDoubleClickEdge?: TLOnDoubleClickHandler<Shape>

	/**
	 * A callback called when a shape is double clicked.
	 *
	 * @param shape - The shape.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onDoubleClick?: TLOnDoubleClickHandler<Shape>

	/**
	 * A callback called when a shape is clicked.
	 *
	 * @param shape - The shape.
	 * @returns A change to apply to the shape, or void.
	 * @public
	 */
	onClick?: TLOnClickHandler<Shape>

	/**
	 * A callback called when a shape finishes being editing.
	 *
	 * @param shape - The shape.
	 * @public
	 */
	onEditEnd?: TLOnEditEndHandler<Shape>
}

/** @public */
export type TLOnBeforeCreateHandler<T extends TLShape> = (next: T) => T | void
/** @public */
export type TLOnBeforeUpdateHandler<T extends TLShape> = (prev: T, next: T) => T | void
/** @public */
export type TLOnTranslateStartHandler<T extends TLShape> = TLEventStartHandler<T>
/** @public */
export type TLOnTranslateHandler<T extends TLShape> = TLEventChangeHandler<T>
/** @public */
export type TLOnTranslateEndHandler<T extends TLShape> = TLEventChangeHandler<T>
/** @public */
export type TLOnRotateStartHandler<T extends TLShape> = TLEventStartHandler<T>
/** @public */
export type TLOnRotateHandler<T extends TLShape> = TLEventChangeHandler<T>
/** @public */
export type TLOnRotateEndHandler<T extends TLShape> = TLEventChangeHandler<T>

/**
 * The type of resize.
 *
 * 'scale_shape' - The shape is being scaled, usually as part of a larger selection.
 *
 * 'resize_bounds' - The user is directly manipulating an individual shape's bounds using a resize
 * handle. It is up to shape util implementers to decide how they want to handle the two
 * situations.
 *
 * @public
 */
export type TLResizeMode = 'scale_shape' | 'resize_bounds'

/**
 * Info about a resize.
 * @param newPoint - The new local position of the shape.
 * @param handle - The handle being dragged.
 * @param mode - The type of resize.
 * @param scaleX - The scale in the x-axis.
 * @param scaleY - The scale in the y-axis.
 * @param initialBounds - The bounds of the shape at the start of the resize.
 * @param initialShape - The shape at the start of the resize.
 * @public
 */
export type TLResizeInfo<T extends TLShape> = {
	newPoint: Vec2d
	handle: TLResizeHandle
	mode: TLResizeMode
	scaleX: number
	scaleY: number
	initialBounds: Box2d
	initialShape: T
}

/** @public */
export type TLOnResizeHandler<T extends TLShape> = (
	shape: T,
	info: TLResizeInfo<T>
) => Partial<TLShapePartial<T>> | undefined | void

/** @public */
export type TLOnResizeStartHandler<T extends TLShape> = TLEventStartHandler<T>

/** @public */
export type TLOnResizeEndHandler<T extends TLShape> = TLEventChangeHandler<T>

/* -------------------- Dragging -------------------- */

/** @public */
export type TLOnDragHandler<T extends TLShape, R = void> = (shape: T, shapes: TLShape[]) => R

/** @internal */
export type TLOnBindingChangeHandler<T extends TLShape> = (shape: T) => TLShapePartial<T> | void

/** @public */
export type TLOnChildrenChangeHandler<T extends TLShape> = (shape: T) => TLShapePartial[] | void

/** @public */
export type TLOnHandleChangeHandler<T extends TLShape> = (
	shape: T,
	info: {
		handle: TLHandle
		isPrecise: boolean
	}
) => TLShapePartial<T> | void

/** @public */
export type TLOnClickHandler<T extends TLShape> = (shape: T) => TLShapePartial<T> | void
/** @public */
export type TLOnEditEndHandler<T extends TLShape> = (shape: T) => void
/** @public */
export type TLOnDoubleClickHandler<T extends TLShape> = (shape: T) => TLShapePartial<T> | void
/** @public */
export type TLOnDoubleClickHandleHandler<T extends TLShape> = (
	shape: T,
	handle: TLHandle
) => TLShapePartial<T> | void

type TLEventStartHandler<T extends TLShape> = (shape: T) => TLShapePartial<T> | void
type TLEventChangeHandler<T extends TLShape> = (initial: T, current: T) => TLShapePartial<T> | void
