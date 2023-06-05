import { BaseRecord } from '@tldraw/store'

import { ObjectValidator, TypeValidator, literalValidator, objectValidator } from '@tldraw/validate'
import { idValidator } from '../misc/id-validator'
import { TLAssetId } from '../records/TLAsset'

/** @public */
export interface TLBaseAsset<Type extends string, Props> extends BaseRecord<'asset', TLAssetId> {
	type: Type
	props: Props
}

/**
 * A validator for asset record type Ids.
 *
 * @public */
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
	props: TypeValidator<Props>
): ObjectValidator<{
	id: TLAssetId
	typeName: 'asset'
	type: Type
	props: Props
}> {
	return objectValidator({
		id: assetIdValidator,
		typeName: literalValidator('asset'),
		type: literalValidator(type),
		props,
	})
}
