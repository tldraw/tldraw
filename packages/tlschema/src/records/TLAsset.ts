import { createRecordType, defineMigrations, ID } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { TLBaseAsset } from '../assets/TLBaseAsset'
import {
	bookmarkAssetMigrations,
	bookmarkAssetTypeValidator,
	TLBookmarkAsset,
} from '../assets/TLBookmarkAsset'
import { imageAssetMigrations, imageAssetTypeValidator, TLImageAsset } from '../assets/TLImageAsset'
import { TLVideoAsset, videoAssetMigrations, videoAssetTypeValidator } from '../assets/TLVideoAsset'
import { TLShape } from './TLShape'

// --- DEFINITION ---
/** @public */
export type TLAsset = TLImageAsset | TLVideoAsset | TLBookmarkAsset

/** @internal */
export const assetValidator: T.Validator<TLAsset> = T.model(
	'asset',
	T.union('type', {
		image: imageAssetTypeValidator,
		video: videoAssetTypeValidator,
		bookmark: bookmarkAssetTypeValidator,
	})
)

/** @internal */
export const assetMigrations = defineMigrations({
	subTypeKey: 'type',
	subTypeMigrations: {
		image: imageAssetMigrations,
		video: videoAssetMigrations,
		bookmark: bookmarkAssetMigrations,
	},
})

/** @public */
export type TLAssetPartial<T extends TLAsset = TLAsset> = T extends T
	? {
			id: TLAssetId
			type: T['type']
			props?: Partial<T['props']>
	  } & Partial<Omit<T, 'type' | 'id' | 'props'>>
	: never

/** @public */
export const AssetRecordType = createRecordType<TLAsset>('asset', {
	migrations: assetMigrations,
	validator: assetValidator,
	scope: 'document',
})

/** @public */
export type TLAssetId = ID<TLBaseAsset<any, any>>

/** @public */
export type TLAssetShape = Extract<TLShape, { props: { assetId: TLAssetId } }>
