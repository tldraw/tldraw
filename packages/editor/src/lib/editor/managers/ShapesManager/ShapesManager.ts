import type { Computed } from '@tldraw/state'
import { EMPTY_ARRAY, computed } from '@tldraw/state'
import { ComputedCache } from '@tldraw/store'
import {
	TLHandle,
	TLPage,
	TLPageId,
	TLParentId,
	TLShape,
	TLShapeId,
	TLShapePartial,
	isPageId,
	isShapeId,
} from '@tldraw/tlschema'
import {
	IndexKey,
	ZERO_INDEX_KEY,
	compact,
	getIndexAbove,
	getIndices,
	getIndicesAbove,
	getIndicesBetween,
	sortById,
	sortByIndex,
} from '@tldraw/utils'
import { Box } from '../../../primitives/Box'
import { Geometry2d } from '../../../primitives/geometry/Geometry2d'
import { intersectPolygonPolygon } from '../../../primitives/intersect'
import { Mat } from '../../../primitives/Mat'
import { Vec, VecLike } from '../../../primitives/Vec'
import { areShapesContentEqual } from '../../../utils/areShapesContentEqual'
import { notVisibleShapes } from '../../derivations/notVisibleShapes'
import type { Editor, TLRenderingShape } from '../../Editor'
import {
	RENDERING_SHAPES_SORT_CACHE_THRESHOLD,
	pushShapeWithDescendants,
	toShapeIds,
} from '../../editorHelpers'
import { getCulledShapeIds } from '../../kernels/culling'
import { getUnorderedRenderingShapes } from '../../queries/renderingShapes'
import { TLGeometryOpts } from '../../shapes/ShapeUtil'
import { EditorManager } from '../EditorManager'

/**
 * Reading shapes: lookup, geometry, transforms, bounds, masks, ancestry, child order, culling and rendering order.
 *
 * @public
 */
export class ShapesManager extends EditorManager {
	/** @internal */
	getUnorderedRenderingShapes(
		// The rendering state. We use this method both for rendering, which
		// is based on other state, and for computing order for SVG export,
		// which should work even when things are for example off-screen.
		useEditorState: boolean
	): TLRenderingShape[] {
		return getUnorderedRenderingShapes(this.editor, useEditorState)
	}

	/**
	 * Get the shapes that should be displayed in the current viewport.
	 *
	 * @example
	 * ```ts
	 * editor.getRenderingShapes()
	 * ```
	 *
	 * @public
	 */
	@computed getRenderingShapes() {
		const renderingShapes = this.editor.getUnorderedRenderingShapes(true)

		// Its IMPORTANT that the result be sorted by id AND include the index
		// that the shape should be displayed at. Steve, this is the past you
		// telling the present you not to change this.

		// We want to sort by id because moving elements about in the DOM will
		// cause the element to get removed by react as it moves the DOM node. This
		// causes <iframes/> to re-render which is hella annoying and a perf
		// drain. By always sorting by 'id' we keep the shapes always in the
		// same order; but we later use index to set the element's 'z-index'
		// to change the "rendered" position in z-space.

		// For small N, native Array.sort is fast enough that the cache
		// bookkeeping is a net loss. Only use the permutation cache when
		// there are enough shapes for sort cost to matter.
		if (renderingShapes.length <= RENDERING_SHAPES_SORT_CACHE_THRESHOLD) {
			this._renderingShapesSortCache = null
			return renderingShapes.sort(sortById)
		}

		// Sort permutation cache: when the set of ids on the page doesn't
		// change (e.g. while drawing a stroke, only props change), we can
		// reuse the previous sorted order and place each entry at its known
		// sorted position in O(N) instead of running Array.sort O(N log N).
		const cache = this._renderingShapesSortCache
		if (cache !== null && cache.size === renderingShapes.length) {
			const sorted = new Array<TLRenderingShape>(renderingShapes.length)
			let allMatched = true
			for (let i = 0; i < renderingShapes.length; i++) {
				const entry = renderingShapes[i]
				const pos = cache.get(entry.id)
				if (pos === undefined) {
					allMatched = false
					break
				}
				sorted[pos] = entry
			}
			if (allMatched) return sorted
		}

		// Slow path: full sort, then cache the permutation by id.
		renderingShapes.sort(sortById)
		const positionById = new Map<TLShapeId, number>()
		for (let i = 0; i < renderingShapes.length; i++) {
			positionById.set(renderingShapes[i].id, i)
		}
		this._renderingShapesSortCache = positionById
		return renderingShapes
	}

