import { BaseRecord, createRecordType, ID, Migrator } from '@tldraw/tlstore'
import { T } from '@tldraw/tlvalidate'
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
export const PageRecordType = createRecordType<TLPage>('page', {
	scope: 'document',
})

/** @public */
export const pageTypeValidator = T.model<TLPage>(
	'page',
	T.object({
		typeName: T.literal('page'),
		id: pageIdValidator,
		name: T.string,
		index: T.string,
	})
)

/** @public */
export const pageTypeMigrator = new Migrator()
