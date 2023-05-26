import { Migrator } from '@tldraw/tlstore'
import { T } from '@tldraw/tlvalidate'
import { TLBaseAsset, createAssetValidator } from './asset-validation'

/** @public */
export type TLBookmarkAsset = TLBaseAsset<
	'bookmark',
	{
		title: string
		description: string
		image: string
		src: string | null
	}
>

/** @public */
export const bookmarkAssetTypeMigrator = new Migrator()

/** @public */
export const bookmarkAssetTypeValidator = createAssetValidator<TLBookmarkAsset>(
	'bookmark',
	T.object({
		title: T.string,
		description: T.string,
		image: T.string,
		src: T.string.nullable(),
	})
)