	_renderingShapesSortCache: Map<TLShapeId, number> | null = null

	/* --------------------- Shapes --------------------- */

	_shapeGeometryCaches: Record<string, ComputedCache<Geometry2d, TLShape>> = {}

	/**
	 * Get the geometry of a shape in shape-space.
	 *
	 * @example
	 * ```ts
	 * editor.getShapeGeometry(myShape)
	 * editor.getShapeGeometry(myShapeId)
	 * editor.getShapeGeometry(myShapeId, { context: "arrow" })
	 * ```
	 *
	 * @param shape - The shape (or shape id) to get the geometry for.
	 * @param opts - Additional options about the request for geometry. Passed to {@link ShapeUtil.getGeometry}.
	 *
	 * @public
	 */
	getShapeGeometry<T extends Geometry2d>(shape: TLShape | TLShapeId, opts?: TLGeometryOpts): T {
		const context = opts?.context ?? 'none'
		if (!this._shapeGeometryCaches[context]) {
			this._shapeGeometryCaches[context] = this.editor.store.createComputedCache(
				'bounds',
				(shape) => {
					this.editor.fonts.trackFontsForShape(shape)
					return this.editor.getShapeUtil(shape).getGeometry(shape, opts)
				},
				{ areRecordsEqual: areShapesContentEqual }
			)
		}
		return this._shapeGeometryCaches[context].get(
			typeof shape === 'string' ? shape : shape.id
		)! as T
	}

	/** @internal */
	@computed _getShapeHandlesCache(): ComputedCache<TLHandle[] | undefined, TLShape> {
		return this.editor.store.createComputedCache(
			'handles',
			(shape) => {
				return this.editor.getShapeUtil(shape).getHandles?.(shape)
			},
			{
				areRecordsEqual: areShapesContentEqual,
			}
		)
	}

	/**
	 * Get the handles (if any) for a shape.
	 *
	 * @example
	 * ```ts
	 * editor.getShapeHandles(myShape)
	 * editor.getShapeHandles(myShapeId)
	 * ```
	 *
	 * @param shape - The shape (or shape id) to get the handles for.
	 * @public
	 */
	getShapeHandles<T extends TLShape>(shape: T | T['id']): TLHandle[] | undefined {
		return this._getShapeHandlesCache().get(typeof shape === 'string' ? shape : shape.id)
	}

	/**
	 * Get the local transform for a shape as a matrix model. This transform reflects both its
	 * translation (x, y) from from either its parent's top left corner, if the shape's parent is
	 * another shape, or else from the 0,0 of the page, if the shape's parent is the page; and the
	 * shape's rotation.
	 *
	 * @example
	 * ```ts
	 * editor.getShapeLocalTransform(myShape)
	 * ```
	 *
	 * @param shape - The shape to get the local transform for.
	 *
	 * @public
	 */
	getShapeLocalTransform(shape: TLShape | TLShapeId): Mat {
		const id = typeof shape === 'string' ? shape : shape.id
		const freshShape = this.editor.getShape(id)
		if (!freshShape) throw Error('Editor.getTransform: shape not found')
		return Mat.Identity().translate(freshShape.x, freshShape.y).rotate(freshShape.rotation)
	}

	/**
	 * A cache of page transforms.
	 *
	 * @internal
	 */
	@computed _getShapePageTransformCache(): ComputedCache<Mat, TLShape> {
		return this.editor.store.createComputedCache<Mat, TLShape>('pageTransformCache', (shape) => {
			if (isPageId(shape.parentId)) {
				return this.editor.getShapeLocalTransform(shape)
			}

			// If the shape's parent doesn't exist yet (e.g. when merging in changes from remote in the wrong order)
			// then we can't compute the transform yet, so just return the identity matrix.
			// In the future we should look at creating a store update mechanism that understands and preserves
			// ordering.
			const parentTransform =
				this._getShapePageTransformCache().get(shape.parentId) ?? Mat.Identity()
			return Mat.Compose(parentTransform, this.editor.getShapeLocalTransform(shape)!)
		})
	}

