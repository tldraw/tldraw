import { Box2d, Vec2d } from '@tldraw/primitives'
import {
	TLAsset,
	TLImageShape,
	TLShapePartial,
	TLVideoShape,
	createShapeId,
} from '@tldraw/tlschema'
import { compact } from '@tldraw/utils'
import { Editor } from '../../editor/Editor'
import { TLCreateShapeFromInteractionInfo } from '../../editor/types/shape-create-types'
import { ACCEPTED_IMG_TYPE, ACCEPTED_VID_TYPE } from '../assets'

/** @internal */
export async function plopFiles(
	editor: Editor,
	{ point, files }: Extract<TLCreateShapeFromInteractionInfo, { type: 'files' }>
) {
	const position =
		point ?? (editor.inputs.shiftKey ? editor.inputs.currentPagePoint : editor.viewportPageCenter)

	const pagePoint = new Vec2d(position.x, position.y)

	const newAssetsForFiles = new Map<File, TLAsset>()

	const shapePartials = await Promise.all(
		files.map(async (file, i) => {
			// Use mime type instead of file ext, this is because
			// window.navigator.clipboard does not preserve file names
			// of copied files.
			if (!file.type) throw new Error('No mime type')

			// We can only accept certain extensions (either images or a videos)
			if (!ACCEPTED_IMG_TYPE.concat(ACCEPTED_VID_TYPE).includes(file.type)) {
				console.warn(`${file.name} not loaded - Extension not allowed.`)
				return null
			}

			try {
				const asset = await editor.onCreateAssetFromFile(file)

				if (asset.type === 'bookmark') return

				if (!asset) throw Error('Could not create an asset')

				newAssetsForFiles.set(file, asset)

				const shapePartial: TLShapePartial<TLImageShape | TLVideoShape> = {
					id: createShapeId(),
					type: asset.type,
					x: pagePoint.x + i,
					y: pagePoint.y,
					props: {
						w: asset.props!.w,
						h: asset.props!.h,
					},
				}

				return shapePartial
			} catch (error) {
				console.error(error)
				return null
			}
		})
	)

	// Filter any nullish values and sort the resulting models by x, so that the
	// left-most model is created first (and placed lowest in the z-order).
	const results = compact(shapePartials).sort((a, b) => a.x! - b.x!)

	if (results.length === 0) return

	// Adjust the placement of the models.
	for (let i = 0; i < results.length; i++) {
		const model = results[i]
		if (i === 0) {
			// The first shape is placed so that its center is at the dropping point
			model.x! -= model.props!.w! / 2
			model.y! -= model.props!.h! / 2
		} else {
			// Later models are placed to the right of the first shape
			const prevModel = results[i - 1]
			model.x = prevModel.x! + prevModel.props!.w!
			model.y = prevModel.y!
		}
	}

	const shapeUpdates = await Promise.all(
		files.map(async (file, i) => {
			const shape = results[i]
			if (!shape) return

			const asset = newAssetsForFiles.get(file)
			if (!asset) return

			// Does the asset collection already have a model with this id
			let existing: TLAsset | undefined = editor.getAssetById(asset.id)

			if (existing) {
				newAssetsForFiles.delete(file)

				if (shape.props) {
					shape.props.assetId = existing.id
				}

				return shape
			}

			existing = editor.getAssetBySrc(asset.props!.src!)

			if (existing) {
				if (shape.props) {
					shape.props.assetId = existing.id
				}

				return shape
			}

			// Create a new model for the new source file
			if (shape.props) {
				shape.props.assetId = asset.id
			}

			return shape
		})
	)

	const filteredUpdates = compact(shapeUpdates)

	editor.createAssets(compact([...newAssetsForFiles.values()]))
	editor.createShapes(filteredUpdates)
	editor.setSelectedIds(filteredUpdates.map((s) => s.id))

	const { selectedIds, viewportPageBounds } = editor

	const pageBounds = Box2d.Common(compact(selectedIds.map((id) => editor.getPageBoundsById(id))))

	if (pageBounds && !viewportPageBounds.contains(pageBounds)) {
		editor.zoomToSelection()
	}
}
