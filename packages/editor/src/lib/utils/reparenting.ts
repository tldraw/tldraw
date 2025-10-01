import { EMPTY_ARRAY } from '@tldraw/state'
import { TLGroupShape, TLParentId, TLShape, TLShapeId } from '@tldraw/tlschema'
import { IndexKey, compact, getIndexAbove, getIndexBetween } from '@tldraw/utils'
import { Editor } from '../editor/Editor'
import { intersectPolygonPolygon } from '../primitives/intersect'

/**
 * Reparents shapes that are no longer contained within their parent shapes.
 * todo: rename me to something more descriptive, like `reparentOccludedShapes` or `reparentAutoDroppedShapes`
 *
 * @param editor - The editor instance.
 * @param shapeIds - The IDs of the shapes to reparent.
 * @param opts - Optional options, including a callback to filter out certain parents, such as when removing a frame.
 *
 * @public
 */
export function kickoutOccludedShapes(
	editor: Editor,
	shapeIds: TLShapeId[],
	opts?: { filter?(parent: TLShape): boolean }
) {
	const parentsToCheck = new Set<TLShape>()

	for (const id of shapeIds) {
		const shape = editor.getShape(id)

		if (!shape) continue
		parentsToCheck.add(shape)

		const parent = editor.getShape(shape.parentId)
		if (!parent) continue
		parentsToCheck.add(parent)
	}

	// Check all of the parents and gather up parents who have lost children
	const parentsToLostChildren = new Map<TLShape, TLShapeId[]>()

	for (const parent of parentsToCheck) {
		const childIds = editor.getSortedChildIdsForParent(parent)
		if (opts?.filter && !opts.filter(parent)) {
			// If the shape is filtered out, we kick out all of its children
			parentsToLostChildren.set(parent, childIds)
		} else {
			const overlappingChildren = getOverlappingShapes(editor, parent.id, childIds)
			if (overlappingChildren.length < childIds.length) {
				parentsToLostChildren.set(
					parent,
					childIds.filter((id) => !overlappingChildren.includes(id))
				)
			}
		}
	}

	// Get all of the shapes on the current page, sorted by their index
	const sortedShapeIds = editor.getCurrentPageShapesSorted().map((s) => s.id)

	const parentsToNewChildren: Record<
		TLParentId,
		{ parentId: TLParentId; shapeIds: TLShapeId[]; index?: IndexKey }
	> = {}

	for (const [prevParent, lostChildrenIds] of parentsToLostChildren) {
		const lostChildren = compact(lostChildrenIds.map((id) => editor.getShape(id)))

		// Don't fall "up" into frames in front of the shape
		// if (pageShapes.indexOf(shape) < frameSortPosition) continue shapeCheck

		// Otherwise, we have no next dropping shape under the cursor, so go find
		// all the frames on the page where the moving shapes will fall into
		const { reparenting, remainingShapesToReparent } = getDroppedShapesToNewParents(
			editor,
			lostChildren,
			(shape, maybeNewParent) => {
				// If we're filtering out a potential parent, don't reparent shapes to the filtered out shape
				if (opts?.filter && !opts.filter(maybeNewParent)) return false
				return (
					maybeNewParent.id !== prevParent.id &&
					sortedShapeIds.indexOf(maybeNewParent.id) < sortedShapeIds.indexOf(shape.id)
				)
			}
		)

		reparenting.forEach((childrenToReparent, newParentId) => {
			if (childrenToReparent.length === 0) return
			if (!parentsToNewChildren[newParentId]) {
				parentsToNewChildren[newParentId] = {
					parentId: newParentId,
					shapeIds: [],
				}
			}
			parentsToNewChildren[newParentId].shapeIds.push(...childrenToReparent.map((s) => s.id))
		})

		// Reparent the rest to the page (or containing group)
		if (remainingShapesToReparent.size > 0) {
			// The remaining shapes are going to be reparented to the old parent's containing group, if there was one, or else to the page
			const newParentId =
				editor.findShapeAncestor(prevParent, (s) => editor.isShapeOfType<TLGroupShape>(s, 'group'))
					?.id ?? editor.getCurrentPageId()

			remainingShapesToReparent.forEach((shape) => {
				if (!parentsToNewChildren[newParentId]) {
					let insertIndexKey: IndexKey | undefined

					const oldParentSiblingIds = editor.getSortedChildIdsForParent(newParentId)
					const oldParentIndex = oldParentSiblingIds.indexOf(prevParent.id)
					if (oldParentIndex > -1) {
						// If the old parent is a direct child of the new parent, then we'll add them above the old parent but below the next sibling.
						const siblingsIndexAbove = oldParentSiblingIds[oldParentIndex + 1]
						const indexKeyAbove = siblingsIndexAbove
							? editor.getShape(siblingsIndexAbove)!.index
							: getIndexAbove(prevParent.index)
						insertIndexKey = getIndexBetween(prevParent.index, indexKeyAbove)
					} else {
						// If the old parent is not a direct child of the new parent, then we'll add them to the "top" of the new parent's children.
						// This is done automatically if we leave the index undefined, so let's do that.
					}

					parentsToNewChildren[newParentId] = {
						parentId: newParentId,
						shapeIds: [],
						index: insertIndexKey,
					}
				}

				parentsToNewChildren[newParentId].shapeIds.push(shape.id)
			})
		}
	}

	editor.run(() => {
		Object.values(parentsToNewChildren).forEach(({ parentId, shapeIds, index }) => {
			if (shapeIds.length === 0) return
			// Before we reparent, sort the new shape ids by their place in the original absolute order on the page
			shapeIds.sort((a, b) => (sortedShapeIds.indexOf(a) < sortedShapeIds.indexOf(b) ? -1 : 1))
			editor.reparentShapes(shapeIds, parentId, index)
		})
	})
}

