import { TlaFile, TlaRow } from '@tldraw/dotcom-shared'
import { stringEnum } from '@tldraw/utils'
import { TopicSubscriptionTree } from './Subscription'

export type Topic = `user:${string}` | `file:${string}`

export const relevantTables = stringEnum('user', 'file', 'file_state', 'user_mutation_number')

export const USER_REGISTRATION_MESSAGE_PREFIX = 'user_registration'
export const USER_REGISTRATION_VERSION = 1

export interface UserRegistrationNotification {
	version: number
	userId: string
	bootId: string
	topicSubscriptions: TopicSubscriptionTree
}

export interface ReplicationEvent {
	command: 'insert' | 'update' | 'delete'
	table: keyof typeof relevantTables
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
			type: 'notify_file_durable_object'
			command: 'insert' | 'update' | 'delete'
			file: TlaFile
	  }
