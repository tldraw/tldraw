import { Atom, atom, computed } from '@tldraw/state'
import {
	InstancePageStateRecordType,
	TLGroupShape,
	TLInstancePageState,
	TLPageId,
	TLParentId,
	TLShape,
	TLShapeId,
	isPageId,
} from '@tldraw/tlschema'
import { areArraysShallowEqual, assertExists, compact, dedupe } from '@tldraw/utils'
import { Box } from '../../../primitives/Box'
import { TLTextOptions, TiptapEditor } from '../../../utils/richText'
import type { Editor } from '../../Editor'
import { toShapeIds } from '../../editorHelpers'
import {
	findNearestItemInDirection,
	getAdjacentIndex,
	sortIntoReadingOrder,
} from '../../kernels/readingOrder'
import { TLEditStartInfo } from '../../shapes/ShapeUtil'
import { TLAdjacentDirection } from '../../types/selection-types'
import { EditorManager } from '../EditorManager'

/**
 * Per-page interaction state: the selection, the focused group, and the editing, hovered, hinting, erasing and cropping shapes.
 *
 * @public
 */
export class SelectionManager extends EditorManager {
	/**
	 * Page states.
	 *
	 * @public
	 */
	@computed getPageStates(): TLInstancePageState[] {
		return this._getPageStatesQuery().get()
	}

	/** @internal */
	@computed _getPageStatesQuery() {
		return this.editor.store.query.records('instance_page_state')
	}

	/**
	 * The current page state.
	 *
	 * @public
	 */
	@computed getCurrentPageState(): TLInstancePageState {
		return this.editor.store.get(this.editor._getCurrentPageStateId())!
	}

	/** @internal */
	@computed _getCurrentPageStateId() {
		return InstancePageStateRecordType.createId(this.editor.getCurrentPageId())
	}

	/**
	 * Update this instance's page state.
	 *
	 * @example
	 * ```ts
	 * editor.updateCurrentPageState({ id: 'page1', editingShapeId: 'shape:123' })
	 * ```
	 *
	 * @param partial - The partial of the page state object containing the changes.
	 *
	 * @public
	 */
	updateCurrentPageState(
		partial: Partial<
			Omit<TLInstancePageState, 'selectedShapeIds' | 'editingShapeId' | 'pageId' | 'focusedGroupId'>
		>
	): Editor {
		this.editor._updateCurrentPageState(partial)
		return this.editor
	}

	_updateCurrentPageState(partial: Partial<Omit<TLInstancePageState, 'selectedShapeIds'>>) {
		this.editor.store.update(partial.id ?? this.editor.getCurrentPageState().id, (state) => ({
			...state,
			...partial,
		}))
	}

	/**
	 * The current selected ids.
	 *
	 * @public
	 */
	@computed getSelectedShapeIds() {
		return this.editor.getCurrentPageState().selectedShapeIds
	}

	/**
	 * An array containing all of the currently selected shapes.
	 *
	 * @public
	 * @readonly
	 */
	@computed getSelectedShapes(): TLShape[] {
		return compact(this.editor.getSelectedShapeIds().map((id) => this.editor.store.get(id)))
	}

	/**
	 * Select one or more shapes.
	 *
	 * @example
	 * ```ts
	 * editor.setSelectedShapes(['id1'])
	 * editor.setSelectedShapes(['id1', 'id2'])
	 * ```
	 *
	 * @param shapes - The shape (or shape ids) to select.
	 *
	 * @public
	 */
	setSelectedShapes(shapes: TLShapeId[] | TLShape[]): Editor {
		return this.editor.run(
			() => {
				const ids = shapes.map((shape) => (typeof shape === 'string' ? shape : shape.id))
				const { selectedShapeIds: prevSelectedShapeIds } = this.editor.getCurrentPageState()
				const prevSet = new Set(prevSelectedShapeIds)

				if (ids.length === prevSet.size && ids.every((id) => prevSet.has(id))) return null

				this.editor.store.put([{ ...this.editor.getCurrentPageState(), selectedShapeIds: ids }])
			},
			{ history: 'record-preserveRedoStack' }
		)
	}

