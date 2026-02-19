import {
	createMigrationIds,
	createRecordMigrationSequence,
	createRecordType,
	RecordId,
} from '@tldraw/store'
import { mapObjectMapValues } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { createAssetValidator, TLBaseAsset } from '../assets/TLBaseAsset'
import { TLBookmarkAsset } from '../assets/TLBookmarkAsset'
import { TLImageAsset } from '../assets/TLImageAsset'
import { TLVideoAsset } from '../assets/TLVideoAsset'
import { SchemaPropsInfo } from '../createTLSchema'
import { TLPropsMigrations } from '../recordsWithProps'
import { ExtractShapeByProps } from './TLShape'

/**
 * The default set of asset types that are available in the editor.
 *
 * @public
 */
export type TLDefaultAsset = TLImageAsset | TLVideoAsset | TLBookmarkAsset

/**
 * A type for an asset that is available in the editor but whose type is
 * unknown—either one of the editor's default assets or else a custom asset.
 *
 * @public
 */
export type TLUnknownAsset = TLBaseAsset<string, object>

/**
 * The set of all assets that are available in the editor.
 *
 * @public
 */
export type TLAsset = TLDefaultAsset

/**
 * Migration version identifiers for asset record schema evolution.
 * Each version represents a breaking change that requires data migration.
 *
 * @public
 */
export const assetVersions = createMigrationIds('com.tldraw.asset', {
	AddMeta: 1,
} as const)

/**
 * Migration sequence for evolving asset record structure over time.
 * Handles converting asset records from older schema versions to current format.
 *
 * @public
 */
export const assetMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw.asset',
	recordType: 'asset',
	sequence: [
		{
			id: assetVersions.AddMeta,
			up: (record) => {
				;(record as any).meta = {}
			},
		},
	],
})

/**
 * Partial type for TLAsset allowing optional properties except id and type.
 *
 * @public
 */
export type TLAssetPartial<T extends TLAsset = TLAsset> = T extends T
	? {
			id: TLAssetId
			type: T['type']
			props?: Partial<T['props']>
			meta?: Partial<T['meta']>
		} & Partial<Omit<T, 'type' | 'id' | 'props' | 'meta'>>
	: never

/**
 * Creates the record type definition for assets based on registered asset schemas.
 * This function follows the same pattern as `createShapeRecordType` and `createBindingRecordType`.
 *
 * @param assets - Record of asset type names to their schema configuration
 * @returns A configured record type for assets with validation
 *
 * @internal
 */
export function createAssetRecordType(assets: Record<string, SchemaPropsInfo>) {
	return createRecordType('asset', {
		scope: 'document',
		validator: T.model(
			'asset',
			T.union(
				'type',
				mapObjectMapValues(assets, (type, { props, meta }) =>
					createAssetValidator(type, props, meta)
				)
			)
		),
	}).withDefaultProperties(() => ({
		meta: {},
	}))
}

/** @public */
export const AssetRecordType = createRecordType<TLAsset>('asset', {
	scope: 'document',
}).withDefaultProperties(() => ({
	meta: {},
}))

/**
 * Branded string type for asset record identifiers.
 *
 * @public
 */
export type TLAssetId = RecordId<TLBaseAsset<any, any>>

/**
 * Union type of all shapes that reference assets through an assetId property.
 *
 * @public
 */
export type TLAssetShape = ExtractShapeByProps<{ assetId: TLAssetId }>

/**
 * Creates a migration sequence for asset properties.
 *
 * @public
 */
export function createAssetPropsMigrationSequence(
	migrations: TLPropsMigrations
): TLPropsMigrations {
	return migrations
}

/**
 * Creates properly formatted migration IDs for asset properties.
 *
 * @public
 */
export function createAssetPropsMigrationIds<S extends string, T extends Record<string, number>>(
	assetType: S,
	ids: T
): { [k in keyof T]: `com.tldraw.asset.${S}/${T[k]}` } {
	return mapObjectMapValues(ids, (_k, v) => `com.tldraw.asset.${assetType}/${v}`) as any
}
