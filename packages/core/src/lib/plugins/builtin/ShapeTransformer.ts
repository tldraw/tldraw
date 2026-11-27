// This module is part of the headless core. It must not import React or touch the DOM.
import { TLShape, TLShapeId, TLShapePartial } from '@tldraw/tlschema'
import type { Editor, TLResizeShapeOptions } from '../../editor/Editor'
import { applyPartialToRecordWithProps, toShapeIds } from '../../editor/recordUtils'
import { TLResizeMode } from '../../editor/shapes/ShapeUtil'
import { TLResizeHandle } from '../../editor/types/selection-types'
import { Box } from '../../primitives/Box'
import { Mat, MatLike } from '../../primitives/Mat'
import { approximately, areAnglesCompatible, shortAngleDist } from '../../primitives/utils'
import { Vec, VecLike } from '../../primitives/Vec'
import { applyRotationToSnapshotShapes, getRotationSnapshot } from '../../utils/rotation'

/**
 * Resizes, rotates, nudges and translates shapes. The editor's `resizeShape`, `rotateShapesBy`,
 * `nudgeShapes` and the methods that compute their changes use it.
 *
 * @public
 */
export class ShapeTransformer {
	constructor(private readonly editor: Editor) {}

	private getChangesToTranslateShape(initialShape: TLShape, newShapeCoords: VecLike): TLShape {
		let workingShape = initialShape
		const util = this.editor.getShapeUtil(initialShape)

		const afterTranslateStart = util.onTranslateStart?.(workingShape)
		if (afterTranslateStart) {
			workingShape = applyPartialToRecordWithProps(workingShape, afterTranslateStart)
		}

		workingShape = applyPartialToRecordWithProps(workingShape, {
			id: initialShape.id,
			type: initialShape.type,
			x: newShapeCoords.x,
			y: newShapeCoords.y,
		})

		const afterTranslate = util.onTranslate?.(initialShape, workingShape)
		if (afterTranslate) {
			workingShape = applyPartialToRecordWithProps(workingShape, afterTranslate)
		}

		const afterTranslateEnd = util.onTranslateEnd?.(initialShape, workingShape)
		if (afterTranslateEnd) {
			workingShape = applyPartialToRecordWithProps(workingShape, afterTranslateEnd)
		}

		return workingShape
	}

	private _scalePagePoint(
		point: VecLike,
		scaleOrigin: VecLike,
		scale: VecLike,
		scaleAxisRotation: number
	) {
		const relativePoint = Vec.RotWith(point, scaleOrigin, -scaleAxisRotation).sub(scaleOrigin)

		// calculate the new point position relative to the scale origin
		const newRelativePagePoint = Vec.MulV(relativePoint, scale)

		// and rotate it back to page coords to get the new page point of the resized shape
		const destination = Vec.Add(newRelativePagePoint, scaleOrigin).rotWith(
			scaleOrigin,
			scaleAxisRotation
		)

		return destination
	}

