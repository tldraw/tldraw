// This module is part of the headless editor kernel. It must not import React or touch the DOM.
import { TLBinding, TLShape, TLShapeId, TLShapePartial } from '@tldraw/tlschema'
import { compact } from '@tldraw/utils'
import type { Editor } from '../../editor/Editor'
import { toShapeIds } from '../../editor/recordUtils'
import { TLShapeUtilCanBeLaidOutOpts } from '../../editor/shapes/ShapeUtil'
import { Box, BoxLike } from '../../primitives/Box'
import { Mat } from '../../primitives/Mat'
import { HALF_PI } from '../../primitives/utils'
import { Vec } from '../../primitives/Vec'

const AXIS = {
	horizontal: { val: 'x', min: 'minX', max: 'maxX', dim: 'width' },
	vertical: { val: 'y', min: 'minY', max: 'maxY', dim: 'height' },
} as const

/**
 * Lays out shapes: flip, stack, pack, align, distribute, stretch and resize to bounds. The
 * editor's methods of the same names use it. It respects `ShapeUtil.canBeLaidOut` and keeps shapes
 * that arrows connect together.
 *
 * @public
 */
export class ShapeArranger {
	constructor(private readonly editor: Editor) {}

	/**
	 * Shared clustering logic for layout methods. Resolves shapes, optionally filters to
	 * axis-aligned shapes, checks canBeLaidOut, and groups shapes into clusters via arrow bindings.
	 *
	 * @internal
	 */
	private getShapeClusters(
		shapes: TLShapeId[] | TLShape[],
		type: TLShapeUtilCanBeLaidOutOpts['type'],
		opts?: { filterAxisAligned?: boolean }
	): { clusters: { shapes: TLShape[]; pageBounds: Box }[]; allBounds: Box[] } {
		const ids = toShapeIds(shapes)

		// always fresh shapes
		let freshShapes = compact(ids.map((id) => this.editor.getShape(id)))

		// optionally filter to axis-aligned shapes (rotation is a multiple of 90 degrees)
		if (opts?.filterAxisAligned) {
			freshShapes = freshShapes.filter((s) => {
				// Page rotations come back through atan2 on a composed matrix, so a 270° shape can land
				// a hair either side of the multiple; an exact === 0 check drops it
				const remainder = Math.abs(this.editor.getShapePageTransform(s).rotation() % HALF_PI)
				return Math.min(remainder, HALF_PI - remainder) < 1e-9
			})
		}

		const clusters: { shapes: TLShape[]; pageBounds: Box }[] = []
		const allBounds: Box[] = []
		const visited = new Set<TLShapeId>()

		for (const shape of freshShapes) {
			if (visited.has(shape.id)) continue
			visited.add(shape.id)

			const shapePageBounds = this.editor.getShapePageBounds(shape)
			if (!shapePageBounds) continue

			if (
				!this.editor.getShapeUtil(shape).canBeLaidOut?.(shape, {
					type,
					shapes: freshShapes,
				})
			) {
				continue
			}

			const shapesMovingTogether = [shape]
			const boundsOfShapesMovingTogether: Box[] = [shapePageBounds]

			// Seed with bindings in both directions, otherwise an arrow visited before the shapes it
			// binds ends up in a cluster of its own and the result depends on input order
			this.collectShapesViaArrowBindings({
				bindings: this.editor.getBindingsInvolvingShape(shape.id, 'arrow'),
				initialShapes: freshShapes,
				resultShapes: shapesMovingTogether,
				resultBounds: boundsOfShapesMovingTogether,
				visited,
			})

			const commonPageBounds = Box.Common(boundsOfShapesMovingTogether)
			if (!commonPageBounds) continue

			clusters.push({
				shapes: shapesMovingTogether,
				pageBounds: commonPageBounds,
			})

			allBounds.push(commonPageBounds)
		}

		return { clusters, allBounds }
	}