	/**
	 * Determine whether or not any of a shape's ancestors are selected.
	 *
	 * @param shape - The shape (or shape id) of the shape to check.
	 *
	 * @public
	 */
	isAncestorSelected(shape: TLShape | TLShapeId): boolean {
		const id = typeof shape === 'string' ? shape : (shape?.id ?? null)
		const _shape = this.editor.getShape(id)
		if (!_shape) return false
		const selectedShapeIds = this.editor.getSelectedShapeIds()
		return !!this.editor.findShapeAncestor(_shape, (parent) => selectedShapeIds.includes(parent.id))
	}

	/**
	 * Select one or more shapes.
	 *
	 * @example
	 * ```ts
	 * editor.select('id1')
	 * editor.select('id1', 'id2')
	 * ```
	 *
	 * @param shapes - The shape (or the shape ids) to select.
	 *
	 * @public
	 */
	select(...shapes: TLShapeId[] | TLShape[]): Editor {
		const ids = toShapeIds(shapes)
		this.editor.setSelectedShapes(ids)
		return this.editor
	}

	/**
	 * Remove a shape from the existing set of selected shapes.
	 *
	 * @example
	 * ```ts
	 * editor.deselect(shape.id)
	 * ```
	 *
	 * @public
	 */
	deselect(...shapes: TLShapeId[] | TLShape[]): Editor {
		const ids = toShapeIds(shapes)
		const selectedShapeIds = this.editor.getSelectedShapeIds()
		if (selectedShapeIds.length > 0 && ids.length > 0) {
			this.editor.setSelectedShapes(selectedShapeIds.filter((id) => !ids.includes(id)))
		}
		return this.editor
	}

	/**
	 * Select all shapes. If the user has selected shapes that share a parent,
	 * select all shapes within that parent. If the user has not selected any shapes,
	 * or if the shapes shapes are only on select all shapes on the current page.
	 *
	 * @example
	 * ```ts
	 * editor.selectAll()
	 * ```
	 *
	 * @public
	 */
	selectAll(): Editor {
		let parentToSelectWithinId: TLParentId | null = null

		const selectedShapeIds = this.editor.getSelectedShapeIds()

		// If we have selected shapes, try to find a parent to select within
		if (selectedShapeIds.length > 0) {
			for (const id of selectedShapeIds) {
				const shape = this.editor.getShape(id)
				if (!shape) continue
				if (parentToSelectWithinId === null) {
					// If we haven't found a parent yet, set this parent as the parent to select within
					parentToSelectWithinId = shape.parentId
				} else if (parentToSelectWithinId !== shape.parentId) {
					// If we've found two different parents, we can't select all, do nothing
					return this.editor
				}
			}
		}

		// If we haven't found a parent from our selected shapes, select the current page
		if (!parentToSelectWithinId) {
			parentToSelectWithinId = this.editor.getCurrentPageId()
		}

		// Select all the unlocked shapes within the parent. Only the shape's own lock matters here:
		// selecting inside a locked frame or group is allowed, mutating is not.
		const ids = this.editor.getSortedChildIdsForParent(parentToSelectWithinId)
		if (ids.length <= 0) return this.editor
		this.editor.setSelectedShapes(ids.filter((id) => !this.editor.getShape(id)?.isLocked))
		return this.editor
	}

	/**
	 * Select the next shape in the reading order or in cardinal order.
	 *
	 * @example
	 * ```ts
	 * editor.selectAdjacentShape('next')
	 * ```
	 *
	 * @public
	 */
	selectAdjacentShape(direction: TLAdjacentDirection) {
		const selectedShapeIds = this.editor.getSelectedShapeIds()
		const firstParentId = selectedShapeIds[0]
			? this.editor.getShape(selectedShapeIds[0])?.parentId
			: null
		const isSelectedWithinContainer =
			firstParentId &&
			selectedShapeIds.every(
				(shapeId) => this.editor.getShape(shapeId)?.parentId === firstParentId
			) &&
			!isPageId(firstParentId)
		// Locked shapes (and children of locked containers) can't be selected by clicking or
		// select all, so traversal skips them too
		const filteredShapes = this.editor
			.getCurrentPageShapes()
			.filter(
				(shape) =>
					!this.editor.isShapeOrAncestorLocked(shape) &&
					(isSelectedWithinContainer ? shape.parentId === firstParentId : isPageId(shape.parentId))
			)
		const readingOrderShapes = this._getShapesInReadingOrder(filteredShapes)
		const currentShapeId: TLShapeId | undefined =
			selectedShapeIds.length === 1
				? selectedShapeIds[0]
				: readingOrderShapes.find((shape) => selectedShapeIds.includes(shape.id))?.id

		let adjacentShapeId: TLShapeId
		if (direction === 'next' || direction === 'prev') {
			const currentIndex = currentShapeId
				? readingOrderShapes.findIndex((shape) => shape.id === currentShapeId)
				: -1
			const adjacentIndex = getAdjacentIndex(readingOrderShapes.length, currentIndex, direction)
			if (adjacentIndex === null) return
			adjacentShapeId = readingOrderShapes[adjacentIndex].id
		} else {
			if (!currentShapeId) return
			adjacentShapeId = this.editor.getNearestAdjacentShape(
				filteredShapes,
				currentShapeId,
				direction
			)
		}

		const shape = this.editor.getShape(adjacentShapeId)
		if (!shape) return

		this._selectShapesAndZoom([shape.id])
	}