	/**
	 * Get the local transform of a shape's parent as a matrix model.
	 *
	 * @example
	 * ```ts
	 * editor.getShapeParentTransform(myShape)
	 * ```
	 *
	 * @param shape - The shape (or shape id) to get the parent transform for.
	 *
	 * @public
	 */
	getShapeParentTransform(shape: TLShape | TLShapeId): Mat {
		const id = typeof shape === 'string' ? shape : shape.id
		const freshShape = this.editor.getShape(id)
		if (!freshShape || isPageId(freshShape.parentId)) return Mat.Identity()
		return this._getShapePageTransformCache().get(freshShape.parentId) ?? Mat.Identity()
	}

	/**
	 * Get the transform of a shape in the current page space.
	 *
	 * @example
	 * ```ts
	 * editor.getShapePageTransform(myShape)
	 * editor.getShapePageTransform(myShapeId)
	 * ```
	 *
	 * @param shape - The shape (or shape id) to get the page transform for.
	 *
	 * @public
	 */
	getShapePageTransform(shape: TLShape | TLShapeId): Mat {
		const id = typeof shape === 'string' ? shape : shape.id
		return this._getShapePageTransformCache().get(id) ?? Mat.Identity()
	}

	/** @internal */
	@computed _getShapePageBoundsCache(): ComputedCache<Box, TLShape> {
		return this.editor.store.createComputedCache<Box, TLShape>('pageBoundsCache', (shape) => {
			return Box.FromPoints(
				this.editor
					.getShapePageTransform(shape)
					.applyToPoints(this.editor.getShapeGeometry(shape).boundsVertices)
			)
		})
	}

	/**
	 * Get the bounds of a shape in the current page space.
	 *
	 * @example
	 * ```ts
	 * editor.getShapePageBounds(myShape)
	 * editor.getShapePageBounds(myShapeId)
	 * ```
	 *
	 * @param shape - The shape (or shape id) to get the bounds for.
	 *
	 * @public
	 */
	getShapePageBounds(shape: TLShape | TLShapeId): Box | undefined {
		return this._getShapePageBoundsCache().get(typeof shape === 'string' ? shape : shape.id)
	}

	/**
	 * A cache of clip paths used for clipping.
	 *
	 * @internal
	 */
	@computed _getShapeClipPathCache(): ComputedCache<string, TLShape> {
		return this.editor.store.createComputedCache<string, TLShape>('clipPathCache', (shape) => {
			const pageMask = this._getShapeMaskCache().get(shape.id)
			if (!pageMask) return undefined
			if (pageMask.length === 0) {
				return `polygon(0px 0px, 0px 0px, 0px 0px)`
			}

			const pageTransform = this._getShapePageTransformCache().get(shape.id)
			if (!pageTransform) return undefined

			const localMask = Mat.applyToPoints(Mat.Inverse(pageTransform), pageMask)

			return `polygon(${localMask.map((p) => `${p.x}px ${p.y}px`).join(',')})`
		})
	}

	/**
	 * Get the clip path for a shape.
	 *
	 * @example
	 * ```ts
	 * const clipPath = editor.getShapeClipPath(shape)
	 * const clipPath = editor.getShapeClipPath(shape.id)
	 * ```
	 *
	 * @param shape - The shape (or shape id) to get the clip path for.
	 *
	 * @returns The clip path or undefined.
	 *
	 * @public
	 */
	getShapeClipPath(shape: TLShape | TLShapeId): string | undefined {
		return this._getShapeClipPathCache().get(typeof shape === 'string' ? shape : shape.id)
	}

	/** @internal */
	@computed _getShapeMaskCache(): ComputedCache<Vec[], TLShape> {
		return this.editor.store.createComputedCache('pageMaskCache', (shape) => {
			if (isPageId(shape.parentId)) return undefined

			const clipPaths: Vec[][] = []
			// Get all ancestors that can potentially clip this shape
			for (const ancestor of this.editor.getShapeAncestors(shape.id)) {
				const util = this.editor.getShapeUtil(ancestor)
				const clipPath = util.getClipPath?.(ancestor)
				if (!clipPath) continue
				if (util.shouldClipChild?.(shape) === false) continue
				const pageTransform = this.editor.getShapePageTransform(ancestor.id)
				clipPaths.push(pageTransform.applyToPoints(clipPath))
			}
			if (clipPaths.length === 0) return undefined

			const pageMask = clipPaths.reduce((acc, b) => {
				const intersection = intersectPolygonPolygon(acc, b)
				if (intersection) {
					return intersection.map(Vec.Cast)
				}
				return []
			})

			return pageMask
		})
	}

