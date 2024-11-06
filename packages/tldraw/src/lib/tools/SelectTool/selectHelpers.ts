import {
	Box,
	Editor,
	Geometry2d,
	Mat,
	TLFrameShape,
	TLShape,
	TLShapeId,
	Vec,
	canonicalizeRotation,
	compact,
	pointInPolygon,
	polygonIntersectsPolyline,
	polygonsIntersect,
} from '@tldraw/editor'
import { getLabelSide } from '../../shapes/frame/components/FrameHeading'

/** @internal */
export function kickoutOccludedShapes(editor: Editor, shapeIds: TLShapeId[]) {
	// const shapes = shapeIds.map((id) => editor.getShape(id)).filter((s) => s) as TLShape[]
	const parentsToCheck = new Set<TLShape>()
	for (const id of shapeIds) {
		// If the shape exists and the shape has an onDragShapesOut
		// function, add it to the set
		const shape = editor.getShape(id)
		if (!shape) continue
		if (editor.getShapeUtil(shape).onDragShapesOut) {
			parentsToCheck.add(shape)
		}
		// If the shape's parent is a shape and the shape's parent
		// has an onDragShapesOut function, add it to the set
		const parent = editor.getShape(shape.parentId)
		if (!parent) continue
		if (editor.getShapeUtil(parent).onDragShapesOut) {
			parentsToCheck.add(parent)
		}
	}

	const parentsWithKickedOutChildren = new Map<TLShape, TLShapeId[]>()

	for (const parent of parentsToCheck) {
		const occludedChildren = getOccludedChildren(editor, parent)
		if (occludedChildren.length) {
			parentsWithKickedOutChildren.set(parent, occludedChildren)
		}
	}

	// now call onDragShapesOut for each parent
	for (const [parent, kickedOutChildrenIds] of parentsWithKickedOutChildren) {
		const shapeUtil = editor.getShapeUtil(parent)
		const kickedOutChildren = compact(kickedOutChildrenIds.map((id) => editor.getShape(id)))
		shapeUtil.onDragShapesOut?.(parent, kickedOutChildren)
	}
}

/** @public */
export function getOccludedChildren(editor: Editor, parent: TLShape) {
	const childIds = editor.getSortedChildIdsForParent(parent.id)
	if (childIds.length === 0) return []
	const parentPageBounds = editor.getShapePageBounds(parent)
	if (!parentPageBounds) return []

	let parentGeometry: Geometry2d | undefined
	let parentPageTransform: Mat | undefined
	let parentPageCorners: Vec[] | undefined

	const results: TLShapeId[] = []

	for (const childId of childIds) {
		const shapePageBounds = editor.getShapePageBounds(childId)
		if (!shapePageBounds) {
			// Not occluded, shape doesn't exist
			continue
		}

		if (!parentPageBounds.includes(shapePageBounds)) {
			// Not in shape's bounds, shape is occluded
			results.push(childId)
			continue
		}

		// There might be a lot of children; we don't want to do this for all of them,
		// but we also don't want to do it at all if we don't have to. ??= to the rescue!

		parentGeometry ??= editor.getShapeGeometry(parent)
		parentPageTransform ??= editor.getShapePageTransform(parent)
		parentPageCorners ??= parentPageTransform.applyToPoints(parentGeometry.vertices)

		const parentCornersInShapeSpace = editor
			.getShapePageTransform(childId)
			.clone()
			.invert()
			.applyToPoints(parentPageCorners)

		// If any of the shape's vertices are inside the occluder, it's not occluded
		const { vertices, isClosed } = editor.getShapeGeometry(childId)

		if (vertices.some((v) => pointInPolygon(v, parentCornersInShapeSpace))) {
			// not occluded, vertices are in the occluder's corners
			continue
		}

		// If any the shape's vertices intersect the edge of the occluder, it's not occluded
		if (isClosed) {
			if (polygonsIntersect(parentCornersInShapeSpace, vertices)) {
				// not occluded, vertices intersect parent's corners
				continue
			}
		} else if (polygonIntersectsPolyline(parentCornersInShapeSpace, vertices)) {
			// not occluded, vertices intersect parent's corners
			continue
		}

		// Passed all checks, shape is occluded
		results.push(childId)
	}

	return results
}

