import { Migrator } from '@tldraw/tlstore'
import { TLBaseAsset } from './asset-validation'

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
export const bookmarkAssetMigrations = new Migrator({})
