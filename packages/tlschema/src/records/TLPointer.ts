import {
	BaseRecord,
	createMigrationIds,
	createRecordMigrationSequence,
	createRecordType,
	RecordId,
} from '@tldraw/store'
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

/** @public */
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

/** @public */
export const pointerVersions = createMigrationIds('com.tldraw.pointer', {
	AddMeta: 1,
})

/** @public */
export const pointerMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw.pointer',
	recordType: 'pointer',
	sequence: [
		{
			id: pointerVersions.AddMeta,
			up: (record: any) => {
				record.meta = {}
			},
		},
	],
})

/** @public */
export const PointerRecordType = createRecordType<TLPointer>('pointer', {
	validator: pointerValidator,
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
