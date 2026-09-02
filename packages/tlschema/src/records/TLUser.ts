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
 * Extend user records with custom metadata by passing validators to
 * {@link @tldraw/tlschema#createTLSchema} or {@link createUserRecordType}.
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

/**
 * Creates a user record type with optional custom meta validation.
 *
 * When `meta` validators are provided, the user record's `meta` field will
 * validate those specific fields (when present) while still allowing
 * arbitrary additional JSON properties. Custom meta fields are treated as
 * optional so that user records created without them remain valid.
 *
 * @param config - Optional configuration for custom meta validators
 * @returns A configured user record type
 *
 * @example
 * ```ts
 * import { createUserRecordType } from '@tldraw/tlschema'
 * import { T } from '@tldraw/validate'
 *
 * const CustomUserRecordType = createUserRecordType({
 *   meta: {
 *     isAdmin: T.boolean,
 *     department: T.string,
 *   },
 * })
 * ```
 *
 * @public
 */
export function createUserRecordType(config?: { meta?: Record<string, T.Validatable<any>> }) {
	const metaConfig = config?.meta

	const metaValidator = metaConfig
		? T.object(
				Object.fromEntries(
					Object.entries(metaConfig).map(([key, v]) => [
						key,
						new T.Validator((value) => {
							if (value === undefined) return undefined
							return (v as T.Validator<unknown>).validate(value)
						}),
					])
				)
			).allowUnknownProperties()
		: (T.jsonValue as T.ObjectValidator<JsonObject>)

	const validator: T.Validator<TLUser> = T.model(
		'user',
		T.object({
			typeName: T.literal('user'),
			id: userIdValidator,
			name: T.string,
			color: T.string,
			imageUrl: T.string,
			meta: metaValidator as T.ObjectValidator<JsonObject>,
		})
	)

	return createRecordType<TLUser>('user', {
		validator,
		scope: 'document',
	}).withDefaultProperties(() => ({
		name: '',
		color: '',
		imageUrl: '',
		meta: {},
	}))
}

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
export const UserRecordType = createUserRecordType()

/** @public */
export function isUserId(id: string): id is TLUserId {
	return UserRecordType.isId(id)
}

/** @public */
export function createUserId(id: string): TLUserId {
	return UserRecordType.createId(id)
}