	/**
	 * Get the mask (in the current page space) for a shape.
	 *
	 * @example
	 * ```ts
	 * const pageMask = editor.getShapeMask(shape.id)
	 * ```
	 *
	 * @param shape - The shape (or the shape id) of the shape to get the mask for.
	 *
	 * @returns The mask for the shape.
	 *
	 * @public
	 */
	getShapeMask(shape: TLShapeId | TLShape): VecLike[] | undefined {
		return this._getShapeMaskCache().get(typeof shape === 'string' ? shape : shape.id)
	}

	/**
	 * Get the bounds of a shape in the current page space, incorporating any masks. For example, if the
	 * shape were the child of a frame and was half way out of the frame, the bounds would be the half
	 * of the shape that was in the frame.
	 *
	 * @example
	 * ```ts
	 * editor.getShapeMaskedPageBounds(myShape)
	 * editor.getShapeMaskedPageBounds(myShapeId)
	 * ```
	 *
	 * @param shape - The shape to get the masked bounds for.
	 *
	 * @public
	 */
	getShapeMaskedPageBounds(shape: TLShapeId | TLShape): Box | undefined {
		if (typeof shape !== 'string') shape = shape.id
		return this._getShapeMaskedPageBoundsCache().get(shape)
	}

	/** @internal */
	@computed _getShapeMaskedPageBoundsCache(): ComputedCache<Box, TLShape> {
		return this.editor.store.createComputedCache('shapeMaskedPageBoundsCache', (shape) => {
			const pageBounds = this._getShapePageBoundsCache().get(shape.id)
			if (!pageBounds) return
			const pageMask = this._getShapeMaskCache().get(shape.id)
			if (pageMask) {
				if (pageMask.length === 0) return undefined
				const { corners } = pageBounds
				// the mask may have fewer than four points (e.g. a triangular clip path)
				if (
					pageMask.length === corners.length &&
					corners.every((p, i) => Vec.Equals(p, pageMask[i]))
				) {
					return pageBounds.clone()
				}
				const intersection = intersectPolygonPolygon(pageMask, corners)
				if (!intersection) return
				return Box.FromPoints(intersection)
			}
			return pageBounds
		})
	}

	/**
	 * Get the ancestors of a shape.
	 *
	 * @example
	 * ```ts
	 * const ancestors = editor.getShapeAncestors(myShape)
	 * const ancestors = editor.getShapeAncestors(myShapeId)
	 * ```
	 *
	 * @param shape - The shape (or shape id) to get the ancestors for.
	 * @param acc - The accumulator.
	 *
	 * @public
	 */
	getShapeAncestors(shape: TLShapeId | TLShape, acc: TLShape[] = []): TLShape[] {
		const id = typeof shape === 'string' ? shape : shape.id
		const freshShape = this.editor.getShape(id)
		if (!freshShape) return acc
		const parentId = freshShape.parentId
		if (isPageId(parentId)) {
			acc.reverse()
			return acc
		}

		const parent = this.editor.store.get(parentId)
		if (!parent) return acc
		acc.push(parent)
		return this.editor.getShapeAncestors(parent, acc)
	}

	/**
	 * Find the first ancestor matching the given predicate
	 *
	 * @example
	 * ```ts
	 * const ancestor = editor.findShapeAncestor(myShape)
	 * const ancestor = editor.findShapeAncestor(myShape.id)
	 * const ancestor = editor.findShapeAncestor(myShape.id, (shape) => shape.type === 'frame')
	 * ```
	 *
	 * @param shape - The shape to check the ancestors for.
	 * @param predicate - The predicate to match.
	 *
	 * @public
	 */
	findShapeAncestor(
		shape: TLShape | TLShapeId,
		predicate: (parent: TLShape) => boolean
	): TLShape | undefined {
		const id = typeof shape === 'string' ? shape : shape.id
		const freshShape = this.editor.getShape(id)
		if (!freshShape) return

		const parentId = freshShape.parentId
		if (isPageId(parentId)) return

		const parent = this.editor.getShape(parentId)
		if (!parent) return
		return predicate(parent) ? parent : this.editor.findShapeAncestor(parent, predicate)
	}

	/**
	 * Returns true if the the given shape has the given ancestor.
	 *
	 * @param shape - The shape.
	 * @param ancestorId - The id of the ancestor.
	 *
	 * @public
	 */
	hasAncestor(shape: TLShape | TLShapeId | undefined, ancestorId: TLShapeId): boolean {
		const id = typeof shape === 'string' ? shape : shape?.id
		const freshShape = id && this.editor.getShape(id)
		if (!freshShape) return false
		if (freshShape.parentId === ancestorId) return true
		return this.editor.hasAncestor(this.editor.getShapeParent(freshShape), ancestorId)
	}

