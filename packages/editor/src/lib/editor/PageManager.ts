import { EMPTY_ARRAY, atom, computed, transact } from '@tldraw/state'
import {
	CameraRecordType,
	PageRecordType,
	TLArrowShape,
	TLAsset,
	TLFrameShape,
	TLINSTANCE_ID,
	TLImageAsset,
	TLPage,
	TLPageId,
	TLParentId,
	TLShape,
	TLShapeId,
	TLShapePartial,
	TLVideoAsset,
	createShapeId,
	isPageId,
	isShapeId,
} from '@tldraw/tlschema'
import { compact, deepCopy, sortById } from '@tldraw/utils'
import {
	CAMERA_MAX_RENDERING_INTERVAL,
	CAMERA_MOVING_TIMEOUT,
	COLLABORATOR_IDLE_TIMEOUT,
	DEFAULT_ANIMATION_OPTIONS,
	INTERNAL_POINTER_IDS,
	MAX_SHAPES_PER_PAGE,
	MAX_ZOOM,
	MIN_ZOOM,
	ZOOMS,
} from '../constants'
import { Box2d } from '../primitives/Box2d'
import { Matrix2d } from '../primitives/Matrix2d'
import { Vec2d, VecLike } from '../primitives/Vec2d'
import { EASINGS } from '../primitives/easings'
import { clamp } from '../primitives/utils'
import { WeakMapCache } from '../utils/WeakMapCache'
import { dataUrlToFile } from '../utils/assets'
import {
	getIndexAbove,
	getIndices,
	getIndicesAbove,
	getIndicesBetween,
	sortByIndex,
} from '../utils/reordering/reordering'
import { Editor, TLAnimationOptions, TLViewportOptions } from './Editor'
import { PageStateManager } from './PageStateManager'
import { parentsToChildren } from './derivations/parentsToChildren'
import { deriveShapeIdsInCurrentPage } from './derivations/shapeIdsInCurrentPage'
import { ShapeUtil } from './shapes/ShapeUtil'
import { TLContent } from './types/clipboard-types'
import { OptionalKeys } from './types/misc-types'

// Manages the CURRENT page
export class PageManager {
	constructor(public editor: Editor) {
		this._shapeIds = deriveShapeIdsInCurrentPage(this.editor.store, () => this.id)
		this._parentIdsToChildIds = parentsToChildren(this.editor.store)
		this.state = new PageStateManager(this.editor)
	}

	state: PageStateManager

	private readonly _shapeIds: ReturnType<typeof deriveShapeIdsInCurrentPage>
	private readonly _parentIdsToChildIds: ReturnType<typeof parentsToChildren>
	private readonly _childIdsCache = new WeakMapCache<TLShapeId[], TLShapeId[]>()

	/**
	 * The current page id.
	 *
	 * @example
	 * ```ts
	 * editor.page.id
	 * ```
	 *
	 * @public
	 */
	@computed get id() {
		return this.editor.instanceState.currentPageId
	}

	/**
	 * The current page record.
	 *
	 * @example
	 * ```ts
	 * editor.page.record
	 * ```
	 *
	 * @public
	 */
	@computed get record(): TLPage {
		return this.editor.store.get(this.id)!
	}

	/** @internal */
	@computed
	private get cameraId() {
		return CameraRecordType.createId(this.id)
	}

	/**
	 * The current camera.
	 *
	 * @public
	 */
	@computed get camera() {
		return this.editor.store.get(this.cameraId)!
	}

	getSortedChildIds(): TLShapeId[]
	getSortedChildIds(shape: TLShape): TLShapeId[]
	getSortedChildIds(shape: TLShapeId): TLShapeId[]
	getSortedChildIds(arg?: TLShape | TLShapeId): TLShapeId[] {
		const parentId = arg ? (typeof arg === 'string' ? arg : arg.id) : this.id
		const ids = this._parentIdsToChildIds.value[parentId]
		if (!ids) return EMPTY_ARRAY
		return this._childIdsCache.get(ids, () => ids)
	}

	@computed get shapeIds(): Set<TLShapeId> {
		return this._shapeIds.value
	}

	@computed get sortedShapeIds(): TLShapeId[] {
		const parentsToChildren = this._parentIdsToChildIds.value

		const results: TLShapeId[] = []

		function pushShapeAndDescendants(id: TLShapeId): void {
			results.push(id)
			const childIds = parentsToChildren[id]
			childIds.forEach(pushShapeAndDescendants)
		}

		const firstChildIds = parentsToChildren[this.id]
		firstChildIds.forEach(pushShapeAndDescendants)

		return results
	}

	@computed get shapes(): TLShape[] {
		const { shapeIds } = this
		const result = Array(shapeIds.size)

		let i = 0
		for (const id of shapeIds) {
			result[i] = this.editor.store.get(id)!
			i++
		}

		return result.sort(sortByIndex)
	}

	@computed get sortedShapes(): TLShape[] {
		return this.sortedShapeIds.map((id) => this.editor.store.get(id)!)
	}

	// crud me

	update(partial: OptionalKeys<TLPage, 'id'>, squashing = false): this {
		this.editor.updatePage({ ...partial, id: this.id }, squashing)
		return this
	}

	delete() {
		this.editor.deletePage(this.id)
		return this
	}

	duplicate() {
		this.editor.duplicatePage(this.id)
		return this
	}

	rename(name: string, squashing = false) {
		this.editor.renamePage(this.id, name, squashing)
		return this
	}

	// helpers

	/**
	 * The bounds of the page, defined by the common bounds of all of the shapes on the page.
	 *
	 * @public
	 */
	@computed get bounds(): Box2d | undefined {
		let commonBounds: Box2d | undefined

		this.shapeIds.forEach((shapeId) => {
			const bounds = this.editor.getMaskedPageBounds(shapeId)
			if (!bounds) return
			if (!commonBounds) {
				commonBounds = bounds
			} else {
				commonBounds = commonBounds.expand(bounds)
			}
		})

		return commonBounds
	}

	/**
	 * Get the top-most selected shape at the given point, ignoring groups.
	 *
	 * @param point - The point to check.
	 *
	 * @returns The top-most selected shape at the given point, or undefined if there is no shape at the point.
	 */
	getSelectedShapeAtPoint(point: VecLike): TLShape | undefined {
		const { selectedShapeIds } = this
		return this.sortedShapes
			.filter((shape) => shape.type !== 'group' && selectedShapeIds.includes(shape.id))
			.findLast((shape) => this.editor.isPointInShape(shape, point, { hitInside: true, margin: 0 }))
	}

