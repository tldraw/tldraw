import {
	EMPTY_ARRAY,
	Editor,
	Geometry2d,
	Group2d,
	TLShape,
	TLShapeId,
	Vec,
	compact,
	intersectPolygonPolygon,
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
		if (overlappingChildren.length < childIds.length) {
			parentsWithKickedOutChildren.set(
				parent,
				childIds.filter((id) => !overlappingChildren.includes(id))
			)
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

	const parentPageMaskVertices = editor.getShapePageMask(shape)
	const parentPagePolygon = parentPageMaskVertices
		? intersectPolygonPolygon(parentPageMaskVertices, parentPageCorners)
		: parentPageCorners

	if (!parentPagePolygon) return EMPTY_ARRAY

	return otherShapes.filter((childId) => {
		const shapePageBounds = editor.getShapePageBounds(childId)
		if (!shapePageBounds || !parentPageBounds.includes(shapePageBounds)) return false

		const parentPolygonInShapeShape = editor
			.getShapePageTransform(childId)
			.clone()
			.invert()
			.applyToPoints(parentPagePolygon)

		const geometry = editor.getShapeGeometry(childId)

		return doesGeometryOverlapPolygon(geometry, parentPolygonInShapeShape)
	})
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
export function getHasOverlappingShapes(
	editor: Editor,
	shape: TLShape,
	otherShapes: TLShapeId[]
): boolean
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
export function getHasOverlappingShapes(
	editor: Editor,
	shape: TLShape,
	otherShapes: TLShape[]
): boolean
export function getHasOverlappingShapes<T extends TLShape[] | TLShapeId[]>(
	editor: Editor,
	shape: T[number],
	otherShapes: T
) {
	if (otherShapes.length === 0) {
		return false
	}

	const parentPageBounds = editor.getShapePageBounds(shape)
	if (!parentPageBounds) return false

	const parentGeometry = editor.getShapeGeometry(shape)
	const parentPageTransform = editor.getShapePageTransform(shape)
	const parentPageCorners = parentPageTransform.applyToPoints(parentGeometry.vertices)

	return otherShapes.some((childId) => {
		const shapePageBounds = editor.getShapePageBounds(childId)
		if (!shapePageBounds || !parentPageBounds.includes(shapePageBounds)) return false

		const parentCornersInShapeSpace = editor
			.getShapePageTransform(childId)
			.clone()
			.invert()
			.applyToPoints(parentPageCorners)

		const geometry = editor.getShapeGeometry(childId)
		return doesGeometryOverlapPolygon(geometry, parentCornersInShapeSpace)
	})
}

/**
 * @public
 */
export function doesGeometryOverlapPolygon(
	geometry: Geometry2d,
	parentCornersInShapeSpace: Vec[]
): boolean {
	// If the child is a group, check if any of its children overlap the box
	if (geometry instanceof Group2d) {
		return geometry.children.some((childGeometry) =>
			doesGeometryOverlapPolygon(childGeometry, parentCornersInShapeSpace)
		)
	}

	// Otherwise, check if the geometry overlaps the box
	return doesGeometryOverlapPolygonInner(geometry, parentCornersInShapeSpace)
}

function doesGeometryOverlapPolygonInner(geometry: Geometry2d, polygon: Vec[]) {
	const { vertices, center, isFilled, isEmptyLabel, isClosed } = geometry

	// We'll do things in order of cheapest to most expensive checks

	// Skip empty labels
	if (isEmptyLabel) return false

	// If the shape is filled and closed and its center is inside the parent, it's inside
	if (isFilled && isClosed && pointInPolygon(center, polygon)) {
		return true
	}

	// If any of the shape's vertices are inside the occluder, it's inside
	if (vertices.some((v) => pointInPolygon(v, polygon))) {
		return true
	}

	// If any the shape's vertices intersect the edge of the occluder, it's inside.
	// for example when a rotated rectangle is moved over the corner of a parent rectangle
	if (isClosed) {
		// If the child shape is closed, intersect as a polygon
		if (polygonsIntersect(polygon, vertices)) {
			return true
		}
	} else {
		// if the child shape is not closed, intersect as a polyline
		if (polygonIntersectsPolyline(polygon, vertices)) {
			return true
		}
	}

	// If none of the above checks passed, the shape is outside the parent
	return false
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
