import { BaseRecord, createRecordType, defineMigrations, RecordId } from '@tldraw/store'
import { T } from '@tldraw/validate'

/**
 * TLDocument
 *
 * @public
 */
export interface TLDocument extends BaseRecord<'document', RecordId<TLDocument>> {
	gridSize: number
	name: string
}

/** @internal */
export const documentValidator: T.Validator<TLDocument> = T.model(
	'document',
	T.object({
		typeName: T.literal('document'),
		id: T.literal('document:document' as RecordId<TLDocument>),
		gridSize: T.number,
		name: T.string,
	})
)

const Versions = {
	AddName: 1,
} as const

/** @internal */
export const documentMigrations = defineMigrations({
	currentVersion: Versions.AddName,
	migrators: {
		[Versions.AddName]: {
			up: (document: TLDocument) => {
				return { ...document, name: '' }
			},
			down: ({ name: _, ...document }: TLDocument) => {
				return document
			},
		},
	},
})

/** @public */
export const DocumentRecordType = createRecordType<TLDocument>('document', {
	migrations: documentMigrations,
	validator: documentValidator,
	scope: 'document',
}).withDefaultProperties(
	(): Omit<TLDocument, 'id' | 'typeName'> => ({
		gridSize: 10,
		name: '',
	})
)

// all document records have the same ID: 'document:document'
/** @public */
export const TLDOCUMENT_ID: RecordId<TLDocument> = DocumentRecordType.createId('document')
