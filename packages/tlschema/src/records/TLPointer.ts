import { BaseRecord, createRecordType, defineMigrations, RecordId } from '@tldraw/store'
import { JsonObject } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { idValidator } from '../misc/id-validator'

/**
 * TLPointer
 *
 * @public
 */
export interface TLPointer extends BaseRecord<'pointer', TLPointerId> {
	x: number
	y: number
	lastActivityTimestamp: number
	meta: JsonObject
}

/** @public */
export type TLPointerId = RecordId<TLPointer>

/** @internal */
export const pointerValidator: T.Validator<TLPointer> = T.model(
	'pointer',
	T.object({
		typeName: T.literal('pointer'),
		id: idValidator<TLPointerId>('pointer'),
		x: T.number,
		y: T.number,
		lastActivityTimestamp: T.number,
		meta: T.jsonValue as T.ObjectValidator<JsonObject>,
	})
)

/** @internal */
export const pointerVersions = {
	AddMeta: 1,
}

/** @internal */
export const pointerMigrations = defineMigrations({
	currentVersion: pointerVersions.AddMeta,
	migrators: {
		[pointerVersions.AddMeta]: {
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
export const PointerRecordType = createRecordType<TLPointer>('pointer', {
	validator: pointerValidator,
	migrations: pointerMigrations,
	scope: 'session',
}).withDefaultProperties(
	(): Omit<TLPointer, 'id' | 'typeName'> => ({
		x: 0,
		y: 0,
		lastActivityTimestamp: 0,
		meta: {},
	})
)

/** @public */
export const TLPOINTER_ID = PointerRecordType.createId('pointer')
