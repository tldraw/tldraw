import { BaseRecord, createRecordType, ID, Migrator } from '@tldraw/tlstore'

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
export const pageTypeMigrator = new Migrator({})
