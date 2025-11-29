/* eslint-disable local/no-export-star */
import { Store, StoreSchema } from 'tldraw'
import {
	faeChatHistoryItemMigrations,
	faeChatHistoryItemRecordType,
} from './schema/fae-chat-history-item'
import { faeMigrations, faeRecordType } from './schema/fae-fairy'
import { faeProjectMigrations, faeProjectRecordType } from './schema/fae-fairy-project'
import { faeTodoItemMigrations, faeTodoItemRecordType } from './schema/fae-fairy-todo-item'
import { faeUiStateMigrations, faeUiStateRecordType } from './schema/fae-ui-state'

// Re-export all types and validators
export * from './schema/fae-chat-history-item'
export * from './schema/fae-fairy'
export * from './schema/fae-fairy-project'
export * from './schema/fae-fairy-todo-item'
export * from './schema/fae-ui-state'
export * from './schema/fae-validators'

export const fairyUiStore = new Store({
	id: 'fairy-ui',
	props: {},
	schema: StoreSchema.create(
		{
			fairy: faeRecordType,
			'fairy-ui-state': faeUiStateRecordType,
			'fairy-project': faeProjectRecordType,
			'fairy-chat-history-item': faeChatHistoryItemRecordType,
			'fairy-todo-item': faeTodoItemRecordType,
		},
		{
			migrations: [
				faeMigrations,
				faeUiStateMigrations,
				faeProjectMigrations,
				faeChatHistoryItemMigrations,
				faeTodoItemMigrations,
			],
		}
	),
})
