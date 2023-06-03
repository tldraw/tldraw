import { defineMigrations } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { createAssetValidator, TLBaseAsset } from './TLBaseAsset'

/**
 * An asset used for URL bookmarks, used by the TLBookmarkShape.
 *
 *  @public */
export type TLBookmarkAsset = TLBaseAsset<
	'bookmark',
	{
		title: string
		description: string
		image: string
		src: string | null
	}
>

/** @internal */
export const bookmarkAssetValidator: T.Validator<TLBookmarkAsset> = createAssetValidator(
	'bookmark',
	T.object({
		title: T.string,
		description: T.string,
		image: T.string,
		src: T.string.nullable(),
	})
)

/** @internal */
export const bookmarkAssetMigrations = defineMigrations({})
