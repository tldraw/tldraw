import { Geometry2d, Group2d } from '@tldraw/editor'

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
