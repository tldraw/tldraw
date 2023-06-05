import { defineMigrations } from '@tldraw/store'

import { object, string, TypeValidator } from '@tldraw/validate'
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
export const bookmarkAssetValidator: TypeValidator<TLBookmarkAsset> = createAssetValidator(
	'bookmark',
	object({
		title: string,
		description: string,
		image: string,
		src: string.nullable(),
	})
)

/** @internal */
export const bookmarkAssetMigrations = defineMigrations({})
