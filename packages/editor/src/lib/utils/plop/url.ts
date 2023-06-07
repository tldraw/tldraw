import { AssetRecordType, TLAssetId, TLBookmarkAsset, createShapeId } from '@tldraw/tlschema'
import { getHashForString } from '@tldraw/utils'
import { Editor } from '../../editor/Editor'
import { TLCreateShapeFromInteractionInfo } from '../../editor/types/shape-create-types'
import { getEmbedInfo } from '../embeds'

/** @internal */
export async function plopUrl(
	editor: Editor,
	{ point, url }: Extract<TLCreateShapeFromInteractionInfo, { type: 'url' }>
) {
	// try to paste as an embed first
	const embedInfo = getEmbedInfo(url)

	if (embedInfo) {
		return editor.onCreateShapeFromSource({
			type: 'embed',
			url: embedInfo.url,
			point,
			embed: embedInfo.definition,
		})
	}

	const position =
		point ?? (editor.inputs.shiftKey ? editor.inputs.currentPagePoint : editor.viewportPageCenter)

	// otherwise, try to paste as a bookmark
	const assetId: TLAssetId = AssetRecordType.createId(getHashForString(url))
	const existing = editor.getAssetById(assetId) as TLBookmarkAsset

	if (existing) {
		editor.createShapes([
			{
				id: createShapeId(),
				type: 'bookmark',
				x: position.x - 150,
				y: position.y - 160,
				opacity: 1,
				props: {
					assetId: existing.id,
					url: existing.props.src!,
				},
			},
		])
		return
	}

	editor.batch(async () => {
		const shapeId = createShapeId()

		editor.createShapes(
			[
				{
					id: shapeId,
					type: 'bookmark',
					x: position.x,
					y: position.y,
					opacity: 1,
					props: {
						url: url,
					},
				},
			],
			true
		)

		const meta = await editor.onCreateBookmarkFromUrl(url)

		if (meta) {
			editor.createAssets([
				{
					id: assetId,
					typeName: 'asset',
					type: 'bookmark',
					props: {
						src: url,
						description: meta.description,
						image: meta.image,
						title: meta.title,
					},
				},
			])

			editor.updateShapes([
				{
					id: shapeId,
					type: 'bookmark',
					opacity: 1,
					props: {
						assetId: assetId,
					},
				},
			])
		}
	})
}
