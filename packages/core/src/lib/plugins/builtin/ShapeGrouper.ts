// This module is part of the headless core. It must not import React or touch the DOM.
import { TLGroupShape, TLShape, TLShapeId, createShapeId } from '@tldraw/tlschema'
import { compact, sortByIndex } from '@tldraw/utils'
import type { Editor } from '../../editor/Editor'
import { alertMaxShapes, toShapeIds } from '../../editor/recordUtils'
import { Box } from '../../primitives/Box'

/**
 * Groups and ungroups shapes. The editor's `groupShapes` and `ungroupShapes` use it.
 *
 * @public
 */
export class ShapeGrouper {
	constructor(private readonly editor: Editor) {}

	groupShapes(
		shapes: TLShapeId[] | TLShape[],
		opts = {} as Partial<{ groupId: TLShapeId; select: boolean }>
	): void {
		const { groupId = createShapeId(), select = true } = opts

		if (!Array.isArray(shapes)) {
			throw Error('Editor.groupShapes: must provide an array of shapes or shape ids')
		}
		if (this.editor.getIsReadonly()) return

		const ids = toShapeIds(shapes)

		const shapesToGroup = compact(
			(this.editor._shouldIgnoreShapeLock ? ids : this.editor._getUnlockedShapeIds(ids)).map((id) =>
				this.editor.getShape(id)
			)
		)
		// Re-check after the lock filter: Box.Common of nothing is not a valid box and would throw
		if (shapesToGroup.length <= 1) return

		const sortedShapeIds = shapesToGroup.sort(sortByIndex).map((s) => s.id)
		const childBounds = compact(shapesToGroup.map((shape) => this.editor.getShapePageBounds(shape)))
		const pageBounds = Box.Common(childBounds)

		if (!pageBounds.isValid()) {
			throw Error(`Editor.groupShapes: group bounds are invalid (NaN).`)
		}

		const { x, y } = pageBounds.point

		const parentId = this.editor.findCommonAncestor(shapesToGroup) ?? this.editor.getCurrentPageId()

		// createShapes bails out when the page is full, so check first; otherwise the shapes get
		// reparented into a group that was never created and vanish from the page
		if (!this.editor.canCreateShapes([groupId])) {
			alertMaxShapes(this.editor)
			return
		}

		// If the select tool is mid-interaction, cancel it (get back to idle) before grouping
		if (this.editor.isIn('select') && !this.editor.isIn('select.idle')) {
			this.editor.cancel()
		}

		// Find all the shapes that have the same parentId, and use the highest index.
		const shapesWithRootParent = shapesToGroup
			.filter((shape) => shape.parentId === parentId)
			.sort(sortByIndex)

		const highestIndex = shapesWithRootParent[shapesWithRootParent.length - 1]?.index

		this.editor.run(() => {
			this.editor.createShapes([
				{
					id: groupId,
					type: 'group',
					parentId,
					index: highestIndex,
					x,
					y,
					opacity: 1,
					props: {},
				},
			])
			this.editor.reparentShapes(sortedShapeIds, groupId)
			if (select) {
				// the select option determines whether the grouped shapes' children are selected
				this.editor.select(groupId)
			}
		})
	}

	ungroupShapes(shapes: TLShapeId[] | TLShape[], opts = {} as Partial<{ select: boolean }>) {
		if (this.editor.getIsReadonly()) return

		const { select = true } = opts
		const ids = toShapeIds(shapes)

		const shapesToUngroup = compact(
			(this.editor._shouldIgnoreShapeLock ? ids : this.editor._getUnlockedShapeIds(ids)).map((id) =>
				this.editor.getShape(id)
			)
		)

		if (shapesToUngroup.length === 0) return

		// If the select tool is mid-interaction, cancel it (get back to idle) before ungrouping
		if (this.editor.isIn('select') && !this.editor.isIn('select.idle')) {
			this.editor.cancel()
		}

		// The ids of the selected shapes after ungrouping;
		// these include all of the grouped shapes children,
		// plus any shapes that were selected apart from the groups.
		const idsToSelect = new Set<TLShapeId>()

		// Get all groups in the selection
		const groups: TLGroupShape[] = []

		shapesToUngroup.forEach((shape) => {
			if (this.editor.isShapeOfType(shape, 'group')) {
				groups.push(shape)
			} else {
				idsToSelect.add(shape.id)
			}
		})

		if (groups.length === 0) return

		this.editor.run(() => {
			for (let i = 0, n = groups.length; i < n; i++) {
				// Re-read the group: ungrouping an outer group earlier in this loop reparents the
				// inner ones, and the stale parentId would send their children into a group that's
				// about to be deleted
				const group = this.editor.getShape<TLGroupShape>(groups[i].id)
				if (!group) continue
				const childIds = this.editor.getSortedChildIdsForParent(group.id)

				for (let j = 0, n = childIds.length; j < n; j++) {
					idsToSelect.add(childIds[j])
				}

				this.editor.reparentShapes(childIds, group.parentId, group.index)
			}

			this.editor.deleteShapes(groups.map((group) => group.id))

			if (select) {
				// the select option determines whether the ungrouped shapes' children are selected
				this.editor.select(...idsToSelect)
			}
		})
	}
}
