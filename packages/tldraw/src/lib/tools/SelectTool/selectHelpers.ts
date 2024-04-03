import {
	Editor,
	TLShape,
	TLShapeId,
	polygonIntersectsPolyline,
	polygonsIntersect,
} from '@tldraw/editor'

/** @internal */
export function kickoutOccludedShapes(editor: Editor, shapeIds: TLShapeId[]) {
	const shapes = shapeIds.map((id) => editor.getShape(id)).filter((s) => s) as TLShape[]
	const effectedParents: TLShape[] = shapes
		.map((shape) => {
			const parent = editor.getShape(shape.parentId)
			if (!parent) return shape
			return parent
		})
		.filter((shape) => shape.type === 'frame' || shape.type === 'note')

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
	// TODO: make this reparent to the parent's parent?
	editor.reparentShapes(kickedOutChildren, editor.getCurrentPageId())
}

/** @internal */
export function isShapeOccluded(editor: Editor, occluder: TLShape, shape: TLShapeId) {
	const occluderPageBounds = editor.getShapePageBounds(occluder)
	if (!occluderPageBounds) return false

	const shapePageBounds = editor.getShapePageBounds(shape)
	if (!shapePageBounds) return true

	// If the shape's bounds are completely inside the occluder, it's not occluded
	if (occluderPageBounds.contains(shapePageBounds)) {
		return false
	}

	// If the shape's bounds are completely outside the occluder, it's occluded
	if (!occluderPageBounds.includes(shapePageBounds)) {
		return true
	}

	// If we've made it this far, the shape's bounds must intersect the edge of the occluder
	// In this case, we need to look at the shape's geometry for a more fine-grained check
	const shapeGeometry = editor.getShapeGeometry(shape)
	const occluderCornersInShapeSpace = occluderPageBounds.corners.map((v) => {
		return editor.getPointInShapeSpace(shape, v)
	})

	if (shapeGeometry.isClosed) {
		return !polygonsIntersect(shapeGeometry.vertices, occluderCornersInShapeSpace)
	}

	return !polygonIntersectsPolyline(shapeGeometry.vertices, occluderCornersInShapeSpace)
}