	/**
	 * @internal
	 */
	private collectShapesViaArrowBindings(info: {
		initialShapes: TLShape[]
		resultShapes: TLShape[]
		resultBounds: Box[]
		bindings: TLBinding[]
		visited: Set<TLShapeId>
	}) {
		const { initialShapes, resultShapes, resultBounds, bindings, visited } = info
		for (const binding of bindings) {
			for (const id of [binding.fromId, binding.toId]) {
				if (!visited.has(id)) {
					const aligningShape = initialShapes.find((s) => s.id === id)
					if (aligningShape && !visited.has(aligningShape.id)) {
						visited.add(aligningShape.id)
						const shapePageBounds = this.editor.getShapePageBounds(aligningShape)
						if (!shapePageBounds) continue
						resultShapes.push(aligningShape)
						resultBounds.push(shapePageBounds)
						this.collectShapesViaArrowBindings({
							...info,
							bindings: this.editor.getBindingsInvolvingShape(aligningShape, 'arrow'),
						})
					}
				}
			}
		}
	}

	/**
	 * Flip shape positions.
	 *
	 * @example
	 * ```ts
	 * editor.flipShapes([box1, box2], 'horizontal', 32)
	 * editor.flipShapes(editor.getSelectedShapeIds(), 'horizontal', 32)
	 * ```
	 *
	 * @param shapes - The ids of the shapes to flip.
	 * @param operation - Whether to flip horizontally or vertically.
	 *
	 * @public
	 */
	flipShapes(shapes: TLShapeId[] | TLShape[], operation: 'horizontal' | 'vertical'): Editor {
		if (this.editor.getIsReadonly()) return this.editor

		const ids = toShapeIds(shapes)

		// Collect a greedy list of shapes to flip
		const shapesToFlipFirstPass = compact(ids.map((id) => this.editor.getShape(id)))

		for (const shape of shapesToFlipFirstPass) {
			if (this.editor.isShapeOfType(shape, 'group')) {
				const childrenOfGroups = compact(
					this.editor.getSortedChildIdsForParent(shape.id).map((id) => this.editor.getShape(id))
				)
				shapesToFlipFirstPass.push(...childrenOfGroups)
			}
		}

		// exclude shapes that can't be flipped
		const shapesToFlip: {
			shape: TLShape
			localBounds: Box
			pageTransform: Mat
			isAspectRatioLocked: boolean
		}[] = []

		const allBounds: Box[] = []

		for (const shape of shapesToFlipFirstPass) {
			const util = this.editor.getShapeUtil(shape)
			if (
				!util.canBeLaidOut(shape, {
					type: 'flip',
					shapes: shapesToFlipFirstPass,
				})
			) {
				continue
			}

			const pageBounds = this.editor.getShapePageBounds(shape)
			const localBounds = this.editor.getShapeGeometry(shape).bounds
			const pageTransform = this.editor.getShapePageTransform(shape.id)
			if (!(pageBounds && localBounds && pageTransform)) continue
			shapesToFlip.push({
				shape,
				localBounds,
				pageTransform,
				isAspectRatioLocked: util.isAspectRatioLocked(shape),
			})
			allBounds.push(pageBounds)
		}

		if (!shapesToFlip.length) return this.editor

		const scaleOriginPage = Box.Common(allBounds).center

		this.editor.run(() => {
			for (const { shape, localBounds, pageTransform, isAspectRatioLocked } of shapesToFlip) {
				this.editor.resizeShape(
					shape.id,
					{ x: operation === 'horizontal' ? -1 : 1, y: operation === 'vertical' ? -1 : 1 },
					{
						initialBounds: localBounds,
						initialPageTransform: pageTransform,
						initialShape: shape,
						isAspectRatioLocked,
						mode: 'scale_shape',
						scaleOrigin: scaleOriginPage,
						scaleAxisRotation: 0,
					}
				)
			}
		})

		return this.editor
	}