	/**
	 * Generates a reading order for shapes based on rows grouping.
	 * Tries to keep a natural reading order (left-to-right, top-to-bottom).
	 *
	 * @public
	 */
	@computed getCurrentPageShapesInReadingOrder(): TLShape[] {
		const shapes = this.editor.getCurrentPageShapes().filter((shape) => isPageId(shape.parentId))
		return this._getShapesInReadingOrder(shapes)
	}

	_getShapesInReadingOrder(shapes: TLShape[]): TLShape[] {
		const tabbableShapes = shapes.filter((shape) => this.editor.getShapeUtil(shape).canTabTo(shape))

		if (tabbableShapes.length <= 1) return tabbableShapes

		return sortIntoReadingOrder(
			tabbableShapes.map((shape) => ({
				payload: shape,
				center: this.editor.getShapePageBounds(shape)!.center,
			}))
		)
	}

	/**
	 * Find the nearest adjacent shape in a specific direction.
	 *
	 * @public
	 */
	getNearestAdjacentShape(
		shapes: TLShape[],
		currentShapeId: TLShapeId,
		direction: 'left' | 'right' | 'up' | 'down'
	): TLShapeId {
		const currentShape = this.editor.getShape(currentShapeId)
		if (!currentShape) return currentShapeId

		const tabbableShapes = shapes.filter(
			(shape) => this.editor.getShapeUtil(shape).canTabTo(shape) && shape.id !== currentShapeId
		)
		if (!tabbableShapes.length) return currentShapeId

		const currentCenter = this.editor.getShapePageBounds(currentShape)!.center
		const nearest = findNearestItemInDirection(
			tabbableShapes.map((shape) => ({
				payload: shape,
				center: this.editor.getShapePageBounds(shape)!.center,
			})),
			currentCenter,
			direction
		)

		return nearest ? nearest.id : currentShapeId
	}

	selectParentShape() {
		const selectedShape = this.editor.getOnlySelectedShape()
		if (!selectedShape) return
		const parentShape = this.editor.getShape(selectedShape.parentId)
		if (!parentShape) return
		this._selectShapesAndZoom([parentShape.id])
	}

	selectFirstChildShape() {
		const selectedShapes = this.editor.getSelectedShapes()
		if (!selectedShapes.length) return
		const selectedShape = selectedShapes[0]
		const children = compact(
			this.editor.getSortedChildIdsForParent(selectedShape.id).map((id) => this.editor.getShape(id))
		)
		const sortedChildren = this._getShapesInReadingOrder(children)
		if (sortedChildren.length === 0) return
		this._selectShapesAndZoom([sortedChildren[0].id])
	}

	_selectShapesAndZoom(ids: TLShapeId[]) {
		this.editor.setSelectedShapes(ids)
		this.editor.zoomToSelectionIfOffscreen(256, {
			animation: {
				duration: this.editor.options.animationMediumMs,
			},
			inset: 0,
		})
	}

	/**
	 * Clear the selection.
	 *
	 * @example
	 * ```ts
	 * editor.selectNone()
	 * ```
	 *
	 * @public
	 */
	selectNone(): Editor {
		if (this.editor.getSelectedShapeIds().length > 0) {
			this.editor.setSelectedShapes([])
		}

		return this.editor
	}

	/**
	 * The id of the editor's only selected shape.
	 *
	 * @returns Null if there is no shape or more than one selected shape, otherwise the selected shape's id.
	 *
	 * @public
	 * @readonly
	 */
	@computed getOnlySelectedShapeId(): TLShapeId | null {
		return this.editor.getOnlySelectedShape()?.id ?? null
	}

