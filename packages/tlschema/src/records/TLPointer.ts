import { BaseRecord, createRecordType, defineMigrations, RecordId } from '@tldraw/store'

import {
	literalValidator,
	modelValidator,
	numberValidator,
	objectValidator,
	TypeValidator,
} from '@tldraw/validate'
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
}

/** @public */
export type TLPointerId = RecordId<TLPointer>

/** @internal */
export const pointerValidator: TypeValidator<TLPointer> = modelValidator(
	'pointer',
	objectValidator({
		typeName: literalValidator('pointer'),
		id: idValidator<TLPointerId>('pointer'),
		x: numberValidator,
		y: numberValidator,
		lastActivityTimestamp: numberValidator,
	})
)

/** @internal */
export const pointerMigrations = defineMigrations({})

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
	})
)

/** @public */
export const TLPOINTER_ID = PointerRecordType.createId('pointer')
