import { TLShape, TLShapeId } from '@tldraw/tlschema'
import { Box } from '../primitives/Box'
import { Mat, MatLike } from '../primitives/Mat'
import { Vec, VecLike } from '../primitives/Vec'
import { approximately, areAnglesCompatible } from '../primitives/utils'
import { Editor, TLResizeShapeOptions } from './Editor'

/**
 * Resize a shape.
 *
 * @param id - The id of the shape to resize.
 * @param scale - The scale factor to apply to the shape.
 * @param options - Additional options.
 *
 * @public
 */
export function resizeShape(
	editor: Editor,
	shape: TLShapeId | TLShape,
	scale: VecLike,
	options: TLResizeShapeOptions = {}
) {
	const id = typeof shape === 'string' ? shape : shape.id
	if (editor.getInstanceState().isReadonly) throw Error('Cannot resize shape in readonly mode')

	if (!Number.isFinite(scale.x)) scale = new Vec(1, scale.y)
	if (!Number.isFinite(scale.y)) scale = new Vec(scale.x, 1)

	const initialShape = options.initialShape ?? editor.getShape(id)
	if (!initialShape) throw Error('Shape not found')

	const scaleOrigin = options.scaleOrigin ?? editor.getShapePageBounds(id)?.center
	if (!scaleOrigin) throw Error('Shape bounds not found')

	const pageTransform = options.initialPageTransform
		? Mat.Cast(options.initialPageTransform)
		: editor.getShapePageTransform(id)
	if (!pageTransform) throw Error('Shape transform not found')

	const pageRotation = pageTransform.rotation()
	if (pageRotation == null) throw Error('Page rotation not found')

	const scaleAxisRotation = options.scaleAxisRotation ?? pageRotation

	const initialBounds = options.initialBounds ?? editor.getShapeGeometry(id).bounds
	if (!initialBounds) throw Error('Shape bounds not found')

	if (!areAnglesCompatible(pageRotation, scaleAxisRotation)) {
		// shape is awkwardly rotated, keep the aspect ratio locked and adopt the scale factor
		// from whichever axis is being scaled the least, to avoid the shape getting bigger
		// than the bounds of the selection
		// const minScale = Math.min(Math.abs(scale.x), Math.abs(scale.y))
		return resizeUnalignedShape(editor, id, scale, {
			...options,
			initialBounds,
			scaleOrigin,
			scaleAxisRotation,
			initialPageTransform: pageTransform,
			initialShape,
		})
	}

	const util = editor.getShapeUtil(initialShape)

	if (util.isAspectRatioLocked(initialShape)) {
		if (Math.abs(scale.x) > Math.abs(scale.y)) {
			scale = new Vec(scale.x, Math.sign(scale.y) * Math.abs(scale.x))
		} else {
			scale = new Vec(Math.sign(scale.x) * Math.abs(scale.y), scale.y)
		}
	}

	if (util.onResize && util.canResize(initialShape)) {
		// get the model changes from the shape util
		const newPagePoint = scalePagePoint(
			Mat.applyToPoint(pageTransform, new Vec(0, 0)),
			scaleOrigin,
			scale,
			scaleAxisRotation
		)

		const newLocalPoint = editor.getPointInParentSpace(initialShape.id, newPagePoint)

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

		// adjust initial model for situations where the parent has moved during the resize
		// e.g. groups
		const initialPagePoint = Mat.applyToPoint(pageTransform, new Vec())

		// need to adjust the shape's x and y points in case the parent has moved since start of resizing
		const { x, y } = editor.getPointInParentSpace(initialShape.id, initialPagePoint)

		editor.updateShapes(
			[
				{
					id,
					type: initialShape.type as any,
					x: newLocalPoint.x,
					y: newLocalPoint.y,
					...util.onResize(
						{ ...initialShape, x, y },
						{
							newPoint: newLocalPoint,
							handle: options.dragHandle ?? 'bottom_right',
							// don't set isSingle to true for children
							mode: options.mode ?? 'scale_shape',
							scaleX: myScale.x,
							scaleY: myScale.y,
							initialBounds,
							initialShape,
						}
					),
				},
			],
			{ squashing: true }
		)
	} else {
		const initialPageCenter = Mat.applyToPoint(pageTransform, initialBounds.center)
		// get the model changes from the shape util
		const newPageCenter = scalePagePoint(initialPageCenter, scaleOrigin, scale, scaleAxisRotation)

		const initialPageCenterInParentSpace = editor.getPointInParentSpace(
			initialShape.id,
			initialPageCenter
		)
		const newPageCenterInParentSpace = editor.getPointInParentSpace(initialShape.id, newPageCenter)

		const delta = Vec.Sub(newPageCenterInParentSpace, initialPageCenterInParentSpace)
		// apply the changes to the model
		editor.updateShapes(
			[
				{
					id,
					type: initialShape.type as any,
					x: initialShape.x + delta.x,
					y: initialShape.y + delta.y,
				},
			],
			{ squashing: true }
		)
	}
}

