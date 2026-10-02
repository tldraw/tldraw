import { TLShape, TLShapeId, TLShapePartial } from '@tldraw/tlschema'
import { compact } from '@tldraw/utils'
import { Box, BoxLike } from '../../../primitives/Box'
import { Mat } from '../../../primitives/Mat'
import { VecLike } from '../../../primitives/Vec'
import type { Editor } from '../../Editor'
import { toShapeIds } from '../../editorHelpers'
import {
	getAlignLayout,
	getDistributeLayout,
	getPackLayout,
	getResizeToBoundsLayout,
	getStackLayout,
	getStretchLayout,
} from '../../kernels/layout'
import { getShapeClusters } from '../../queries/shapeClusters'
import { EditorManager } from '../EditorManager'

/**
 * Arranging shapes relative to each other: align, distribute, stack, pack, flip, stretch and resize to bounds.
 *
 * @internal
 */
export class LayoutManager extends EditorManager {
	/**
	 * Shared clustering logic for layout methods. Resolves shapes, optionally filters to
	 * axis-aligned shapes, checks canBeLaidOut, and groups shapes into clusters via arrow bindings.
	 *
	 * @internal
	 */
	/** Layout kernels return a move per cluster; every shape in the cluster shifts by that delta. */
	getChangesToApplyLayoutMoves(
		moves: { item: { shapes: TLShape[] }; delta: VecLike }[]
	): TLShapePartial[] {
		const changes: TLShapePartial[] = []
		for (const { item, delta } of moves) {
			for (const shape of item.shapes) {
				changes.push(this.editor.getChangesToTranslateShapeByPageDelta(shape, delta))
			}
		}
		return changes
	}

	/**
	 * Layout kernels return a translation and a scale per cluster. Each shape moves before it
	 * resizes, so the resize measures geometry that is already in place.
	 */
	applyLayoutTransforms(
		transforms: {
			item: { shapes: TLShape[] }
			pageOffset: VecLike
			scaleOrigin: VecLike
			scale: VecLike
		}[]
	) {
		for (const { item, pageOffset, scaleOrigin, scale } of transforms) {
			for (const shape of item.shapes) {
				this.editor.updateShape(
					this.editor.getChangesToTranslateShapeByPageDelta(shape, pageOffset)
				)

				this.editor.resizeShape(shape.id, scale, {
					initialBounds: this.editor.getShapeGeometry(shape).bounds,
					scaleOrigin,
					isAspectRatioLocked: this.editor.getShapeUtil(shape).isAspectRatioLocked(shape),
					scaleAxisRotation: 0,
				})
			}
		}
	}

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

	stackShapes(
		shapes: TLShapeId[] | TLShape[],
		operation: 'horizontal' | 'vertical',
		gap?: number
	): Editor {
		const _gap = gap ?? this.editor.options.adjacentShapeMargin
		if (this.editor.getIsReadonly()) return this.editor

		// todo: this has a lot of extra code to handle stacking with custom gaps or auto gaps or other things like that. I don't think anyone has ever used this stuff.

		const { clusters: shapeClustersToStack } = getShapeClusters(
			this.editor,
			toShapeIds(shapes),
			'stack'
		)

		const len = shapeClustersToStack.length
		if ((_gap === 0 && len < 3) || len < 2) return this.editor

		const changes = this.getChangesToApplyLayoutMoves(
			getStackLayout(shapeClustersToStack, operation, _gap)
		)

		this.editor.updateShapes(changes)
		return this.editor
	}

	packShapes(shapes: TLShapeId[] | TLShape[], _gap?: number): Editor {
		if (this.editor.getIsReadonly()) return this.editor

		const gap = _gap ?? this.editor.options.adjacentShapeMargin

		const { clusters } = getShapeClusters(this.editor, toShapeIds(shapes), 'pack')

		if (clusters.length < 2) return this.editor

		const changes = this.getChangesToApplyLayoutMoves(getPackLayout(clusters, gap))

		if (changes.length) {
			this.editor.updateShapes(changes)
		}

		return this.editor
	}

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

		const { clusters: shapeClustersToAlign } = getShapeClusters(
			this.editor,
			toShapeIds(shapes),
			'align'
		)

		if (shapeClustersToAlign.length < 2) return this.editor

		const changes = this.getChangesToApplyLayoutMoves(
			getAlignLayout(shapeClustersToAlign, operation)
		)

		this.editor.updateShapes(changes)
		return this.editor
	}

	distributeShapes(shapes: TLShapeId[] | TLShape[], operation: 'horizontal' | 'vertical'): Editor {
		if (this.editor.getIsReadonly()) return this.editor

		const { clusters: shapeClustersToDistribute } = getShapeClusters(
			this.editor,
			toShapeIds(shapes),
			'distribute'
		)

		if (shapeClustersToDistribute.length < 3) return this.editor

		const layout = getDistributeLayout(
			shapeClustersToDistribute,
			operation,
			(cluster) => cluster.shapes[0].id
		)

		// If the first shape group is also the last shape group, distribute without it
		if (layout.type === 'excludes') {
			const excludedShapeIds = new Set(layout.excluded.shapes.map((s) => s.id))
			const ids = toShapeIds(shapes)
			return this.editor.distributeShapes(
				ids.filter((id) => !excludedShapeIds.has(id)),
				operation
			)
		}

		const changes = this.getChangesToApplyLayoutMoves(layout.moves)

		this.editor.updateShapes(changes)
		return this.editor
	}

	stretchShapes(shapes: TLShapeId[] | TLShape[], operation: 'horizontal' | 'vertical'): Editor {
		if (this.editor.getIsReadonly()) return this.editor

		const { clusters: shapeClustersToStretch } = getShapeClusters(
			this.editor,
			toShapeIds(shapes),
			'stretch',
			{
				filterAxisAligned: true,
			}
		)

		if (shapeClustersToStretch.length < 2) return this.editor

		this.editor.run(() => {
			this.applyLayoutTransforms(getStretchLayout(shapeClustersToStretch, operation))
		})

		return this.editor
	}

	resizeToBounds(shapes: TLShapeId[] | TLShape[], bounds: BoxLike): Editor {
		if (this.editor.getIsReadonly()) return this.editor

		const targetBounds = Box.From(bounds)

		const { clusters: shapeClusters } = getShapeClusters(
			this.editor,
			toShapeIds(shapes),
			'resize_to_bounds',
			{
				filterAxisAligned: true,
			}
		)

		if (shapeClusters.length === 0) return this.editor

		const transforms = getResizeToBoundsLayout(shapeClusters, targetBounds)
		if (!transforms) return this.editor

		this.applyLayoutTransforms(transforms)

		return this.editor
	}
}