	/**
	 * Stack shape.
	 *
	 * @example
	 * ```ts
	 * editor.stackShapes([box1, box2], 'horizontal')
	 * editor.stackShapes(editor.getSelectedShapeIds(), 'horizontal')
	 * ```
	 *
	 * @param shapes - The shapes (or shape ids) to stack.
	 * @param operation - Whether to stack horizontally or vertically.
	 * @param gap - The gap to leave between shapes. By default, uses the editor's `adjacentShapeMargin` option.
	 *
	 * @public
	 */
	stackShapes(
		shapes: TLShapeId[] | TLShape[],
		operation: 'horizontal' | 'vertical',
		gap?: number
	): Editor {
		const _gap = gap ?? this.editor.options.adjacentShapeMargin
		if (this.editor.getIsReadonly()) return this.editor

		// todo: this.editor has a lot of extra code to handle stacking with custom gaps or auto gaps or other things like that. I don't think anyone has ever used this.editor stuff.

		const { clusters: shapeClustersToStack } = this.getShapeClusters(shapes, 'stack')

		const len = shapeClustersToStack.length
		if ((_gap === 0 && len < 3) || len < 2) return this.editor

		const { val, min, max, dim } = AXIS[operation]

		let shapeGap: number = 0

		// Stack in spatial order rather than input (z) order, otherwise shapes swap places
		shapeClustersToStack.sort((a, b) => a.pageBounds[min] - b.pageBounds[min])

		if (_gap === 0) {
			// note: this.editor is not used in the current tldraw.com; there we use a specified stack

			const gaps: Record<number, number> = {}

			// Collect all of the gaps between shapes. We want to find
			// patterns (equal gaps between shapes) and use the most common
			// one as the gap for all of the shapes.
			for (let i = 0; i < len - 1; i++) {
				const currCluster = shapeClustersToStack[i]
				const nextCluster = shapeClustersToStack[i + 1]
				const gap = nextCluster.pageBounds[min] - currCluster.pageBounds[max]
				if (!gaps[gap]) {
					gaps[gap] = 0
				}
				gaps[gap]++
			}

			// Which gap is the most common?
			let maxCount = 1
			for (const [gap, count] of Object.entries(gaps)) {
				if (count > maxCount) {
					maxCount = count
					shapeGap = parseFloat(gap)
				}
			}

			// If there is no most-common gap, use the average gap.
			if (maxCount === 1) {
				let totalCount = 0
				for (const [gap, count] of Object.entries(gaps)) {
					shapeGap += parseFloat(gap) * count
					totalCount += count
				}
				shapeGap /= totalCount
			}
		} else {
			// If a gap was provided, then use that instead.
			shapeGap = _gap
		}

		const changes: TLShapePartial[] = []

		let v = shapeClustersToStack[0].pageBounds[max]

		for (let i = 1; i < shapeClustersToStack.length; i++) {
			const { shapes, pageBounds } = shapeClustersToStack[i]
			const delta = new Vec()
			delta[val] = v + shapeGap - pageBounds[val]

			for (const shape of shapes) {
				changes.push(this.editor.getChangesToTranslateShapeByPageDelta(shape, delta))
			}

			v += pageBounds[dim] + shapeGap
		}

		this.editor.updateShapes(changes)
		return this.editor
	}

