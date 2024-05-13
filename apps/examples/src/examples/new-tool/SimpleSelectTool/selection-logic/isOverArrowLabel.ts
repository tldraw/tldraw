import { Editor, Group2d, TLArrowShape, TLShape, pointInPolygon } from 'tldraw'

export function isOverArrowLabel(editor: Editor, shape: TLShape | undefined) {
	if (!shape) return false

	const pointInShapeSpace = editor.getPointInShapeSpace(shape, editor.inputs.currentPagePoint)

	// todo: Extract into general hit test for arrows
	if (editor.isShapeOfType<TLArrowShape>(shape, 'arrow')) {
		// How should we handle multiple labels? Do shapes ever have multiple labels?
		const labelGeometry = editor.getShapeGeometry<Group2d>(shape).children[1]
		// Knowing what we know about arrows... if the shape has no text in its label,
		// then the label geometry should not be there.
		if (labelGeometry && pointInPolygon(pointInShapeSpace, labelGeometry.vertices)) {
			return true
		}
	}

	return false
}
