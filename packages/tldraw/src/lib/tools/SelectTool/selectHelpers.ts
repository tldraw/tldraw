import { Editor, TLShape, TLShapeId } from '@tldraw/editor'

export function kickoutOccludedShapes(editor: Editor, shapes: TLShape[]) {
	const effectedParents: TLShape[] = [] // ... get these from the shapes

	const kickedOutChildren: TLShapeId[] = []

	for (const parent of effectedParents) {
		const childIds = editor.getSortedChildIdsForParent(parent.id)

		// Get the bounds of the parent shape
		const parentPageBounds = editor.getShapePageBounds(parent)
		if (!parentPageBounds) continue

		// For each child, check whether its bounds overlap with the parent's bounds
		for (const childId of childIds) {
			const childPageBounds = editor.getShapeMaskedPageBounds(childId)
			if (childPageBounds && parentPageBounds.includes(childPageBounds)) {
				continue
			}

			kickedOutChildren.push(childId)
		}
	}

	// now kick out the children
	editor.reparentShapes(kickedOutChildren, editor.getCurrentPageId())
}