	/**
	 * Reparent shapes to a new parent. This operation preserves the shape's current page positions /
	 * rotations.
	 *
	 * @example
	 * ```ts
	 * editor.reparentShapes([box1, box2], 'frame1')
	 * editor.reparentShapes([box1.id, box2.id], 'frame1')
	 * editor.reparentShapes([box1.id, box2.id], 'frame1', 4)
	 * ```
	 *
	 * @param shapes - The shapes (or shape ids) of the shapes to reparent.
	 * @param parentId - The id of the new parent shape.
	 * @param insertIndex - (optional) The index to insert the children.
	 *
	 * @public
	 */
	reparentShapes(shapes: TLShape[], insertIndex?: string): this
	reparentShapes(ids: TLShapeId[], insertIndex?: string): this
	reparentShapes(
		shapes: TLShapeId[] | TLShape[],
		parentId: string | TLShapeId,
		insertIndex?: string
	): this
	reparentShapes(arg: TLShapeId[] | TLShape[], arg2: string | TLShapeId, arg3?: string) {
		const ids =
			typeof arg[0] === 'string' ? (arg as TLShapeId[]) : arg.map((s) => (s as TLShape).id)

		let parentId: TLParentId
		let insertIndex: string | undefined = undefined
		let childIds: TLShapeId[] = []
		if (isShapeId(arg2)) {
			parentId = arg2
			insertIndex = arg3
			childIds = this.getSortedChildIds(parentId)
		} else {
			parentId = this.id
			insertIndex = arg2
			childIds = this.getSortedChildIds()
		}

		const changes: TLShapePartial[] = []

		const parentTransform = isPageId(parentId)
			? Matrix2d.Identity()
			: this.editor.getPageTransform(parentId)!

		const parentPageRotation = parentTransform.rotation()

		let indices: string[] = []

		const sibs = compact(childIds.map((id) => this.editor.getShape(id)))

		if (insertIndex !== undefined) {
			const sibWithInsertIndex = sibs.find((s) => s.index === insertIndex)
			if (sibWithInsertIndex) {
				// If there's a sibling with the same index as the insert index...
				const sibAbove = sibs[sibs.indexOf(sibWithInsertIndex) + 1]
				if (sibAbove) {
					// If the sibling has a sibling above it, insert the shapes
					// between the sibling and its sibling above it.
					indices = getIndicesBetween(insertIndex, sibAbove.index, ids.length)
				} else {
					// Or if the sibling is the top sibling, insert the shapes
					// above the sibling
					indices = getIndicesAbove(insertIndex, ids.length)
				}
			} else {
				// If there's no collision, then we can start at the insert index
				const sibAbove = sibs.sort(sortByIndex).find((s) => s.index > insertIndex!)

				if (sibAbove) {
					// If the siblings include a sibling with a higher index, insert the shapes
					// between the insert index and the sibling with the higher index.
					indices = getIndicesBetween(insertIndex, sibAbove.index, ids.length)
				} else {
					// Otherwise, we're at the top of the order, so insert the shapes above
					// the insert index.
					indices = getIndicesAbove(insertIndex, ids.length)
				}
			}
		} else {
			// If insert index is not specified, start the index at the top.
			const sib = sibs.length && sibs[sibs.length - 1]
			indices = sib ? getIndicesAbove(sib.index, ids.length) : getIndices(ids.length)
		}

		const invertedParentTransform = parentTransform.clone().invert()

		let id: TLShapeId
		for (let i = 0; i < ids.length; i++) {
			id = ids[i]
			const shape = this.editor.getShape(id)
			if (!shape) continue
			const pageTransform = this.editor.getPageTransform(shape)!
			if (!pageTransform) continue
			const pagePoint = pageTransform.point()

			if (!shape || !pagePoint) continue

			const newPoint = invertedParentTransform.applyToPoint(pagePoint)
			const newRotation = pageTransform.rotation() - parentPageRotation

			changes.push({
				id: shape.id,
				type: shape.type,
				parentId: parentId,
				x: newPoint.x,
				y: newPoint.y,
				rotation: newRotation,
				index: indices[i],
			})
		}

		this.editor.updateShapes(changes)
		return this
	}

	/**
	 * Get the index above the highest child of a given parent.
	 *
	 * @param parentId - The id of the parent.
	 *
	 * @returns The index.
	 *
	 * @public
	 */
	getHighestIndexForParent(parent: TLPage | TLShape): string
	getHighestIndexForParent(parentId: TLParentId): string
	getHighestIndexForParent(arg: TLParentId | TLPage | TLShape): string {
		const parentId = typeof arg === 'string' ? arg : arg.id
		const children = this._parentIdsToChildIds.value[parentId]

		if (!children || children.length === 0) {
			return 'a1'
		}
		const shape = this.editor.getShape(children[children.length - 1])!
		return getIndexAbove(shape.index)
	}