	private _resizeUnalignedShape(
		id: TLShapeId,
		scale: VecLike,
		options: {
			initialBounds: Box
			scaleOrigin: VecLike
			scaleAxisRotation: number
			initialShape: TLShape
			isAspectRatioLocked: boolean
			initialPageTransform: MatLike
			dragHandle?: TLResizeHandle
			mode?: TLResizeMode
			skipStartAndEndCallbacks?: boolean
		}
	) {
		const { type } = options.initialShape
		// If a shape is not aligned with the scale axis we need to treat it differently to avoid skewing.
		// Instead of skewing we normalize the scale aspect ratio (i.e. keep the same scale magnitude in both axes)
		// and then after applying the scale to the shape we also rotate it if required and translate it so that it's center
		// point ends up in the right place.

		const shapeScale = new Vec(scale.x, scale.y)

		// // make sure we are constraining aspect ratio, and using the smallest scale axis to avoid shapes getting bigger
		// // than the selection bounding box
		if (Math.abs(scale.x) > Math.abs(scale.y)) {
			shapeScale.x = Math.sign(scale.x) * Math.abs(scale.y)
		} else {
			shapeScale.y = Math.sign(scale.y) * Math.abs(scale.x)
		}

		// first we can scale the shape about its center point
		this.editor.resizeShape(id, shapeScale, {
			initialShape: options.initialShape,
			initialBounds: options.initialBounds,
			isAspectRatioLocked: options.isAspectRatioLocked,
			initialPageTransform: options.initialPageTransform,
			dragHandle: options.dragHandle,
			mode: options.mode,
			// this is one frame of the same resize, not a new one, so don't fire start/end again
			skipStartAndEndCallbacks: options.skipStartAndEndCallbacks,
		})

		// then if the shape is flipped in one axis only, we need to apply an extra rotation
		// to make sure the shape is mirrored correctly
		if (Math.sign(scale.x) * Math.sign(scale.y) < 0) {
			// Mirroring across an axis at angle `axisRot` maps a page rotation `pageRot` to
			// `2 * axisRot - pageRot`. For a shape with local rotation `localRot` whose parent had
			// page rotation `parentRot` when the resize began:
			// - pageRot = parentRot + localRot
			// - newPageRot = 2 * axisRot - pageRot
			// - newPageRot = (parentRot + parentDelta) + newLocalRot
			// - Therefore: newLocalRot = 2 * axisRot - localRot - 2 * parentRot - parentDelta
			// `parentDelta` is how far the parent has rotated since the resize began. Nested resizes
			// commit ancestors before descendants, so an unaligned parent may itself have been
			// flipped by the time its child gets here; reading the parent's current rotation as if
			// it were the initial one would then double-count that flip.
			const parentRotation = this.editor.getShapeParentTransform(id).rotation()
			// take the shortest arc so the stored rotation doesn't drift by 2π when the parent
			// hasn't moved and the initial page rotation happens to be wrapped
			const parentDelta = shortAngleDist(
				Mat.Cast(options.initialPageTransform).rotation() - options.initialShape.rotation,
				parentRotation
			)
			const initialParentRotation = parentRotation - parentDelta
			const rotation =
				2 * options.scaleAxisRotation -
				options.initialShape.rotation -
				2 * initialParentRotation -
				parentDelta
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
		// We need to use the local bounds center transformed to page space, not the axis-aligned
		// page bounds center. This is because the page bounds are axis-aligned and their center
		// changes when the rotation changes, but we want to use the same reference point as
		// preScaleShapePageCenter (which used initialBounds.center transformed by the page transform).
		const currentLocalBounds = this.editor.getShapeGeometry(id).bounds
		const currentPageCenter = Mat.applyToPoint(pageTransform, currentLocalBounds.center)
		const shapePageTransformOrigin = pageTransform.point()
		const pageDelta = Vec.Sub(postScaleShapePageCenter, currentPageCenter)

		// and finally figure out what the shape's new position should be
		const postScaleShapePagePoint = Vec.Add(shapePageTransformOrigin, pageDelta)
		const { x, y } = this.editor.getPointInParentSpace(id, postScaleShapePagePoint)

		this.editor.updateShapes([{ id, type, x, y }])
	}

	rotateShapesBy(
		shapes: TLShapeId[] | TLShape[],
		delta: number,
		opts?: { center?: VecLike }
	): void {
		const ids = toShapeIds(shapes)

		if (ids.length <= 0) return

		const snapshot = getRotationSnapshot({ editor: this.editor, ids })
		if (!snapshot) return
		applyRotationToSnapshotShapes({
			delta,
			snapshot,
			editor: this.editor,
			stage: 'one-off',
			centerOverride: opts?.center,
		})
	}

	/** @internal */
	getChangesToTranslateShapeByPageDelta(shape: TLShape, pageDelta: VecLike): TLShape {
		const localDelta = Vec.From(pageDelta).rot(
			-this.editor.getShapeParentTransform(shape).rotation()
		)
		return this.getChangesToTranslateShape(shape, localDelta.add(shape))
	}

	nudgeShapes(shapes: TLShapeId[] | TLShape[], offset: VecLike): void {
		const ids = toShapeIds(shapes)

		if (ids.length <= 0) return
		const changes: TLShapePartial[] = []

		for (const id of ids) {
			const shape = this.editor.getShape(id)!
			changes.push(this.getChangesToTranslateShapeByPageDelta(shape, offset))
		}

		this.editor.updateShapes(changes)
	}

	resizeShape(shape: TLShapeId | TLShape, scale: VecLike, opts: TLResizeShapeOptions = {}): void {
		const partial = this.editor.getResizeShapePartial(shape, scale, opts)
		if (partial) this.editor.updateShapes([partial])
	}

	/** @internal */
	getResizeShapePartial(
		shape: TLShapeId | TLShape,
		scale: VecLike,
		opts: TLResizeShapeOptions = {}
	): TLShapePartial | null {
		const id = typeof shape === 'string' ? shape : shape.id
		if (this.editor.getIsReadonly()) return null

		if (!Number.isFinite(scale.x)) scale = new Vec(1, scale.y)
		if (!Number.isFinite(scale.y)) scale = new Vec(scale.x, 1)

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

		if (isAspectRatioLocked) {
			if (Math.abs(scale.x) > Math.abs(scale.y)) {
				scale = new Vec(scale.x, Math.sign(scale.y) * Math.abs(scale.x))
			} else {
				scale = new Vec(Math.sign(scale.x) * Math.abs(scale.y), scale.y)
			}
		}

		let workingShape: TLShape | null = null

		const initialPagePoint = Mat.applyToPoint(pageTransform, new Vec())

		if (util.onResize && util.canResize(initialShape)) {
			// get the model changes from the shape util
			const newPagePoint = this._scalePagePoint(
				initialPagePoint,
				scaleOrigin,
				scale,
				scaleAxisRotation
			)

			const newLocalPoint = this.editor.getPointInParentSpace(initialShape.id, newPagePoint)

			// resize the shape's local bounding box
			const myScale = new Vec(scale.x, scale.y)
			// the shape is aligned with the rest of the shapes in the selection, but may be
			// 90deg offset from the main rotation of the selection, in which case
			// we need to flip the width and height scale factors
			const areWidthAndHeightAlignedWithCorrectAxis = approximately(
				(pageRotation - scaleAxisRotation) % Math.PI,
				0
			)
			myScale.x = areWidthAndHeightAlignedWithCorrectAxis ? scale.x : scale.y
			myScale.y = areWidthAndHeightAlignedWithCorrectAxis ? scale.y : scale.x

			// need to adjust the shape's x and y points in case the parent has moved since start of
			// resizing, e.g. groups
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

		// A parent-space delta added to the shape's initial x/y would double-count the parent's own
		// move during the same gesture — a repositioned group carries its children with it (#10617).
		const repositionedPagePoint = Vec.Add(
			newPageCenter,
			Vec.Sub(initialPagePoint, initialPageCenter)
		)
		const repositionedLocalPoint = this.editor.getPointInParentSpace(
			initialShape.id,
			repositionedPagePoint
		)

		if (workingShape) {
			// the util's onResize ran but returned no change; keep the working update (which may
			// include changes from onResizeStart / onResizeEnd) and reposition the shape
			return {
				...workingShape,
				x: repositionedLocalPoint.x,
				y: repositionedLocalPoint.y,
			}
		}

		return {
			id,
			type: initialShape.type as any,
			x: repositionedLocalPoint.x,
			y: repositionedLocalPoint.y,
		}
	}
}
