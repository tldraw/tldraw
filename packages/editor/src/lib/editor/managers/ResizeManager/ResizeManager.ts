import { TLShape, TLShapeId, TLShapePartial } from '@tldraw/tlschema'
import { Box } from '../../../primitives/Box'
import { Mat, MatLike } from '../../../primitives/Mat'
import { areAnglesCompatible } from '../../../primitives/utils'
import { Vec, VecLike } from '../../../primitives/Vec'
import type { Editor, TLResizeShapeOptions } from '../../Editor'
import { applyPartialToRecordWithProps } from '../../editorHelpers'
import {
	getFiniteScale,
	getLocalScale,
	getMirroredRotation,
	getPagePointForCenter,
	isMirroredInOneAxis,
	lockScaleToLargerAxis,
	lockScaleToSmallerAxis,
	scalePagePoint,
} from '../../kernels/resize'
import { EditorManager } from '../EditorManager'

/**
 * Resizing a shape, including shapes whose rotation is not aligned with the resize axis.
 *
 * @public
 */
export class ResizeManager extends EditorManager {
	/**
	 * Resize a shape.
	 *
	 * @param shape - The shape (or the shape id of the shape) to resize.
	 * @param scale - The scale factor to apply to the shape.
	 * @param opts - Additional options.
	 *
	 * @public
	 */
	resizeShape(shape: TLShapeId | TLShape, scale: VecLike, opts: TLResizeShapeOptions = {}): Editor {
		const partial = this.editor.getResizeShapePartial(shape, scale, opts)
		if (partial) this.editor.updateShapes([partial])
		return this.editor
	}

	/**
	 * Get the update for a resized shape without committing it to the store. Interactions that
	 * resize many shapes at once use this to collect all of the updates and commit them in a
	 * single batch. Returns null when there is nothing to update.
	 *
	 * Shapes that are rotated out of alignment with the scale axis cannot be resized with a
	 * single update; those shapes are resized immediately (as `resizeShape` would do) and null
	 * is returned.
	 *
	 * @internal
	 */
	getResizeShapePartial(
		shape: TLShapeId | TLShape,
		scale: VecLike,
		opts: TLResizeShapeOptions = {}
	): TLShapePartial | null {
		const id = typeof shape === 'string' ? shape : shape.id
		if (this.editor.getIsReadonly()) return null

		scale = getFiniteScale(scale)

		const initialShape = opts.initialShape ?? this.editor.getShape(id)
		if (!initialShape) return null

		const scaleOrigin = opts.scaleOrigin ?? this.editor.getShapePageBounds(id)?.center
		if (!scaleOrigin) return null

		const pageTransform = opts.initialPageTransform
			? Mat.Cast(opts.initialPageTransform)
			: this.editor.getShapePageTransform(id)

		const pageRotation = pageTransform.rotation()

		const scaleAxisRotation = opts.scaleAxisRotation ?? pageRotation

		const initialBounds = opts.initialBounds ?? this.editor.getShapeGeometry(id).bounds

		if (!initialBounds) return null

		const isAspectRatioLocked =
			opts.isAspectRatioLocked ??
			this.editor.getShapeUtil(initialShape).isAspectRatioLocked(initialShape)

		if (!areAnglesCompatible(pageRotation, scaleAxisRotation)) {
			// shape is awkwardly rotated, keep the aspect ratio locked and adopt the scale factor
			// from whichever axis is being scaled the least, to avoid the shape getting bigger
			// than the bounds of the selection
			// const minScale = Math.min(Math.abs(scale.x), Math.abs(scale.y))
			this._resizeUnalignedShape(id, scale, {
				...opts,
				initialBounds,
				scaleOrigin,
				scaleAxisRotation,
				initialPageTransform: pageTransform,
				isAspectRatioLocked,
				initialShape,
			})
			return null
		}

		const util = this.editor.getShapeUtil(initialShape)

		if (isAspectRatioLocked) scale = lockScaleToLargerAxis(scale)

		let workingShape: TLShape | null = null

		if (util.onResize && util.canResize(initialShape)) {
			// get the model changes from the shape util
			const newPagePoint = this._scalePagePoint(
				Mat.applyToPoint(pageTransform, new Vec(0, 0)),
				scaleOrigin,
				scale,
				scaleAxisRotation
			)

			const newLocalPoint = this.editor.getPointInParentSpace(initialShape.id, newPagePoint)

			// resize the shape's local bounding box
			const myScale = getLocalScale(scale, pageRotation, scaleAxisRotation)

			// adjust initial model for situations where the parent has moved during the resize
			// e.g. groups
			const initialPagePoint = Mat.applyToPoint(pageTransform, new Vec())

			// need to adjust the shape's x and y points in case the parent has moved since start of resizing
			const { x, y } = this.editor.getPointInParentSpace(initialShape.id, initialPagePoint)

			workingShape = initialShape
			if (!opts.skipStartAndEndCallbacks) {
				workingShape = applyPartialToRecordWithProps(
					initialShape,
					util.onResizeStart?.(initialShape) ?? undefined
				)
			}

			const resizedShape = util.onResize(
				{ ...initialShape, x, y },
				{
					newPoint: newLocalPoint,
					handle: opts.dragHandle ?? 'bottom_right',
					// don't set isSingle to true for children
					mode: opts.mode ?? 'scale_shape',
					scaleX: myScale.x,
					scaleY: myScale.y,
					initialBounds,
					initialShape,
				}
			)

			workingShape = applyPartialToRecordWithProps(workingShape, {
				id,
				type: initialShape.type as any,
				x: newLocalPoint.x,
				y: newLocalPoint.y,
				...resizedShape,
			})

			if (!opts.skipStartAndEndCallbacks) {
				workingShape = applyPartialToRecordWithProps(
					workingShape,
					util.onResizeEnd?.(initialShape, workingShape) ?? undefined
				)
			}

			if (resizedShape) {
				return workingShape
			}
		}

		// the shape was not resized by its util, so reposition it (rather than resizing it)
		// based on where its resized center would be

		const initialPageCenter = Mat.applyToPoint(pageTransform, initialBounds.center)
		// get the model changes from the shape util
		const newPageCenter = this._scalePagePoint(
			initialPageCenter,
			scaleOrigin,
			scale,
			scaleAxisRotation
		)

		const initialPageCenterInParentSpace = this.editor.getPointInParentSpace(
			initialShape.id,
			initialPageCenter
		)
		const newPageCenterInParentSpace = this.editor.getPointInParentSpace(
			initialShape.id,
			newPageCenter
		)

		const delta = Vec.Sub(newPageCenterInParentSpace, initialPageCenterInParentSpace)

		if (workingShape) {
			// the util's onResize ran but returned no change; keep the working update (which may
			// include changes from onResizeStart / onResizeEnd) and reposition the shape
			return {
				...workingShape,
				x: initialShape.x + delta.x,
				y: initialShape.y + delta.y,
			}
		}

		return {
			id,
			type: initialShape.type as any,
			x: initialShape.x + delta.x,
			y: initialShape.y + delta.y,
		}
	}

