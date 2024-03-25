import {
	createMigrationIds,
	createRecordMigrations,
	createRecordType,
	RecordId,
} from '@tldraw/store'
import { T } from '@tldraw/validate'
import { TLBaseAsset } from '../assets/TLBaseAsset'
import { bookmarkAssetValidator, TLBookmarkAsset } from '../assets/TLBookmarkAsset'
import { imageAssetValidator, TLImageAsset } from '../assets/TLImageAsset'
import { TLVideoAsset, videoAssetValidator } from '../assets/TLVideoAsset'
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
export const assetVersions = createMigrationIds('com.tldraw.asset', {
	AddMeta: 1,
} as const)

/** @internal */
export const assetMigrations = createRecordMigrations({
	recordType: 'asset',
	sequence: [
		{
			id: assetVersions.AddMeta,
			up: (record) => {
				;(record as any).meta = {}
			},
			down: (record) => {
				delete (record as any).meta
			},
		},
	],
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
	validator: assetValidator,
	scope: 'document',
}).withDefaultProperties(() => ({
	meta: {},
}))

/** @public */
export type TLAssetId = RecordId<TLBaseAsset<any, any>>

/** @public */
export type TLAssetShape = Extract<TLShape, { props: { assetId: TLAssetId } }>