	/**
	 * Get the common ancestor of two or more shapes that matches a predicate.
	 *
	 * @param shapes - The shapes (or shape ids) to check.
	 * @param predicate - The predicate to match.
	 */
	findCommonAncestor(
		shapes: TLShape[] | TLShapeId[],
		predicate?: (shape: TLShape) => boolean
	): TLShapeId | undefined {
		if (shapes.length === 0) {
			return
		}

		const ids = toShapeIds(shapes)
		const freshShapes = compact(ids.map((id) => this.editor.getShape(id)))

		if (freshShapes.length === 1) {
			const parentId = freshShapes[0].parentId
			if (isPageId(parentId)) {
				return
			}
			return predicate ? this.editor.findShapeAncestor(freshShapes[0], predicate)?.id : parentId
		}

		const [nodeA, ...others] = freshShapes
		let ancestor = this.editor.getShapeParent(nodeA)
		while (ancestor) {
			// TODO: this is not ideal, optimize
			if (predicate && !predicate(ancestor)) {
				ancestor = this.editor.getShapeParent(ancestor)
				continue
			}
			if (others.every((shape) => this.editor.hasAncestor(shape, ancestor!.id))) {
				return ancestor!.id
			}
			ancestor = this.editor.getShapeParent(ancestor)
		}
		return undefined
	}

	/**
	 * Check whether a shape or its parent is locked.
	 *
	 * @param shape - The shape (or shape id) to check.
	 *
	 * @public
	 */
	isShapeOrAncestorLocked(shape?: TLShape | TLShapeId): boolean {
		const _shape = shape && this.editor.getShape(shape)
		if (_shape === undefined) return false
		if (_shape.isLocked) return true
		return this.editor.isShapeOrAncestorLocked(this.editor.getShapeParent(_shape))
	}

	/**
	 * Get shapes that are outside of the viewport.
	 *
	 * @public
	 */
	@computed
	getNotVisibleShapes() {
		return this._notVisibleShapes.get()
	}

	_notVisibleShapes = notVisibleShapes(this.editor)
	_culledShapesCache: Set<TLShapeId> | null = null

	/**
	 * Get culled shapes (those that should not render), taking into account which shapes are selected or editing.
	 *
	 * @public
	 */
	@computed
	getCulledShapes() {
		const notVisibleShapes = this.editor.getNotVisibleShapes()
		const selectedShapeIds = this.editor.getSelectedShapeIds()
		const editingId = this.editor.getEditingShapeId()

		const culled = getCulledShapeIds(
			notVisibleShapes,
			selectedShapeIds,
			editingId,
			this._culledShapesCache
		)
		this._culledShapesCache = culled
		return culled
	}

	/**
	 * The bounds of the current page (the common bounds of all of the shapes on the page).
	 *
	 * @public
	 */
	@computed getCurrentPageBounds(): Box | undefined {
		let commonBounds: Box | undefined

		this.editor.getCurrentPageShapeIdsSorted().forEach((shapeId) => {
			if (this.editor.isShapeHidden(shapeId)) return
			const bounds = this.editor.getShapeMaskedPageBounds(shapeId)
			if (!bounds) return
			if (!commonBounds) {
				commonBounds = bounds.clone()
			} else {
				commonBounds = commonBounds.expand(bounds)
			}
		})

		return commonBounds
	}

	/**
	 * Get the hit-test margin in page space—the distance in page units within which a pointer is
	 * considered to be touching a shape. This resolves to {@link TldrawOptions.hitTestMargin} (or
	 * {@link TldrawOptions.coarseHitTestMargin} when using a coarse pointer) divided by the current
	 * zoom level, so it stays a constant distance in screen space.
	 *
	 * @returns The hit-test margin in page space.
	 *
	 * @public
	 */
	@computed getHitTestMargin(): number {
		const { hitTestMargin, coarseHitTestMargin } = this.editor.options
		const margin = this.editor.getInstanceState().isCoarsePointer
			? coarseHitTestMargin
			: hitTestMargin
		return margin / this.editor.getZoomLevel()
	}