	/**
	 * The editor's only selected shape.
	 *
	 * @returns Null if there is no shape or more than one selected shape, otherwise the selected shape.
	 *
	 * @public
	 * @readonly
	 */
	@computed getOnlySelectedShape(): TLShape | null {
		const selectedShapes = this.editor.getSelectedShapes()
		return selectedShapes.length === 1 ? selectedShapes[0] : null
	}

	/**
	 * Get the page bounds of all the provided shapes.
	 *
	 * @public
	 */
	getShapesPageBounds(shapeIds: TLShapeId[]): Box | null {
		const bounds = compact(shapeIds.map((id) => this.editor.getShapePageBounds(id)))
		if (bounds.length === 0) return null
		return Box.Common(bounds)
	}

	/**
	 * The current page bounds of all the selected shapes. If the
	 * selection is rotated, then these bounds are the axis-aligned
	 * box that the rotated bounds would fit inside of.
	 *
	 * @readonly
	 *
	 * @public
	 */
	@computed getSelectionPageBounds(): Box | null {
		return this.editor.getShapesPageBounds(this.editor.getSelectedShapeIds())
	}

	/**
	 * The bounds of the selection bounding box in the current page space.
	 *
	 * @readonly
	 * @public
	 */
	getSelectionScreenBounds(): Box | undefined {
		const bounds = this.editor.getSelectionPageBounds()
		if (!bounds) return undefined
		const { x, y } = this.editor.pageToScreen(bounds.point)
		const zoom = this.editor.getZoomLevel()
		return new Box(x, y, bounds.width * zoom, bounds.height * zoom)
	}

	/**
	 * @internal
	 */
	getShapesSharedRotation(shapeIds: TLShapeId[]) {
		let rotation = 0
		for (let i = 0, n = shapeIds.length; i < n; i++) {
			const pageRotation = this.editor.getShapePageTransform(shapeIds[i]).rotation()
			if (i === 0) {
				rotation = pageRotation
			} else if (pageRotation !== rotation) {
				// There are at least 2 different rotations, so the common rotation is zero
				return 0
			}
		}

		return rotation
	}

	/**
	 * The rotation of the selection bounding box in the current page space.
	 *
	 * @readonly
	 * @public
	 */
	@computed getSelectionRotation(): number {
		return this.editor.getShapesSharedRotation(this.editor.getSelectedShapeIds())
	}

	/**
	 * @internal
	 */
	getShapesRotatedPageBounds(shapeIds: TLShapeId[]): Box | undefined {
		if (shapeIds.length === 0) {
			return undefined
		}

		const selectionRotation = this.editor.getShapesSharedRotation(shapeIds)
		if (selectionRotation === 0) {
			return this.editor.getShapesPageBounds(shapeIds) ?? undefined
		}

		if (shapeIds.length === 1) {
			const bounds = this.editor.getShapeGeometry(shapeIds[0]).bounds.clone()
			const pageTransform = this.editor.getShapePageTransform(shapeIds[0])
			bounds.point = pageTransform.applyToPoint(bounds.point)
			return bounds
		}

		// need to 'un-rotate' all the outlines of the existing nodes so we can fit them inside a box
		const boxFromRotatedVertices = Box.FromPoints(
			shapeIds
				.flatMap((id) =>
					this.editor
						.getShapePageTransform(id)
						.applyToPoints(this.editor.getShapeGeometry(id).bounds.corners)
				)
				.map((p) => p.rot(-selectionRotation))
		)
		// now position box so that it's top-left corner is in the right place
		boxFromRotatedVertices.point = boxFromRotatedVertices.point.rot(selectionRotation)
		return boxFromRotatedVertices
	}

	/**
	 * The bounds of the selection bounding box in the current page space.
	 *
	 * @readonly
	 * @public
	 */
	@computed getSelectionRotatedPageBounds(): Box | undefined {
		return this.editor.getShapesRotatedPageBounds(this.editor.getSelectedShapeIds())
	}

