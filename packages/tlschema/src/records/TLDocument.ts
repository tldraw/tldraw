import {
	BaseRecord,
	createMigrationIds,
	createRecordMigrationSequence,
	createRecordType,
	RecordId,
	UnknownRecord,
} from '@tldraw/store'
import { JsonObject } from '@tldraw/utils'
import { T } from '@tldraw/validate'

/**
 * TLDocument
 *
 * @public
 */
export interface TLDocument extends BaseRecord<'document', RecordId<TLDocument>> {
	gridSize: number
	name: string
	meta: JsonObject
}

/** @public */
export const documentValidator: T.Validator<TLDocument> = T.model(
	'document',
	T.object({
		typeName: T.literal('document'),
		id: T.literal('document:document' as RecordId<TLDocument>),
		gridSize: T.number,
		name: T.string,
		meta: T.jsonValue as T.ObjectValidator<JsonObject>,
	})
)

/** @public */
export function isDocument(record?: UnknownRecord): record is TLDocument {
	if (!record) return false
	return record.typeName === 'document'
}

/** @public */
export const documentVersions = createMigrationIds('com.tldraw.document', {
	AddName: 1,
	AddMeta: 2,
} as const)

/** @public */
export const documentMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw.document',
	recordType: 'document',
	sequence: [
		{
			id: documentVersions.AddName,
			up: (document) => {
				;(document as any).name = ''
			},
			down: (document) => {
				delete (document as any).name
			},
		},
		{
			id: documentVersions.AddMeta,
			up: (record) => {
				;(record as any).meta = {}
			},
		},
	],
})

/** @public */
export const DocumentRecordType = createRecordType<TLDocument>('document', {
	validator: documentValidator,
	scope: 'document',
}).withDefaultProperties(
	(): Omit<TLDocument, 'id' | 'typeName'> => ({
		gridSize: 10,
		name: '',
		meta: {},
	})
)

// all document records have the same ID: 'document:document'
/** @public */
export const TLDOCUMENT_ID: RecordId<TLDocument> = DocumentRecordType.createId('document')
