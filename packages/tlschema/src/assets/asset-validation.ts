import { BaseRecord } from '@tldraw/tlstore'
import { T } from '@tldraw/tlvalidate'
import { TLAssetId } from '../records/TLAsset'
import { assetIdValidator } from '../validation'

/** @public */
export interface TLBaseAsset<Type extends string, Props> extends BaseRecord<'asset', TLAssetId> {
	type: Type
	props: Props
}

/** @public */
export function createAssetValidator<T extends TLBaseAsset<any, any>>(
	type: T extends TLBaseAsset<infer R, any> ? R : never,
	props: T extends TLBaseAsset<any, infer K> ? T.Validator<K> : never
) {
	return T.object({
		id: assetIdValidator,
		typeName: T.literal('asset'),
		type: T.literal(type),
		props,
	})
}