	/**
	 * Pack shapes into a grid centered on their current position. Based on potpack (https://github.com/mapbox/potpack).
	 *
	 * @example
	 * ```ts
	 * editor.packShapes([box1, box2])
	 * editor.packShapes(editor.getSelectedShapeIds(), 32)
	 * ```
	 *
	 *
	 * @param shapes - The shapes (or shape ids) to pack.
	 * @param gap - The padding to apply to the packed shapes. Defaults to the editor's `adjacentShapeMargin` option.
	 */
	packShapes(shapes: TLShapeId[] | TLShape[], _gap?: number): Editor {
		if (this.editor.getIsReadonly()) return this.editor

		const gap = _gap ?? this.editor.options.adjacentShapeMargin

		const { clusters, allBounds } = this.getShapeClusters(shapes, 'pack')

		const shapeClustersToPack = clusters.map((cluster) => ({
			...cluster,
			nextPageBounds: cluster.pageBounds.clone(),
		}))

		if (shapeClustersToPack.length < 2) return this.editor

		let area = 0
		for (const { pageBounds } of shapeClustersToPack) {
			area += pageBounds.width * pageBounds.height
		}

		const commonBounds = Box.Common(allBounds)

		const maxWidth = commonBounds.width

		// sort the shape clusters by width and then height, descending: potpack fills each row's
		// right-hand space with the shapes that follow, so they must be no taller than the row
		shapeClustersToPack
			.sort((a, b) => b.pageBounds.width - a.pageBounds.width)
			.sort((a, b) => b.pageBounds.height - a.pageBounds.height)

		// Start with is (sort of) the square of the area
		const startWidth = Math.max(Math.ceil(Math.sqrt(area / 0.95)), maxWidth)

		// first shape fills the width and is infinitely tall
		const spaces: Box[] = [new Box(commonBounds.x, commonBounds.y, startWidth, Infinity)]

		let width = 0
		let height = 0
		let space: Box
		let last: Box

		for (const { nextPageBounds } of shapeClustersToPack) {
			// starting at the back (smaller shapes)
			for (let i = spaces.length - 1; i >= 0; i--) {
				space = spaces[i]

				// find a space that is big enough to contain the shape
				if (nextPageBounds.width > space.width || nextPageBounds.height > space.height) continue

				// add the shape to its top-left corner
				nextPageBounds.x = space.x
				nextPageBounds.y = space.y

				height = Math.max(height, nextPageBounds.maxY)
				width = Math.max(width, nextPageBounds.maxX)

				if (nextPageBounds.width === space.width && nextPageBounds.height === space.height) {
					// remove the space on a perfect fit
					last = spaces.pop()!
					if (i < spaces.length) spaces[i] = last
				} else if (nextPageBounds.height === space.height) {
					// fit the shape into the space (width)
					space.x += nextPageBounds.width + gap
					space.width -= nextPageBounds.width + gap
				} else if (nextPageBounds.width === space.width) {
					// fit the shape into the space (height)
					space.y += nextPageBounds.height + gap
					space.height -= nextPageBounds.height + gap
				} else {
					// split the space into two spaces
					spaces.push(
						new Box(
							space.x + (nextPageBounds.width + gap),
							space.y,
							space.width - (nextPageBounds.width + gap),
							nextPageBounds.height
						)
					)
					space.y += nextPageBounds.height + gap
					space.height -= nextPageBounds.height + gap
				}
				break
			}
		}

		const commonAfter = Box.Common(shapeClustersToPack.map((s) => s.nextPageBounds))
		const centerDelta = Vec.Sub(commonBounds.center, commonAfter.center)

		const changes: TLShapePartial<any>[] = []

		for (const { shapes, pageBounds, nextPageBounds } of shapeClustersToPack) {
			const delta = Vec.Sub(nextPageBounds.point, pageBounds.point).add(centerDelta)

			for (const shape of shapes) {
				changes.push(this.editor.getChangesToTranslateShapeByPageDelta(shape, delta))
			}
		}

		if (changes.length) {
			this.editor.updateShapes(changes)
		}

		return this.editor
	}

	/**
	 * Align shape positions.
	 *
	 * @example
	 * ```ts
	 * editor.alignShapes([box1, box2], 'left')
	 * editor.alignShapes(editor.getSelectedShapeIds(), 'left')
	 * ```
	 *
	 * @param shapes - The shapes (or shape ids) to align.
	 * @param operation - The align operation to apply.
	 *
	 * @public
	 */
	alignShapes(
		shapes: TLShapeId[] | TLShape[],
		operation:
			| 'left'
			| 'center-horizontal'
			| 'right'
			| 'top'
			| 'center-vertical'
			| 'bottom'
			| 'center'
	): Editor {
		if (this.editor.getIsReadonly()) return this.editor
		if (operation === 'center') {
			return this.editor
				.alignShapes(shapes, 'center-horizontal')
				.alignShapes(shapes, 'center-vertical')
		}

		const { clusters: shapeClustersToAlign, allBounds } = this.getShapeClusters(shapes, 'align')

		if (shapeClustersToAlign.length < 2) return this.editor

		const commonBounds = Box.Common(allBounds)

		const changes: TLShapePartial[] = []

		shapeClustersToAlign.forEach(({ shapes, pageBounds }) => {
			const delta = new Vec()

			switch (operation) {
				case 'top': {
					delta.y = commonBounds.minY - pageBounds.minY
					break
				}
				case 'center-vertical': {
					delta.y = commonBounds.midY - pageBounds.minY - pageBounds.height / 2
					break
				}
				case 'bottom': {
					delta.y = commonBounds.maxY - pageBounds.minY - pageBounds.height
					break
				}
				case 'left': {
					delta.x = commonBounds.minX - pageBounds.minX
					break
				}
				case 'center-horizontal': {
					delta.x = commonBounds.midX - pageBounds.minX - pageBounds.width / 2
					break
				}
				case 'right': {
					delta.x = commonBounds.maxX - pageBounds.minX - pageBounds.width
					break
				}
			}

			for (const shape of shapes) {
				changes.push(this.editor.getChangesToTranslateShapeByPageDelta(shape, delta))
			}
		})

		this.editor.updateShapes(changes)
		return this.editor
	}

