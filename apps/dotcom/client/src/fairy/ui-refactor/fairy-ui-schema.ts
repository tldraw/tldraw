import { type FairyProject } from '@tldraw/fairy-shared'
import {
	type BaseRecord,
	createRecordMigrationSequence,
	createRecordType,
	idValidator,
	type RecordId,
	Store,
	StoreSchema,
	T,
	type Validator,
} from 'tldraw'
import { FairyAgent } from '../fairy-agent/agent/FairyAgent'

export type FairyUiState =
	| {
			name: 'closed'
	  }
	| {
			name: 'manual'
	  }
	| {
			name: 'chat'
			mode: FairyUiChatMode
	  }

export type FairyUiChatMode =
	| {
			name: 'solo'
			fairyId: FairyAgent['id']
	  }
	| {
			name: 'creating-project'
			fairyIds: FairyAgent['id'][]
	  }
	| {
			name: 'project'
			projectTitle: string
			projectId: FairyProject['id']
			orchestratorId: FairyAgent['id']
			fairyIds: FairyAgent['id'][]
			phase: FairyUiProjectPhase
	  }

export type FairyUiProjectPhase =
	| {
			name: 'planning'
	  }
	| {
			name: 'executing'
	  }
	| {
			name: 'waiting-for-input'
	  }

interface FairyUiStateRecord extends BaseRecord<'fairy-ui-state', FairyUiStateId> {
	state: FairyUiState
}

type FairyUiStateId = RecordId<FairyUiStateRecord>

const FairyUiStateValidator: Validator<FairyUiStateRecord> = T.object({
	id: idValidator<FairyUiStateId>('fairy-ui-state'),
	typeName: T.literal('fairy-ui-state'),
	state: T.union('name', {
		closed: T.object({
			name: T.literal('closed'),
		}),
		manual: T.object({
			name: T.literal('manual'),
		}),
		chat: T.object({
			name: T.literal('chat'),
			mode: T.union('name', {
				solo: T.object({
					name: T.literal('solo'),
					fairyId: T.string,
				}),
				'creating-project': T.object({
					name: T.literal('creating-project'),
					fairyIds: T.arrayOf(T.string),
				}),
				project: T.object({
					name: T.literal('project'),
					projectId: T.string,
					projectTitle: T.string,
					orchestratorId: T.string,
					fairyIds: T.arrayOf(T.string),
					phase: T.union('name', {
						planning: T.object({
							name: T.literal('planning'),
						}),
						executing: T.object({
							name: T.literal('executing'),
						}),
						'waiting-for-input': T.object({
							name: T.literal('waiting-for-input'),
						}),
					}),
				}),
			}),
		}),
	}),
})

// const FairyUiStateVersions = createMigrationIds('com.tldraw.fairy-ui-state', {
// 	AddOrchestratorId: 1,
// } as const)

const FairyUiStateMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw.fairy-ui-state',
	recordType: 'fairy-ui-state',
	sequence: [],
})

const FairyUiStateRecordType = createRecordType<FairyUiStateRecord>('fairy-ui-state', {
	validator: FairyUiStateValidator,
	scope: 'session',
})

export const fairyUiStore = new Store({
	id: 'fairy-ui',
	props: {},
	schema: StoreSchema.create(
		{
			'fairy-ui-state': FairyUiStateRecordType,
		},
		{
			migrations: [FairyUiStateMigrations],
		}
	),
})
