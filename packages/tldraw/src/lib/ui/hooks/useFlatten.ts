import {
	Box,
	Editor,
	IndexKey,
	TLImageAsset,
	TLShape,
	TLShapeId,
	Vec,
	compact,
	createShapeId,
	isShapeId,
	transact,
	useEditor,
} from '@tldraw/editor'
import { useCallback } from 'react'

export async function flattenShapesToImages(
	editor: Editor,
	shapeIds: TLShapeId[],
	flattenImageBoundsExpand?: number
) {
	const shapes = compact(
		shapeIds.map((id) => {
			const shape = editor.getShape(id)
			if (!shape) return
			const util = editor.getShapeUtil(shape.type)
			// skip shapes that don't have a toSvg method
			if (util.toSvg === undefined) return
			return shape
		})
	)

	if (shapes.length === 0) return

	// Don't flatten if it's just one image
	if (shapes.length === 1) {
		const shape = shapes[0]
		if (!shape) return
		if (editor.isShapeOfType(shape, 'image')) return
	}

	const groups: { shapes: TLShape[]; bounds: Box; asset?: TLImageAsset }[] = []

	if (flattenImageBoundsExpand !== undefined) {
		const expandedBounds = shapes.map((shape) => {
			return {
				shape,
				bounds: editor.getShapeMaskedPageBounds(shape)!.clone().expandBy(flattenImageBoundsExpand),
			}
		})

		// Cluster shapes by connected components: any two shapes whose expanded
		// bounds intersect end up in the same group. Using union-find here
		// instead of a greedy first-fit pass means the result is independent of
		// the order shapes appear in `shapeIds`, and a shape that bridges two
		// otherwise-disjoint clusters merges them in one pass.
		const parents = expandedBounds.map((_, i) => i)
		const find = (i: number): number => {
			let root = i
			while (parents[root] !== root) root = parents[root]
			while (parents[i] !== root) {
				const next = parents[i]
				parents[i] = root
				i = next
			}
			return root
		}
		const union = (i: number, j: number) => {
			const ri = find(i)
			const rj = find(j)
			if (ri !== rj) parents[ri] = rj
		}

		// Broad-phase sweep: sort by minX and, for each box, only compare against
		// later boxes until one starts past the current box's maxX. Boxes that
		// don't overlap on the x-axis can't intersect, so this skips the bulk of
		// the pairwise checks for spread-out selections while still finding every
		// intersecting pair (Box.includes is symmetric, so each pair is tested once).
		const order = expandedBounds
			.map((_, i) => i)
			.sort((a, b) => {
				return expandedBounds[a].bounds.minX - expandedBounds[b].bounds.minX
			})

		for (let a = 0; a < order.length; a++) {
			const i = order[a]
			const boundsI = expandedBounds[i].bounds
			for (let b = a + 1; b < order.length; b++) {
				const j = order[b]
				// sorted by minX, so once a box starts past i's maxX no later box can overlap i
				if (expandedBounds[j].bounds.minX > boundsI.maxX) break
				if (find(i) === find(j)) continue
				if (boundsI.includes(expandedBounds[j].bounds)) {
					union(i, j)
				}
			}
		}

		const groupsByRoot = new Map<number, { shapes: TLShape[]; bounds: Box }>()
		for (let i = 0; i < expandedBounds.length; i++) {
			const root = find(i)
			const item = expandedBounds[i]
			const existing = groupsByRoot.get(root)
			if (existing) {
				existing.shapes.push(item.shape)
				existing.bounds.expand(item.bounds)
			} else {
				groupsByRoot.set(root, {
					shapes: [item.shape],
					bounds: item.bounds.clone(),
				})
			}
		}

		groups.push(...groupsByRoot.values())
	} else {
		const bounds = Box.Common(shapes.map((shape) => editor.getShapeMaskedPageBounds(shape)!))
		groups.push({
			shapes,
			bounds,
		})
	}

	const padding = editor.options.flattenImageBoundsPadding

	for (const group of groups) {
		if (flattenImageBoundsExpand !== undefined) {
			// shrink the bounds again, removing the expanded area
			group.bounds.expandBy(-flattenImageBoundsExpand)
		}

		// get an image for the shapes
		const svgResult = await editor.getSvgString(group.shapes, {
			padding,
			background: false,
		})
		if (!svgResult?.svg) continue

		// get an image asset for the image
		const asset = (await editor.getAssetForExternalContent({
			type: 'file',
			file: new File([svgResult.svg], 'asset.svg', { type: 'image/svg+xml' }),
		})) as TLImageAsset
		if (!asset) continue

		// add it to the group
		group.asset = asset
	}

	const createdShapeIds: TLShapeId[] = []

	transact(() => {
		for (const group of groups) {
			const { asset, bounds, shapes } = group
			if (!asset) continue

			const commonAncestorId = editor.findCommonAncestor(shapes) ?? editor.getCurrentPageId()
			if (!commonAncestorId) continue

			let index: IndexKey = 'a1' as IndexKey
			for (const shape of shapes) {
				if (shape.parentId === commonAncestorId && shape.index > index) {
					index = shape.index
				}
			}

			let x: number
			let y: number
			let rotation: number

			if (isShapeId(commonAncestorId)) {
				const commonAncestor = editor.getShape(commonAncestorId)
				if (!commonAncestor) continue
				// put the point in the parent's space
				const point = editor.getPointInShapeSpace(commonAncestor, {
					x: bounds.x,
					y: bounds.y,
				})
				// get the parent's rotation
				rotation = editor.getShapePageTransform(commonAncestorId).rotation()
				// rotate the point against the parent's rotation
				point.sub(new Vec(padding, padding).rot(-rotation))
				x = point.x
				y = point.y
			} else {
				// if the common ancestor is the page, then just adjust for the padding
				x = bounds.x - padding
				y = bounds.y - padding
				rotation = 0
			}

			// delete the shapes
			editor.deleteShapes(shapes)

			// create the asset
			editor.createAssets([{ ...asset, id: asset.id }])

			const shapeId = createShapeId()

			// create an image shape in the same place as the shapes
			editor.createShape({
				id: shapeId,
				type: 'image',
				index,
				parentId: commonAncestorId,
				x,
				y,
				rotation: -rotation,
				props: {
					assetId: asset.id,
					w: bounds.w + padding * 2,
					h: bounds.h + padding * 2,
				},
			})

			createdShapeIds.push(shapeId)
		}
	})

	return createdShapeIds
}

export function useFlatten() {
	const editor = useEditor()
	return useCallback(
		(ids: TLShapeId[]) => {
			return flattenShapesToImages(editor, ids)
		},
		[editor]
	)
}
