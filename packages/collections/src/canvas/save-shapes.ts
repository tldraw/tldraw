import { createShapeId, type TLGroupShape } from '@tldraw/tlschema'
import { sortByIndex } from '@tldraw/utils'
import type { BoxModel, Editor, TLContent, TLShapeId } from 'tldraw'
import type { CollectionSource } from '../lib/CollectionSource'
import {
	CURRENT_ITEM_CONTENT_FORMAT_VERSION,
	type TLCollectionId,
	type TLCollectionItem,
} from '../lib/schema'

/**
 * Saves shapes from the current page to a collection, with a rendered thumbnail. Their bindings
 * and assets go with them, as when copying. Several top-level shapes are saved inside a new group,
 * so the item places as one shape; the shapes on the page are left as they are. Rejects with the
 * source's error when the save is refused.
 * @public
 */
export async function saveShapesToCollection(
	editor: Editor,
	source: CollectionSource,
	collectionId: TLCollectionId,
	shapeIds: TLShapeId[],
	name?: string
): Promise<TLCollectionItem> {
	const copied = editor.getContentFromCurrentPage(shapeIds)
	if (!copied) throw new Error('No shapes to save')
	const bounds = editor.getShapesPageBounds(copied.rootShapeIds)
	const content =
		copied.rootShapeIds.length > 1 && bounds ? groupRootShapes(copied, bounds) : copied
	const { blob } = await editor.toImage(shapeIds, { format: 'png', background: false })
	return source.addItem(collectionId, {
		name,
		content: { formatVersion: CURRENT_ITEM_CONTENT_FORMAT_VERSION, content },
		thumbnail: blob,
	})
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