	/**
	 * The bounds of the selection bounding box in the current page space.
	 *
	 * @readonly
	 * @public
	 */
	@computed getSelectionRotatedScreenBounds(): Box | undefined {
		const bounds = this.editor.getSelectionRotatedPageBounds()
		if (!bounds) return undefined
		// Don't use pageToScreen here: it reads the screen bounds without capturing them, so this
		// computed would never invalidate when the container moves
		const screenBounds = this.editor.getViewportScreenBounds()
		const { x: cx, y: cy, z: zoom } = this.editor.getCamera()
		return new Box(
			(bounds.x + cx) * zoom + screenBounds.x,
			(bounds.y + cy) * zoom + screenBounds.y,
			bounds.width * zoom,
			bounds.height * zoom
		)
	}

	/**
	 * The current focused group id.
	 *
	 * @public
	 */
	@computed getFocusedGroupId(): TLShapeId | TLPageId {
		return this.editor.getCurrentPageState().focusedGroupId ?? this.editor.getCurrentPageId()
	}

	/**
	 * The current focused group.
	 *
	 * @public
	 */
	@computed getFocusedGroup(): TLShape | undefined {
		const focusedGroupId = this.editor.getFocusedGroupId()
		return focusedGroupId ? this.editor.getShape(focusedGroupId) : undefined
	}

	/**
	 * Set the current focused group shape.
	 *
	 * @param shape - The group shape id (or group shape's id) to set as the focused group shape.
	 *
	 * @public
	 */
	setFocusedGroup(shape: TLShapeId | TLGroupShape | null): Editor {
		const id = typeof shape === 'string' ? shape : (shape?.id ?? null)

		if (id !== null) {
			const shape = this.editor.getShape(id)
			if (!shape) {
				throw Error(`Editor.setFocusedGroup: Shape with id ${id} does not exist`)
			}

			if (!this.editor.isShapeOfType(shape, 'group')) {
				throw Error(
					`Editor.setFocusedGroup: Cannot set focused group to shape of type ${shape.type}`
				)
			}
		}

		if (id === this.editor.getFocusedGroupId()) return this.editor

		return this.editor.run(
			() => {
				this.editor.store.update(this.editor.getCurrentPageState().id, (s) => ({
					...s,
					focusedGroupId: id,
				}))
			},
			{ history: 'record-preserveRedoStack' }
		)
	}

	/**
	 * Exit the current focused group, moving up to the next parent group if there is one.
	 *
	 * @public
	 */
	popFocusedGroupId(): Editor {
		const focusedGroup = this.editor.getFocusedGroup()

		if (focusedGroup) {
			// If we have a focused layer, look for an ancestor of the focused shape that is a group
			const match = this.editor.findShapeAncestor(focusedGroup, (shape) =>
				this.editor.isShapeOfType(shape, 'group')
			)
			// If we have an ancestor that can become a focused layer, set it as the focused layer
			this.editor.setFocusedGroup(match?.id ?? null)
			this.editor.select(focusedGroup.id)
		} else {
			// If there's no parent focused group, then clear the focus layer and clear selection
			this.editor.setFocusedGroup(null)
			this.editor.selectNone()
		}

		return this.editor
	}

	/**
	 * The current editing shape's id.
	 *
	 * @public
	 */
	@computed getEditingShapeId(): TLShapeId | null {
		return this.editor.getCurrentPageState().editingShapeId
	}

	/**
	 * The current editing shape.
	 *
	 * @public
	 */
	@computed getEditingShape(): TLShape | undefined {
		const editingShapeId = this.editor.getEditingShapeId()
		return editingShapeId ? this.editor.getShape(editingShapeId) : undefined
	}

	/**
	 * Whether the shape can be edited.
	 *
	 * @param shape - The shape (or shape id) to check if it can be edited.
	 * @param info - The info about the edit start.
	 *
	 * @public
	 * @returns true if the shape can be edited, false otherwise.
	 */
	canEditShape<T extends TLShape | TLShapeId>(shape: T | null, info?: TLEditStartInfo): shape is T {
		const id = typeof shape === 'string' ? shape : (shape?.id ?? null)
		if (!id) return false // no shape
		if (id === this.editor.getEditingShapeId()) return false // already editing this shape
		const _shape = this.editor.getShape(id)
		if (!_shape) return false // no shape
		const util = this.editor.getShapeUtil(_shape)
		const _info: TLEditStartInfo = info ?? { type: 'unknown' }
		if (!util.canEdit(_shape, _info)) return false // shape is not editable
		if (this.editor.getIsReadonly() && !util.canEditInReadonly(_shape)) return false // readonly and no exception
		if (this.editor.isShapeOrAncestorLocked(_shape) && !util.canEditWhileLocked(_shape))
			return false // locked and no exception. Note here: we're not distinguishing between a locked shape and a shape that is the descendant of a locked shape.
		return true // shape is editable
	}

