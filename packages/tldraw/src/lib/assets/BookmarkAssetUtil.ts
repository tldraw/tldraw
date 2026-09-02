import {
	AssetUtil,
	TLBookmarkAsset,
	bookmarkAssetMigrations,
	bookmarkAssetProps,
} from '@tldraw/editor'

/** @public */
export class BookmarkAssetUtil extends AssetUtil<TLBookmarkAsset> {
	static override type = 'bookmark' as const
	static override props = bookmarkAssetProps
	static override migrations = bookmarkAssetMigrations

	override getDefaultProps(): TLBookmarkAsset['props'] {
		return {
			title: '',
			description: '',
			image: '',
			favicon: '',
			src: null,
		}
	}
}
