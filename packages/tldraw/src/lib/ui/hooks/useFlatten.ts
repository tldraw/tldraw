import {
	AssetRecordType,
	Box,
	Editor,
	IndexKey,
	TLImageAsset,
	TLImageShape,
	TLShapeId,
	Vec,
	createShapeId,
	isShapeId,
	transact,
	useEditor,
} from '@tldraw/editor'
import { useCallback } from 'react'

export async function flattenShapesToImages(
	editor: Editor,
	ids: TLShapeId[],
	flattenImageBoundsExpand?: number
) {
	if (ids.length === 0) return

	// Don't flatten if it's just one image
	if (ids.length === 1) {
		const shape = editor.getShape(ids[0])
		if (!shape) return
		if (editor.isShapeOfType(shape, 'image')) return
	}

	const groups: { ids: TLShapeId[]; bounds: Box; asset?: TLImageAsset }[] = []

	if (flattenImageBoundsExpand !== undefined) {
		const expandedBounds = ids.map((id) => {
			return {
				id,
				bounds: editor.getShapeMaskedPageBounds(id)!.clone().expandBy(flattenImageBoundsExpand),
			}
		})

		for (let i = 0; i < expandedBounds.length; i++) {
			const item = expandedBounds[i]
			if (i === 0) {
				groups[0] = {
					ids: [item.id],
					bounds: item.bounds,
				}
				continue
			}

			let didLand = false

			for (const group of groups) {
				if (group.bounds.includes(item.bounds)) {
					group.ids.push(item.id)
					group.bounds.expand(item.bounds)
					didLand = true
					break
				}
			}

			if (!didLand) {
				groups.push({
					ids: [item.id],
					bounds: item.bounds,
				})
			}
		}
	} else {
		const bounds = Box.Common(ids.map((id) => editor.getShapeMaskedPageBounds(id)!))
		groups.push({
			ids,
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
		const svgResult = await editor.getSvgString(group.ids, {
			padding,
		})
		if (!svgResult?.svg) continue

		// get an image asset for the image
		const blob = new Blob([svgResult.svg], { type: 'image/svg+xml' })
		const asset = (await editor.getAssetForExternalContent({
			type: 'file',
			file: new File([blob], 'asset.svg', { type: 'image/svg+xml' }),
		})) as TLImageAsset
		if (!asset) continue

		// add it to the group
		group.asset = asset
	}

	const shapeIds: TLShapeId[] = []

	transact(() => {
		for (const group of groups) {
			const { asset, bounds, ids } = group
			if (!asset) continue

			const assetId = AssetRecordType.createId()

			const commonAncestorId = editor.findCommonAncestor(ids) ?? editor.getCurrentPageId()
			if (!commonAncestorId) continue

			let index: IndexKey = 'a1' as IndexKey
			for (const id of ids) {
				const shape = editor.getShape(id)
				if (!shape) continue
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
			editor.deleteShapes(ids)

			// create the asset
			editor.createAssets([{ ...asset, id: assetId }])

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
					assetId,
					w: bounds.w + padding * 2,
					h: bounds.h + padding * 2,
				},
			})

			shapeIds.push(shapeId)
		}
	})

	return shapeIds
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
