import { BaseRecord, createRecordType, ID, Migrator } from '@tldraw/tlstore'

/**
 * TLDocument
 *
 * @public
 */
export interface TLDocument extends BaseRecord<'document', ID<TLDocument>> {
	gridSize: number
}

/** @public */
export const DocumentRecordType = createRecordType<TLDocument>('document', {
	scope: 'document',
}).withDefaultProperties(
	(): Omit<TLDocument, 'id' | 'typeName'> => ({
		gridSize: 10,
	})
)

// all document records have the same ID: 'document:document'
/** @public */
export const TLDOCUMENT_ID: ID<TLDocument> = DocumentRecordType.createCustomId('document')

/** @public */
export const documentTypeMigrator = new Migrator({})
