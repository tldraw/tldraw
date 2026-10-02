import { RecordType } from '@tldraw/store'
import {
	TLBinding,
	TLCreateShapePartial,
	TLGroupShape,
	TLPageId,
	TLParentId,
	TLShape,
	TLShapeId,
	TLShapePartial,
	createBindingId,
	createShapeId,
	isShapeId,
} from '@tldraw/tlschema'
import {
	IndexKey,
	JsonObject,
	assertExists,
	compact,
	getIndexAbove,
	getIndexBetween,
	lerp,
	sortByIndex,
	structuredClone,
	uniqueId,
} from '@tldraw/utils'
import { DEFAULT_ANIMATION_OPTIONS } from '../../../constants'
import { Box } from '../../../primitives/Box'
import { EASINGS } from '../../../primitives/easings'
import { Vec, VecLike } from '../../../primitives/Vec'
import { getReorderingShapesChanges } from '../../../utils/reorderShapes'
import { applyRotationToSnapshotShapes, getRotationSnapshot } from '../../../utils/rotation'
import type { Editor } from '../../Editor'
import {
	alertMaxShapes,
	applyPartialToRecordWithProps,
	toShapeIds,
	withIsolatedShapes,
} from '../../editorHelpers'
import { OptionalKeys, TLCameraMoveOptions } from '../../types/misc-types'
import { EditorManager } from '../EditorManager'

/**
 * Commands that create, update, delete, duplicate, move, rotate, reorder, lock, group and animate shapes.
 *
 * @internal
 */
export class ShapeCommandsManager extends EditorManager {
	rotateShapesBy(
		shapes: TLShapeId[] | TLShape[],
		delta: number,
		opts?: { center?: VecLike }
	): Editor {
		const ids = toShapeIds(shapes)

		if (ids.length <= 0) return this.editor

		const snapshot = getRotationSnapshot({ editor: this.editor, ids })
		if (!snapshot) return this.editor
		applyRotationToSnapshotShapes({
			delta,
			snapshot,
			editor: this.editor,
			stage: 'one-off',
			centerOverride: opts?.center,
		})

		return this.editor
	}

	// Gets a shape partial that includes life cycle changes: on translate start, on translate, on translate end
	getChangesToTranslateShape(initialShape: TLShape, newShapeCoords: VecLike): TLShape {
		let workingShape = initialShape
		const util = this.editor.getShapeUtil(initialShape)

		const afterTranslateStart = util.onTranslateStart?.(workingShape)
		if (afterTranslateStart) {
			workingShape = applyPartialToRecordWithProps(workingShape, afterTranslateStart)
		}

		workingShape = applyPartialToRecordWithProps(workingShape, {
			id: initialShape.id,
			type: initialShape.type,
			x: newShapeCoords.x,
			y: newShapeCoords.y,
		})

		const afterTranslate = util.onTranslate?.(initialShape, workingShape)
		if (afterTranslate) {
			workingShape = applyPartialToRecordWithProps(workingShape, afterTranslate)
		}

		const afterTranslateEnd = util.onTranslateEnd?.(initialShape, workingShape)
		if (afterTranslateEnd) {
			workingShape = applyPartialToRecordWithProps(workingShape, afterTranslateEnd)
		}

		return workingShape
	}

	getChangesToTranslateShapeByPageDelta(shape: TLShape, pageDelta: VecLike): TLShape {
		const localDelta = Vec.From(pageDelta).rot(
			-this.editor.getShapeParentTransform(shape).rotation()
		)
		return this.getChangesToTranslateShape(shape, localDelta.add(shape))
	}

	nudgeShapes(shapes: TLShapeId[] | TLShape[], offset: VecLike): Editor {
		const ids = toShapeIds(shapes)

		if (ids.length <= 0) return this.editor
		const changes: TLShapePartial[] = []

		for (const id of ids) {
			const shape = this.editor.getShape(id)!
			changes.push(this.editor.getChangesToTranslateShapeByPageDelta(shape, offset))
		}

		this.editor.updateShapes(changes)

		return this.editor
	}