	/**
	 * Set the current editing shape.
	 *
	 * @example
	 * ```ts
	 * editor.setEditingShape(myShape)
	 * editor.setEditingShape(myShape.id)
	 * ```
	 *
	 * @param shape - The shape (or shape id) to set as editing.
	 *
	 * @public
	 */
	setEditingShape(shape: TLShapeId | TLShape | null): Editor {
		const id = typeof shape === 'string' ? shape : (shape?.id ?? null)

		// id was provided but the next editing shape was not editable or didn't exist, so do nothing
		if (id && !this.editor.canEditShape(id)) return this.editor

		this.editor.run(() => {
			// Clean up the previous editing shape. This runs outside the history-ignored batch below,
			// otherwise document changes made by onEditEnd (e.g. deleting an empty text shape) are
			// never recorded and leave a phantom undo entry whose redo resurrects the shape.
			const prevEditingShapeId = this.editor.getEditingShapeId()
			if (prevEditingShapeId) {
				const prevEditingShape = this.editor.getShape(prevEditingShapeId)
				if (prevEditingShape) {
					this.editor.getShapeUtil(prevEditingShape).onEditEnd?.(prevEditingShape)
				}
			}

			this.editor.run(
				() => {
					// Clean up the editing shape state and rich text editor
					this.editor._updateCurrentPageState({ editingShapeId: null })
					this._currentRichTextEditor.set(null)

					if (!id) return

					this.editor.select(id)
					this.editor._updateCurrentPageState({ editingShapeId: id })

					const nextEditingShape = this.editor.getShape(id)! // shape should be there because canEditShape checked it. Possible small chance that onEditEnd deleted it?
					this.editor.getShapeUtil(nextEditingShape).onEditStart?.(nextEditingShape)
				},
				{ history: 'ignore' }
			)
		})

		return this.editor
	}

	// Rich text editor

	_currentRichTextEditor = atom('rich text editor', null as TiptapEditor | null)

	/**
	 * The current editing shape's text editor.
	 *
	 * @public
	 */
	@computed getRichTextEditor(): TiptapEditor | null {
		return this._currentRichTextEditor.get()
	}

	/**
	 * Set the current editing shape's rich text editor.
	 *
	 * @example
	 * ```ts
	 * editor.setRichTextEditor(richTextEditorView)
	 * ```
	 *
	 * @param textEditor - The text editor to set as the current editing shape's text editor.
	 *
	 * @public
	 */
	setRichTextEditor(textEditor: TiptapEditor | null) {
		this._currentRichTextEditor.set(textEditor)
		return this.editor
	}

	/**
	 * The current hovered shape id.
	 *
	 * @readonly
	 * @public
	 */
	@computed getHoveredShapeId(): TLShapeId | null {
		return this.editor.getCurrentPageState().hoveredShapeId
	}

	/**
	 * The current hovered shape.
	 *
	 * @public
	 */
	@computed getHoveredShape(): TLShape | undefined {
		const hoveredShapeId = this.editor.getHoveredShapeId()
		return hoveredShapeId ? this.editor.getShape(hoveredShapeId) : undefined
	}

	/**
	 * Set the editor's current hovered shape.
	 *
	 * @example
	 * ```ts
	 * editor.setHoveredShape(myShape)
	 * editor.setHoveredShape(myShape.id)
	 * ```
	 *
	 * @param shape - The shape (or shape id) to set as hovered.
	 *
	 * @public
	 */
	setHoveredShape(shape: TLShapeId | TLShape | null): Editor {
		const id = typeof shape === 'string' ? shape : (shape?.id ?? null)
		if (id === this.editor.getHoveredShapeId()) return this.editor
		this.editor.run(
			() => {
				this.editor.updateCurrentPageState({ hoveredShapeId: id })
			},
			{ history: 'ignore' }
		)
		return this.editor
	}

	/**
	 * The editor's current hinting shape ids.
	 *
	 * @public
	 */
	@computed getHintingShapeIds() {
		return this.editor.getCurrentPageState().hintingShapeIds
	}

	/**
	 * The editor's current hinting shapes.
	 *
	 * @public
	 */
	@computed getHintingShape() {
		const hintingShapeIds = this.editor.getHintingShapeIds()
		return compact(hintingShapeIds.map((id) => this.editor.getShape(id)))
	}

