import {
	type BaseRecord,
	createRecordMigrationSequence,
	createRecordType,
	idValidator,
	type RecordId,
	T,
} from 'tldraw'
import type { FaeTodoItemStatus } from './fae-validators'
import { faeTodoItemStatusValidator } from './fae-validators'

export interface FaeTodoItemRecord extends BaseRecord<'fairy-todo-item', FaeTodoItemId> {
	status: FaeTodoItemStatus
	text: string
}

export type FaeTodoItemId = RecordId<FaeTodoItemRecord>

const faeTodoItemValidator = T.object<FaeTodoItemRecord>({
	id: idValidator<FaeTodoItemId>('fairy-todo-item'),
	typeName: T.literal('fairy-todo-item'),
	status: faeTodoItemStatusValidator,
	text: T.string,
})
export type FaeTodoItem = T.TypeOf<typeof faeTodoItemValidator>

export const faeTodoItemRecordType = createRecordType<FaeTodoItemRecord>('fairy-todo-item', {
	validator: faeTodoItemValidator,
	scope: 'session',
})

export const faeTodoItemMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw.fairy-todo-item',
	recordType: 'fairy-todo-item',
	sequence: [],
})