	/**
	 * Convert a point in the current page space to a point in the local space of a shape. For example, if a
	 * shape's page point were `{ x: 100, y: 100 }`, a page point at `{ x: 110, y: 110 }` would be at
	 * `{ x: 10, y: 10 }` in the shape's local space.
	 *
	 * @example
	 * ```ts
	 * editor.getPointInShapeSpace(myShape, { x: 100, y: 100 })
	 * ```
	 *
	 * @param shape - The shape to get the point in the local space of.
	 * @param point - The page point to get in the local space of the shape.
	 *
	 * @public
	 */
	getPointInShapeSpace(shape: TLShape | TLShapeId, point: VecLike): Vec {
		const id = typeof shape === 'string' ? shape : shape.id
		return this._getShapePageTransformCache().get(id)!.clone().invert().applyToPoint(point)
	}

	/**
	 * Convert a delta in the current page space to a point in the local space of a shape's parent.
	 *
	 * @example
	 * ```ts
	 * editor.getPointInParentSpace(myShape.id, { x: 100, y: 100 })
	 * ```
	 *
	 * @param shape - The shape to get the point in the local space of.
	 * @param point - The page point to get in the local space of the shape.
	 *
	 * @public
	 */
	getPointInParentSpace(shape: TLShapeId | TLShape, point: VecLike): Vec {
		const id = typeof shape === 'string' ? shape : shape.id
		const freshShape = this.editor.getShape(id)
		if (!freshShape) return new Vec(0, 0)
		if (isPageId(freshShape.parentId)) return Vec.From(point)

		return this.editor
			.getShapePageTransform(freshShape.parentId)
			.clone()
			.invert()
			.applyToPoint(point)
	}

	/**
	 * An array containing all of the shapes in the current page.
	 *
	 * @public
	 */
	@computed getCurrentPageShapes(): TLShape[] {
		return Array.from(
			this.editor.getCurrentPageShapeIds(),
			(id) => this.editor.store.get(id)! as TLShape
		)
	}

	/**
	 * An array containing all of the shapes in the current page, sorted in z-index order (accounting
	 * for nested shapes): e.g. A, B, BA, BB, C.
	 *
	 * @public
	 */
	@computed getCurrentPageShapesSorted(): TLShape[] {
		const result: TLShape[] = []
		const topLevelShapes = this.editor.getSortedChildIdsForParent(this.editor.getCurrentPageId())

		for (let i = 0, n = topLevelShapes.length; i < n; i++) {
			pushShapeWithDescendants(this.editor, topLevelShapes[i], result)
		}

		return result
	}

	/**
	 * An array containing all of the rendering shapes in the current page, sorted in z-index order (accounting
	 * for nested shapes): e.g. A, B, BA, BB, C.
	 *
	 * @public
	 */
	@computed getCurrentPageRenderingShapesSorted(): TLShape[] {
		const culledShapes = this.editor.getCulledShapes()
		return this.editor
			.getCurrentPageShapesSorted()
			.filter(({ id }) => !culledShapes.has(id) && !this.editor.isShapeHidden(id))
	}

	/**
	 * Get whether a shape matches the type of a TLShapeUtil.
	 *
	 * @example
	 * ```ts
	 * const isArrowShape = isShapeOfType(someShape, 'arrow')
	 * ```
	 *
	 * @param util - the TLShapeUtil constructor to test against
	 * @param shape - the shape to test
	 *
	 * @public
	 */
	isShapeOfType<K extends TLShape['type']>(
		shape: TLShape,
		type: K
	): shape is Extract<TLShape, { type: K }>
	isShapeOfType<T extends TLShape>(
		shape: TLShape,
		type: T['type']
	): shape is Extract<TLShape, { type: T['type'] }>
	isShapeOfType<T extends TLShape = TLShape>(shapeId: TLShapeId, type: T['type']): boolean
	isShapeOfType(arg: TLShape | TLShapeId, type: TLShape['type']) {
		const shape = typeof arg === 'string' ? this.editor.getShape(arg) : arg
		if (!shape) return false
		return shape.type === type
	}

	/**
	 * Get whether a shape behaves like a frame — a container that has child
	 * shapes, requires full-brush selection, blocks erasure from inside, etc.
	 *
	 * @example
	 * ```ts
	 * const isFrameLike = editor.isShapeFrameLike(someShape)
	 * ```
	 *
	 * @param shape - The shape (or shape id) to test.
	 *
	 * @public
	 */
	isShapeFrameLike(shape: TLShape | TLShapeId): boolean {
		const _shape = typeof shape === 'string' ? this.editor.getShape(shape) : shape
		if (!_shape) return false
		return this.editor.getShapeUtil(_shape).isFrameLike(_shape)
	}

