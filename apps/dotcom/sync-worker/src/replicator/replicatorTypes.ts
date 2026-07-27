import { TlaFile, TlaRow } from '@tldraw/dotcom-shared'
import { stringEnum } from '@tldraw/utils'

export type Topic = `user:${string}` | `file:${string}` | `group:${string}`

export const replicatedTables = stringEnum(
	'user',
	'file',
	'file_state',
	'user_mutation_number',
	'group',
	'group_user',
	'group_file'
)
export type ReplicatedTable = keyof typeof replicatedTables

export interface ReplicationEvent {
	command: 'insert' | 'update' | 'delete'
	table: keyof typeof replicatedTables
}

export interface ChangeV1 {
	event: ReplicationEvent
	userId: string
	fileId: string | null
	row: TlaRow
	previous?: TlaRow
}

export interface ChangeV2 {
	event: ReplicationEvent
	row: TlaRow
	previous?: TlaRow
	topics: Topic[]
}

export type ReplicatorEffect =
	| {
			type: 'publish'
			file: TlaFile
	  }
	| {
			type: 'unpublish'
			file: TlaFile
	  }
	| {
			// The file stopped being shared via link. Nothing about the room changes, but anything derived
			// from the file's public content — its cached OG image — has to go.
			type: 'unshare'
			file: TlaFile
	  }
	| {
			type: 'notify_file_durable_object'
			command: 'insert' | 'update' | 'delete'
			file: TlaFile
	  }
