import { BaseRecord, createRecordType, defineMigrations, ID } from '@tldraw/tlstore'
import { T } from '@tldraw/tlvalidate'

/**
 * TLDocument
 *
 * @public
 */
export interface TLDocument extends BaseRecord<'document'> {
	gridSize: number
}

/** @public */
export const documentTypeValidator: T.Validator<TLDocument> = T.model(
	'document',
	T.object({
		typeName: T.literal('document'),
		id: T.literal('document:document' as ID<TLDocument>),
		gridSize: T.number,
	})
)

/** @public */
export const documentTypeMigrations = defineMigrations({})

/** @public */
export const TLDocument = createRecordType<TLDocument>('document', {
	migrations: documentTypeMigrations,
	validator: documentTypeValidator,
	scope: 'document',
}).withDefaultProperties(
	(): Omit<TLDocument, 'id' | 'typeName'> => ({
		gridSize: 10,
	})
)

// all document records have the same ID: 'document:document'
/** @public */
export const TLDOCUMENT_ID: ID<TLDocument> = TLDocument.createCustomId('document')
