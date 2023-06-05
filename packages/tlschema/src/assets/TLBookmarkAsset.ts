import { defineMigrations } from '@tldraw/store'

import { objectValidator, stringValidator, TypeValidator } from '@tldraw/validate'
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
	objectValidator({
		title: stringValidator,
		description: stringValidator,
		image: stringValidator,
		src: stringValidator.nullable(),
	})
)

/** @internal */
export const bookmarkAssetMigrations = defineMigrations({})