	/**
	 * Place content into the editor.
	 *
	 * @param content - The content.
	 * @param options - Options for placing the content.
	 *
	 * @public
	 */
	putContent(
		content: TLContent,
		options: {
			point?: VecLike
			select?: boolean
			preservePosition?: boolean
			preserveIds?: boolean
		} = {}
	): this {
		if (this.editor.instanceState.isReadonly) return this

		if (!content.schema) {
			throw Error('Could not put content:\ncontent is missing a schema.')
		}

		const { select = false, preserveIds = false, preservePosition = false } = options
		let { point = undefined } = options

		// decide on a parent for the put shapes; if the parent is among the put shapes(?) then use its parent

		const { id: currentPageId, selectedShapes } = this
		const { assets, shapes, rootShapeIds } = content

		const idMap = new Map<any, TLShapeId>(shapes.map((shape) => [shape.id, createShapeId()]))

		// By default, the paste parent will be the current page.
		let pasteParentId = currentPageId as TLPageId | TLShapeId
		let lowestDepth = Infinity
		let lowestAncestors: TLShape[] = []

		// Among the selected shapes, find the shape with the fewest ancestors and use its first ancestor.
		for (const shape of selectedShapes) {
			if (lowestDepth === 0) break

			const isFrame = this.editor.isShapeOfType<TLFrameShape>(shape, 'frame')
			const ancestors = this.editor.getAncestors(shape)
			if (isFrame) ancestors.push(shape)

			const depth = isFrame ? ancestors.length + 1 : ancestors.length

			if (depth < lowestDepth) {
				lowestDepth = depth
				lowestAncestors = ancestors
				pasteParentId = isFrame ? shape.id : shape.parentId
			} else if (depth === lowestDepth) {
				if (lowestAncestors.length !== ancestors.length) {
					throw Error(`Ancestors: ${lowestAncestors.length} !== ${ancestors.length}`)
				}

				if (lowestAncestors.length === 0) {
					pasteParentId = currentPageId
					break
				} else {
					pasteParentId = currentPageId
					for (let i = 0; i < lowestAncestors.length; i++) {
						if (ancestors[i] !== lowestAncestors[i]) break
						pasteParentId = ancestors[i].id
					}
				}
			}
		}

		let isDuplicating = false

		if (!isPageId(pasteParentId)) {
			const parent = this.editor.getShape(pasteParentId)
			if (parent) {
				if (!this.viewportPageBounds.includes(this.editor.getPageBounds(parent)!)) {
					pasteParentId = currentPageId
				} else {
					if (rootShapeIds.length === 1) {
						const rootShape = shapes.find((s) => s.id === rootShapeIds[0])!
						if (
							this.editor.isShapeOfType<TLFrameShape>(parent, 'frame') &&
							this.editor.isShapeOfType<TLFrameShape>(rootShape, 'frame') &&
							rootShape.props.w === parent?.props.w &&
							rootShape.props.h === parent?.props.h
						) {
							isDuplicating = true
						}
					}
				}
			} else {
				pasteParentId = currentPageId
			}
		}

		if (!isDuplicating) {
			isDuplicating = idMap.has(pasteParentId)
		}

		if (isDuplicating) {
			pasteParentId = this.editor.getShape(pasteParentId)!.parentId
		}

		let index = this.getHighestIndexForParent(pasteParentId)

		const rootShapes: TLShape[] = []

		const newShapes: TLShape[] = shapes.map((shape): TLShape => {
			let newShape: TLShape

			if (preserveIds) {
				newShape = deepCopy(shape)
				idMap.set(shape.id, shape.id)
			} else {
				const id = idMap.get(shape.id)!

				// Create the new shape (new except for the id)
				newShape = deepCopy({ ...shape, id })
			}

			if (rootShapeIds.includes(shape.id)) {
				newShape.parentId = currentPageId
				rootShapes.push(newShape)
			}

			// Assign the child to its new parent.

			// If the child's parent is among the putting shapes, then assign
			// it to the new parent's id.
			if (idMap.has(newShape.parentId)) {
				newShape.parentId = idMap.get(shape.parentId)!
			} else {
				rootShapeIds.push(newShape.id)
				// newShape.parentId = pasteParentId
				newShape.index = index
				index = getIndexAbove(index)
			}

			if (this.editor.isShapeOfType<TLArrowShape>(newShape, 'arrow')) {
				if (newShape.props.start.type === 'binding') {
					const mappedId = idMap.get(newShape.props.start.boundShapeId)
					newShape.props.start = mappedId
						? { ...newShape.props.start, boundShapeId: mappedId }
						: // this shouldn't happen, if you copy an arrow but not it's bound shape it should
						  // convert the binding to a point at the time of copying
						  { type: 'point', x: 0, y: 0 }
				}
				if (newShape.props.end.type === 'binding') {
					const mappedId = idMap.get(newShape.props.end.boundShapeId)
					newShape.props.end = mappedId
						? { ...newShape.props.end, boundShapeId: mappedId }
						: // this shouldn't happen, if you copy an arrow but not it's bound shape it should
						  // convert the binding to a point at the time of copying
						  { type: 'point', x: 0, y: 0 }
				}
			}

			return newShape
		})

		if (newShapes.length + this.shapeIds.size > MAX_SHAPES_PER_PAGE) {
			// There's some complexity here involving children
			// that might be created without their parents, so
			// if we're going over the limit then just don't paste.
			alertMaxShapes(this.editor)
			return this
		}

		// Migrate the new shapes

		let assetsToCreate: TLAsset[] = []

		if (assets) {
			for (let i = 0; i < assets.length; i++) {
				const asset = assets[i]
				const result = this.editor.store.schema.migratePersistedRecord(asset, content.schema)
				if (result.type === 'success') {
					assets[i] = result.value as TLAsset
				} else {
					throw Error(
						`Could not put content:\ncould not migrate content for asset:\n${asset.id}\n${asset.type}\nreason:${result.reason}`
					)
				}
			}

			const assetsToUpdate: (TLImageAsset | TLVideoAsset)[] = []

			assetsToCreate = assets
				.filter((asset) => !this.editor.store.has(asset.id))
				.map((asset) => {
					if (asset.type === 'image' || asset.type === 'video') {
						if (asset.props.src && asset.props.src?.startsWith('data:image')) {
							assetsToUpdate.push(structuredClone(asset))
							asset.props.src = null
						} else {
							assetsToUpdate.push(structuredClone(asset))
						}
					}

					return asset
				})

			Promise.allSettled(
				assetsToUpdate.map(async (asset) => {
					const file = await dataUrlToFile(
						asset.props.src!,
						asset.props.name,
						asset.props.mimeType ?? 'image/png'
					)

					const newAsset = await this.editor.getAssetForExternalContent({ type: 'file', file })

					if (!newAsset) {
						return null
					}

					return [asset, newAsset] as const
				})
			).then((assets) => {
				this.editor.updateAssets(
					compact(
						assets.map((result) =>
							result.status === 'fulfilled' && result.value
								? { ...result.value[1], id: result.value[0].id }
								: undefined
						)
					)
				)
			})
		}

		for (let i = 0; i < newShapes.length; i++) {
			const shape = newShapes[i]
			const result = this.editor.store.schema.migratePersistedRecord(shape, content.schema)
			if (result.type === 'success') {
				newShapes[i] = result.value as TLShape
			} else {
				throw Error(
					`Could not put content:\ncould not migrate content for shape:\n${shape.id}, ${shape.type}\nreason:${result.reason}`
				)
			}
		}

		this.editor.batch(() => {
			// Create any assets that need to be created
			if (assetsToCreate.length > 0) {
				this.editor.createAssets(assetsToCreate)
			}

			// Create the shapes with root shapes as children of the page
			this.editor.createShapes(newShapes, select)

			// And then, if needed, reparent the root shapes to the paste parent
			if (pasteParentId !== currentPageId) {
				this.reparentShapes(
					rootShapes.map((s) => s.id),
					pasteParentId
				)
			}

			const newCreatedShapes = newShapes.map((s) => this.editor.getShape(s.id)!)
			const bounds = Box2d.Common(newCreatedShapes.map((s) => this.editor.getPageBounds(s)!))

			if (point === undefined) {
				if (!isPageId(pasteParentId)) {
					// Put the shapes in the middle of the (on screen) parent
					const shape = this.editor.getShape(pasteParentId)!
					point = this.editor.getGeometry(shape).bounds.center
				} else {
					const { viewportPageBounds } = this
					if (preservePosition || viewportPageBounds.includes(Box2d.From(bounds))) {
						// Otherwise, put shapes where they used to be
						point = bounds.center
					} else {
						// If the old bounds are outside of the viewport...
						// put the shapes in the middle of the viewport
						point = viewportPageBounds.center
					}
				}
			}

			if (rootShapes.length === 1) {
				const onlyRoot = rootShapes[0] as TLFrameShape
				// If the old bounds are in the viewport...
				if (this.editor.isShapeOfType<TLFrameShape>(onlyRoot, 'frame')) {
					while (
						this.editor
							.getShapesAtPoint(point)
							.some(
								(shape) =>
									this.editor.isShapeOfType<TLFrameShape>(shape, 'frame') &&
									shape.props.w === onlyRoot.props.w &&
									shape.props.h === onlyRoot.props.h
							)
					) {
						point.x += bounds.w + 16
					}
				}
			}

			this.editor.updateShapes(
				rootShapes.map((s) => {
					const delta = {
						x: (s.x ?? 0) - (bounds.x + bounds.w / 2),
						y: (s.y ?? 0) - (bounds.y + bounds.h / 2),
					}

					return { id: s.id, type: s.type, x: point!.x + delta.x, y: point!.y + delta.y }
				})
			)
		})

		return this
	}

	// crud me

	@computed get selectedShapeIds() {
		return this.state.record.selectedShapeIds
	}

