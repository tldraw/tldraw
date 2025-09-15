import {
	createMigrationIds,
	createRecordMigrationSequence,
	createRecordType,
	RecordId,
} from '@tldraw/store'
import { T } from '@tldraw/validate'
import { TLBaseAsset } from '../assets/TLBaseAsset'
import { bookmarkAssetValidator, TLBookmarkAsset } from '../assets/TLBookmarkAsset'
import { imageAssetValidator, TLImageAsset } from '../assets/TLImageAsset'
import { TLVideoAsset, videoAssetValidator } from '../assets/TLVideoAsset'
import { TLShape } from './TLShape'

/**
 * Union type representing all possible asset types in tldraw.
 * Assets represent external resources like images, videos, or bookmarks that can be referenced by shapes.
 *
 * @example
 * ```ts
 * const imageAsset: TLAsset = {
 *   id: 'asset:image123',
 *   typeName: 'asset',
 *   type: 'image',
 *   props: {
 *     src: 'https://example.com/image.jpg',
 *     w: 800,
 *     h: 600,
 *     mimeType: 'image/jpeg',
 *     isAnimated: false
 *   },
 *   meta: {}
 * }
 * ```
 *
 * @public
 */
export type TLAsset = TLImageAsset | TLVideoAsset | TLBookmarkAsset

/**
 * Validator for TLAsset records that ensures runtime type safety.
 * Uses a discriminated union based on the 'type' field to validate different asset types.
 *
 * @example
 * ```ts
 * // Validation happens automatically when assets are stored
 * try {
 *   const validatedAsset = assetValidator.validate(assetData)
 *   store.put([validatedAsset])
 * } catch (error) {
 *   console.error('Asset validation failed:', error.message)
 * }
 * ```
 *
 * @public
 */
export const assetValidator: T.Validator<TLAsset> = T.model(
	'asset',
	T.union('type', {
		image: imageAssetValidator,
		video: videoAssetValidator,
		bookmark: bookmarkAssetValidator,
	})
)

/**
 * Migration version identifiers for asset record schema evolution.
 * Each version represents a breaking change that requires data migration.
 *
 * @example
 * ```ts
 * // Check if a migration is needed
 * const needsMigration = currentVersion < assetVersions.AddMeta
 * ```
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
 * @example
 * ```ts
 * // Migration is applied automatically when loading old documents
 * const migratedStore = migrator.migrateStoreSnapshot({
 *   schema: oldSchema,
 *   store: oldStoreSnapshot
 * })
 * ```
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
 * Useful for creating or updating assets where not all properties need to be specified.
 *
 * @example
 * ```ts
 * // Create a partial asset for updating
 * const partialAsset: TLAssetPartial<TLImageAsset> = {
 *   id: 'asset:image123',
 *   type: 'image',
 *   props: {
 *     w: 800 // Only updating width
 *   }
 * }
 *
 * // Use in asset updates
 * editor.updateAssets([partialAsset])
 * ```
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
 * Record type definition for TLAsset with validation and default properties.
 * Configures assets as document-scoped records that persist across sessions.
 *
 * @example
 * ```ts
 * // Create a new asset record
 * const assetRecord = AssetRecordType.create({
 *   id: 'asset:image123',
 *   type: 'image',
 *   props: {
 *     src: 'https://example.com/image.jpg',
 *     w: 800,
 *     h: 600,
 *     mimeType: 'image/jpeg',
 *     isAnimated: false
 *   }
 * })
 *
 * // Store the asset
 * store.put([assetRecord])
 * ```
 *
 * @public
 */
export const AssetRecordType = createRecordType<TLAsset>('asset', {
	validator: assetValidator,
	scope: 'document',
}).withDefaultProperties(() => ({
	meta: {},
}))

/**
 * Branded string type for asset record identifiers.
 * Prevents mixing asset IDs with other types of record IDs at compile time.
 *
 * @example
 * ```ts
 * import { createAssetId } from '@tldraw/tlschema'
 *
 * // Create a new asset ID
 * const assetId: TLAssetId = createAssetId()
 *
 * // Use in asset records
 * const asset: TLAsset = {
 *   id: assetId,
 *   // ... other properties
 * }
 *
 * // Reference in shapes
 * const imageShape: TLImageShape = {
 *   props: {
 *     assetId: assetId,
 *     // ... other properties
 *   }
 * }
 * ```
 *
 * @public
 */
export type TLAssetId = RecordId<TLBaseAsset<any, any>>

/**
 * Union type of all shapes that reference assets through an assetId property.
 * Includes image shapes, video shapes, and any other shapes that depend on external assets.
 *
 * @example
 * ```ts
 * // Function that works with any asset-based shape
 * function handleAssetShape(shape: TLAssetShape) {
 *   const assetId = shape.props.assetId
 *   if (assetId) {
 *     const asset = editor.getAsset(assetId)
 *     // Handle the asset...
 *   }
 * }
 *
 * // Use with image or video shapes
 * const imageShape: TLImageShape = { props: { assetId: 'asset:img1' } }
 * const videoShape: TLVideoShape = { props: { assetId: 'asset:vid1' } }
 * handleAssetShape(imageShape) // Works
 * handleAssetShape(videoShape) // Works
 * ```
 *
 * @public
 */
export type TLAssetShape = Extract<TLShape, { props: { assetId: TLAssetId } }>