	/**
	 * Distribute shape positions.
	 *
	 * @example
	 * ```ts
	 * editor.distributeShapes([box1, box2], 'horizontal')
	 * editor.distributeShapes(editor.getSelectedShapeIds(), 'horizontal')
	 * ```
	 *
	 * @param shapes - The shapes (or shape ids) to distribute.
	 * @param operation - Whether to distribute shapes horizontally or vertically.
	 *
	 * @public
	 */
	distributeShapes(shapes: TLShapeId[] | TLShape[], operation: 'horizontal' | 'vertical'): Editor {
		if (this.editor.getIsReadonly()) return this.editor

		const { clusters: shapeClustersToDistribute } = this.getShapeClusters(shapes, 'distribute')

		if (shapeClustersToDistribute.length < 3) return this.editor

		const { val, min, max, dim } = AXIS[operation]
		const changes: TLShapePartial[] = []

		const first = shapeClustersToDistribute.sort((a, b) => a.pageBounds[min] - b.pageBounds[min])[0]
		const last = shapeClustersToDistribute.sort((a, b) => b.pageBounds[max] - a.pageBounds[max])[0]

		// If the first shape group is also the last shape group, distribute without it
		if (first === last) {
			const excludedShapeIds = new Set(first.shapes.map((s) => s.id))
			const ids = toShapeIds(shapes)
			return this.editor.distributeShapes(
				ids.filter((id) => !excludedShapeIds.has(id)),
				operation
			)
		}

		const shapeClustersToMove = shapeClustersToDistribute
			.filter((shape) => shape !== first && shape !== last)
			.sort((a, b) => {
				if (a.pageBounds[min] === b.pageBounds[min]) {
					return a.shapes[0].id < b.shapes[0].id ? -1 : 1
				}
				return a.pageBounds[min] - b.pageBounds[min]
			})

		// The gap is the amount of space "left over" between the first and last shape. This can be a negative number if the shapes are overlapping.
		const maxFirst = first.pageBounds[max]
		const range = last.pageBounds[min] - maxFirst
		const summedShapeDimensions = shapeClustersToMove.reduce((acc, s) => acc + s.pageBounds[dim], 0)
		const gap = (range - summedShapeDimensions) / (shapeClustersToMove.length + 1)

		for (let v = maxFirst + gap, i = 0; i < shapeClustersToMove.length; i++) {
			const { shapes, pageBounds } = shapeClustersToMove[i]
			const delta = new Vec()
			delta[val] = v - pageBounds[val]

			// If for some reason the new position would be more than the maximum, we need to adjust the delta
			// This will likely throw off some of the other placements but hey, it's better than changing the common bounds
			if (v + pageBounds[dim] > last.pageBounds[max] - 1) {
				delta[val] = last.pageBounds[max] - pageBounds[max] - 1
			}

			for (const shape of shapes) {
				changes.push(this.editor.getChangesToTranslateShapeByPageDelta(shape, delta))
			}

			v += pageBounds[dim] + gap
		}

		this.editor.updateShapes(changes)
		return this.editor
	}