	/** @internal */
	_scalePagePoint(point: VecLike, scaleOrigin: VecLike, scale: VecLike, scaleAxisRotation: number) {
		return scalePagePoint(point, scaleOrigin, scale, scaleAxisRotation)
	}

	/** @internal */
	_resizeUnalignedShape(
		id: TLShapeId,
		scale: VecLike,
		options: {
			initialBounds: Box
			scaleOrigin: VecLike
			scaleAxisRotation: number
			initialShape: TLShape
			isAspectRatioLocked: boolean
			initialPageTransform: MatLike
		}
	) {
		const { type } = options.initialShape
		// If a shape is not aligned with the scale axis we need to treat it differently to avoid skewing.
		// Instead of skewing we normalize the scale aspect ratio (i.e. keep the same scale magnitude in both axes)
		// and then after applying the scale to the shape we also rotate it if required and translate it so that it's center
		// point ends up in the right place.

		const shapeScale = lockScaleToSmallerAxis(scale)

		// first we can scale the shape about its center point
		this.editor.resizeShape(id, shapeScale, {
			initialShape: options.initialShape,
			initialBounds: options.initialBounds,
			isAspectRatioLocked: options.isAspectRatioLocked,
			initialPageTransform: options.initialPageTransform,
		})

		// then if the shape is flipped in one axis only, we need to apply an extra rotation
		// to make sure the shape is mirrored correctly
		if (isMirroredInOneAxis(scale)) {
			const parentRotation = this.editor.getShapeParentTransform(id).rotation()
			const rotation = getMirroredRotation(options.initialShape.rotation, parentRotation)
			this.editor.updateShapes([{ id, type, rotation }])
		}

		// Next we need to translate the shape so that it's center point ends up in the right place.
		// To do that we first need to calculate the center point of the shape in the current page space before the scale was applied.
		const preScaleShapePageCenter = Mat.applyToPoint(
			options.initialPageTransform,
			options.initialBounds.center
		)

		// And now we scale the center point by the original scale factor
		const postScaleShapePageCenter = this._scalePagePoint(
			preScaleShapePageCenter,
			options.scaleOrigin,
			scale,
			options.scaleAxisRotation
		)

		// now calculate how far away the shape is from where it needs to be
		const pageTransform = this.editor.getShapePageTransform(id)
		const currentLocalBounds = this.editor.getShapeGeometry(id).bounds
		const postScaleShapePagePoint = getPagePointForCenter(
			pageTransform,
			currentLocalBounds,
			postScaleShapePageCenter
		)
		const { x, y } = this.editor.getPointInParentSpace(id, postScaleShapePagePoint)

		this.editor.updateShapes([{ id, type, x, y }])

		return this.editor
	}
}
