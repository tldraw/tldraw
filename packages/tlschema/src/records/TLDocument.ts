import { BaseRecord, createRecordType, defineMigrations, ID } from '@tldraw/tlstore'
import { T } from '@tldraw/tlvalidate'
import { styleValidator, TLStyle } from './TLStyle'

/**
 * TLDocument
 *
 * @public
 */
export interface TLDocument extends BaseRecord<'document', ID<TLDocument>> {
	gridSize: number
	styles: TLStyle[]
}

/** @public */
export const documentTypeValidator: T.Validator<TLDocument> = T.model(
	'document',
	T.object({
		typeName: T.literal('document'),
		id: T.literal('document:document' as ID<TLDocument>),
		gridSize: T.number,
		styles: T.arrayOf(styleValidator),
	})
)

/** @public */
export const DocumentRecordType = createRecordType<TLDocument>('document', {
	validator: documentTypeValidator,
	scope: 'document',
}).withDefaultProperties(
	(): Omit<TLDocument, 'id' | 'typeName'> => ({
		gridSize: 10,
		styles: [],
	})
)

// all document records have the same ID: 'document:document'
/** @public */
export const TLDOCUMENT_ID: ID<TLDocument> = DocumentRecordType.createCustomId('document')

const Versions = {
	AddStyles: 1,
} as const

/** @public */
export const documentTypeMigrations = defineMigrations({
	currentVersion: Versions.AddStyles,
	migrators: {
		[Versions.AddStyles]: {
			up: (doc) => {
				return { ...doc, styles: [] }
			},
			down: ({ styles: _styles, ...doc }) => {
				return doc
			},
		},
	},
})