	/**
	 * Select one or more shapes.
	 *
	 * @example
	 * ```ts
	 * editor.setSelectedShapeIds(['id1'])
	 * editor.setSelectedShapeIds(['id1', 'id2'])
	 * ```
	 *
	 * @param ids - The ids to select.
	 * @param squashing - Whether the change should create a new history entry or combine with the
	 *   previous (if the previous is the same type).
	 *
	 * @public
	 */
	setSelectedShapeIds(ids: TLShapeId[], squashing = false) {
		this.editor.setPageStateSelectedShapeIds(this.state.id, ids, squashing)
		return this
	}

	/**
	 * The shape id of the current focus layer. Null when the focus layer id is the current page.
	 *
	 * @public
	 */
	get focusedGroupId(): TLShapeId | TLPageId {
		return this.focusedGroupId ?? this.editor.page.id
	}

	setFocusedGroupId(next: TLShapeId | TLPageId): this {
		this.editor.setFocusedGroupId(next)
		return this
	}

	/**
	 * An array containing all of the currently selected shapes.
	 *
	 * @example
	 * ```ts
	 * editor.selectedShapes
	 * ```
	 *
	 * @public
	 * @readonly
	 */
	@computed get selectedShapes(): TLShape[] {
		const { selectedShapeIds } = this
		return compact(selectedShapeIds.map((id) => this.editor.store.get(id)))
	}

	/**
	 * The app's only selected shape.
	 *
	 * @example
	 * ```ts
	 * editor.onlySelectedShape
	 * ```
	 *
	 * @returns Null if there is no shape or more than one selected shape, otherwise the selected
	 *   shape.
	 *
	 * @public
	 * @readonly
	 */
	@computed get onlySelectedShape(): TLShape | null {
		const { selectedShapes } = this
		return selectedShapes.length === 1 ? selectedShapes[0] : null
	}

	/**
	 * The bounds of the selection bounding box.
	 *
	 * @readonly
	 * @public
	 */
	@computed get selectionBounds(): Box2d | undefined {
		const { selectedShapeIds } = this

		if (selectedShapeIds.length === 0) {
			return undefined
		}

		const { selectionRotation } = this
		if (selectionRotation === 0) {
			return this.selectedPageBounds!
		}

		if (selectedShapeIds.length === 1) {
			const bounds = this.editor.getGeometry(selectedShapeIds[0]).bounds.clone()
			bounds.point = Matrix2d.applyToPoint(
				this.editor.getPageTransform(selectedShapeIds[0])!,
				bounds.point
			)
			return bounds
		}

		// need to 'un-rotate' all the outlines of the existing nodes so we can fit them inside a box
		const allPoints = this.selectedShapeIds
			.flatMap((id) => {
				const pageTransform = this.editor.getPageTransform(id)
				if (!pageTransform) return []
				return pageTransform.applyToPoints(this.editor.getGeometry(id).vertices)
			})
			.map((p) => Vec2d.Rot(p, -selectionRotation))
		const box = Box2d.FromPoints(allPoints)
		// now position box so that it's top-left corner is in the right place
		box.point = box.point.rot(selectionRotation)
		return box
	}

	/**
	 * The current page bounds of all the selected shapes (Not the same thing as the page bounds of
	 * the selection bounding box when the selection has been rotated)
	 *
	 * @readonly
	 *
	 * @public
	 */
	@computed get selectedPageBounds(): Box2d | null {
		const { selectedShapeIds } = this

		if (selectedShapeIds.length === 0) return null

		return Box2d.Common(compact(selectedShapeIds.map((id) => this.editor.getPageBounds(id))))
	}

	/**
	 * The rotation of the selection bounding box.
	 *
	 * @readonly
	 * @public
	 */
	@computed get selectionRotation(): number {
		const { selectedShapeIds } = this
		if (selectedShapeIds.length === 0) {
			return 0
		}
		if (selectedShapeIds.length === 1) {
			return this.editor.getPageTransform(this.selectedShapeIds[0])!.rotation()
		}

		const allRotations = selectedShapeIds.map((id) => this.editor.getPageTransform(id)!.rotation())
		// if the rotations are all compatible with each other, return the rotation of any one of them
		if (allRotations.every((rotation) => Math.abs(rotation - allRotations[0]) < Math.PI / 180)) {
			return this.editor.getPageTransform(selectedShapeIds[0])!.rotation()
		}
		return 0
	}

	/**
	 * The center of the selection bounding box.
	 *
	 * @readonly
	 * @public
	 */
	@computed get selectionPageCenter() {
		const { selectionBounds, selectionRotation } = this
		if (!selectionBounds) return null
		return Vec2d.RotWith(selectionBounds.center, selectionBounds.point, selectionRotation)
	}

	/**
	 * The current viewport in page space.
	 *
	 * @public
	 */
	@computed get viewportPageBounds() {
		const { x, y, w, h } = this.editor.viewportScreenBounds
		const tl = this.screenToPage(x, y)
		const br = this.screenToPage(x + w, y + h)
		return new Box2d(tl.x, tl.y, br.x - tl.x, br.y - tl.y)
	}

	/**
	 * The center of the viewport in page space.
	 *
	 * @public
	 */
	@computed get viewportPageCenter() {
		return this.viewportPageBounds.center
	}

	/**
	 * Convert a point in screen space to a point in page space.
	 *
	 * @example
	 * ```ts
	 * editor.screenToPage(100, 100)
	 * ```
	 *
	 * @param x - The x coordinate of the point in screen space.
	 * @param y - The y coordinate of the point in screen space.
	 * @param camera - The camera to use. Defaults to the current camera.
	 *
	 * @public
	 */
	screenToPage(x: number, y: number, z = 0.5, camera: VecLike = this.camera) {
		const { screenBounds } = this.editor.store.unsafeGetWithoutCapture(TLINSTANCE_ID)!
		const { x: cx, y: cy, z: cz = 1 } = camera
		return {
			x: (x - screenBounds.x) / cz - cx,
			y: (y - screenBounds.y) / cz - cy,
			z,
		}
	}

	/**
	 * Convert a point in page space to a point in screen space.
	 *
	 * @example
	 * ```ts
	 * editor.pageToScreen(100, 100)
	 * ```
	 *
	 * @param x - The x coordinate of the point in screen space.
	 * @param y - The y coordinate of the point in screen space.
	 * @param camera - The camera to use. Defaults to the current camera.
	 *
	 * @public
	 */
	pageToScreen(x: number, y: number, z = 0.5, camera: VecLike = this.camera) {
		const { x: cx, y: cy, z: cz = 1 } = camera
		return {
			x: x + cx * cz,
			y: y + cy * cz,
			z,
		}
	}

	/**
	 * The current camera zoom level.
	 *
	 * @public
	 */
	@computed get zoomLevel() {
		return this.camera.z
	}

	/** @internal */
	private _willSetInitialBounds = true

