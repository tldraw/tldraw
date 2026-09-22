import {
	CameraRecordType,
	InstancePageStateRecordType,
	isPageId,
	isShapeId,
	TLBinding,
	TLBindingId,
	TLInstancePageState,
	TLShapeId,
} from '@tldraw/tlschema'
import { compact } from '@tldraw/utils'
import { BindingOnDeleteOptions } from './bindings/BindingUtil'
import { Editor } from './Editor'

/**
 * Work that store side effects queue up during an operation, flushed once when the operation
 * completes. Handlers run against the store and queue more work as they go, so a batch is
 * detached from the queue before it is processed. Processing in place instead lets a flush
 * consume entries belonging to the next operation, or spin on its own output.
 */
interface PendingIntegrityWork {
	createdShapes: Set<TLShapeId>
	deletedShapeIds: Set<TLShapeId>
	invalidParents: Set<TLShapeId>
	invalidBindingTypes: Set<TLBinding['type']>
	deletedBindings: Map<TLBindingId, BindingOnDeleteOptions<any>>
}

/** Detach everything queued under `key`, leaving an empty collection behind. Null when empty. */
function take<K extends keyof PendingIntegrityWork>(
	work: PendingIntegrityWork,
	key: K
): PendingIntegrityWork[K] | null {
	const taken = work[key]
	if (taken.size === 0) return null
	work[key] = (taken instanceof Map ? new Map() : new Set()) as PendingIntegrityWork[K]
	return taken
}

/**
 * Strip ids that are no longer on the page out of a page state, returning null when nothing
 * changed so callers can skip the write.
 */
export function cleanupInstancePageState(
	prevPageState: TLInstancePageState,
	shapesNoLongerInPage: Set<TLShapeId>
): TLInstancePageState | null {
	let nextPageState = null as null | TLInstancePageState

	const selectedShapeIds = prevPageState.selectedShapeIds.filter(
		(id) => !shapesNoLongerInPage.has(id)
	)
	if (selectedShapeIds.length !== prevPageState.selectedShapeIds.length) {
		if (!nextPageState) nextPageState = { ...prevPageState }
		nextPageState.selectedShapeIds = selectedShapeIds
	}

	const erasingShapeIds = prevPageState.erasingShapeIds.filter(
		(id) => !shapesNoLongerInPage.has(id)
	)
	if (erasingShapeIds.length !== prevPageState.erasingShapeIds.length) {
		if (!nextPageState) nextPageState = { ...prevPageState }
		nextPageState.erasingShapeIds = erasingShapeIds
	}

	if (prevPageState.hoveredShapeId && shapesNoLongerInPage.has(prevPageState.hoveredShapeId)) {
		if (!nextPageState) nextPageState = { ...prevPageState }
		nextPageState.hoveredShapeId = null
	}

	if (prevPageState.editingShapeId && shapesNoLongerInPage.has(prevPageState.editingShapeId)) {
		if (!nextPageState) nextPageState = { ...prevPageState }
		nextPageState.editingShapeId = null
	}

	if (prevPageState.croppingShapeId && shapesNoLongerInPage.has(prevPageState.croppingShapeId)) {
		if (!nextPageState) nextPageState = { ...prevPageState }
		nextPageState.croppingShapeId = null
	}

	const hintingShapeIds = prevPageState.hintingShapeIds.filter(
		(id) => !shapesNoLongerInPage.has(id)
	)
	if (hintingShapeIds.length !== prevPageState.hintingShapeIds.length) {
		if (!nextPageState) nextPageState = { ...prevPageState }
		nextPageState.hintingShapeIds = hintingShapeIds
	}

	if (prevPageState.focusedGroupId && shapesNoLongerInPage.has(prevPageState.focusedGroupId)) {
		if (!nextPageState) nextPageState = { ...prevPageState }
		nextPageState.focusedGroupId = null
	}
	return nextPageState
}

/**
 * Registers the store side effects that keep shapes, bindings and page state mutually consistent:
 * reparenting orphans, running binding lifecycle hooks, and pruning deleted ids out of every page
 * state. The work is queued during an operation and flushed once on completion, so a single user
 * action produces one round of cleanup rather than one per record change.
 *
 * @internal
 */