	/**
	 * Set the editor's current hinting shapes.
	 *
	 * @example
	 * ```ts
	 * editor.setHintingShapes([myShape])
	 * editor.setHintingShapes([myShape.id])
	 * ```
	 *
	 * @param shapes - The shapes (or shape ids) to set as hinting.
	 *
	 * @public
	 */
	setHintingShapes(shapes: TLShapeId[] | TLShape[]): Editor {
		const ids = toShapeIds(shapes)
		// always ephemeral
		this.editor.run(
			() => {
				this.editor._updateCurrentPageState({ hintingShapeIds: dedupe(ids) })
			},
			{ history: 'ignore' }
		)
		return this.editor
	}

	/**
	 * The editor's current erasing ids.
	 *
	 * @public
	 */
	@computed getErasingShapeIds() {
		return this.editor.getCurrentPageState().erasingShapeIds
	}

	/**
	 * The editor's current erasing shapes.
	 *
	 * @public
	 */
	@computed getErasingShapes() {
		const erasingShapeIds = this.editor.getErasingShapeIds()
		return compact(erasingShapeIds.map((id) => this.editor.getShape(id)))
	}

	/**
	 * Set the editor's current erasing shapes.
	 *
	 * @example
	 * ```ts
	 * editor.setErasingShapes([myShape])
	 * editor.setErasingShapes([myShape.id])
	 * ```
	 *
	 * @param shapes - The shapes (or shape ids) to set as hinting.
	 *
	 * @public
	 */
	setErasingShapes(shapes: TLShapeId[] | TLShape[]): Editor {
		// copy before sorting: the caller may pass a store-owned (frozen) array
		const ids = toShapeIds(shapes).slice()
		ids.sort() // sort the incoming ids
		const erasingShapeIds = this.editor.getErasingShapeIds()
		this.editor.run(
			() => {
				// the current ids are also sorted, so a shallow comparison tells us whether they changed
				if (!areArraysShallowEqual(ids, erasingShapeIds)) {
					this.editor._updateCurrentPageState({ erasingShapeIds: ids })
				}
			},
			{ history: 'ignore' }
		)

		return this.editor
	}

	/**
	 * The current cropping shape's id.
	 *
	 * @public
	 */
	getCroppingShapeId() {
		return this.editor.getCurrentPageState().croppingShapeId
	}

	/**
	 * Whether the shape can be cropped.
	 *
	 * @param shape - The shape (or shape id) to check if it can be cropped.
	 *
	 * @public
	 * @returns true if the shape can be cropped, false otherwise.
	 */
	canCropShape<T extends TLShape | TLShapeId>(shape: T | null): shape is T {
		if (!shape) return false
		const id = typeof shape === 'string' ? shape : (shape?.id ?? null)
		if (!id) return false
		const _shape = this.editor.getShape(id)
		if (!_shape) return false
		const util = this.editor.getShapeUtil(_shape)
		if (!util.canCrop(_shape)) return false
		if (this.editor.getIsReadonly()) return false
		if (this.editor.isShapeOrAncestorLocked(_shape)) return false
		return true
	}

	/**
	 * Set the current cropping shape.
	 *
	 * @example
	 * ```ts
	 * editor.setCroppingShape(myShape)
	 * editor.setCroppingShape(myShape.id)
	 * ```
	 *
	 *
	 * @param shape - The shape (or shape id) to set as cropping.
	 *
	 * @public
	 */
	setCroppingShape(shape: TLShapeId | TLShape | null): Editor {
		const id = typeof shape === 'string' ? shape : (shape?.id ?? null)
		if (id !== this.editor.getCroppingShapeId()) {
			this.editor.run(
				() => {
					if (!id) {
						this.editor.updateCurrentPageState({ croppingShapeId: null })
					} else if (this.editor.canCropShape(id)) {
						this.editor.updateCurrentPageState({ croppingShapeId: id })
					}
				},
				{ history: 'ignore' }
			)
		}
		return this.editor
	}

	_textOptions!: Atom<TLTextOptions | null>

	/**
	 * Get the current text options.
	 *
	 * @example
	 * ```ts
	 * editor.getTextOptions()
	 * ```
	 *
	 *  @public */
	getTextOptions() {
		return assertExists(this._textOptions.get(), 'Cannot use text without setting textOptions')
	}
}
