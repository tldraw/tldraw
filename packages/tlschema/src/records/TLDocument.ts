import { BaseRecord, createRecordType, defineMigrations, ID } from '@tldraw/tlstore'
import { T } from '@tldraw/tlvalidate'

/**
 * TLDocument
 *
 * @public
 */
export interface TLDocument extends BaseRecord<'document'> {
	gridSize: number
	name: string
}

// --- VALIDATION ---
/** @public */
export const documentTypeValidator: T.Validator<TLDocument> = T.model(
	'document',
	T.object({
		typeName: T.literal('document'),
		id: T.literal('document:document' as ID<TLDocument>),
		gridSize: T.number,
		name: T.string,
	})
)

// --- MIGRATIONS ---
// STEP 1: Add a new version number here, give it a meaningful name.
// It should be 1 higher than the current version
const Versions = {
	Initial: 0,
	AddName: 1,
} as const

/** @public */
export const documentTypeMigrations = defineMigrations({
	firstVersion: Versions.Initial,
	// STEP 2: Update the current version to point to your latest version
	currentVersion: Versions.Initial,
	// STEP 3: Add an up+down migration for the new version here
	migrators: {
		[Versions.AddName]: {
			up: (document: TLDocument) => {
				return { ...document, name: 'Home Project' }
			},
			down: ({ name: _, ...document }: TLDocument) => {
				return document
			},
		},
	},
})

/** @public */
export const TLDocument = createRecordType<TLDocument>('document', {
	migrations: documentTypeMigrations,
	validator: documentTypeValidator,
	scope: 'document',
}).withDefaultProperties(
	(): Omit<TLDocument, 'id' | 'typeName'> => ({
		gridSize: 10,
		name: 'Home Project',
	})
)

// all document records have the same ID: 'document:document'
/** @public */
export const TLDOCUMENT_ID: ID<TLDocument> = TLDocument.createCustomId('document')