export function registerShapeIntegritySideEffects(editor: Editor) {
	const work: PendingIntegrityWork = {
		createdShapes: new Set(),
		deletedShapeIds: new Set(),
		invalidParents: new Set(),
		invalidBindingTypes: new Set(),
		deletedBindings: new Map(),
	}

	editor.disposables.add(
		editor.sideEffects.registerOperationCompleteHandler(() => {
			const deletedIds = take(work, 'deletedShapeIds')
			if (deletedIds) {
				const updates = compact(
					editor.getPageStates().map((pageState) => {
						return cleanupInstancePageState(pageState, deletedIds)
					})
				)

				if (updates.length) {
					editor.store.put(updates)
				}
			}

			const justCreatedShapeIds = take(work, 'createdShapes')

			// Drained in place rather than taken: onChildrenChange updates shapes, which invalidates
			// further parents, and a Set visits entries added while it is being iterated. Taking a
			// batch here would defer those to the next operation and leave the tree stale until then.
			for (const parentId of work.invalidParents) {
				work.invalidParents.delete(parentId)
				if (justCreatedShapeIds?.has(parentId)) continue
				const parent = editor.getShape(parentId)
				if (!parent) continue

				const util = editor.getShapeUtil(parent)
				const changes = util.onChildrenChange?.(parent)

				if (changes?.length) {
					editor.updateShapes(changes)
				}
			}

			const invalidBindingTypes = take(work, 'invalidBindingTypes')
			if (invalidBindingTypes) {
				for (const type of invalidBindingTypes) {
					editor.getBindingUtil(type).onOperationComplete?.()
				}
			}

			const deletedBindings = take(work, 'deletedBindings')
			if (deletedBindings) {
				for (const opts of deletedBindings.values()) {
					editor.getBindingUtil(opts.binding).onAfterDelete?.(opts)
				}
			}

			editor.emit('update')
		})
	)

	editor.disposables.add(
		editor.sideEffects.register({
			shape: {
				afterCreate: (shape) => {
					work.createdShapes.add(shape.id)
					if (shape.parentId && isShapeId(shape.parentId)) {
						work.invalidParents.add(shape.parentId)
					}
				},
				afterChange: (shapeBefore, shapeAfter) => {
					for (const binding of editor.getBindingsInvolvingShape(shapeAfter)) {
						work.invalidBindingTypes.add(binding.type)
						if (binding.fromId === shapeAfter.id) {
							editor.getBindingUtil(binding).onAfterChangeFromShape?.({
								binding,
								shapeBefore,
								shapeAfter,
								reason: 'self',
							})
						}
						if (binding.toId === shapeAfter.id) {
							editor.getBindingUtil(binding).onAfterChangeToShape?.({
								binding,
								shapeBefore,
								shapeAfter,
								reason: 'self',
							})
						}
					}

					// if the shape's parent changed and it has a binding, update the binding
					if (shapeBefore.parentId !== shapeAfter.parentId) {
						const notifyBindingAncestryChange = (id: TLShapeId) => {
							const descendantShape = editor.getShape(id)
							if (!descendantShape) return

							for (const binding of editor.getBindingsInvolvingShape(descendantShape)) {
								work.invalidBindingTypes.add(binding.type)

								if (binding.fromId === descendantShape.id) {
									editor.getBindingUtil(binding).onAfterChangeFromShape?.({
										binding,
										shapeBefore: descendantShape,
										shapeAfter: descendantShape,
										reason: 'ancestry',
									})
								}
								if (binding.toId === descendantShape.id) {
									editor.getBindingUtil(binding).onAfterChangeToShape?.({
										binding,
										shapeBefore: descendantShape,
										shapeAfter: descendantShape,
										reason: 'ancestry',
									})
								}
							}
						}
						notifyBindingAncestryChange(shapeAfter.id)
						editor.visitDescendants(shapeAfter.id, notifyBindingAncestryChange)
					}

					// if this shape moved to a new page, clean up any previous page's instance state
					if (shapeBefore.parentId !== shapeAfter.parentId && isPageId(shapeAfter.parentId)) {
						const allMovingIds = new Set([shapeBefore.id])
						editor.visitDescendants(shapeBefore.id, (id) => {
							allMovingIds.add(id)
						})

						for (const instancePageState of editor.getPageStates()) {
							if (instancePageState.pageId === shapeAfter.parentId) continue
							const nextPageState = cleanupInstancePageState(instancePageState, allMovingIds)

							if (nextPageState) {
								editor.store.put([nextPageState])
							}
						}
					}

					if (shapeBefore.parentId && isShapeId(shapeBefore.parentId)) {
						work.invalidParents.add(shapeBefore.parentId)
					}

					if (shapeAfter.parentId !== shapeBefore.parentId && isShapeId(shapeAfter.parentId)) {
						work.invalidParents.add(shapeAfter.parentId)
					}
				},
				beforeDelete: (shape) => {
					// if we triggered this delete with a recursive call, don't do anything
					if (work.deletedShapeIds.has(shape.id)) return
					// if the deleted shape has a parent shape make sure we call it's onChildrenChange callback
					if (shape.parentId && isShapeId(shape.parentId)) {
						work.invalidParents.add(shape.parentId)
					}

					work.deletedShapeIds.add(shape.id)

					const deleteBindingIds: TLBindingId[] = []
					for (const binding of editor.getBindingsInvolvingShape(shape)) {
						work.invalidBindingTypes.add(binding.type)
						deleteBindingIds.push(binding.id)
						const util = editor.getBindingUtil(binding)
						if (binding.fromId === shape.id) {
							util.onBeforeIsolateToShape?.({ binding, removedShape: shape })
							util.onBeforeDeleteFromShape?.({ binding, shape })
						} else {
							util.onBeforeIsolateFromShape?.({ binding, removedShape: shape })
							util.onBeforeDeleteToShape?.({ binding, shape })
						}
					}

					if (deleteBindingIds.length) {
						// straight to the store: this cleanup must run even when deleteBindings would
						// refuse (readonly), e.g. for a deletion that arrived from a remote peer
						editor.store.remove(deleteBindingIds)
					}
				},
			},
			binding: {
				beforeCreate: (binding) => {
					const next = editor.getBindingUtil(binding).onBeforeCreate?.({ binding })
					if (next) return next
					return binding
				},
				afterCreate: (binding) => {
					work.invalidBindingTypes.add(binding.type)
					editor.getBindingUtil(binding).onAfterCreate?.({ binding })
				},
				beforeChange: (bindingBefore, bindingAfter) => {
					const updated = editor.getBindingUtil(bindingAfter).onBeforeChange?.({
						bindingBefore,
						bindingAfter,
					})
					if (updated) return updated
					return bindingAfter
				},
				afterChange: (bindingBefore, bindingAfter) => {
					work.invalidBindingTypes.add(bindingAfter.type)
					editor.getBindingUtil(bindingAfter).onAfterChange?.({ bindingBefore, bindingAfter })
				},
				beforeDelete: (binding) => {
					editor.getBindingUtil(binding).onBeforeDelete?.({ binding })
				},
				afterDelete: (binding) => {
					editor.getBindingUtil(binding).onAfterDelete?.({ binding })
					work.invalidBindingTypes.add(binding.type)
				},
			},
			page: {
				afterCreate: (record) => {
					const cameraId = CameraRecordType.createId(record.id)
					const _pageStateId = InstancePageStateRecordType.createId(record.id)
					if (!editor.store.has(cameraId)) {
						editor.store.put([CameraRecordType.create({ id: cameraId })])
					}
					if (!editor.store.has(_pageStateId)) {
						editor.store.put([
							InstancePageStateRecordType.create({ id: _pageStateId, pageId: record.id }),
						])
					}
				},
				afterDelete: (record, source) => {
					// page was deleted, need to check whether it's the current page and select another one if so
					if (editor.getInstanceState()?.currentPageId === record.id) {
						const backupPageId = editor.getPages().find((p) => p.id !== record.id)?.id
						if (backupPageId) {
							editor.store.put([{ ...editor.getInstanceState(), currentPageId: backupPageId }])
						} else if (source === 'user') {
							// fall back to ensureStoreIsUsable:
							editor.store.ensureStoreIsUsable()
						}
					}

					// delete the camera and state for the page if necessary
					const cameraId = CameraRecordType.createId(record.id)
					const instance_PageStateId = InstancePageStateRecordType.createId(record.id)
					editor.store.remove([cameraId, instance_PageStateId])
				},
			},
			instance: {
				afterChange: (prev, next, source) => {
					// instance should never be updated to a page that no longer exists (this can
					// happen when undoing a change that involves switching to a page that has since
					// been deleted by another user)
					if (!editor.store.has(next.currentPageId)) {
						const backupPageId = editor.store.has(prev.currentPageId)
							? prev.currentPageId
							: editor.getPages()[0]?.id
						if (backupPageId) {
							editor.store.update(next.id, (instance) => ({
								...instance,
								currentPageId: backupPageId,
							}))
						} else if (source === 'user') {
							// fall back to ensureStoreIsUsable:
							editor.store.ensureStoreIsUsable()
						}
					}
				},
			},
			instance_page_state: {
				afterChange: (prev, next) => {
					if (prev?.focusedGroupId !== next?.focusedGroupId) {
						editor.cancelDoubleClick()
					}

					if (prev?.selectedShapeIds !== next?.selectedShapeIds) {
						// ensure that descendants and ancestors are not selected at the same time
						const selectedShapeIds = new Set(next.selectedShapeIds)
						const filtered = next.selectedShapeIds.filter((id) => {
							let parentId = editor.getShape(id)?.parentId
							while (isShapeId(parentId)) {
								if (selectedShapeIds.has(parentId)) {
									return false
								}
								parentId = editor.getShape(parentId)?.parentId
							}
							return true
						})

						let nextFocusedGroupId: null | TLShapeId = null

						if (filtered.length > 0) {
							const commonGroupAncestor = editor.findCommonAncestor(
								compact(filtered.map((id) => editor.getShape(id))),
								(shape) => editor.isShapeOfType(shape, 'group')
							)

							if (commonGroupAncestor) {
								nextFocusedGroupId = commonGroupAncestor
							}
						} else {
							if (next?.focusedGroupId) {
								nextFocusedGroupId = next.focusedGroupId
							}
						}

						if (
							filtered.length !== next.selectedShapeIds.length ||
							nextFocusedGroupId !== next.focusedGroupId
						) {
							editor.store.put([
								{
									...next,
									selectedShapeIds: filtered,
									focusedGroupId: nextFocusedGroupId ?? null,
								},
							])
						}
					}
				},
			},
		})
	)
}
