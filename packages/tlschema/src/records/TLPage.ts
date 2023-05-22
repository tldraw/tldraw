import { BaseRecord, createRecordType, defineMigrations, ID } from '@tldraw/tlstore'
import { T } from '@tldraw/tlvalidate'
import { pageIdValidator } from '../validation'

/**
 * TLPage
 *
 * @public
 */
export interface TLPage extends BaseRecord<'page'> {
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
export const TLPage = createRecordType<TLPage>('page', {
	validator: pageTypeValidator,
	scope: 'document',
})

/** @public */
export const pageTypeMigrations = defineMigrations({})
