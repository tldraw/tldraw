import { createRecordType, ID, Migrator } from '@tldraw/tlstore'
import { T } from '@tldraw/tlvalidate'
import { TLBaseAsset } from '../assets/asset-validation'
import {
	bookmarkAssetTypeMigrator,
	bookmarkAssetTypeValidator,
	TLBookmarkAsset,
} from '../assets/TLBookmarkAsset'
import {
	imageAssetTypeMigrator,
	imageAssetTypeValidator,
	TLImageAsset,
} from '../assets/TLImageAsset'
import {
	TLVideoAsset,
	videoAssetTypeMigrator,
	videoAssetTypeValidator,
} from '../assets/TLVideoAsset'
import { TLShape } from './TLShape'

// --- DEFINITION ---
/** @public */
export type TLAsset = TLImageAsset | TLVideoAsset | TLBookmarkAsset

/** @public */
export const assetTypeValidator: T.Validator<TLAsset> = T.model(
	'asset',
	T.union('type', {
		image: imageAssetTypeValidator,
		video: videoAssetTypeValidator,
		bookmark: bookmarkAssetTypeValidator,
	})
)

/** @public */
export const rootAssetTypeMigrator = new Migrator({
	subTypeKey: 'type',
	subTypeMigrators: {
		image: imageAssetTypeMigrator,
		video: videoAssetTypeMigrator,
		bookmark: bookmarkAssetTypeMigrator,
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
export const TLAsset = createRecordType<TLAsset>('asset', {
	validator: assetTypeValidator,
	scope: 'document',
})

/** @public */
export type TLAssetId = ID<TLBaseAsset<any, any>>

/** @public */
export type TLAssetShape = Extract<TLShape, { props: { assetId: TLAssetId } }>
