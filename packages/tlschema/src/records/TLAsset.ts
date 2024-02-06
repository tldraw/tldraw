import { createRecordType, defineMigrations, RecordId } from '@tldraw/store'
import { T } from '@tldraw/validate'
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
export const assetValidator: T.Validator<TLAsset> = T.model(
	'asset',
	T.union('type', {
		image: imageAssetValidator,
		video: videoAssetValidator,
		bookmark: bookmarkAssetValidator,
	})
)

/** @internal */
export const assetVersions = {
	AddMeta: 1,
}

/** @internal */
export const assetMigrations = defineMigrations({
	subTypeKey: 'type',
	subTypeMigrations: {
		image: imageAssetMigrations,
		video: videoAssetMigrations,
		bookmark: bookmarkAssetMigrations,
	},
	currentVersion: assetVersions.AddMeta,
	migrators: {
		[assetVersions.AddMeta]: {
			up: (record) => {
				return {
					...record,
					meta: {},
				}
			},
			down: ({ meta: _, ...record }) => {
				return {
					...record,
				}
			},
		},
	},
})

/** @public */
export type TLAssetPartial<T extends TLAsset = TLAsset> = T extends T
	? {
			id: TLAssetId
			type: T['type']
			props?: Partial<T['props']>
			meta?: Partial<T['meta']>
	  } & Partial<Omit<T, 'type' | 'id' | 'props' | 'meta'>>
	: never

/** @public */
export const AssetRecordType = createRecordType<TLAsset>('asset', {
	migrations: assetMigrations,
	validator: assetValidator,
	scope: 'document',
}).withDefaultProperties(() => ({
	meta: {},
}))

/** @public */
export type TLAssetId = RecordId<TLBaseAsset<any, any>>

/** @public */
export type TLAssetShape = Extract<TLShape, { props: { assetId: TLAssetId } }>
