import {
	BaseRecord,
	RecordId,
	T,
	createMigrationIds,
	createRecordMigrationSequence,
	createRecordType,
	idValidator,
} from 'tldraw'
import { TldrawAppUserId } from './TldrawAppUser'
import { TldrawAppWorkspaceId } from './TldrawAppWorkspace'

export interface TldrawAppSessionState
	extends BaseRecord<'session', RecordId<TldrawAppSessionState>> {
	isSidebarOpen: boolean
	auth?: {
		userId: TldrawAppUserId // null,
		workspaceId: TldrawAppWorkspaceId
	}
	sidebarActiveTab: 'recent' | 'groups'
	views: {
		[key: string]: {
			sort: 'recent' | 'newest' | 'oldest'
			view: 'grid' | 'list'
		}
	}
}

export type TldrawAppSessionStateId = RecordId<TldrawAppSessionState>

/** @public */
export const tldrawAppSessionStateValidator: T.Validator<TldrawAppSessionState> = T.model(
	'session',
	T.object({
		typeName: T.literal('session'),
		id: idValidator<TldrawAppSessionStateId>('session'),
		isSidebarOpen: T.boolean,
		sidebarActiveTab: T.literalEnum('recent', 'groups'),
		views: T.dict(
			T.string,
			T.object({
				sort: T.literalEnum('recent', 'newest', 'oldest'),
				view: T.literalEnum('grid', 'list'),
			})
		),
		auth: T.object({
			userId: idValidator<TldrawAppUserId>('user'),
			workspaceId: idValidator<TldrawAppWorkspaceId>('workspace'),
		}).optional(),
	})
)

/** @public */
export const tldrawAppSessionStateVersions = createMigrationIds('com.tldraw.visit', {} as const)

/** @public */
export const tldrawAppSessionStateMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw-app.visit',
	recordType: 'session',
	sequence: [],
})

/** @public */
export const TldrawAppSessionStateRecordType = createRecordType<TldrawAppSessionState>('session', {
	validator: tldrawAppSessionStateValidator,
	scope: 'document',
}).withDefaultProperties(
	(): Omit<TldrawAppSessionState, 'id' | 'typeName'> => ({
		isSidebarOpen: true,
		sidebarActiveTab: 'recent',
		views: {
			drafts: {
				sort: 'recent',
				view: 'grid',
			},
			shared: {
				sort: 'recent',
				view: 'grid',
			},
			star: {
				sort: 'recent',
				view: 'grid',
			},
		},
	})
)
