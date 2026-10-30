import { createShapeId, type TLGroupShape } from '@tldraw/tlschema'
import { sortByIndex } from '@tldraw/utils'
import type { BoxModel, Editor, TLContent } from 'tldraw'

/**
 * A {@link PrepareItemContent} that saves several top-level shapes inside a new group, so the item
 * places as one shape. A single top-level shape is saved as it is.
 * @public
 */
export function wrapInGroup(content: TLContent, editor: Editor): TLContent {
	if (content.rootShapeIds.length < 2) return content
	const bounds = editor.getShapesPageBounds(content.rootShapeIds)
	return bounds ? groupRootShapes(content, bounds) : content
}

/**
 * Wraps content's top-level shapes in a new group, as `Editor.groupShapes` would on the page: the
 * group sits at the top left of their page bounds, above them all, and they move into its space.
 * `bounds` is the page bounds of the top-level shapes.
 */
export function groupRootShapes(content: TLContent, bounds: BoxModel): TLContent {
	const rootIds = new Set(content.rootShapeIds)
	const roots = content.shapes.filter((shape) => rootIds.has(shape.id)).sort(sortByIndex)
	const topmost = roots[roots.length - 1]
	if (!topmost) return content

	const group: TLGroupShape = {
		id: createShapeId(),
		typeName: 'shape',
		type: 'group',
		x: bounds.x,
		y: bounds.y,
		rotation: 0,
		index: topmost.index,
		parentId: topmost.parentId,
		isLocked: false,
		opacity: 1,
		props: {},
		meta: {},
	}

	return {
		...content,
		rootShapeIds: [group.id],
		shapes: [
			group,
			...content.shapes.map((shape) =>
				rootIds.has(shape.id)
					? { ...shape, parentId: group.id, x: shape.x - bounds.x, y: shape.y - bounds.y }
					: shape
			),
		],
	}
}