	/** @internal */
	private _setCamera(x: number, y: number, z = this.camera.z): this {
		const currentCamera = this.camera
		if (currentCamera.x === x && currentCamera.y === y && currentCamera.z === z) return this
		const nextCamera = { ...currentCamera, x, y, z }

		transact(() => {
			this.editor.store.put([nextCamera])

			const { currentScreenPoint } = this.editor.inputs

			this.editor.dispatch({
				type: 'pointer',
				target: 'canvas',
				name: 'pointer_move',
				point: currentScreenPoint,
				pointerId: INTERNAL_POINTER_IDS.CAMERA_MOVE,
				ctrlKey: this.editor.inputs.ctrlKey,
				altKey: this.editor.inputs.altKey,
				shiftKey: this.editor.inputs.shiftKey,
				button: 0,
				isPen: this.editor.instanceState.isPenMode ?? false,
			})

			this._tickCameraState()
		})

		return this
	}

	/**
	 * Set the current camera.
	 *
	 * @example
	 * ```ts
	 * editor.setCamera(0, 0)
	 * editor.setCamera(0, 0, 1)
	 * ```
	 *
	 * @param x - The camera's x position.
	 * @param y - The camera's y position.
	 * @param z - The camera's z position. Defaults to the current zoom.
	 * @param options - Options for the camera change.
	 *
	 * @public
	 */
	setCamera(
		x: number,
		y: number,
		z = this.camera.z,
		{ stopFollowing = true }: TLViewportOptions = {}
	): this {
		this.stopCameraAnimation()
		if (stopFollowing && this.editor.instanceState.followingUserId) {
			this.stopFollowingUser()
		}
		x = Number.isNaN(x) ? 0 : x
		y = Number.isNaN(y) ? 0 : y
		z = Number.isNaN(z) ? 1 : z
		this._setCamera(x, y, z)
		return this
	}

	/**
	 * Animate the camera.
	 *
	 * @example
	 * ```ts
	 * editor.animateCamera(0, 0)
	 * editor.animateCamera(0, 0, 1)
	 * editor.animateCamera(0, 0, 1, { duration: 1000, easing: (t) => t * t })
	 * ```
	 *
	 * @param x - The camera's x position.
	 * @param y - The camera's y position.
	 * @param z - The camera's z position. Defaults to the current zoom.
	 * @param opts - Options for the animation.
	 *
	 * @public
	 */
	animateCamera(
		x: number,
		y: number,
		z = this.camera.z,
		opts: TLAnimationOptions = DEFAULT_ANIMATION_OPTIONS
	): this {
		x = Number.isNaN(x) ? 0 : x
		y = Number.isNaN(y) ? 0 : y
		z = Number.isNaN(z) ? 1 : z
		const { width, height } = this.editor.viewportScreenBounds
		const w = width / z
		const h = height / z

		const targetViewport = new Box2d(-x, -y, w, h)

		return this._animateToViewport(targetViewport, opts)
	}

	/**
	 * Center the camera on a point (in page space).
	 *
	 * @example
	 * ```ts
	 * editor.centerOnPoint(100, 100)
	 * ```
	 *
	 * @param x - The x position of the point.
	 * @param y - The y position of the point.
	 * @param opts - The options for an animation.
	 *
	 * @public
	 */
	centerOnPoint(x: number, y: number, opts?: TLAnimationOptions): this {
		if (!this.editor.instanceState.canMoveCamera) return this

		const {
			viewportPageBounds: { width: pw, height: ph },
			camera,
		} = this

		if (opts?.duration) {
			this.animateCamera(-(x - pw / 2), -(y - ph / 2), camera.z, opts)
		} else {
			this.setCamera(-(x - pw / 2), -(y - ph / 2), camera.z)
		}
		return this
	}

	/**
	 * Move the camera to the nearest content.
	 *
	 * @public
	 */
	zoomToContent() {
		const bounds = this.selectedPageBounds ?? this.commonBoundsOfAllShapesOnCurrentPage

		if (bounds) {
			this.zoomToBounds(
				bounds.minX,
				bounds.minY,
				bounds.width,
				bounds.height,
				Math.min(1, this.zoomLevel),
				{ duration: 220 }
			)
		}

		return this
	}

	/**
	 * Zoom the camera to fit the current page's content in the viewport.
	 *
	 * @example
	 * ```ts
	 * editor.zoomToFit()
	 * ```
	 *
	 * @public
	 */
	zoomToFit(opts?: TLAnimationOptions): this {
		if (!this.editor.instanceState.canMoveCamera) return this

		const ids = [...this.shapeIdsOnCurrentPage]
		if (ids.length <= 0) return this

		const pageBounds = Box2d.Common(compact(ids.map((id) => this.editor.getPageBounds(id))))
		this.zoomToBounds(
			pageBounds.minX,
			pageBounds.minY,
			pageBounds.width,
			pageBounds.height,
			undefined,
			opts
		)
		return this
	}

	/**
	 * Set the zoom back to 100%.
	 *
	 * @example
	 * ```ts
	 * editor.resetZoom()
	 * ```
	 *
	 * @param opts - The options for an animation.
	 *
	 * @public
	 */
	resetZoom(point = this.viewportScreenCenter, opts?: TLAnimationOptions): this {
		if (!this.editor.instanceState.canMoveCamera) return this

		const { x: cx, y: cy, z: cz } = this.camera
		const { x, y } = point
		if (opts?.duration) {
			this.animateCamera(cx + (x / 1 - x) - (x / cz - x), cy + (y / 1 - y) - (y / cz - y), 1, opts)
		} else {
			this.setCamera(cx + (x / 1 - x) - (x / cz - x), cy + (y / 1 - y) - (y / cz - y), 1)
		}

		return this
	}

	/**
	 * Zoom the camera in.
	 *
	 * @example
	 * ```ts
	 * editor.zoomIn()
	 * editor.zoomIn(editor.viewportScreenCenter, { duration: 120 })
	 * editor.zoomIn(editor.inputs.currentScreenPoint, { duration: 120 })
	 * ```
	 *
	 * @param opts - The options for an animation.
	 *
	 * @public
	 */
	zoomIn(point = this.viewportScreenCenter, opts?: TLAnimationOptions): this {
		if (!this.editor.instanceState.canMoveCamera) return this

		const { x: cx, y: cy, z: cz } = this.camera

		let zoom = MAX_ZOOM

		for (let i = 1; i < ZOOMS.length; i++) {
			const z1 = ZOOMS[i - 1]
			const z2 = ZOOMS[i]
			if (z2 - cz <= (z2 - z1) / 2) continue
			zoom = z2
			break
		}

		const { x, y } = point
		if (opts?.duration) {
			this.animateCamera(
				cx + (x / zoom - x) - (x / cz - x),
				cy + (y / zoom - y) - (y / cz - y),
				zoom,
				opts
			)
		} else {
			this.setCamera(cx + (x / zoom - x) - (x / cz - x), cy + (y / zoom - y) - (y / cz - y), zoom)
		}

		return this
	}

