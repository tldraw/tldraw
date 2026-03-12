import {
	BaseRecord,
	createMigrationIds,
	createRecordMigrationSequence,
	createRecordType,
	RecordId,
} from '@tldraw/store'
import { JsonObject } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { idValidator } from '../misc/id-validator'

/**
 * A user record in a tldraw store. User records are document-scoped and
 * persist alongside shapes, assets, and pages. They are automatically
 * included in snapshots, clipboard content, and `.tldr` files so that
 * attribution display names survive across boards and sessions.
 *
 * User records are populated from the {@link @tldraw/tlschema#TLUserStore}
 * when the editor stamps attribution metadata onto shapes.
 *
 * @public
 */
export interface TLUser extends BaseRecord<'user', TLUserId> {
	name: string
	color: string
	imageUrl: string
	meta: JsonObject
}

/** @public */
export type TLUserId = RecordId<TLUser>

/** @public */
export const userIdValidator = idValidator<TLUserId>('user')

/** @public */
export const userValidator: T.Validator<TLUser> = T.model(
	'user',
	T.object({
		typeName: T.literal('user'),
		id: userIdValidator,
		name: T.string,
		color: T.string,
		imageUrl: T.string,
		meta: T.jsonValue as T.ObjectValidator<JsonObject>,
	})
)

/** @public */
export const userVersions = createMigrationIds('com.tldraw.user', {
	Initial: 1,
})

/** @public */
export const userMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw.user',
	recordType: 'user',
	sequence: [
		{
			id: userVersions.Initial,
			up: (_record: any) => {
				// initial version — nothing to migrate
			},
		},
	],
})

/** @public */
export const UserRecordType = createRecordType<TLUser>('user', {
	validator: userValidator,
	scope: 'document',
}).withDefaultProperties(() => ({
	name: '',
	color: '',
	imageUrl: '',
	meta: {},
}))

/** @public */
export function isUserId(id: string): id is TLUserId {
	return UserRecordType.isId(id)
}

/** @public */
export function createUserId(id: string): TLUserId {
	return UserRecordType.createId(id)
}
