import { createRecordType, defineMigrations, RecordId } from '@tldraw/store'

import { model, TypeValidator, union } from '@tldraw/validate'
import { TLBaseAsset } from '../assets/TLBaseAsset'
import {
	bookmarkAssetMigrations,
	bookmarkAssetValidator,
	TLBookmarkAsset,
} from '../assets/TLBookmarkAsset'
import { imageAssetMigrations, imageAssetValidator, TLImageAsset } from '../assets/TLImageAsset'
import { TLVideoAsset, videoAssetMigrations, videoAssetValidator } from '../assets/TLVideoAsset'
import { TLShape } from './TLShape'

/** @public */
export type TLAsset = TLImageAsset | TLVideoAsset | TLBookmarkAsset

/** @internal */
export const assetValidator: TypeValidator<TLAsset> = model(
	'asset',
	union('type', {
		image: imageAssetValidator,
		video: videoAssetValidator,
		bookmark: bookmarkAssetValidator,
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
export type TLAssetId = RecordId<TLBaseAsset<any, any>>

/** @public */
export type TLAssetShape = Extract<TLShape, { props: { assetId: TLAssetId } }>