	/**
	 * Zoom the camera out.
	 *
	 * @example
	 * ```ts
	 * editor.zoomOut()
	 * editor.zoomOut(editor.viewportScreenCenter, { duration: 120 })
	 * editor.zoomOut(editor.inputs.currentScreenPoint, { duration: 120 })
	 * ```
	 *
	 * @param opts - The options for an animation.
	 *
	 * @public
	 */
	zoomOut(point = this.viewportScreenCenter, opts?: TLAnimationOptions): this {
		if (!this.editor.instanceState.canMoveCamera) return this

		const { x: cx, y: cy, z: cz } = this.camera

		let zoom = MIN_ZOOM

		for (let i = ZOOMS.length - 1; i > 0; i--) {
			const z1 = ZOOMS[i - 1]
			const z2 = ZOOMS[i]
			if (z2 - cz >= (z2 - z1) / 2) continue
			zoom = z1
			break
		}

		const { x, y } = point

		if (opts?.duration) {
			this.animateCamera(
				cx + (x / zoom - x) - (x / cz - x),
				cy + (y / zoom - y) - (y / cz - y),
				zoom,
				opts
			)
		} else {
			this.setCamera(cx + (x / zoom - x) - (x / cz - x), cy + (y / zoom - y) - (y / cz - y), zoom)
		}

		return this
	}

	/**
	 * Zoom the camera to fit the current selection in the viewport.
	 *
	 * @example
	 * ```ts
	 * editor.zoomToSelection()
	 * ```
	 *
	 * @param opts - The options for an animation.
	 *
	 * @public
	 */
	zoomToSelection(opts?: TLAnimationOptions): this {
		if (!this.editor.instanceState.canMoveCamera) return this

		const ids = this.selectedShapeIds
		if (ids.length <= 0) return this

		const selectedBounds = Box2d.Common(compact(ids.map((id) => this.editor.getPageBounds(id))))

		this.zoomToBounds(
			selectedBounds.minX,
			selectedBounds.minY,
			selectedBounds.width,
			selectedBounds.height,
			Math.max(1, this.camera.z),
			opts
		)

		return this
	}

	/**
	 * Pan or pan/zoom the selected ids into view. This method tries to not change the zoom if possible.
	 *
	 * @param ids - The ids of the shapes to pan and zoom into view.
	 * @param opts - The options for an animation.
	 *
	 * @public
	 */
	panZoomIntoView(ids: TLShapeId[], opts?: TLAnimationOptions): this {
		if (!this.editor.instanceState.canMoveCamera) return this

		if (ids.length <= 0) return this
		const selectedBounds = Box2d.Common(compact(ids.map((id) => this.editor.getPageBounds(id))))

		const { viewportPageBounds } = this

		if (viewportPageBounds.h < selectedBounds.h || viewportPageBounds.w < selectedBounds.w) {
			this.zoomToBounds(
				selectedBounds.minX,
				selectedBounds.minY,
				selectedBounds.width,
				selectedBounds.height,
				this.camera.z,
				opts
			)

			return this
		} else {
			const insetViewport = this.viewportPageBounds.clone().expandBy(-32 / this.zoomLevel)

			let offsetX = 0
			let offsetY = 0
			if (insetViewport.maxY < selectedBounds.maxY) {
				// off bottom
				offsetY = insetViewport.maxY - selectedBounds.maxY
			} else if (insetViewport.minY > selectedBounds.minY) {
				// off top
				offsetY = insetViewport.minY - selectedBounds.minY
			} else {
				// inside y-bounds
			}

			if (insetViewport.maxX < selectedBounds.maxX) {
				// off right
				offsetX = insetViewport.maxX - selectedBounds.maxX
			} else if (insetViewport.minX > selectedBounds.minX) {
				// off left
				offsetX = insetViewport.minX - selectedBounds.minX
			} else {
				// inside x-bounds
			}

			const { camera } = this

			if (opts?.duration) {
				this.animateCamera(camera.x + offsetX, camera.y + offsetY, camera.z, opts)
			} else {
				this.setCamera(camera.x + offsetX, camera.y + offsetY, camera.z)
			}
		}

		return this
	}

	/**
	 * Zoom the camera to fit a bounding box (in page space).
	 *
	 * @example
	 * ```ts
	 * editor.zoomToBounds(0, 0, 100, 100)
	 * ```
	 *
	 * @param x - The bounding box's x position.
	 * @param y - The bounding box's y position.
	 * @param width - The bounding box's width.
	 * @param height - The bounding box's height.
	 * @param targetZoom - The desired zoom level. Defaults to 0.1.
	 *
	 * @public
	 */
	zoomToBounds(
		x: number,
		y: number,
		width: number,
		height: number,
		targetZoom?: number,
		opts?: TLAnimationOptions
	): this {
		if (!this.editor.instanceState.canMoveCamera) return this

		const { viewportScreenBounds } = this

		const inset = Math.min(256, viewportScreenBounds.width * 0.28)

		let zoom = clamp(
			Math.min(
				(viewportScreenBounds.width - inset) / width,
				(viewportScreenBounds.height - inset) / height
			),
			MIN_ZOOM,
			MAX_ZOOM
		)

		if (targetZoom !== undefined) {
			zoom = Math.min(targetZoom, zoom)
		}

		if (opts?.duration) {
			this.animateCamera(
				-x + (viewportScreenBounds.width - width * zoom) / 2 / zoom,
				-y + (viewportScreenBounds.height - height * zoom) / 2 / zoom,
				zoom,
				opts
			)
		} else {
			this.setCamera(
				-x + (viewportScreenBounds.width - width * zoom) / 2 / zoom,
				-y + (viewportScreenBounds.height - height * zoom) / 2 / zoom,
				zoom
			)
		}

		return this
	}

	/**
	 * Pan the camera.
	 *
	 * @example
	 * ```ts
	 * editor.pan(100, 100)
	 * editor.pan(100, 100, { duration: 1000 })
	 * ```
	 *
	 * @param dx - The amount to pan on the x axis.
	 * @param dy - The amount to pan on the y axis.
	 * @param opts - The animation options
	 */
	pan(dx: number, dy: number, opts?: TLAnimationOptions): this {
		if (!this.editor.instanceState.canMoveCamera) return this

		const { camera } = this
		const { x: cx, y: cy, z: cz } = camera
		const d = new Vec2d(dx, dy).div(cz)

		if (opts?.duration ?? 0 > 0) {
			return this.animateCamera(cx + d.x, cy + d.y, cz, opts)
		} else {
			this.setCamera(cx + d.x, cy + d.y, cz)
		}

		return this
	}

	/**
	 * Stop the current camera animation, if any.
	 *
	 * @public
	 */
	stopCameraAnimation() {
		this.emit('stop-camera-animation')

		return this
	}

	/** @internal */
	private _viewportAnimation = null as null | {
		elapsed: number
		duration: number
		easing: (t: number) => number
		start: Box2d
		end: Box2d
	}