	/**
	 * Stretch shape sizes and positions to fill their common bounding box.
	 *
	 * @example
	 * ```ts
	 * editor.stretchShapes([box1, box2], 'horizontal')
	 * editor.stretchShapes(editor.getSelectedShapeIds(), 'horizontal')
	 * ```
	 *
	 * @param shapes - The shapes (or shape ids) to stretch.
	 * @param operation - Whether to stretch shapes horizontally or vertically.
	 *
	 * @public
	 */
	stretchShapes(shapes: TLShapeId[] | TLShape[], operation: 'horizontal' | 'vertical'): Editor {
		if (this.editor.getIsReadonly()) return this.editor

		const { clusters: shapeClustersToStretch, allBounds } = this.getShapeClusters(
			shapes,
			'stretch',
			{ filterAxisAligned: true }
		)

		if (shapeClustersToStretch.length < 2) return this.editor

		const commonBounds = Box.Common(allBounds)
		const { val, min, dim } = AXIS[operation]

		this.editor.run(() => {
			shapeClustersToStretch.forEach(({ shapes, pageBounds }) => {
				const pageOffset = new Vec()
				pageOffset[val] = commonBounds[min] - pageBounds[min]

				const scaleOrigin = pageBounds.center.clone()
				scaleOrigin[val] = commonBounds[min]

				const scale = new Vec(1, 1)
				scale[val] = commonBounds[dim] / pageBounds[dim]

				for (const shape of shapes) {
					// First translate
					this.editor.updateShape(
						this.editor.getChangesToTranslateShapeByPageDelta(shape, pageOffset)
					)

					// Then resize
					this.editor.resizeShape(shape.id, scale, {
						initialBounds: this.editor.getShapeGeometry(shape).bounds,
						scaleOrigin,
						isAspectRatioLocked: this.editor.getShapeUtil(shape).isAspectRatioLocked(shape),
						scaleAxisRotation: 0,
					})
				}
			})
		})

		return this.editor
	}

	/**
	 * Resize and reposition a set of shapes so that their combined page bounds matches the given
	 * target bounds.
	 *
	 * @example
	 * ```ts
	 * editor.resizeToBounds([box1, box2], { x: 0, y: 0, w: 500, h: 500 })
	 * editor.resizeToBounds(editor.getSelectedShapeIds(), new Box(0, 0, 500, 500))
	 * ```
	 *
	 * @param shapes - The shapes (or shape ids) to resize.
	 * @param bounds - The target bounding box.
	 *
	 * @public
	 */
	resizeToBounds(shapes: TLShapeId[] | TLShape[], bounds: BoxLike): Editor {
		if (this.editor.getIsReadonly()) return this.editor

		const targetBounds = Box.From(bounds)

		const { clusters: shapeClusters, allBounds } = this.getShapeClusters(
			shapes,
			'resize_to_bounds',
			{ filterAxisAligned: true }
		)

		if (shapeClusters.length === 0) return this.editor

		const commonBounds = Box.Common(allBounds)
		if (!commonBounds) return this.editor
		if (commonBounds.width === 0 || commonBounds.height === 0) return this.editor

		const scaleX = targetBounds.width / commonBounds.width
		const scaleY = targetBounds.height / commonBounds.height
		const scale = new Vec(scaleX, scaleY)

		shapeClusters.forEach(({ shapes, pageBounds }) => {
			const pageOffset = new Vec(
				targetBounds.minX -
					commonBounds.minX +
					(pageBounds.minX - commonBounds.minX) * (scaleX - 1),
				targetBounds.minY - commonBounds.minY + (pageBounds.minY - commonBounds.minY) * (scaleY - 1)
			)

			const scaleOrigin = new Vec(
				targetBounds.minX + (pageBounds.minX - commonBounds.minX) * scaleX,
				targetBounds.minY + (pageBounds.minY - commonBounds.minY) * scaleY
			)

			for (const shape of shapes) {
				// First translate
				this.editor.updateShape(
					this.editor.getChangesToTranslateShapeByPageDelta(shape, pageOffset)
				)

				// Then resize
				this.editor.resizeShape(shape.id, scale, {
					initialBounds: this.editor.getShapeGeometry(shape).bounds,
					scaleOrigin,
					isAspectRatioLocked: this.editor.getShapeUtil(shape).isAspectRatioLocked(shape),
					scaleAxisRotation: 0,
				})
			}
		})

		return this.editor
	}
}