	/**
	 * Get a shape by its id.
	 *
	 * @example
	 * ```ts
	 * editor.getShape('box1')
	 * ```
	 *
	 * @param shape - The shape (or the id of the shape) to get.
	 *
	 * @public
	 */
	getShape<T extends TLShape = TLShape>(shape: TLShape | TLParentId): T | undefined {
		const id = typeof shape === 'string' ? shape : shape.id
		if (!isShapeId(id)) return undefined
		return this.editor.store.get(id) as T
	}

	/**
	 * Get the parent shape for a given shape. Returns undefined if the shape is the direct child of
	 * the page.
	 *
	 * @example
	 * ```ts
	 * editor.getShapeParent(myShape)
	 * ```
	 *
	 * @public
	 */
	getShapeParent(shape?: TLShape | TLShapeId): TLShape | undefined {
		const id = typeof shape === 'string' ? shape : shape?.id
		if (!id) return undefined
		const freshShape = this.editor.getShape(id)
		if (freshShape === undefined || !isShapeId(freshShape.parentId)) return undefined
		return this.editor.getShape(freshShape.parentId)
	}

	/**
	 * If siblingShape and targetShape are siblings, this returns targetShape. If targetShape has an
	 * ancestor who is a sibling of siblingShape, this returns that ancestor. Otherwise, this returns
	 * undefined.
	 *
	 * @internal
	 */
	getShapeNearestSibling(
		siblingShape: TLShape,
		targetShape: TLShape | undefined
	): TLShape | undefined {
		if (!targetShape) {
			return undefined
		}
		if (targetShape.parentId === siblingShape.parentId) {
			return targetShape
		}

		const ancestor = this.editor.findShapeAncestor(
			targetShape,
			(ancestor) => ancestor.parentId === siblingShape.parentId
		)

		return ancestor
	}

	/**
	 * Get whether the given shape is the descendant of the given page.
	 *
	 * @example
	 * ```ts
	 * editor.isShapeInPage(myShape)
	 * editor.isShapeInPage(myShape, 'page1')
	 * ```
	 *
	 * @param shape - The shape to check.
	 * @param pageId - The id of the page to check against. Defaults to the current page.
	 *
	 * @public
	 */
	isShapeInPage(shape: TLShape | TLShapeId, pageId = this.editor.getCurrentPageId()): boolean {
		return this.editor.getAncestorPageId(shape) === pageId
	}

	/**
	 * Get the id of the containing page for a given shape.
	 *
	 * @param shape - The shape to get the page id for.
	 *
	 * @returns The id of the page that contains the shape, or undefined if the shape is undefined.
	 *
	 * @public
	 */
	getAncestorPageId(shape?: TLShape | TLShapeId): TLPageId | undefined {
		const id = typeof shape === 'string' ? shape : shape?.id
		const _shape = id && this.editor.getShape(id)
		if (!_shape) return undefined
		if (isPageId(_shape.parentId)) {
			return _shape.parentId
		} else {
			return this.editor.getAncestorPageId(this.editor.getShape(_shape.parentId))
		}
	}

	// Parents and children