	/** @internal */
	private _animateViewport(ms: number) {
		if (!this._viewportAnimation) return

		const cancel = () => {
			this.removeListener('tick', this._animateViewport)
			this.removeListener('stop-camera-animation', cancel)
			this._viewportAnimation = null
		}

		this.once('stop-camera-animation', cancel)

		this._viewportAnimation.elapsed += ms

		const { elapsed, easing, duration, start, end } = this._viewportAnimation

		if (elapsed > duration) {
			const z = this.editor.viewportScreenBounds.width / end.width
			const x = -end.x
			const y = -end.y

			this._setCamera(x, y, z)
			cancel()
			return
		}

		const remaining = duration - elapsed
		const t = easing(1 - remaining / duration)

		const left = start.minX + (end.minX - start.minX) * t
		const top = start.minY + (end.minY - start.minY) * t
		const right = start.maxX + (end.maxX - start.maxX) * t
		const bottom = start.maxY + (end.maxY - start.maxY) * t

		const easedViewport = new Box2d(left, top, right - left, bottom - top)

		const z = this.editor.viewportScreenBounds.width / easedViewport.width
		const x = -easedViewport.x
		const y = -easedViewport.y

		this._setCamera(x, y, z)
	}

	/** @internal */
	private _animateToViewport(targetViewportPage: Box2d, opts = {} as TLAnimationOptions) {
		const { duration = 0, easing = EASINGS.easeInOutCubic } = opts
		const {
			user: { animationSpeed },
			viewportPageBounds,
		} = this

		// If we have an existing animation, then stop it; also stop following any user
		this.stopCameraAnimation()
		if (this.editor.instanceState.followingUserId) {
			this.stopFollowingUser()
		}

		if (duration === 0 || animationSpeed === 0) {
			// If we have no animation, then skip the animation and just set the camera
			return this._setCamera(
				-targetViewportPage.x,
				-targetViewportPage.y,
				this.editor.viewportScreenBounds.width / targetViewportPage.width
			)
		}

		// Set our viewport animation
		this._viewportAnimation = {
			elapsed: 0,
			duration: duration / animationSpeed,
			easing,
			start: viewportPageBounds.clone(),
			end: targetViewportPage,
		}

		// On each tick, animate the viewport
		this.addListener('tick', this._animateViewport)

		return this
	}

	/**
	 * Slide the camera in a certain direction.
	 *
	 * @param opts - Options for the slide
	 * @public
	 */
	slideCamera(
		opts = {} as {
			speed: number
			direction: VecLike
			friction: number
			speedThreshold?: number
		}
	) {
		if (!this.editor.instanceState.canMoveCamera) return this

		this.stopCameraAnimation()

		const { animationSpeed } = this.user

		if (animationSpeed === 0) return

		const { speed, friction, direction, speedThreshold = 0.01 } = opts
		let currentSpeed = Math.min(speed, 1)

		const cancel = () => {
			this.removeListener('tick', moveCamera)
			this.removeListener('stop-camera-animation', cancel)
		}

		this.once('stop-camera-animation', cancel)

		const moveCamera = (elapsed: number) => {
			const { x: cx, y: cy, z: cz } = this.camera
			const movementVec = Vec2d.Mul(direction, (currentSpeed * elapsed) / cz)

			// Apply friction
			currentSpeed *= 1 - friction
			if (currentSpeed < speedThreshold) {
				cancel()
			} else {
				this._setCamera(cx + movementVec.x, cy + movementVec.y, cz)
			}
		}

		this.addListener('tick', moveCamera)

		return this
	}

	/**
	 * Animate the camera to a user's cursor position.
	 * This also briefly show the user's cursor if it's not currently visible.
	 *
	 * @param userId - The id of the user to aniamte to.
	 * @public
	 */
	animateToUser(userId: string) {
		const presences = this.editor.store.query.records('instance_presence', () => ({
			userId: { eq: userId },
		}))

		const presence = [...presences.value]
			.sort((a, b) => {
				return a.lastActivityTimestamp - b.lastActivityTimestamp
			})
			.pop()

		if (!presence) return

		transact(() => {
			// If we're following someone, stop following them
			if (this.editor.instanceState.followingUserId !== null) {
				this.stopFollowingUser()
			}

			// If we're not on the same page, move to the page they're on
			const isOnSamePage = presence.currentPageId === this.currentPageId
			if (!isOnSamePage) {
				this.setCurrentPage(presence.currentPageId)
			}

			// Only animate the camera if the user is on the same page as us
			const options = isOnSamePage ? { duration: 500 } : undefined

			const position = presence.cursor

			this.centerOnPoint(position.x, position.y, options)

			// Highlight the user's cursor
			const { highlightedUserIds } = this.editor.instanceState
			this.updateInstanceState({ highlightedUserIds: [...highlightedUserIds, userId] })

			// Unhighlight the user's cursor after a few seconds
			setTimeout(() => {
				const highlightedUserIds = [...this.editor.instanceState.highlightedUserIds]
				const index = highlightedUserIds.indexOf(userId)
				if (index < 0) return
				highlightedUserIds.splice(index, 1)
				this.updateInstanceState({ highlightedUserIds })
			}, COLLABORATOR_IDLE_TIMEOUT)
		})
	}

	/**
	 * Animate the camera to a shape.
	 *
	 * @public
	 */
	animateToShape(shapeId: TLShapeId, opts: TLAnimationOptions = DEFAULT_ANIMATION_OPTIONS): this {
		if (!this.editor.instanceState.canMoveCamera) return this

		const activeArea = this.editor.viewportScreenBounds.clone().expandBy(-32)
		const viewportAspectRatio = activeArea.width / activeArea.height

		const shapePageBounds = this.editor.getPageBounds(shapeId)

		if (!shapePageBounds) return this

		const shapeAspectRatio = shapePageBounds.width / shapePageBounds.height

		const targetViewportPage = shapePageBounds.clone()

		const z = shapePageBounds.width / activeArea.width
		targetViewportPage.width += (activeArea.minX + activeArea.maxX) * z
		targetViewportPage.height += (activeArea.minY + activeArea.maxY) * z
		targetViewportPage.x -= activeArea.minX * z
		targetViewportPage.y -= activeArea.minY * z

		if (shapeAspectRatio > viewportAspectRatio) {
			targetViewportPage.height = shapePageBounds.width / viewportAspectRatio
			targetViewportPage.y -= (targetViewportPage.height - shapePageBounds.height) / 2
		} else {
			targetViewportPage.width = shapePageBounds.height * viewportAspectRatio
			targetViewportPage.x -= (targetViewportPage.width - shapePageBounds.width) / 2
		}

		return this._animateToViewport(targetViewportPage, opts)
	}

	// Camera state

	private _cameraState = atom('camera state', 'idle' as 'idle' | 'moving')

	/**
	 * Whether the camera is moving or idle.
	 *
	 * @public
	 */
	@computed get cameraState() {
		return this._cameraState.value
	}

	// Camera state does two things: first, it allows us to subscribe to whether
	// the camera is moving or not; and second, it allows us to update the rendering
	// shapes on the canvas. Changing the rendering shapes may cause shapes to
	// unmount / remount in the DOM, which is expensive; and computing visibility is
	// also expensive in large projects. For this reason, we use a second bounding
	// box just for rendering, and we only update after the camera stops moving.

	private _cameraStateTimeoutRemaining = 0
	private _lastUpdateRenderingBoundsTimestamp = Date.now()

