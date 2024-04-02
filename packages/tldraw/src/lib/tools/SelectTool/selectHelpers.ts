import {
	Box,
	Editor,
	TLShape,
	TLShapeId,
	intersectPolygonBounds,
	intersectPolylineBounds,
} from '@tldraw/editor'

/**
 * @internal
 */
export function kickoutOccludedShapes(editor: Editor, shapes: TLShape[]) {
	const effectedParents: TLShape[] = shapes

	const kickedOutChildren: TLShapeId[] = []

	for (const parent of effectedParents) {
		const childIds = editor.getSortedChildIdsForParent(parent.id)

		// Get the bounds of the parent shape
		const parentPageBounds = editor.getShapePageBounds(parent)
		if (!parentPageBounds) continue

		// For each child, check whether its bounds overlap with the parent's bounds
		for (const childId of childIds) {
			const childPageBounds = editor.getShapeMaskedPageBounds(childId)
			if (!childPageBounds) {
				kickedOutChildren.push(childId)
				continue
			}

			// If the child's bounds are completely inside the parent, keep it
			if (parentPageBounds.contains(childPageBounds)) {
				continue
			}

			// If the child's bounds are completely outside the parent, unparent it
			if (!parentPageBounds.includes(childPageBounds)) {
				kickedOutChildren.push(childId)
				continue
			}

			// If we've made it this far, the child's bounds must intersect the edge of the parent
			// If the child's geometry is outside the parent, unparent it

			const childGeometry = editor.getShapeGeometry(childId)
			const parentBoundsInChildSpace = Box.FromPoints(
				parentPageBounds.corners.map((v) => editor.getPointInShapeSpace(childId, v))
			)

			// If the child's geometry intersects the parent, keep it
			if (
				childGeometry.isClosed
					? !intersectPolygonBounds(childGeometry.vertices, parentBoundsInChildSpace)
					: !intersectPolylineBounds(childGeometry.vertices, parentBoundsInChildSpace)
			) {
				kickedOutChildren.push(childId)
			}
		}
	}

	// now kick out the children
	editor.reparentShapes(kickedOutChildren, editor.getCurrentPageId())
}
