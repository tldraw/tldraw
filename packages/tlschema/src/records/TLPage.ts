import { BaseRecord, createRecordType, defineMigrations, ID } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { pageIdValidator } from '../validation'

/**
 * TLPage
 *
 * @public
 */
export interface TLPage extends BaseRecord<'page', TLPageId> {
	name: string
	index: string
}

/** @public */
export type TLPageId = ID<TLPage>

/** @public */
export const pageTypeValidator: T.Validator<TLPage> = T.model(
	'page',
	T.object({
		typeName: T.literal('page'),
		id: pageIdValidator,
		name: T.string,
		index: T.string,
	})
)

/** @public */
export const PageRecordType = createRecordType<TLPage>('page', {
	validator: pageTypeValidator,
	scope: 'document',
})

/** @public */
export const pageTypeMigrations = defineMigrations({})

/** @public */
export function isPageId(id: string): id is TLPageId {
	return PageRecordType.isId(id)
}
