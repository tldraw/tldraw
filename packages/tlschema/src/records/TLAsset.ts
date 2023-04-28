import { createRecordType, defineMigrations, ID } from '@tldraw/tlstore'
import { T } from '@tldraw/tlvalidate'
import { TLBaseAsset } from '../assets/asset-validation'
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

// --- VALIDATION ---
/** @public */
export const assetTypeValidator: T.Validator<TLAsset> = T.model(
	'asset',
	T.union('type', {
		image: imageAssetTypeValidator,
		video: videoAssetTypeValidator,
		bookmark: bookmarkAssetTypeValidator,
	})
)

// --- MIGRATIONS ---
// STEP 1: Add a new version number here, give it a meaningful name.
// It should be 1 higher than the current version
const Versions = {
	Initial: 0,
} as const

/** @public */
export const assetTypeMigrations = defineMigrations({
	firstVersion: Versions.Initial,
	// STEP 2: Update the current version to point to your latest version
	currentVersion: Versions.Initial,
	// STEP 3: Add an up+down migration for the new version here
	migrators: {},
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
export const TLAsset = createRecordType<TLAsset>('asset', {
	migrations: assetTypeMigrations,
	validator: assetTypeValidator,
	scope: 'document',
})

/** @public */
export type TLAssetId = ID<TLBaseAsset<any, any>>

/** @public */
export type TLAssetShape = Extract<TLShape, { props: { assetId: TLAssetId } }>