	private _decayCameraStateTimeout = (elapsed: number) => {
		this._cameraStateTimeoutRemaining -= elapsed

		if (this._cameraStateTimeoutRemaining <= 0) {
			this.off('tick', this._decayCameraStateTimeout)
			this._cameraState.set('idle')
			this.updateRenderingBounds()
		}
	}

	private _tickCameraState = () => {
		// always reset the timeout
		this._cameraStateTimeoutRemaining = CAMERA_MOVING_TIMEOUT

		const now = Date.now()

		// If the state is idle, then start the tick
		if (this._cameraState.__unsafe__getWithoutCapture() === 'idle') {
			this._lastUpdateRenderingBoundsTimestamp = now // don't render right away
			this._cameraState.set('moving')
			this.on('tick', this._decayCameraStateTimeout)
		} else {
			if (now - this._lastUpdateRenderingBoundsTimestamp > CAMERA_MAX_RENDERING_INTERVAL) {
				this.updateRenderingBounds()
			}
		}
	}

	private computeUnorderedRenderingShapes(
		ids: TLParentId[],
		{
			renderingBounds,
			renderingBoundsExpanded,
			erasingShapeIdsSet,
			editingShapeId,
		}: {
			renderingBounds?: Box2d
			renderingBoundsExpanded?: Box2d
			erasingShapeIdsSet?: Set<TLShapeId>
			editingShapeId?: TLShapeId | null
		} = {}
	) {
		// Here we get the shape as well as any of its children, as well as their
		// opacities. If the shape is being erased, and none of its ancestors are
		// being erased, then we reduce the opacity of the shape and all of its
		// ancestors; but we don't apply this effect more than once among a set
		// of descendants so that it does not compound.

		// This is designed to keep all the shapes in a single list which
		// allows the DOM nodes to be reused even when they become children
		// of other nodes.

		const renderingShapes: {
			id: TLShapeId
			shape: TLShape
			util: ShapeUtil
			index: number
			backgroundIndex: number
			opacity: number
			isCulled: boolean
			isInViewport: boolean
			maskedPageBounds: Box2d | undefined
		}[] = []

		let nextIndex = MAX_SHAPES_PER_PAGE
		let nextBackgroundIndex = 0

		const addShapeById = (id: TLParentId, parentOpacity: number, isAncestorErasing: boolean) => {
			if (PageRecordType.isId(id)) {
				for (const childId of this.getSortedChildIdsForParent(id)) {
					addShapeById(childId, parentOpacity, isAncestorErasing)
				}
				return
			}

			const shape = this.getShape(id)
			if (!shape) return

			let opacity = shape.opacity * parentOpacity
			let isShapeErasing = false

			if (!isAncestorErasing && erasingShapeIdsSet?.has(id)) {
				isShapeErasing = true
				opacity *= 0.32
			}

			// If a child is outside of its parent's clipping bounds, then bounds will be undefined.
			const maskedPageBounds = this.getMaskedPageBounds(id)

			// Whether the shape is on screen. Use the "strict" viewport here.
			const isInViewport = maskedPageBounds
				? renderingBounds?.includes(maskedPageBounds) ?? true
				: false

			// Whether the shape should actually be culled / unmounted.
			// - Use the "expanded" rendering viewport to include shapes that are just off-screen.
			// - Editing shapes should never be culled.
			const isCulled = maskedPageBounds
				? (editingShapeId !== id && !renderingBoundsExpanded?.includes(maskedPageBounds)) ?? true
				: true

			const util = this.getShapeUtil(shape)

			renderingShapes.push({
				id,
				shape,
				util,
				index: nextIndex,
				backgroundIndex: nextBackgroundIndex,
				opacity,
				isCulled,
				isInViewport,
				maskedPageBounds,
			})

			nextIndex += 1
			nextBackgroundIndex += 1

			const childIds = this.getSortedChildIdsForParent(id)
			if (!childIds.length) return

			let backgroundIndexToRestore = null
			if (util.providesBackgroundForChildren(shape)) {
				backgroundIndexToRestore = nextBackgroundIndex
				nextBackgroundIndex = nextIndex
				nextIndex += MAX_SHAPES_PER_PAGE
			}

			for (const childId of childIds) {
				addShapeById(childId, opacity, isAncestorErasing || isShapeErasing)
			}

			if (backgroundIndexToRestore !== null) {
				nextBackgroundIndex = backgroundIndexToRestore
			}
		}

		for (const id of ids) {
			addShapeById(id, 1, false)
		}

		return renderingShapes
	}

	/**
	 * Get the shapes that should be displayed in the current viewport.
	 *
	 * @public
	 */
	@computed get renderingShapes() {
		const renderingShapes = this.computeUnorderedRenderingShapes([this.currentPageId], {
			renderingBounds: this.renderingBounds,
			renderingBoundsExpanded: this.renderingBoundsExpanded,
			erasingShapeIdsSet: this.erasingShapeIdsSet,
			editingShapeId: this.editingShapeId,
		})

		// Its IMPORTANT that the result be sorted by id AND include the index
		// that the shape should be displayed at. Steve, this is the past you
		// telling the present you not to change this.

		// We want to sort by id because moving elements about in the DOM will
		// cause the element to get removed by react as it moves the DOM node. This
		// causes <iframes/> to re-render which is hella annoying and a perf
		// drain. By always sorting by 'id' we keep the shapes always in the
		// same order; but we later use index to set the element's 'z-index'
		// to change the "rendered" position in z-space.
		return renderingShapes.sort(sortById)
	}

	/**
	 * The current rendering bounds in page space, used for checking which shapes are "on screen".
	 *
	 * @public
	 */
	@computed get renderingBounds() {
		return this._renderingBounds.value
	}

	/** @internal */
	private readonly _renderingBounds = atom('rendering viewport', new Box2d())

	/**
	 * The current rendering bounds in page space, expanded slightly. Used for determining which shapes
	 * to render and which to "cull".
	 *
	 * @public
	 */
	@computed get renderingBoundsExpanded() {
		return this._renderingBoundsExpanded.value
	}

	/** @internal */
	private readonly _renderingBoundsExpanded = atom('rendering viewport expanded', new Box2d())

	/**
	 * Update the rendering bounds. This should be called when the viewport has stopped changing, such
	 * as at the end of a pan, zoom, or animation.
	 *
	 * @example
	 * ```ts
	 * editor.updateRenderingBounds()
	 * ```
	 *
	 *
	 * @internal
	 */
	updateRenderingBounds(): this {
		const { viewportPageBounds } = this
		if (viewportPageBounds.equals(this._renderingBounds.__unsafe__getWithoutCapture())) return this
		this._renderingBounds.set(viewportPageBounds.clone())
		this._renderingBoundsExpanded.set(viewportPageBounds.clone().expandBy(100 / this.zoomLevel))
		return this
	}
}

function alertMaxShapes(editor: Editor, pageId = editor.currentPageId) {
	const name = editor.getPage(pageId)!.name
	editor.emit('max-shapes', { name, pageId, count: MAX_SHAPES_PER_PAGE })
}
