import {
	Editor,
	TLShape,
	TLShapeId,
	pointInPolygon,
	polygonIntersectsPolyline,
	polygonsIntersect,
} from '@tldraw/editor'

/** @internal */
export function kickoutOccludedShapes(editor: Editor, shapeIds: TLShapeId[]) {
	const shapes = shapeIds.map((id) => editor.getShape(id)).filter((s) => s) as TLShape[]
	const effectedParents = shapes
		.map((shape) => {
			const parent = editor.getShape(shape.parentId)
			if (!parent) return shape
			return parent
		})
		.filter((shape) => shape.type === 'frame')

	const kickedOutChildren: TLShapeId[] = []
	for (const parent of effectedParents) {
		const childIds = editor.getSortedChildIdsForParent(parent.id)

		// Get the bounds of the parent shape
		const parentPageBounds = editor.getShapePageBounds(parent)
		if (!parentPageBounds) continue

		// For each child, check whether its bounds overlap with the parent's bounds
		for (const childId of childIds) {
			if (isShapeOccluded(editor, parent, childId)) {
				kickedOutChildren.push(childId)
			}
		}
	}

	// now kick out the children
	editor.reparentShapes(kickedOutChildren, editor.getCurrentPageId())
}

/** @internal */
export function isShapeOccluded(editor: Editor, occluder: TLShape, shape: TLShapeId) {
	const occluderPageBounds = editor.getShapePageBounds(occluder)
	const shapePageBounds = editor.getShapePageBounds(shape)
	if (!occluderPageBounds) return true
	if (!shapePageBounds) return false

	// If the shape's bounds are completely outside the occluder, it's occluded
	if (!occluderPageBounds.includes(shapePageBounds)) {
		return true
	}

	const occluderGeometry = editor.getShapeGeometry(occluder)
	const occluderPageTransform = editor.getShapePageTransform(occluder)
	const occluderPageCorners = occluderGeometry.vertices.map((v) => {
		return occluderPageTransform.applyToPoint(v)
	})

	const occluderShapeCorners = occluderPageCorners.map((v) => {
		return editor.getPointInShapeSpace(shape, v)
	})

	// If any of the shape's vertices are inside the occluder, it's not occluded
	const shapeGeometry = editor.getShapeGeometry(shape)
	if (shapeGeometry.vertices.some((v) => pointInPolygon(v, occluderShapeCorners))) {
		return false
	}

	// If any the shape's vertices intersect the edge of the occluder, it's not occluded
	if (shapeGeometry.isClosed) {
		return !polygonsIntersect(occluderShapeCorners, shapeGeometry.vertices)
	}

	return !polygonIntersectsPolyline(occluderShapeCorners, shapeGeometry.vertices)
}
