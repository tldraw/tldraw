import { BaseRecord, createRecordType, defineMigrations, RecordId } from '@tldraw/store'
import { IndexKey, JsonObject } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { idValidator } from '../misc/id-validator'

/**
 * TLPage
 *
 * @public
 */
export interface TLPage extends BaseRecord<'page', TLPageId> {
	name: string
	index: IndexKey
	meta: JsonObject
}

/** @public */
export type TLPageId = RecordId<TLPage>

/** @internal */
export const pageIdValidator = idValidator<TLPageId>('page')

/** @internal */
export const pageValidator: T.Validator<TLPage> = T.model(
	'page',
	T.object({
		typeName: T.literal('page'),
		id: pageIdValidator,
		name: T.string,
		index: T.indexKey,
		meta: T.jsonValue as T.ObjectValidator<JsonObject>,
	})
)

/** @internal */
export const pageVersions = {
	AddMeta: 1,
}

/** @internal */
export const pageMigrations = defineMigrations({
	currentVersion: pageVersions.AddMeta,
	migrators: {
		[pageVersions.AddMeta]: {
			up: (record) => {
				return {
					...record,
					meta: {},
				}
			},
			down: ({ meta: _, ...record }) => {
				return {
					...record,
				}
			},
		},
	},
})

/** @public */
export const PageRecordType = createRecordType<TLPage>('page', {
	validator: pageValidator,
	migrations: pageMigrations,
	scope: 'document',
}).withDefaultProperties(() => ({
	meta: {},
}))

/** @public */
export function isPageId(id: string): id is TLPageId {
	return PageRecordType.isId(id)
}