function resizeUnalignedShape(
	editor: Editor,
	id: TLShapeId,
	scale: VecLike,
	options: {
		initialBounds: Box
		scaleOrigin: VecLike
		scaleAxisRotation: number
		initialShape: TLShape
		initialPageTransform: MatLike
	}
) {
	const { type } = options.initialShape
	// If a shape is not aligned with the scale axis we need to treat it differently to avoid skewing.
	// Instead of skewing we normalize the scale aspect ratio (i.e. keep the same scale magnitude in both axes)
	// and then after applying the scale to the shape we also rotate it if required and translate it so that it's center
	// point ends up in the right place.

	const shapeScale = new Vec(scale.x, scale.y)

	// make sure we are constraining aspect ratio, and using the smallest scale axis to avoid shapes getting bigger
	// than the selection bounding box
	if (Math.abs(scale.x) > Math.abs(scale.y)) {
		shapeScale.x = Math.sign(scale.x) * Math.abs(scale.y)
	} else {
		shapeScale.y = Math.sign(scale.y) * Math.abs(scale.x)
	}

	// first we can scale the shape about its center point
	resizeShape(editor, id, shapeScale, {
		initialShape: options.initialShape,
		initialBounds: options.initialBounds,
	})

	// then if the shape is flipped in one axis only, we need to apply an extra rotation
	// to make sure the shape is mirrored correctly
	if (Math.sign(scale.x) * Math.sign(scale.y) < 0) {
		let { rotation } = Mat.Decompose(options.initialPageTransform)
		rotation -= 2 * rotation
		editor.updateShapes([{ id, type, rotation }], { squashing: true })
	}

	// Next we need to translate the shape so that it's center point ends up in the right place.
	// To do that we first need to calculate the center point of the shape in the current page space before the scale was applied.
	const preScaleShapePageCenter = Mat.applyToPoint(
		options.initialPageTransform,
		options.initialBounds.center
	)

	// And now we scale the center point by the original scale factor
	const postScaleShapePageCenter = scalePagePoint(
		preScaleShapePageCenter,
		options.scaleOrigin,
		scale,
		options.scaleAxisRotation
	)

	// now calculate how far away the shape is from where it needs to be
	const pageBounds = editor.getShapePageBounds(id)!
	const pageTransform = editor.getShapePageTransform(id)!
	const currentPageCenter = pageBounds.center
	const shapePageTransformOrigin = pageTransform.point()
	if (!currentPageCenter || !shapePageTransformOrigin) throw Error('Shape bounds not found')
	const pageDelta = Vec.Sub(postScaleShapePageCenter, currentPageCenter)

	// and finally figure out what the shape's new position should be
	const postScaleShapePagePoint = Vec.Add(shapePageTransformOrigin, pageDelta)
	const { x, y } = editor.getPointInParentSpace(id, postScaleShapePagePoint)

	editor.updateShapes([{ id, type, x, y }], { squashing: true })
}

function scalePagePoint(
	point: VecLike,
	scaleOrigin: VecLike,
	scale: VecLike,
	scaleAxisRotation: number
) {
	return (
		Vec.From(point)
			.rotWith(scaleOrigin, -scaleAxisRotation)
			.sub(scaleOrigin)
			// calculate the new point position relative to the scale origin
			.mulV(scale)
			// and rotate it back to page coords to get the new page point of the resized shape
			.add(scaleOrigin)
			.rotWith(scaleOrigin, scaleAxisRotation)
	)
}
