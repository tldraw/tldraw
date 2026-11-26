// This module is part of the headless editor kernel. It must not import React or touch the DOM.
import { computed } from '@tldraw/state'
import { TLGroupShape, TLParentId, TLShape, TLShapeId, isPageId } from '@tldraw/tlschema'
import { compact, minBy } from '@tldraw/utils'
import type { Editor } from '../../editor/Editor'
import { toShapeIds } from '../../editor/recordUtils'
import { TLAdjacentDirection } from '../../editor/types/selection-types'
import { Box } from '../../primitives/Box'
import { Vec } from '../../primitives/Vec'

/**
 * Changes and measures the selection: select, deselect, select all, move the selection to an
 * adjacent shape, reading order, the bounds and rotation of the selection, and the focused group.
 * The editor's methods of the same names use it. The selected ids themselves are page state that
 * the editor keeps.
 *
 * @public
 */
export class SelectionController {
	constructor(private readonly editor: Editor) {}

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
		const filteredShapes = this.editor
			.getCurrentPageShapes()
			.filter((shape) =>
				isSelectedWithinContainer ? shape.parentId === firstParentId : isPageId(shape.parentId)
			)
		const readingOrderShapes = this.editor.getShapesInReadingOrder(filteredShapes)
		const currentShapeId: TLShapeId | undefined =
			selectedShapeIds.length === 1
				? selectedShapeIds[0]
				: readingOrderShapes.find((shape) => selectedShapeIds.includes(shape.id))?.id