	duplicateShapes(shapes: TLShapeId[] | TLShape[], offset?: VecLike): Editor {
		this.editor.run(() => {
			const _ids = toShapeIds(shapes)

			const ids = this.editor._shouldIgnoreShapeLock ? _ids : this._getUnlockedShapeIds(_ids)
			if (ids.length <= 0) return this.editor

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

		return this.editor
	}

	moveShapesToPage(shapes: TLShapeId[] | TLShape[], pageId: TLPageId): Editor {
		const ids = toShapeIds(shapes)

		if (ids.length === 0) return this.editor
		if (this.editor.getIsReadonly()) return this.editor

		const currentPageId = this.editor.getCurrentPageId()

		if (pageId === currentPageId) return this.editor
		if (!this.editor.store.has(pageId)) return this.editor

		// Basically copy the shapes
		const content = this.editor.getContentFromCurrentPage(ids)

		// Just to be sure
		if (!content) return this.editor

		// If there is no space on pageId, or if the selected shapes
		// would take the new page above the limit, don't move the shapes
		if (
			this.editor.getPageShapeIds(pageId).size + content.shapes.length >
			this.editor.options.maxShapesPerPage
		) {
			alertMaxShapes(this.editor, pageId)
			return this.editor
		}

		const fromPageZ = this.editor.getCamera().z

		this.editor.run(() => {
			// Delete the shapes on the current page
			this.editor.deleteShapes(ids)

			// Move to the next page
			this.editor.setCurrentPage(pageId)

			// Put the shape content onto the new page; parents and indices will
			// be taken care of by the putContent method; make sure to pop any focus
			// layers so that the content will be put onto the page.
			this.editor.setFocusedGroup(null)
			this.editor.selectNone()
			this.editor.putContentOntoCurrentPage(content, {
				select: true,
				preserveIds: true,
				preservePosition: true,
			})

			// Force the new page's camera to be at the same zoom level as the
			// "from" page's camera, then center the "to" page's camera on the
			// pasted shapes
			this.editor.setCamera({ ...this.editor.getCamera(), z: fromPageZ })
			this.editor.centerOnPoint(this.editor.getSelectionRotatedPageBounds()!.center)
		})

		return this.editor
	}

	toggleLock(shapes: TLShapeId[] | TLShape[]): Editor {
		const ids = toShapeIds(shapes)

		if (this.editor.getIsReadonly() || ids.length === 0) return this.editor

		let allLocked = true
		const shapesToToggle: TLShape[] = []
		for (const id of ids) {
			const shape = this.editor.getShape(id)
			if (shape) {
				shapesToToggle.push(shape)
				if (!shape.isLocked) allLocked = false
			}
		}
		this.editor.run(() => {
			if (allLocked) {
				this.editor.updateShapes(
					shapesToToggle.map((shape) => ({ id: shape.id, type: shape.type, isLocked: false }))
				)
			} else {
				this.editor.updateShapes(
					shapesToToggle.map((shape) => ({ id: shape.id, type: shape.type, isLocked: true }))
				)
				this.editor.setSelectedShapes([])
			}
		})

		return this.editor
	}

	sendToBack(shapes: TLShapeId[] | TLShape[]): Editor {
		const ids = toShapeIds(shapes)
		const changes = getReorderingShapesChanges(this.editor, 'toBack', ids, {
			considerAllShapes: true,
		})
		if (changes) this.editor.updateShapes(changes)
		return this.editor
	}

	sendBackward(
		shapes: TLShapeId[] | TLShape[],
		opts: { considerAllShapes?: boolean } = {}
	): Editor {
		const ids = toShapeIds(shapes)
		const changes = getReorderingShapesChanges(this.editor, 'backward', ids, opts)
		if (changes) this.editor.updateShapes(changes)
		return this.editor
	}

	bringForward(
		shapes: TLShapeId[] | TLShape[],
		opts: { considerAllShapes?: boolean } = {}
	): Editor {
		const ids = toShapeIds(shapes)
		const changes = getReorderingShapesChanges(this.editor, 'forward', ids, opts)
		if (changes) this.editor.updateShapes(changes)
		return this.editor
	}

	bringToFront(shapes: TLShapeId[] | TLShape[]): Editor {
		const ids = toShapeIds(shapes)
		const changes = getReorderingShapesChanges(this.editor, 'toFront', ids)
		if (changes) this.editor.updateShapes(changes)
		return this.editor
	}

	getInitialMetaForShape(_shape: TLShape): JsonObject {
		return {}
	}

	canCreateShape(shape: OptionalKeys<TLShapePartial<TLShape>, 'id'> | TLShape['id']): boolean {
		return this.editor.canCreateShapes([shape])
	}

	canCreateShapes(
		shapes: (TLShape['id'] | OptionalKeys<TLShapePartial<TLShape>, 'id'>)[]
	): boolean {
		return (
			shapes.length + this.editor.getCurrentPageShapeIds().size <=
			this.editor.options.maxShapesPerPage
		)
	}

	createShape<TShape extends TLShape>(shape: TLCreateShapePartial<TShape>): Editor {
		this.editor.createShapes([shape])
		return this.editor
	}

	createShapes<TShape extends TLShape = TLShape>(shapes: TLCreateShapePartial<TShape>[]): Editor {
		if (!Array.isArray(shapes)) {
			throw Error('Editor.createShapes: must provide an array of shapes or shape partials')
		}
		if (this.editor.getIsReadonly()) return this.editor
		if (shapes.length <= 0) return this.editor

		const currentPageShapeIds = this.editor.getCurrentPageShapeIds()

		const maxShapesReached =
			shapes.length + currentPageShapeIds.size > this.editor.options.maxShapesPerPage

		if (maxShapesReached) {
			// can't create more shapes than fit on the page
			alertMaxShapes(this.editor)
			// todo: throw an error here? Otherwise we'll need to check every time whether the shapes were actually created
			return this.editor
		}

		const focusedGroupId = this.editor.getFocusedGroupId()

		this.editor.run(() => {
			// 1. Parents

			// Make sure that each partial will become the child of either the
			// page or another shape that exists (or that will exist) in this page.

			// find last parent id
			const currentPageShapesSorted = this.editor.getCurrentPageShapesSorted()

			const partials = shapes.map((partial) => {
				if (!partial.id) {
					partial = { id: createShapeId(), ...partial }
				}

				// If the partial does not provide the parentId OR if the provided
				// parentId is NOT in the store AND NOT among the other shapes being
				// created, then we need to find a parent for the shape. This can be
				// another shape that exists under that point and which can receive
				// children of the creating shape's type, or else the page itself.
				if (
					!partial.parentId ||
					!(
						this.editor.store.has(partial.parentId) || shapes.some((p) => p.id === partial.parentId)
					)
				) {
					let parentId: TLParentId = this.editor.getFocusedGroupId()

					const isPositioned = partial.x !== undefined && partial.y !== undefined

					// If the shape has been explicitly positioned, we'll try to find a parent at
					// that position. If not, we'll assume the user isn't deliberately placing the
					// shape and the positioning will be handled later by another system.
					if (isPositioned) {
						for (let i = currentPageShapesSorted.length - 1; i >= 0; i--) {
							const parent = currentPageShapesSorted[i]
							const util = this.editor.getShapeUtil(parent)
							if (
								util.canReceiveNewChildrenOfType(parent, partial.type) &&
								!this.editor.isShapeHidden(parent) &&
								this.editor.isPointInShape(
									parent,
									// If no parent is provided, then we can treat the
									// shape's provided x/y as being in the page's space.
									{ x: partial.x ?? 0, y: partial.y ?? 0 },
									{
										margin: 0,
										hitInside: true,
									}
								)
							) {
								parentId = parent.id
								break
							}
						}
					}

					const prevParentId = partial.parentId

					// a shape cannot be its own parent. This was a rare issue with frames/groups in the syncFuzz tests.
					if (parentId === partial.id) {
						parentId = focusedGroupId
					}

					// If the parentid has changed...
					if (parentId !== prevParentId) {
						partial = { ...partial }

						partial.parentId = parentId

						// If the parent is a shape (rather than a page) then insert the
						// shapes into the shape's children. Adjust the point and page rotation to be
						// preserved relative to the parent.
						if (isShapeId(parentId)) {
							const point = this.editor.getPointInShapeSpace(this.editor.getShape(parentId)!, {
								x: partial.x ?? 0,
								y: partial.y ?? 0,
							})
							partial.x = point.x
							partial.y = point.y
							partial.rotation =
								-this.editor.getShapePageTransform(parentId)!.rotation() + (partial.rotation ?? 0)
						}
					}
				}

				return partial
			})

			// 2. Indices

			// Get the highest index among the parents of each of the
			// the shapes being created; we'll increment from there.

			const parentIndices = new Map<TLParentId, IndexKey>()

			const shapeRecordsToCreate: TLShape[] = []

			const { opacityForNextShape } = this.editor.getInstanceState()

			for (const partial of partials) {
				const util = this.editor.getShapeUtil(partial as TLShapePartial)

				// If an index is not explicitly provided, then add the
				// shapes to the top of their parents' children; using the
				// value in parentsMappedToIndex, get the index above, use it,
				// and set it back to parentsMappedToIndex for next time.
				let index = partial.index

				if (!index) {
					// Hello bug-seeker: have you just created a frame and then a shape
					// and found that the shape is automatically the child of the frame?
					// this is the reason why! It would be harder to have each shape specify
					// the frame as the parent when creating a shape inside of a frame, so
					// we do it here.
					const parentId = partial.parentId ?? focusedGroupId

					if (!parentIndices.has(parentId)) {
						parentIndices.set(parentId, this.editor.getHighestIndexForParent(parentId))
					}
					index = parentIndices.get(parentId)!
					parentIndices.set(parentId, getIndexAbove(index))
				}

				// The initial props starts as the shape utility's default props
				const initialProps = util.getDefaultProps()

				// We then look up each key in the tab state's styles; and if it's there,
				// we use the value from the tab state's styles instead of the default.
				for (const [style, propKey] of this.editor.styleProps[partial.type]) {
					;(initialProps as any)[propKey] = this.editor.getStyleForNextShape(style)
				}

				// When we create the shape, take in the partial (the props coming into the
				// function) and merge it with the default props.
				let shapeRecordToCreate = (
					this.editor.store.schema.types.shape as RecordType<
						TLShape,
						'type' | 'props' | 'index' | 'parentId'
					>
				).create({
					...partial,
					index,
					opacity: partial.opacity ?? opacityForNextShape,
					parentId: partial.parentId ?? focusedGroupId,
					props: 'props' in partial ? { ...initialProps, ...partial.props } : initialProps,
				})

				if (shapeRecordToCreate.index === undefined) {
					throw Error('no index!')
				}

				const next = this.editor
					.getShapeUtil(shapeRecordToCreate)
					.onBeforeCreate?.(shapeRecordToCreate)

				if (next) {
					shapeRecordToCreate = next
				}

				shapeRecordsToCreate.push(shapeRecordToCreate)
			}

			// Add meta properties, if any, to the shapes
			shapeRecordsToCreate.forEach((shape) => {
				shape.meta = {
					...this.editor.getInitialMetaForShape(shape),
					...shape.meta,
				}
			})

			this.editor.emit('created-shapes', shapeRecordsToCreate)
			this.editor.emit('edit')
			this.editor.store.put(shapeRecordsToCreate)
		})

		return this.editor
	}

	animatingShapes = new Map<TLShapeId, string>()

	animateShape(
		partial: TLShapePartial | null | undefined,
		opts = { animation: DEFAULT_ANIMATION_OPTIONS } as TLCameraMoveOptions
	): Editor {
		return this.editor.animateShapes([partial], opts)
	}

	animateShapes(
		partials: (TLShapePartial | null | undefined)[],
		opts = { animation: DEFAULT_ANIMATION_OPTIONS } as TLCameraMoveOptions
	): Editor {
		if (!opts.animation) return this.editor
		const { duration = 500, easing = EASINGS.linear } = opts.animation

		const animationId = uniqueId()

		let remaining = duration
		let t: number

		interface ShapeAnimation {
			start: TLShape
			end: TLShape
		}

		const animations: ShapeAnimation[] = []

		// Snapshot the lock override now: when this animation is started inside
		// editor.run(..., { ignoreShapeLock: true }), run() restores the flag before any tick
		// fires, so the final updateShapes below would refuse the locked shape and strand it
		const ignoreShapeLock = this.editor._shouldIgnoreShapeLock

		let partial: TLShapePartial | null | undefined, result: ShapeAnimation
		for (let i = 0, n = partials.length; i < n; i++) {
			partial = partials[i]
			if (!partial) continue

			const shape = this.editor.getShape(partial.id)!
			if (!shape) continue

			// Apply the same lock rule as updateShapes up front: the intermediate frames go through
			// _updateShapes, which doesn't check locks, so a locked shape would otherwise be moved by
			// every frame but the last and end up stranded at the penultimate one
			const unlocks = shape.isLocked && Object.hasOwn(partial, 'isLocked') && !partial.isLocked
			if (!ignoreShapeLock && !unlocks && this.editor.isShapeOrAncestorLocked(shape)) {
				continue
			}

			result = {
				start: structuredClone(shape),
				end: applyPartialToRecordWithProps(structuredClone(shape), partial),
			}

			animations.push(result)
			this.animatingShapes.set(shape.id, animationId)
		}

		const handleTick = (elapsed: number) => {
			remaining -= elapsed

			if (remaining < 0) {
				const { animatingShapes } = this
				const partialsToUpdate = partials.filter(
					(p) => p && animatingShapes.get(p.id) === animationId
				)
				if (partialsToUpdate.length) {
					// the regular update shapes also removes the shape from
					// the animating shapes set
					this.editor.run(() => this.editor.updateShapes(partialsToUpdate), { ignoreShapeLock })
				}

				this.editor.off('tick', handleTick)
				return
			}

			t = easing(1 - remaining / duration)

			const { animatingShapes } = this

			const updates: TLShapePartial[] = []

			let animationIdForShape: string | undefined
			for (let i = 0, n = animations.length; i < n; i++) {
				const { start, end } = animations[i]
				// Is the animation for this shape still active?
				animationIdForShape = animatingShapes.get(start.id)
				if (animationIdForShape !== animationId) continue

				updates.push({
					...end,
					x: lerp(start.x, end.x, t),
					y: lerp(start.y, end.y, t),
					opacity: lerp(start.opacity, end.opacity, t),
					rotation: lerp(start.rotation, end.rotation, t),
					props: this.editor.getShapeUtil(end).getInterpolatedProps?.(start, end, t) ?? end.props,
				})
			}

			// The _updateShapes method does NOT remove the
			// shapes from the animated shapes set
			this.editor._updateShapes(updates)
		}

		this.editor.on('tick', handleTick)

		return this.editor
	}

	groupShapes(shapes: TLShape[], opts?: Partial<{ groupId: TLShapeId; select: boolean }>): Editor
	groupShapes(ids: TLShapeId[], opts?: Partial<{ groupId: TLShapeId; select: boolean }>): Editor
	groupShapes(
		shapes: TLShapeId[] | TLShape[],
		opts = {} as Partial<{ groupId: TLShapeId; select: boolean }>
	): Editor {
		const { groupId = createShapeId(), select = true } = opts

		if (!Array.isArray(shapes)) {
			throw Error('Editor.groupShapes: must provide an array of shapes or shape ids')
		}
		if (this.editor.getIsReadonly()) return this.editor

		const ids = toShapeIds(shapes)

		const shapesToGroup = compact(
			(this.editor._shouldIgnoreShapeLock ? ids : this._getUnlockedShapeIds(ids)).map((id) =>
				this.editor.getShape(id)
			)
		)
		// Re-check after the lock filter: Box.Common of nothing is not a valid box and would throw
		if (shapesToGroup.length <= 1) return this.editor

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
			return this.editor
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

		return this.editor
	}

	ungroupShapes(ids: TLShapeId[], opts?: Partial<{ select: boolean }>): Editor
	ungroupShapes(shapes: TLShape[], opts?: Partial<{ select: boolean }>): Editor
	ungroupShapes(shapes: TLShapeId[] | TLShape[], opts = {} as Partial<{ select: boolean }>) {
		if (this.editor.getIsReadonly()) return this.editor

		const { select = true } = opts
		const ids = toShapeIds(shapes)

		const shapesToUngroup = compact(
			(this.editor._shouldIgnoreShapeLock ? ids : this._getUnlockedShapeIds(ids)).map((id) =>
				this.editor.getShape(id)
			)
		)

		if (shapesToUngroup.length === 0) return this.editor

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

		if (groups.length === 0) return this.editor

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

		return this.editor
	}

	updateShape<T extends TLShape = TLShape>(partial: TLShapePartial<T> | null | undefined) {
		this.editor.updateShapes([partial])
		return this.editor
	}

	updateShapes<T extends TLShape>(partials: (TLShapePartial<T> | null | undefined)[]) {
		const compactedPartials: TLShapePartial<T>[] = []

		for (let i = 0, n = partials.length; i < n; i++) {
			const partial = partials[i]
			if (!partial) continue
			// Get the current shape referenced by the partial
			const shape = this.editor.getShape(partial.id)
			if (!shape) continue

			// If we're "forcing" the update, then we'll update the shape
			// regardless of whether it / its ancestor is locked
			if (!this.editor._shouldIgnoreShapeLock) {
				if (shape.isLocked) {
					// If the shape itself is locked (even if one of its ancestors is
					// also locked) then only allow an update that unlocks the shape.
					if (!(Object.hasOwn(partial, 'isLocked') && !partial.isLocked)) {
						continue
					}
				} else if (this.editor.isShapeOrAncestorLocked(shape)) {
					// If the shape itself is unlocked, and any of the shape's
					// ancestors are locked then we'll skip the update
					continue
				}
			}

			// Remove any animating shapes from the list of partials
			this.animatingShapes.delete(partial.id)

			compactedPartials.push(partial)
		}

		this.editor._updateShapes(compactedPartials)
		return this.editor
	}

	_updateShapes(_partials: (TLShapePartial | null | undefined)[]) {
		if (this.editor.getIsReadonly()) return

		this.editor.run(() => {
			const updates = []

			let shape: TLShape | undefined
			let updated: TLShape

			for (let i = 0, n = _partials.length; i < n; i++) {
				const partial = _partials[i]
				// Skip nullish partials (sometimes created by map fns returning undefined)
				if (!partial) continue

				// Get the current shape referenced by the partial
				// If there is no current shape, we'll skip this update
				shape = this.editor.getShape(partial.id)
				if (!shape) continue

				// Get the updated version of the shape
				// If the update had no effect, we'll skip this update
				updated = applyPartialToRecordWithProps(shape, partial)
				if (updated === shape) continue

				//if any shape has an onBeforeUpdate handler, call it and, if the handler returns a
				// new shape, replace the old shape with the new one. This is used for example when
				// repositioning a text shape based on its new text content.
				updated = this.editor.getShapeUtil(shape).onBeforeUpdate?.(shape, updated) ?? updated

				updates.push(updated)
			}

			this.editor.emit('edited-shapes', updates)
			this.editor.emit('edit')
			this.editor.store.put(updates)
		})
	}

	/** @internal */
	_getUnlockedShapeIds(ids: TLShapeId[]): TLShapeId[] {
		// Match updateShapes, which also refuses shapes under a locked ancestor; otherwise a child
		// of a locked frame can't be moved but can still be deleted or duplicated
		return ids.filter((id) => !this.editor.isShapeOrAncestorLocked(id))
	}

	deleteShapes(ids: TLShapeId[]): Editor
	deleteShapes(shapes: TLShape[]): Editor
	deleteShapes(_ids: TLShapeId[] | TLShape[]): Editor {
		if (this.editor.getIsReadonly()) return this.editor

		if (!Array.isArray(_ids)) {
			throw Error('Editor.deleteShapes: must provide an array of shapes or shapeIds')
		}

		const shapeIds = toShapeIds(_ids)

		// Normally we don't want to delete locked shapes, but if the force option is set, we'll delete them anyway
		const shapeIdsToDelete = this.editor._shouldIgnoreShapeLock
			? shapeIds
			: this._getUnlockedShapeIds(shapeIds)

		if (shapeIdsToDelete.length === 0) return this.editor

		// We also need to delete these shapes' descendants
		const allShapeIdsToDelete = new Set<TLShapeId>(shapeIdsToDelete)

		for (const id of shapeIdsToDelete) {
			this.editor.visitDescendants(id, (childId) => {
				allShapeIdsToDelete.add(childId)
			})
		}

		this.editor.emit('deleted-shapes', [...allShapeIdsToDelete])
		this.editor.emit('edit')
		return this.editor.run(() => this.editor.store.remove([...allShapeIdsToDelete]))
	}

	deleteShape(id: TLShapeId): Editor
	deleteShape(shape: TLShape): Editor
	deleteShape(_id: TLShapeId | TLShape) {
		this.editor.deleteShapes([typeof _id === 'string' ? _id : _id.id])
		return this.editor
	}
}
