import {
	Box,
	Editor,
	IndexKey,
	TLImageAsset,
	TLImageShape,
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

		for (let i = 0; i < expandedBounds.length; i++) {
			const item = expandedBounds[i]
			if (i === 0) {
				groups[0] = {
					shapes: [item.shape],
					bounds: item.bounds,
				}
				continue
			}

			let didLand = false

			for (const group of groups) {
				if (group.bounds.includes(item.bounds)) {
					group.shapes.push(item.shape)
					group.bounds.expand(item.bounds)
					didLand = true
					break
				}
			}

			if (!didLand) {
				groups.push({
					shapes: [item.shape],
					bounds: item.bounds,
				})
			}
		}
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
				if (shape.parentId === commonAncestorId) {
					if (shape.index > index) {
						index = shape.index
					}
					break
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
			editor.createShape<TLImageShape>({
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
