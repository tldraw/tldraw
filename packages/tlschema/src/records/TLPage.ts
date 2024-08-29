import {
	BaseRecord,
	createMigrationIds,
	createRecordMigrationSequence,
	createRecordType,
	RecordId,
} from '@tldraw/store'
import { IndexKey, JsonObject } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { idValidator } from '../misc/id-validator'

/**
 * @public
 */
export type TLGridType = 'grid' | 'dot' | 'line' | 'iso'

/**
 * TLPage
 *
 * @public
 */
export interface TLPage extends BaseRecord<'page', TLPageId> {
	name: string
	gridType: TLGridType
	index: IndexKey
	meta: JsonObject
}

/** @public */
export type TLPageId = RecordId<TLPage>

/** @public */
export const pageIdValidator = idValidator<TLPageId>('page')

/** @public */
export const pageValidator: T.Validator<TLPage> = T.model(
	'page',
	T.object({
		typeName: T.literal('page'),
		id: pageIdValidator,
		name: T.string,
		gridType: T.literalEnum('grid', 'dot', 'line', 'iso'),
		index: T.indexKey,
		meta: T.jsonValue as T.ObjectValidator<JsonObject>,
	})
)

/** @public */
export const pageVersions = createMigrationIds('com.tldraw.page', {
	AddMeta: 1,
	AddGridType: 2,
})

/** @public */
export const pageMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw.page',
	recordType: 'page',
	sequence: [
		{
			id: pageVersions.AddMeta,
			up: (record: any) => {
				record.meta = {}
			},
		},
		{
			id: pageVersions.AddGridType,
			up: (record: any) => {
				record.gridType = 'dot'
			},
			down: (record: any) => {
				delete record.gridType
			},
		},
	],
})

/** @public */
export const PageRecordType = createRecordType<TLPage>('page', {
	validator: pageValidator,
	scope: 'document',
}).withDefaultProperties(() => ({
	meta: {},
	gridType: 'dot',
}))

/** @public */
export function isPageId(id: string): id is TLPageId {
	return PageRecordType.isId(id)
}