/**
 * Get the shapes that overlap with a given shape.
 *
 * @param editor - The editor instance.
 * @param shape - The shapes or shape IDs to check against.
 * @param otherShapes - The shapes or shape IDs to check for overlap.
 * @returns An array of shapes or shape IDs that overlap with the given shape.
 */
function getOverlappingShapes<T extends TLShape[] | TLShapeId[]>(
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

	const _shape = editor.getShape(shape)
	if (!_shape) return EMPTY_ARRAY

	const pageTransform = editor.getShapePageTransform(shape)
	const clipPath = editor.getShapeUtil(_shape.type).getClipPath?.(_shape)

	const parentPageMaskVertices = clipPath ? pageTransform.applyToPoints(clipPath) : undefined
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

		return geometry.overlapsPolygon(parentPolygonInShapeShape)
	})
}

/**
 * Get the shapes that will be reparented to new parents when the shapes are dropped.
 *
 * @param editor - The editor instance.
 * @param shapes - The shapes to check.
 * @param cb - A callback to filter out certain shapes.
 * @returns An object with the shapes that will be reparented to new parents and the shapes that will be reparented to the page or their ancestral group.
 *
 * @public
 */
export function getDroppedShapesToNewParents(
	editor: Editor,
	shapes: Set<TLShape> | TLShape[],
	cb?: (shape: TLShape, parent: TLShape) => boolean
) {
	const shapesToActuallyCheck = new Set<TLShape>(shapes)
	const movingGroups = new Set<TLGroupShape>()

	for (const shape of shapes) {
		const parent = editor.getShapeParent(shape)
		if (parent && editor.isShapeOfType<TLGroupShape>(parent, 'group')) {
			if (!movingGroups.has(parent)) {
				movingGroups.add(parent)
			}
		}
	}

	// If all of a group's children are moving, then move the group instead
	for (const movingGroup of movingGroups) {
		const children = compact(
			editor.getSortedChildIdsForParent(movingGroup).map((id) => editor.getShape(id))
		)
		for (const child of children) {
			shapesToActuallyCheck.delete(child)
		}
		shapesToActuallyCheck.add(movingGroup)
	}

	// this could be cached and passed in
	const shapeGroupIds = new Map<TLShapeId, TLShapeId | undefined>()

	const reparenting = new Map<TLShapeId, TLShape[]>()

	const remainingShapesToReparent = new Set(shapesToActuallyCheck)

	const potentialParentShapes = editor
		.getCurrentPageShapesSorted()
		// filter out any shapes that aren't frames or that are included among the provided shapes
		.filter(
			(s) =>
				editor.getShapeUtil(s).canReceiveNewChildrenOfType?.(s, s.type) &&
				!remainingShapesToReparent.has(s)
		)

	parentCheck: for (let i = potentialParentShapes.length - 1; i >= 0; i--) {
		const parentShape = potentialParentShapes[i]
		const parentShapeContainingGroupId = editor.findShapeAncestor(parentShape, (s) =>
			editor.isShapeOfType<TLGroupShape>(s, 'group')
		)?.id

		const parentGeometry = editor.getShapeGeometry(parentShape)
		const parentPageTransform = editor.getShapePageTransform(parentShape)
		const parentPageMaskVertices = editor.getShapeMask(parentShape)
		const parentPageCorners = parentPageTransform.applyToPoints(parentGeometry.vertices)
		const parentPagePolygon = parentPageMaskVertices
			? intersectPolygonPolygon(parentPageMaskVertices, parentPageCorners)
			: parentPageCorners

		if (!parentPagePolygon) continue parentCheck

		const childrenToReparent = []

		// For each of the dropping shapes...
		shapeCheck: for (const shape of remainingShapesToReparent) {
			// Don't reparent a frame to itself
			if (parentShape.id === shape.id) continue shapeCheck

			// Use the callback to filter out certain shapes
			if (cb && !cb(shape, parentShape)) continue shapeCheck

			if (!shapeGroupIds.has(shape.id)) {
				shapeGroupIds.set(
					shape.id,
					editor.findShapeAncestor(shape, (s) => editor.isShapeOfType<TLGroupShape>(s, 'group'))?.id
				)
			}

			const shapeGroupId = shapeGroupIds.get(shape.id)

			// Are the shape and the parent part of different groups?
			if (shapeGroupId !== parentShapeContainingGroupId) continue shapeCheck

			// Is the shape is actually the ancestor of the parent?
			if (editor.findShapeAncestor(parentShape, (s) => shape.id === s.id)) continue shapeCheck

			// Convert the parent polygon to the shape's space
			const parentPolygonInShapeSpace = editor
				.getShapePageTransform(shape)
				.clone()
				.invert()
				.applyToPoints(parentPagePolygon)

			// If the shape overlaps the parent polygon, reparent it to that parent
			if (editor.getShapeGeometry(shape).overlapsPolygon(parentPolygonInShapeSpace)) {
				// Use the util to check if the shape can be reparented to the parent
				if (
					!editor.getShapeUtil(parentShape).canReceiveNewChildrenOfType?.(parentShape, shape.type)
				)
					continue shapeCheck

				if (shape.parentId !== parentShape.id) {
					childrenToReparent.push(shape)
				}
				remainingShapesToReparent.delete(shape)
				continue shapeCheck
			}
		}

		if (childrenToReparent.length) {
			reparenting.set(parentShape.id, childrenToReparent)
		}
	}

	return {
		// these are the shapes that will be reparented to new parents
		reparenting,
		// these are the shapes that will be reparented to the page or their ancestral group
		remainingShapesToReparent,
	}
}
