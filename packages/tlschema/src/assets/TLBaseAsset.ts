import { BaseRecord } from '@tldraw/store'
import { JsonObject } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { idValidator } from '../misc/id-validator'
import { TLAssetId } from '../records/TLAsset'

/**
 * Base interface for all asset records in tldraw. Assets represent external resources
 * like images, videos, or bookmarks that shapes can reference. This interface extends
 * the base record system with asset-specific typing.
 *
 * @param Type - The specific asset type identifier (e.g., 'image', 'video', 'bookmark')
 * @param Props - The properties object specific to this asset type
 *
 * @example
 * ```ts
 * // Define a custom asset type
 * interface MyCustomAsset extends TLBaseAsset<'custom', { url: string; title: string }> {}
 *
 * const customAsset: MyCustomAsset = {
 *   id: 'asset:custom123',
 *   typeName: 'asset',
 *   type: 'custom',
 *   props: {
 *     url: 'https://example.com',
 *     title: 'My Custom Asset'
 *   },
 *   meta: {}
 * }
 * ```
 *
 * @public
 */
export interface TLBaseAsset<Type extends string, Props> extends BaseRecord<'asset', TLAssetId> {
	/** The specific type of this asset (e.g., 'image', 'video', 'bookmark') */
	type: Type
	/** Type-specific properties for this asset */
	props: Props
	/** User-defined metadata that can be attached to this asset */
	meta: JsonObject
}

/**
 * A validator for asset record type IDs. This validator ensures that asset IDs
 * follow the correct format and type structure required by tldraw's asset system.
 * Asset IDs are prefixed with 'asset:' followed by a unique identifier.
 *
 * @example
 * ```ts
 * import { assetIdValidator } from '@tldraw/tlschema'
 *
 * // Valid asset ID
 * const validId = 'asset:abc123'
 * console.log(assetIdValidator.isValid(validId)) // true
 *
 * // Invalid asset ID
 * const invalidId = 'shape:abc123'
 * console.log(assetIdValidator.isValid(invalidId)) // false
 * ```
 *
 * @public
 */
export const assetIdValidator = idValidator<TLAssetId>('asset')

/**
 * Creates a validator for a specific asset record type. This factory function generates
 * a complete validator that validates the entire asset record structure including the
 * base properties (id, typeName, type, meta) and the type-specific props.
 *
 * @param type - The asset type identifier (e.g., 'image', 'video', 'bookmark')
 * @param props - The validator for the asset's type-specific properties
 * @returns A complete validator for the asset record type
 *
 * @example
 * ```ts
 * import { createAssetValidator, TLBaseAsset } from '@tldraw/tlschema'
 * import { T } from '@tldraw/validate'
 *
 * // Define a custom asset type
 * type TLCustomAsset = TLBaseAsset<'custom', {
 *   url: string
 *   title: string
 *   description?: string
 * }>
 *
 * // Create validator for the custom asset
 * const customAssetValidator = createAssetValidator('custom', T.object({
 *   url: T.string,
 *   title: T.string,
 *   description: T.string.optional()
 * }))
 *
 * // Use the validator
 * const assetData = {
 *   id: 'asset:custom123',
 *   typeName: 'asset' as const,
 *   type: 'custom' as const,
 *   props: {
 *     url: 'https://example.com',
 *     title: 'My Custom Asset'
 *   },
 *   meta: {}
 * }
 *
 * const validatedAsset = customAssetValidator.validate(assetData)
 * ```
 *
 * @public
 */
export function createAssetValidator<Type extends string, Props extends JsonObject>(
	type: Type,
	props: T.Validator<Props>
) {
	return T.object<{
		id: TLAssetId
		typeName: 'asset'
		type: Type
		props: Props
		meta: JsonObject
	}>({
		id: assetIdValidator,
		typeName: T.literal('asset'),
		type: T.literal(type),
		props,
		meta: T.jsonValue as T.ObjectValidator<JsonObject>,
	})
}