/** @internal */
export function startEditingShapeWithLabel(editor: Editor, shape: TLShape, selectAll = false) {
	// Finish this shape and start editing the next one
	editor.select(shape)
	editor.setEditingShape(shape)
	editor.setCurrentTool('select.editing_shape', {
		target: 'shape',
		shape: shape,
	})
	if (selectAll) {
		editor.emit('select-all-text', { shapeId: shape.id })
	}
	// zoomToShapeIfOffscreen(editor)
	zoomToLabelPosition(editor)
}

const ZOOM_TO_SHAPE_PADDING = 16
export function zoomToShapeIfOffscreen(editor: Editor) {
	const selectionPageBounds = editor.getSelectionPageBounds()
	const viewportPageBounds = editor.getViewportPageBounds()
	zoomToBoxIfOffScreen(selectionPageBounds, viewportPageBounds, editor)
}

function zoomToLabelPosition(editor: Editor) {
	const viewportPageBounds = editor.getViewportPageBounds()
	const shape = editor.getEditingShape()!
	const transform = editor.getShapePageTransform(shape)

	const labelBox =
		shape.type === 'frame'
			? getFrameLabelBox(editor, shape as TLFrameShape, transform)
			: getShapeLabelBox(editor, shape, transform)

	if (labelBox) {
		zoomToBoxIfOffScreen(labelBox, viewportPageBounds, editor)
	}
}

function getFrameLabelBox(editor: Editor, shape: TLFrameShape, transform: Mat) {
	const FRAME_HEADING_HEIGHT = 32
	// which side is the frame heading on?
	const pageRotation = canonicalizeRotation(transform.rotation())
	const labelSide = getLabelSide(pageRotation)

	// The frame heading scales with the zoom
	const zoomAdjustedHeight = FRAME_HEADING_HEIGHT / editor.getZoomLevel()

	let frameHeadingPoint: Vec
	switch (labelSide) {
		case 'top':
			frameHeadingPoint = new Vec(0, -zoomAdjustedHeight)
			break
		case 'left':
			frameHeadingPoint = new Vec(-zoomAdjustedHeight, shape.props.h)
			break
		case 'bottom':
			frameHeadingPoint = new Vec(shape.props.w, shape.props.h + zoomAdjustedHeight)
			break
		case 'right':
			frameHeadingPoint = new Vec(shape.props.w + zoomAdjustedHeight, 0)
			break
	}

	const inPageSpace = transform.applyToPoint(frameHeadingPoint)

	// make a small box around this point
	return new Box(inPageSpace.x, inPageSpace.y, 4, 4)
}

function getShapeLabelBox(editor: Editor, shape: TLShape, transform: Mat) {
	const labelGeometry = editor
		.getShapeGeometry(shape)
		// @ts-ignore
		.children.filter((g: Geometry2d) => g.isLabel === true)[0]
	//arrows with no label text return undefined, so let's just get the center of the shape
	if (!labelGeometry) {
		// todo : arrows with no label that have had the label position changed, remember the old position in props We can use that to get the place we should pan to
		const shapeBounds = editor.getShapePageBounds(shape)
		if (!shapeBounds) throw new Error('no shape bounds found')
		return new Box(shapeBounds.center.x, shapeBounds.center.y, 40, 40)
	} else {
		const pagePoint = transform.applyToPoint(
			new Vec(labelGeometry.bounds.minX, labelGeometry.bounds.minY)
		)
		return new Box(
			pagePoint.x,
			pagePoint.y,
			labelGeometry.bounds.width,
			labelGeometry.bounds.height
		)
	}
}

function zoomToBoxIfOffScreen(box: Box | null, viewport: Box, editor: Editor) {
	if (box && !viewport.contains(box)) {
		const eb = box
			.clone()
			// Expand the bounds by the padding
			.expandBy(ZOOM_TO_SHAPE_PADDING / editor.getZoomLevel())
			// then expand the bounds to include the viewport bounds
			.expand(viewport)

		// then use the difference between the centers to calculate the offset
		const nextBounds = viewport.clone().translate({
			x: (eb.center.x - viewport.center.x) * 2,
			y: (eb.center.y - viewport.center.y) * 2,
		})
		editor.zoomToBounds(nextBounds, {
			animation: {
				duration: editor.options.animationMediumMs,
			},
			inset: 0,
		})
	}
}
