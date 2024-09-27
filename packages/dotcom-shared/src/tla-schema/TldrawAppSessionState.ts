import {
	BaseRecord,
	RecordId,
	createMigrationIds,
	createRecordMigrationSequence,
	createRecordType,
} from '@tldraw/store'
import { T } from '@tldraw/validate'
import { TldrawAppUserId } from './TldrawAppUser'
import { idValidator } from './idValidator'

export interface TldrawAppViewState {
	sort: 'recent' | 'newest' | 'oldest' | 'atoz' | 'ztoa'
	view: 'grid' | 'list'
	search: string
}

export interface TldrawAppSessionState
	extends BaseRecord<'session', RecordId<TldrawAppSessionState>> {
	isSidebarOpen: boolean
	auth?: {
		userId: TldrawAppUserId // null,
	}
	sidebarActiveTab: 'recent' | 'groups' | 'shared' | 'drafts' | 'starred'
	views: {
		[key: string]: TldrawAppViewState
	}
	theme: 'light' | 'dark'
	createdAt: number
}

export type TldrawAppSessionStateId = RecordId<TldrawAppSessionState>

/** @public */
export const tldrawAppSessionStateValidator: T.Validator<TldrawAppSessionState> = T.model(
	'session',
	T.object({
		typeName: T.literal('session'),
		id: idValidator<TldrawAppSessionStateId>('session'),
		isSidebarOpen: T.boolean,
		sidebarActiveTab: T.literalEnum('recent', 'groups', 'shared', 'drafts', 'starred'),
		views: T.dict(
			T.string,
			T.object({
				sort: T.literalEnum('recent', 'newest', 'oldest', 'atoz', 'ztoa'),
				view: T.literalEnum('grid', 'list'),
				search: T.string,
			})
		),
		auth: T.object({
			userId: idValidator<TldrawAppUserId>('user'),
		}).optional(),
		theme: T.literalEnum('light', 'dark'),
		createdAt: T.number,
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
	scope: 'session',
}).withDefaultProperties(
	(): Omit<TldrawAppSessionState, 'id' | 'typeName'> => ({
		isSidebarOpen: true,
		sidebarActiveTab: 'recent',
		auth: undefined,
		views: {
			drafts: {
				sort: 'recent',
				view: 'grid',
				search: '',
			},
			shared: {
				sort: 'recent',
				view: 'grid',
				search: '',
			},
			starred: {
				sort: 'recent',
				view: 'grid',
				search: '',
			},
		},
		theme: 'light',
		createdAt: Date.now(),
	})
)
