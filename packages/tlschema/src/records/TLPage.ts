import { BaseRecord, createRecordType, RecordId } from '@tldraw/store'
import { JsonObject } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { idValidator } from '../misc/id-validator'

/**
 * TLPage
 *
 * @public
 */
export interface TLPage extends BaseRecord<'page', TLPageId> {
	name: string
	index: string
	meta: JsonObject
}

/** @public */
export type TLPageId = RecordId<TLPage>

/** @internal */
export const pageIdValidator = idValidator<TLPageId>('page')

/** @internal */
export const pageValidator: T.Validator<TLPage> = T.model(
	'page',
	T.object({
		typeName: T.literal('page'),
		id: pageIdValidator,
		name: T.string,
		index: T.string,
		meta: T.jsonValue as T.ObjectValidator<JsonObject>,
	})
)

/** @public */
export const PageRecordType = createRecordType<TLPage>('page', {
	validator: pageValidator,
	scope: 'document',
}).withDefaultProperties(() => ({
	meta: {},
}))

/** @public */
export function isPageId(id: string): id is TLPageId {
	return PageRecordType.isId(id)
}
