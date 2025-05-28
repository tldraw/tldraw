import {
	EMPTY_ARRAY,
	Editor,
	TLShape,
	TLShapeId,
	compact,
	pointInPolygon,
	polygonIntersectsPolyline,
	polygonsIntersect,
} from '@tldraw/editor'

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
		const childIds = editor.getSortedChildIdsForParent(parent)
		const overlappingChildren = getOverlappingShapes(editor, parent, childIds)
		if (overlappingChildren.length) {
			parentsWithKickedOutChildren.set(parent, overlappingChildren)
		}
	}

	// now call onDragShapesOut for each parent
	for (const [parent, kickedOutChildrenIds] of parentsWithKickedOutChildren) {
		const shapeUtil = editor.getShapeUtil(parent)
		const kickedOutChildren = compact(kickedOutChildrenIds.map((id) => editor.getShape(id)))
		shapeUtil.onDragShapesOut?.(parent, kickedOutChildren)
	}
}

/**
 * Get the shapes that overlap with a given shape.
 *
 * @param editor - The editor instance.
 * @param shape - The shapes or shape IDs to check against.
 * @param otherShapes - The shapes or shape IDs to check for overlap.
 * @returns An array of shapes or shape IDs that overlap with the given shape.
 *
 * @public
 */
export function getOverlappingShapes(
	editor: Editor,
	shape: TLShape,
	otherShapes: TLShapeId[]
): TLShapeId[]
/**
 * Get the shapes that overlap with a given shape.
 *
 * @param editor - The editor instance.
 * @param shape - The shapes or shape IDs to check against.
 * @param otherShapes - The shapes or shape IDs to check for overlap.
 * @returns An array of shapes or shape IDs that overlap with the given shape.
 *
 * @public
 */
export function getOverlappingShapes(
	editor: Editor,
	shape: TLShape,
	otherShapes: TLShape[]
): TLShape[]
export function getOverlappingShapes<T extends TLShape[] | TLShapeId[]>(
	editor: Editor,
	shape: T[number],
	otherShapes: T
) {
	if (otherShapes.length === 0) {
		return EMPTY_ARRAY
	}

	const parentPageBounds = editor.getShapePageBounds(shape)
	if (!parentPageBounds) return EMPTY_ARRAY

	const parentGeometry = editor.getShapeGeometry(shape)
	const parentPageTransform = editor.getShapePageTransform(shape)
	const parentPageCorners = parentPageTransform.applyToPoints(parentGeometry.vertices)

	const shapesInsideOfParent = []

	for (const childId of otherShapes) {
		const shapePageBounds = editor.getShapePageBounds(childId)
		if (!shapePageBounds) continue

		// If the shape's bounds are entirely outside of the parent's bounds, it's outside
		if (!parentPageBounds.includes(shapePageBounds)) {
			shapesInsideOfParent.push(typeof childId === 'string' ? childId : childId.id)
			continue
		}

		// There might be a lot of children; we don't want to do this for all of them,
		// but we also don't want to do it at all if we don't have to. ??= to the rescue!

		// Put the parent's corners into shape space.
		// todo: really this should be the entire vertices of the parent shape, but we only do this check for Frames (rectangles); it might actually be easier to use the geometry intersection anyway (bounds, center, and polygon or polyline)
		const parentCornersInShapeSpace = editor
			.getShapePageTransform(childId)
			.clone()
			.invert()
			.applyToPoints(parentPageCorners)

		const { vertices, center, isClosed } = editor.getShapeGeometry(childId)

		// We'll do things in order of cheapest to most expensive checks

		// If the shape is closed and its center is inside the parent, it' inside
		if (isClosed && pointInPolygon(center, parentCornersInShapeSpace)) {
			continue
		}

		// If any of the shape's vertices are inside the occluder, it's inside
		if (vertices.some((v) => pointInPolygon(v, parentCornersInShapeSpace))) {
			continue
		}

		// If any the shape's vertices intersect the edge of the occluder, it's inside.
		// for example when a rotated rectangle is moved over the corner of a parent rectangle
		if (isClosed) {
			// If the child shape is closed, intersect as a polygon
			if (polygonsIntersect(parentCornersInShapeSpace, vertices)) {
				continue
			}
		} else {
			// if the child shape is not closed, intersect as a polyline
			if (polygonIntersectsPolyline(parentCornersInShapeSpace, vertices)) {
				continue
			}
		}

		// If we haven't established that the shape is inside the parent, it must be outside
		shapesInsideOfParent.push(childId)
	}

	return shapesInsideOfParent
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
}
