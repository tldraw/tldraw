import { BaseRecord, createRecordType, defineMigrations, ID } from '@tldraw/tlstore'
import { T } from '@tldraw/tlvalidate'
import { getDefaultTranslationLocale } from '../translations'
import { userIdValidator } from '../validation'

/**
 * A user of tldraw
 *
 * @public
 */
export interface TLUser extends BaseRecord<'user'> {
	name: string
	locale: string
}
/** @public */
export type TLUserId = ID<TLUser>

// --- VALIDATION ---
/** @public */
export const userTypeValidator: T.Validator<TLUser> = T.model(
	'user',
	T.object({
		typeName: T.literal('user'),
		id: userIdValidator,
		name: T.string,
		locale: T.string,
	})
)

// --- MIGRATIONS ---
// STEP 1: Add a new version number here, give it a meaningful name.
// It should be 1 higher than the current version
const Versions = {
	Initial: 0,
} as const

/** @public */
export const userTypeMigrations = defineMigrations({
	// STEP 2: Update the current version to point to your latest version
	currentVersion: Versions.Initial,
	firstVersion: Versions.Initial,
	migrators: {
		// STEP 3: Add an up+down migration for the new version here
	},
})

/** @public */
export const TLUser = createRecordType<TLUser>('user', {
	migrations: userTypeMigrations,
	validator: userTypeValidator,
	scope: 'instance',
}).withDefaultProperties((): Omit<TLUser, 'id' | 'typeName'> => {
	let locale = 'en'
	if (typeof window !== 'undefined' && window.navigator) {
		locale = getDefaultTranslationLocale(window.navigator.languages)
	}
	return {
		name: 'New User',
		locale,
	}
})
