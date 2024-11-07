import { Editor, Geometry2d, Group2d, Vec } from '@tldraw/editor'

/**
 * Return all the text labels in a geometry.
 *
 * @param geometry - The geometry to get the text labels from.
 *
 * @public
 */
export function getTextLabels(geometry: Geometry2d) {
	if (geometry.isLabel) {
		return [geometry]
	}

	if (geometry instanceof Group2d) {
		return geometry.children.filter((child) => child.isLabel)
	}

	return []
}

export function maybeSnapToGrid(point: Vec, editor: Editor): Vec {
	const isGridMode = editor.getInstanceState().isGridMode
	const gridSize = editor.getDocumentSettings().gridSize
	if (isGridMode) return point.snapToGrid(gridSize)
	return point
}