		let adjacentShapeId: TLShapeId
		if (direction === 'next' || direction === 'prev') {
			const shapeIds = readingOrderShapes.map((shape) => shape.id)
			// Every candidate can be filtered out (e.g. every util returns false from canTabTo);
			// indexing an empty list would hand getShape undefined
			if (shapeIds.length === 0) return

			const currentIndex = currentShapeId ? shapeIds.indexOf(currentShapeId) : -1
			// With no current index, stepping from -1 makes 'prev' land one shape
			// before the last; seed it from 0 so it wraps to the last shape. See #10559.
			const startIndex = currentIndex === -1 && direction === 'prev' ? 0 : currentIndex
			const adjacentIndex =
				(startIndex + (direction === 'next' ? 1 : -1) + shapeIds.length) % shapeIds.length
			adjacentShapeId = shapeIds[adjacentIndex]
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
	 * Shapes whose util returns `false` from {@link ShapeUtil.canTabTo} are left out. Locked
	 * shapes are included, so keyboard users can reach them to unlock them.
	 *
	 * @public
	 */
	@computed getCurrentPageShapesInReadingOrder(): TLShape[] {
		const shapes = this.editor.getCurrentPageShapes().filter((shape) => isPageId(shape.parentId))
		return this.editor.getShapesInReadingOrder(shapes)
	}

	/**
	 * Sort the given shapes into reading order (left-to-right, top-to-bottom), dropping any that
	 * can't be tabbed to. Use this for the children of a frame or group, which
	 * {@link Editor.getCurrentPageShapesInReadingOrder} leaves out.
	 *
	 * @internal
	 */
	getShapesInReadingOrder(shapes: TLShape[]): TLShape[] {
		const SHALLOW_ANGLE = 20
		const ROW_THRESHOLD = 100

		const tabbableShapes = shapes.filter((shape) => this.editor.getShapeUtil(shape).canTabTo(shape))

		if (tabbableShapes.length <= 1) return tabbableShapes

		const shapesWithCenters = tabbableShapes.map((shape) => ({
			shape,
			center: this.editor.getShapePageBounds(shape)!.center,
		}))
		shapesWithCenters.sort((a, b) => a.center.y - b.center.y)

		const rows: Array<typeof shapesWithCenters> = []

		// First, group shapes into rows based on y-coordinates.
		for (const shapeWithCenter of shapesWithCenters) {
			let rowIndex = -1
			for (let i = rows.length - 1; i >= 0; i--) {
				const row = rows[i]
				const lastShapeInRow = row[row.length - 1]

				// If the shape is close enough vertically to the last shape in this row.
				if (Math.abs(shapeWithCenter.center.y - lastShapeInRow.center.y) < ROW_THRESHOLD) {
					rowIndex = i
					break
				}
			}

			// If no suitable row found, create a new row.
			if (rowIndex === -1) {
				rows.push([shapeWithCenter])
			} else {
				rows[rowIndex].push(shapeWithCenter)
			}
		}

		// Then, sort each row by x-coordinate (left-to-right).
		for (const row of rows) {
			row.sort((a, b) => a.center.x - b.center.x)
		}

		// Finally, apply angle/distance weight adjustments within rows for closely positioned shapes.
		for (const row of rows) {
			if (row.length <= 2) continue

			for (let i = 0; i < row.length - 2; i++) {
				const currentShape = row[i]
				const nextShape = row[i + 1]
				const nextNextShape = row[i + 2]

				// Only consider adjustment if the next two shapes are relatively close to each other.
				const dist1 = Vec.Dist2(currentShape.center, nextShape.center)
				const dist2 = Vec.Dist2(currentShape.center, nextNextShape.center)

				// Check if the 2nd shape is actually closer to the current shape.
				if (dist2 < dist1 * 0.9) {
					// Check if it's a shallow enough angle.
					const angle = Math.abs(
						Vec.Angle(currentShape.center, nextNextShape.center) * (180 / Math.PI)
					)
					if (angle <= SHALLOW_ANGLE) {
						// Swap swap.
						;[row[i + 1], row[i + 2]] = [row[i + 2], row[i + 1]]
					}
				}
			}
		}

		return rows.flat().map((item) => item.shape)
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
		const directionToAngle = { right: 0, left: 180, down: 90, up: 270 }
		const currentShape = this.editor.getShape(currentShapeId)
		if (!currentShape) return currentShapeId

		const tabbableShapes = shapes.filter(
			(shape) => this.editor.getShapeUtil(shape).canTabTo(shape) && shape.id !== currentShapeId
		)
		if (!tabbableShapes.length) return currentShapeId

		const currentCenter = this.editor.getShapePageBounds(currentShape)!.center
		const shapesWithCenters = tabbableShapes.map((shape) => ({
			shape,
			center: this.editor.getShapePageBounds(shape)!.center,
		}))

		// Filter shapes that are in the same direction.
		const shapesInDirection = shapesWithCenters.filter(({ center }) => {
			const isRight = center.x > currentCenter.x
			const isDown = center.y > currentCenter.y
			const xDist = center.x - currentCenter.x
			const yDist = center.y - currentCenter.y
			const isInXDirection = Math.abs(yDist) < Math.abs(xDist) * 2
			const isInYDirection = Math.abs(xDist) < Math.abs(yDist) * 2
			if (direction === 'left' || direction === 'right') {
				return isInXDirection && (direction === 'right' ? isRight : !isRight)
			}
			if (direction === 'up' || direction === 'down') {
				return isInYDirection && (direction === 'down' ? isDown : !isDown)
			}
		})

		if (shapesInDirection.length === 0) return currentShapeId

		// Ok, now score that subset of shapes.
		const lowestScoringShape = minBy(shapesInDirection, ({ center }) => {
			// Linear, not squared: the off-axis and diagonal penalties below are page units too, and
			// squared distance swamps them, so a nearer diagonal shape beats an aligned one.
			const distance = Vec.Dist(currentCenter, center)

			// Distance along the primary axis.
			const dirProp = ['left', 'right'].includes(direction) ? 'x' : 'y'
			const directionalDistance = Math.abs(center[dirProp] - currentCenter[dirProp])

			// Distance off the perpendicular to the primary axis.
			const offProp = ['left', 'right'].includes(direction) ? 'y' : 'x'
			const offAxisDeviation = Math.abs(center[offProp] - currentCenter[offProp])

			// atan2 gives -180..180, so 'up' is -90; normalize to 0..360 to match 270, and wrap the
			// deviation so that 350 is 10 away from 'right' (0), not 350.
			const angle = (Vec.Angle(currentCenter, center) * (180 / Math.PI) + 360) % 360
			const rawAngleDeviation = Math.abs(angle - directionToAngle[direction])
			const angleDeviation = Math.min(rawAngleDeviation, 360 - rawAngleDeviation)

			// Calculate final score (lower is better).
			// Weight factors to prioritize:
			// 1. Shapes directly in line with the current shape
			// 2. Shapes closer to the current shape
			// 3. Shapes with less angular deviation from the primary direction
			return (
				distance * 1.0 + // Base distance
				offAxisDeviation * 2.0 + // Heavy penalty for off-axis deviation
				(distance - directionalDistance) * 1.5 + // Penalty for diagonal distance
				angleDeviation * 0.5
			) // Slight penalty for angular deviation
		})

		return lowestScoringShape!.shape.id
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
		const sortedChildren = this.editor.getShapesInReadingOrder(children)
		if (sortedChildren.length === 0) return
		this._selectShapesAndZoom([sortedChildren[0].id])
	}

	private _selectShapesAndZoom(ids: TLShapeId[]) {
		// setSelectedShapes is a no-op for an unchanged selection (Tab with a single shape,
		// Ctrl+arrow with no neighbour); marking anyway would leave an empty stopping point
		// that makes undo available with nothing to undo
		const selectedShapeIds = this.editor.getSelectedShapeIds()
		const isSelectionChanging =
			ids.length !== selectedShapeIds.length || ids.some((id) => !selectedShapeIds.includes(id))
		if (isSelectionChanging) {
			this.editor.markHistoryStoppingPoint('selecting adjacent shape')
		}
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
}
