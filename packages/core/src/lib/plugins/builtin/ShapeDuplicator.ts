// This module is part of the headless core. It must not import React or touch the DOM.
import {
	CameraRecordType,
	PageRecordType,
	TLBinding,
	TLPage,
	TLPageId,
	TLShape,
	TLShapeId,
	createBindingId,
	createShapeId,
} from '@tldraw/tlschema'
import { IndexKey, assertExists, compact, getIndexBetween } from '@tldraw/utils'
import type { Editor } from '../../editor/Editor'
import { alertMaxShapes, toShapeIds, withIsolatedShapes } from '../../editor/recordUtils'
import { Vec, VecLike } from '../../primitives/Vec'

/**
 * Duplicates shapes, with their descendants and the bindings between them, and duplicates pages.
 * The editor's `duplicateShapes` and `duplicatePage` use it.
 *
 * @public
 */
export class ShapeDuplicator {
	constructor(private readonly editor: Editor) {}

	duplicateShapes(shapes: TLShapeId[] | TLShape[], offset?: VecLike): void {
		this.editor.run(() => {
			const _ids = toShapeIds(shapes)

			const ids = this.editor._shouldIgnoreShapeLock ? _ids : this.editor._getUnlockedShapeIds(_ids)
			if (ids.length <= 0) return

			const initialIds = new Set(ids)
			const shapeIdSet = this.editor.getShapeAndDescendantIds(ids)

			const orderedShapeIds = [...shapeIdSet].reverse()
			const shapeIds = new Map<TLShapeId, TLShapeId>()
			for (const shapeId of shapeIdSet) {
				shapeIds.set(shapeId, createShapeId())
			}

			const { shapesToCreateWithOriginals, bindingsToCreate } = withIsolatedShapes(
				this.editor,
				shapeIdSet,
				(bindingIdsToMaintain) => {
					const bindingsToCreate: TLBinding[] = []
					for (const originalId of bindingIdsToMaintain) {
						const originalBinding = this.editor.getBinding(originalId)
						if (!originalBinding) continue

						const duplicatedId = createBindingId()
						bindingsToCreate.push({
							...originalBinding,
							id: duplicatedId,
							fromId: assertExists(shapeIds.get(originalBinding.fromId)),
							toId: assertExists(shapeIds.get(originalBinding.toId)),
						})
					}

					const shapesToCreateWithOriginals: { shape: TLShape; originalShape: TLShape }[] = []
					for (const originalId of orderedShapeIds) {
						const duplicatedId = assertExists(shapeIds.get(originalId))
						const originalShape = this.editor.getShape(originalId)
						if (!originalShape) continue

						let ox = 0
						let oy = 0

						// Only offset the roots of the duplicated tree: a descendant that was also passed in
						// follows its duplicated parent, so offsetting it too would move it twice
						if (
							offset &&
							initialIds.has(originalId) &&
							!shapeIdSet.has(originalShape.parentId as TLShapeId)
						) {
							const parentTransform = this.editor.getShapeParentTransform(originalShape)
							const vec = new Vec(offset.x, offset.y).rot(-parentTransform!.rotation())
							ox = vec.x
							oy = vec.y
						}

						shapesToCreateWithOriginals.push({
							shape: {
								...originalShape,
								id: duplicatedId,
								x: originalShape.x + ox,
								y: originalShape.y + oy,
								// Use a dummy index for now, it will get updated outside of the `withIsolatedShapes`
								index: 'a1' as IndexKey,
								parentId:
									shapeIds.get(originalShape.parentId as TLShapeId) ?? originalShape.parentId,
							},
							originalShape,
						})
					}

					return { shapesToCreateWithOriginals, bindingsToCreate }
				}
			)

			// We will update the indexes after the `withIsolatedShapes`, since we cannot rely on the indexes
			// to be correct inside of it.
			shapesToCreateWithOriginals.forEach(({ shape, originalShape }) => {
				const parentId = originalShape.parentId
				const siblings = this.editor.getSortedChildIdsForParent(parentId)
				const currentIndex = siblings.indexOf(originalShape.id)
				const siblingAboveId = siblings[currentIndex + 1]
				const siblingAbove = siblingAboveId ? this.editor.getShape(siblingAboveId) : undefined

				const index = getIndexBetween(originalShape.index, siblingAbove?.index)

				shape.index = index
			})
			const shapesToCreate = shapesToCreateWithOriginals.map(({ shape, originalShape }) => {
				// Give the shape util a chance to modify the duplicate, e.g. to re-stamp note
				// attribution to the current user so we don't forge the original author's identity.
				return this.editor.getShapeUtil(shape).onBeforeDuplicate?.(originalShape, shape) ?? shape
			})

			if (!this.editor.canCreateShapes(shapesToCreate)) {
				alertMaxShapes(this.editor)
				return
			}

			this.editor.createShapes(shapesToCreate)
			this.editor.createBindings(bindingsToCreate)

			this.editor.setSelectedShapes(
				compact(
					ids.map((oldId) => {
						const newId = shapeIds.get(oldId)
						if (!newId) return null
						if (!this.editor.getShape(newId)) return null
						return newId
					})
				)
			)

			if (offset !== undefined) {
				// If we've offset the duplicated shapes, check to see whether their new bounds is entirely
				// contained in the current viewport. If not, then animate the camera to be centered on the
				// new shapes.
				const selectionPageBounds = this.editor.getSelectionPageBounds()
				const viewportPageBounds = this.editor.getViewportPageBounds()
				if (selectionPageBounds && !viewportPageBounds.contains(selectionPageBounds)) {
					this.editor.centerOnPoint(selectionPageBounds.center, {
						animation: { duration: this.editor.options.animationMediumMs },
					})
				}
			}
		})
	}

	duplicatePage(page: TLPageId | TLPage, createId: TLPageId = PageRecordType.createId()): void {
		if (this.editor.getPages().length >= this.editor.options.maxPages) return
		const id = typeof page === 'string' ? page : page.id
		const freshPage = this.editor.getPage(id) // get the most recent version of the page anyway
		if (!freshPage) return

		// Read the source page's own camera rather than getCamera(), which is the
		// current page's and is wrong when duplicating a page that isn't being viewed
		const prevCamera = {
			...(this.editor.store.get(CameraRecordType.createId(freshPage.id)) ??
				this.editor.getCamera()),
		}
		const content = this.editor.getContentFromCurrentPage(
			this.editor.getSortedChildIdsForParent(freshPage.id)
		)

		this.editor.run(() => {
			const pages = this.editor.getPages()
			const index = getIndexBetween(freshPage.index, pages[pages.indexOf(freshPage) + 1]?.index)

			// create the page (also creates the pagestate and camera for the new page)
			this.editor.createPage({ name: freshPage.name + ' Copy', id: createId, index })
			// set the new page as the current page
			this.editor.setCurrentPage(createId)
			// update the new page's camera to the previous page's camera
			this.editor.setCamera(prevCamera)

			if (content) {
				// Without preservePosition the paste rule recenters off-screen content
				// in the viewport, so the copy's layout would not match the original
				return this.editor.putContentOntoCurrentPage(content, { preservePosition: true })
			}
		})
	}
}
