import type { FairyProject } from '@tldraw/fairy-shared'
import {
	type BaseRecord,
	createRecordMigrationSequence,
	createRecordType,
	idValidator,
	type RecordId,
	T,
} from 'tldraw'
import { FairyAgent } from '../../fairy-agent/agent/FairyAgent'
import { FaeId } from './fae-fairy'
import type { FaeProjectId } from './fae-fairy-project'

export type FaeUiState =
	| {
			name: 'closed'
	  }
	| {
			name: 'manual'
	  }
	| {
			name: 'chat'
			mode: FaeUiChatMode
	  }

export type FaeUiChatMode =
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
			projectId: FairyProject['id']
			orchestratorId: FairyAgent['id']
			fairyIds: FairyAgent['id'][]
			phase: FaeUiProjectPhase
	  }

export type FaeUiProjectPhase =
	| {
			name: 'planning'
	  }
	| {
			name: 'executing'
	  }
	| {
			name: 'waiting-for-input'
	  }

interface FaeUiStateRecord extends BaseRecord<'fairy-ui-state', FaeUiStateId> {
	state: FaeUiState
}

type FaeUiStateId = RecordId<FaeUiStateRecord>

const FaeUiStateValidator = T.object<FaeUiStateRecord>({
	id: idValidator<FaeUiStateId>('fairy-ui-state'),
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
					fairyId: idValidator<FaeId>('fairy'),
				}),
				'creating-project': T.object({
					name: T.literal('creating-project'),
					fairyIds: T.arrayOf(T.string),
				}),
				project: T.object({
					name: T.literal('project'),
					projectId: idValidator<FaeProjectId>('fairy-project'),
					orchestratorId: idValidator<FaeId>('fairy'),
					fairyIds: T.arrayOf(idValidator<FaeId>('fairy')),
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

// const FaeUiStateVersions = createMigrationIds('com.tldraw.fairy-ui-state', {
// 	AddOrchestratorId: 1,
// } as const)

export const faeUiStateMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw.fairy-ui-state',
	recordType: 'fairy-ui-state',
	sequence: [],
})

export const faeUiStateRecordType = createRecordType<FaeUiStateRecord>('fairy-ui-state', {
	validator: FaeUiStateValidator,
	scope: 'session',
})
