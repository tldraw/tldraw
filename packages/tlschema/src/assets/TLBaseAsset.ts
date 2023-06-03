import { BaseRecord } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { idValidator } from '../misc/id-validator'
import { TLAssetId } from '../records/TLAsset'

/** @public */
export interface TLBaseAsset<Type extends string, Props> extends BaseRecord<'asset', TLAssetId> {
	type: Type
	props: Props
}

/** @internal */
export const assetIdValidator = idValidator<TLAssetId>('asset')

/**
 * Create a validator for an asset record type.
 *
 * @param type - The type of the asset
 * @param props - The validator for the asset's props
 *
 * @public */
export function createAssetValidator<Type extends string, Props extends object>(
	type: Type,
	props: T.Validator<Props>
): T.ObjectValidator<{
	id: TLAssetId
	typeName: 'asset'
	type: Type
	props: Props
}> {
	return T.object({
		id: assetIdValidator,
		typeName: T.literal('asset'),
		type: T.literal(type),
		props,
	})
}
