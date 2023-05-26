import { createRecordType, ID, Migrator } from '@tldraw/tlstore'
import { T } from '@tldraw/tlvalidate'
import { TLBaseAsset } from '../assets/asset-validation'
import { bookmarkAssetTypeValidator, TLBookmarkAsset } from '../assets/TLBookmarkAsset'
import { imageAssetTypeValidator, TLImageAsset } from '../assets/TLImageAsset'
import { TLVideoAsset, videoAssetTypeValidator } from '../assets/TLVideoAsset'
import { TLShape } from './TLShape'

/** @public */
export type TLAsset = TLImageAsset | TLVideoAsset | TLBookmarkAsset

/** @public */
export type TLAssetPartial<T extends TLAsset = TLAsset> = T extends T
	? {
			id: TLAssetId
			type: T['type']
			props?: Partial<T['props']>
	  } & Partial<Omit<T, 'type' | 'id' | 'props'>>
	: never

/** @public */
export type TLAssetId = ID<TLBaseAsset<any, any>>

/** @public */
export type TLAssetShape = Extract<TLShape, { props: { assetId: TLAssetId } }>

/** @public */
export const AssetRecordType = createRecordType<TLAsset>('asset', {
	scope: 'document',
})

/** @public */
export const assetTypeValidator = T.model(
	'asset',
	T.union('type', {
		image: imageAssetTypeValidator,
		video: videoAssetTypeValidator,
		bookmark: bookmarkAssetTypeValidator,
	})
)

/** @public */
export const rootAssetTypeMigrator = new Migrator()
