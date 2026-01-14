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
			if (util.toSvg === undefined) return
			return shape
		})
	)

	if (shapes.length === 0) return

	if (shapes.length === 1) {
		const shape = shapes[0]
		if (!shape) return
		if (editor.isShapeOfType(shape, 'image')) return
	}

	class UnionFind {
		private parent: number[]
		private rank: number[]

		constructor(size: number) {
			this.parent = Array.from({ length: size }, (_, i) => i)
			this.rank = Array(size).fill(0)
		}

		find(x: number): number {
			if (this.parent[x] !== x) {
				this.parent[x] = this.find(this.parent[x])
			}
			return this.parent[x]
		}

		union(x: number, y: number): void {
			const rootX = this.find(x)
			const rootY = this.find(y)
			if (rootX !== rootY) {
				if (this.rank[rootX] < this.rank[rootY]) {
					this.parent[rootX] = rootY
				} else if (this.rank[rootX] > this.rank[rootY]) {
					this.parent[rootY] = rootX
				} else {
					this.parent[rootY] = rootX
					this.rank[rootX]++
				}
			}
		}
	}

	const groups: { shapes: TLShape[]; bounds: Box; asset?: TLImageAsset }[] = []

	if (flattenImageBoundsExpand !== undefined) {
		const expandedBounds = shapes.map((shape) => ({
			shape,
			bounds: editor.getShapeMaskedPageBounds(shape)!.clone().expandBy(flattenImageBoundsExpand),
		}))

		const uf = new UnionFind(expandedBounds.length)

		for (let i = 0; i < expandedBounds.length; i++) {
			for (let j = i + 1; j < expandedBounds.length; j++) {
				if (Box.Collides(expandedBounds[i].bounds, expandedBounds[j].bounds)) {
					uf.union(i, j)
				}
			}
		}

		const shapeGroups = new Map<number, TLShape[]>()
		for (let i = 0; i < expandedBounds.length; i++) {
			const root = uf.find(i)
			if (!shapeGroups.has(root)) {
				shapeGroups.set(root, [])
			}
			shapeGroups.get(root)!.push(expandedBounds[i].shape)
		}

		for (const shapeList of Array.from(shapeGroups.values())) {
			const groupBounds = Box.Common(shapeList.map((shape) => editor.getShapeMaskedPageBounds(shape)!))
			groups.push({
				shapes: shapeList,
				bounds: groupBounds,
			})
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
			group.bounds.expandBy(-flattenImageBoundsExpand)
		}

		const svgResult = await editor.getSvgString(group.shapes, {
			padding,
			background: false,
		})
		if (!svgResult?.svg) continue

		const asset = (await editor.getAssetForExternalContent({
			type: 'file',
			file: new File([svgResult.svg], 'asset.svg', { type: 'image/svg+xml' }),
		})) as TLImageAsset
		if (!asset) continue

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
				const point = editor.getPointInShapeSpace(commonAncestor, {
					x: bounds.x,
					y: bounds.y,
				})
				rotation = editor.getShapePageTransform(commonAncestorId).rotation()
				point.sub(new Vec(padding, padding).rot(-rotation))
				x = point.x
				y = point.y
			} else {
				x = bounds.x - padding
				y = bounds.y - padding
				rotation = 0
			}

			editor.deleteShapes(shapes)

			editor.createAssets([{ ...asset, id: asset.id }])

			const shapeId = createShapeId()
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
