import { BaseRecord } from '@tldraw/tlstore'
import { T } from '@tldraw/validate'
import { TLAssetId } from '../records/TLAsset'
import { assetIdValidator } from '../validation'

/** @public */
export interface TLBaseAsset<Type extends string, Props> extends BaseRecord<'asset', TLAssetId> {
	type: Type
	props: Props
}

/** @public */
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
