import { TLParentId, TLShape, TLShapeId, TLShapePartial } from '@tldraw/tlschema'
import { compact } from '@tldraw/utils'
import { Editor } from '../editor/Editor'
import { getIndicesBetween, sortByIndex } from './reordering/reordering'

export function getReorderingShapesChanges(
	editor: Editor,
	operation: 'toBack' | 'toFront' | 'forward' | 'backward',
	ids: TLShapeId[]
) {
	if (ids.length === 0) return []

	// From the ids that are moving, collect the parents, their children, and which of those children are moving
	const parents = new Map<TLParentId, { moving: Set<TLShape>; children: TLShape[] }>()

	for (const shape of compact(ids.map((id) => editor.getShape(id)))) {
		const { parentId } = shape
		if (!parents.has(parentId)) {
			parents.set(parentId, {
				children: compact(
					editor.getSortedChildIdsForParent(parentId).map((id) => editor.getShape(id))
				),
				moving: new Set(),
			})
		}
		parents.get(parentId)!.moving.add(shape)
	}

	const changes: TLShapePartial[] = []

	switch (operation) {
		case 'toBack': {
			parents.forEach(({ moving, children }) => reorderToBack(moving, children, changes))
			break
		}
		case 'toFront': {
			parents.forEach(({ moving, children }) => reorderToFront(moving, children, changes))
			break
		}
		case 'forward': {
			parents.forEach(({ moving, children }) => reorderForward(moving, children, changes))
			break
		}
		case 'backward': {
			parents.forEach(({ moving, children }) => reorderBackward(moving, children, changes))
			break
		}
	}

	return changes
}

/**
 * Reorders the moving shapes to the back of the parent's children.
 *
 * @param moving The set of shapes that are moving
 * @param children The parent's children
 * @param changes The changes array to push changes to
 */
function reorderToBack(moving: Set<TLShape>, children: TLShape[], changes: TLShapePartial[]) {
	const len = children.length

	// If all of the children are moving, there's nothing to do
	if (moving.size === len) return

	let below: string | undefined
	let above: string | undefined

	// Starting at the bottom of this parent's children...
	for (let i = 0; i < len; i++) {
		const shape = children[i]

		if (moving.has(shape)) {
			// If we've found a moving shape before we've found a non-moving shape,
			// then that shape is already at the back; we can remove it from the
			// moving set and mark it as the shape that will be below the moved shapes.
			below = shape.index
			moving.delete(shape)
		} else {
			// The first non-moving shape we find will be above our moved shapes; we'll
			// put our moving shapes between it and the shape marked as below (if any).
			above = shape.index
			break
		}
	}

	if (moving.size === 0) {
		// If our moving set is empty, there's nothing to do; all of our shapes were
		// already at the back of the parent's children.
		return
	} else {
		// Sort the moving shapes by their current index, then apply the new indices
		const indices = getIndicesBetween(below, above, moving.size)
		changes.push(
			...Array.from(moving.values())
				.sort(sortByIndex)
				.map((shape, i) => ({ ...shape, index: indices[i] }))
		)
	}
}

/**
 * Reorders the moving shapes to the front of the parent's children.
 *
 * @param moving The set of shapes that are moving
 * @param children The parent's children
 * @param changes The changes array to push changes to
 */
function reorderToFront(moving: Set<TLShape>, children: TLShape[], changes: TLShapePartial[]) {
	const len = children.length

	// If all of the children are moving, there's nothing to do
	if (moving.size === len) return

	let below: string | undefined
	let above: string | undefined

	// Starting at the top of this parent's children...
	for (let i = len - 1; i > -1; i--) {
		const shape = children[i]

		if (moving.has(shape)) {
			// If we've found a moving shape before we've found a non-moving shape,
			// then that shape is already at the front; we can remove it from the
			// moving set and mark it as the shape that will be above the moved shapes.
			above = shape.index
			moving.delete(shape)
		} else {
			// The first non-moving shape we find will be below our moved shapes; we'll
			// put our moving shapes between it and the shape marked as above (if any).
			below = shape.index
			break
		}
	}

	if (moving.size === 0) {
		// If our moving set is empty, there's nothing to do; all of our shapes were
		// already at the front of the parent's children.
		return
	} else {
		// Sort the moving shapes by their current index, then apply the new indices
		const indices = getIndicesBetween(below, above, moving.size)
		changes.push(
			...Array.from(moving.values())
				.sort(sortByIndex)
				.map((shape, i) => ({ ...shape, index: indices[i] }))
		)
	}
}

/**
 * Reorders the moving shapes forward in the parent's children.
 *
 * @param moving The set of shapes that are moving
 * @param children The parent's children
 * @param changes The changes array to push changes to
 */
function reorderForward(moving: Set<TLShape>, children: TLShape[], changes: TLShapePartial[]) {
	const len = children.length

	// If all of the children are moving, there's nothing to do
	if (moving.size === len) return

	let state = { name: 'skipping' } as
		| { name: 'skipping' }
		| { name: 'selecting'; selectIndex: number }

	// Starting at the bottom of this parent's children...
	for (let i = 0; i < len; i++) {
		const isMoving = moving.has(children[i])

		switch (state.name) {
			case 'skipping': {
				if (!isMoving) continue
				// If we find a moving shape while skipping, start selecting
				state = { name: 'selecting', selectIndex: i }
				break
			}
			case 'selecting': {
				if (isMoving) continue
				// if we find a non-moving shape while selecting, move all selected
				// shapes in front of the not moving shape; and start skipping
				const { selectIndex } = state
				getIndicesBetween(children[i].index, children[i + 1]?.index, i - selectIndex).forEach(
					(index, k) => changes.push({ ...children[selectIndex + k], index })
				)
				state = { name: 'skipping' }
				break
			}
		}
	}
}

/**
 * Reorders the moving shapes backward in the parent's children.
 *
 * @param moving The set of shapes that are moving
 * @param children The parent's children
 * @param changes The changes array to push changes to
 */
function reorderBackward(moving: Set<TLShape>, children: TLShape[], changes: TLShapePartial[]) {
	const len = children.length

	if (moving.size === len) return

	let state = { name: 'skipping' } as
		| { name: 'skipping' }
		| { name: 'selecting'; selectIndex: number }

	// Starting at the top of this parent's children...
	for (let i = len - 1; i > -1; i--) {
		const isMoving = moving.has(children[i])

		switch (state.name) {
			case 'skipping': {
				if (!isMoving) continue
				// If we find a moving shape while skipping, start selecting
				state = { name: 'selecting', selectIndex: i }
				break
			}
			case 'selecting': {
				if (isMoving) continue
				// if we find a non-moving shape while selecting, move all selected
				// shapes in behind of the not moving shape; and start skipping
				getIndicesBetween(children[i - 1]?.index, children[i].index, state.selectIndex - i).forEach(
					(index, k) => {
						changes.push({ ...children[i + k + 1], index })
					}
				)
				state = { name: 'skipping' }
				break
			}
		}
	}
}
