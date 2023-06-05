import { BaseRecord, createRecordType, defineMigrations, RecordId } from '@tldraw/store'

import {
	literalValidator,
	modelValidator,
	objectValidator,
	stringValidator,
	TypeValidator,
} from '@tldraw/validate'
import { idValidator } from '../misc/id-validator'

/**
 * TLPage
 *
 * @public
 */
export interface TLPage extends BaseRecord<'page', TLPageId> {
	name: string
	index: string
}

/** @public */
export type TLPageId = RecordId<TLPage>

/** @internal */
export const pageIdValidator = idValidator<TLPageId>('page')

/** @internal */
export const pageValidator: TypeValidator<TLPage> = modelValidator(
	'page',
	objectValidator({
		typeName: literalValidator('page'),
		id: pageIdValidator,
		name: stringValidator,
		index: stringValidator,
	})
)
/** @internal */
export const pageMigrations = defineMigrations({})

/** @public */
export const PageRecordType = createRecordType<TLPage>('page', {
	validator: pageValidator,
	migrations: pageMigrations,
	scope: 'document',
})

/** @public */
export function isPageId(id: string): id is TLPageId {
	return PageRecordType.isId(id)
}
