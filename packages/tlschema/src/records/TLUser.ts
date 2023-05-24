import { BaseRecord, createRecordType, ID, Migrator } from '@tldraw/tlstore'
import { getDefaultTranslationLocale } from '../translations'

/**
 * A user of tldraw
 *
 * @public
 */
export interface TLUser extends BaseRecord<'user', ID<TLUser>> {
	name: string
	locale: string
}
/** @public */
export type TLUserId = TLUser['id']

/** @public */
export const UserRecordType = createRecordType<TLUser>('user', {
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

/** @public */
export const userTypeMigrator = new Migrator({})