	/**
	 * A cache of parents to children.
	 *
	 * @internal
	 */
	_parentIdsToChildIds!: Computed<Record<TLParentId, TLShapeId[]>>

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
	 * @param insertIndex - The index to insert the children.
	 *
	 * @public
	 */
	reparentShapes(shapes: TLShapeId[] | TLShape[], parentId: TLParentId, insertIndex?: IndexKey) {
		const ids = toShapeIds(shapes)
		if (ids.length === 0) return this.editor

		const changes: TLShapePartial[] = []

		const parentTransform = isPageId(parentId)
			? Mat.Identity()
			: this.editor.getShapePageTransform(parentId)!

		const parentPageRotation = parentTransform.rotation()

		let indices: IndexKey[] = []

		const sibs = compact(
			this.editor.getSortedChildIdsForParent(parentId).map((id) => this.editor.getShape(id))
		)

		if (insertIndex) {
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
				const sibAbove = sibs.sort(sortByIndex).find((s) => s.index > insertIndex)

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

		const shapesToReparent = compact(ids.map((id) => this.editor.getShape(id))).sort(sortByIndex)

		// Ignore locked shapes so that we can reparent locked shapes, for example
		// when a locked shape's parent is deleted.
		this.editor.run(
			() => {
				for (let i = 0; i < shapesToReparent.length; i++) {
					const shape = shapesToReparent[i]

					const pageTransform = this.editor.getShapePageTransform(shape)
					const newPoint = invertedParentTransform.applyToPoint(pageTransform.point())
					const newRotation = pageTransform.rotation() - parentPageRotation

					if (shape.id === parentId) {
						throw Error('Attempted to reparent a shape to itself!')
					}

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
			},
			{ ignoreShapeLock: true }
		)

		return this.editor
	}

	/**
	 * Get the index above the highest child of a given parent.
	 *
	 * @param parent - The parent (or the id) of the parent.
	 *
	 * @returns The index.
	 *
	 * @public
	 */
	getHighestIndexForParent(parent: TLParentId | TLPage | TLShape): IndexKey {
		const parentId = typeof parent === 'string' ? parent : parent.id
		const children = this._parentIdsToChildIds.get()[parentId]

		if (!children || children.length === 0) {
			return getIndexAbove(ZERO_INDEX_KEY)
		}
		const shape = this.editor.getShape(children[children.length - 1])!
		return getIndexAbove(shape.index)
	}

	/**
	 * Get an array of all the children of a shape.
	 *
	 * @example
	 * ```ts
	 * editor.getSortedChildIdsForParent('frame1')
	 * ```
	 *
	 * @param parent - The parent (or the id) of the parent shape.
	 *
	 * @public
	 */
	getSortedChildIdsForParent(parent: TLParentId | TLPage | TLShape): TLShapeId[] {
		const parentId = typeof parent === 'string' ? parent : parent.id
		const ids = this._parentIdsToChildIds.get()[parentId]
		if (!ids) return EMPTY_ARRAY
		return ids
	}

	/**
	 * Run a visitor function for all descendants of a shape.
	 *
	 * @example
	 * ```ts
	 * editor.visitDescendants('frame1', myCallback)
	 * ```
	 *
	 * @param parent - The parent (or the id) of the parent shape.
	 * @param visitor - The visitor function.
	 *
	 * @public
	 */
	visitDescendants(
		parent: TLParentId | TLPage | TLShape,
		visitor: (id: TLShapeId) => void | false
	): Editor {
		const children = this.editor.getSortedChildIdsForParent(parent)
		for (const id of children) {
			if (visitor(id) === false) continue
			this.editor.visitDescendants(id, visitor)
		}
		return this.editor
	}

	/**
	 * Get the shape ids of all descendants of the given shapes (including the shapes themselves). IDs are returned in z-index order.
	 *
	 * @param ids - The ids of the shapes to get descendants of.
	 *
	 * @returns The descendant ids.
	 *
	 * @public
	 */
	getShapeAndDescendantIds(ids: TLShapeId[]): Set<TLShapeId> {
		const shapeIds = new Set<TLShapeId>()
		for (const shape of compact(ids.map((id) => this.editor.getShape(id))).sort(sortByIndex)) {
			shapeIds.add(shape.id)
			this.editor.visitDescendants(shape, (descendantId) => {
				shapeIds.add(descendantId)
			})
		}
		return shapeIds
	}

	/**
	 * Get the shape that should be selected when you click on a given shape, assuming there is
	 * nothing already selected. It will not return anything higher than or including the current
	 * focus layer.
	 *
	 * @param shape - The shape to get the outermost selectable shape for.
	 * @param filter - A function to filter the selectable shapes.
	 *
	 * @returns The outermost selectable shape.
	 *
	 * @public
	 */
	getOutermostSelectableShape(
		shape: TLShape | TLShapeId,
		filter?: (shape: TLShape) => boolean
	): TLShape {
		const id = typeof shape === 'string' ? shape : shape.id
		const freshShape = this.editor.getShape(id)!
		let match = freshShape
		let node = freshShape as TLShape | undefined

		const focusedGroup = this.editor.getFocusedGroup()

		while (node) {
			if (
				this.editor.isShapeOfType(node, 'group') &&
				focusedGroup?.id !== node.id &&
				!this.editor.hasAncestor(focusedGroup, node.id) &&
				(filter?.(node) ?? true)
			) {
				match = node
			} else if (focusedGroup?.id === node.id) {
				break
			}
			node = this.editor.getShapeParent(node)
		}

		return match
	}
}
