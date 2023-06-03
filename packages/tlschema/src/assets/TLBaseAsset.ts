import { BaseRecord } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { TLAssetId, assetIdValidator } from '../records/TLAsset'

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
