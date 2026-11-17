import { getThumbnailForColorMode, type TLLibraryThumbnail } from '@tldraw/libraries'
import type { Editor, TLAssetId } from 'tldraw'

/**
 * Whether an asset is the thumbnail of an item in one of the board's own libraries. Such an item
 * is listed, naming its thumbnail's assets, before they upload.
 */
export function isBoardLibraryThumbnail(editor: Editor, assetId: TLAssetId) {
	return editor.store.allRecords().some((record) => {
		const typeName: string = record.typeName
		if (typeName !== 'library-item') return false
		const { thumbnail } = record as { thumbnail?: TLLibraryThumbnail<TLAssetId> }
		if (!thumbnail) return false
		return (
			getThumbnailForColorMode(thumbnail, 'light') === assetId ||
			getThumbnailForColorMode(thumbnail, 'dark') === assetId
		)
	})
}
