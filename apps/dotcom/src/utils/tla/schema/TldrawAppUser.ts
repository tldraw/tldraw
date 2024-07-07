import {
	BaseRecord,
	RecordId,
	T,
	createMigrationIds,
	createRecordMigrationSequence,
	createRecordType,
	idValidator,
} from 'tldraw'

export interface TldrawAppUser extends BaseRecord<'user', RecordId<TldrawAppUser>> {
	name: string
	email: string
	avatar: string
	createdAt: number
	updatedAt: number
}

export type TldrawAppUserId = RecordId<TldrawAppUser>

/** @public */
export const tldrawAppUserValidator: T.Validator<TldrawAppUser> = T.model(
	'user',
	T.object({
		typeName: T.literal('user'),
		id: idValidator<TldrawAppUserId>('user'),
		name: T.string,
		email: T.string,
		avatar: T.string,
		createdAt: T.number,
		updatedAt: T.number,
	})
)

/** @public */
export const tldrawAppUserVersions = createMigrationIds('com.tldraw.user', {} as const)

/** @public */
export const tldrawAppUserMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw-app.user',
	recordType: 'user',
	sequence: [],
})

/** @public */
export const TldrawAppUserRecordType = createRecordType<TldrawAppUser>('user', {
	validator: tldrawAppUserValidator,
	scope: 'document',
}).withDefaultProperties(
	(): Omit<TldrawAppUser, 'id' | 'typeName'> => ({
		name: 'Steve Ruiz',
		email: 'steve@tldraw.com',
		avatar: '',
		createdAt: Date.now(),
		updatedAt: Date.now(),
	})
)
