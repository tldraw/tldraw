import { atom } from '@tldraw/state'
import { defineMigrations, migrate } from '@tldraw/store'
import { getDefaultTranslationLocale } from '@tldraw/tlschema'
import { T } from '@tldraw/validate'
import { uniqueId } from '../utils/uniqueId'

const USER_DATA_KEY = 'TLDRAW_USER_DATA_v3'

/**
 * A user of tldraw
 *
 * @public
 */
export interface TLUserPreferences {
	id: string
	name?: string | null
	locale?: string | null
	color?: string | null
	isDarkMode?: boolean | null
	animationSpeed?: number | null
	isSnapMode?: boolean | null
}

interface UserDataSnapshot {
	version: number
	user: TLUserPreferences
}

interface UserChangeBroadcastMessage {
	type: typeof broadcastEventKey
	origin: string
	data: UserDataSnapshot
}

const userTypeValidator: T.Validator<TLUserPreferences> = T.object<TLUserPreferences>({
	id: T.string,
	name: T.string.nullable().optional(),
	locale: T.string.nullable().optional(),
	color: T.string.nullable().optional(),
	isDarkMode: T.boolean.nullable().optional(),
	animationSpeed: T.number.nullable().optional(),
	isSnapMode: T.boolean.nullable().optional(),
})

const Versions = {
	AddAnimationSpeed: 1,
	AddIsSnapMode: 2,
	MakeFieldsNullable: 3,
} as const

const userMigrations = defineMigrations({
	currentVersion: Versions.MakeFieldsNullable,
	migrators: {
		[Versions.AddAnimationSpeed]: {
			up: (user) => {
				return {
					...user,
					animationSpeed: 1,
				}
			},
			down: ({ animationSpeed: _, ...user }) => {
				return user
			},
		},
		[Versions.AddIsSnapMode]: {
			up: (user: TLUserPreferences) => {
				return { ...user, isSnapMode: false }
			},
			down: ({ isSnapMode: _, ...user }: TLUserPreferences) => {
				return user
			},
		},
		[Versions.MakeFieldsNullable]: {
			up: (user: TLUserPreferences) => {
				return user
			},
			down: (user: TLUserPreferences) => {
				return {
					id: user.id,
					name: user.name ?? defaultUserPreferences.name,
					locale: user.locale ?? defaultUserPreferences.locale,
					color: user.color ?? defaultUserPreferences.color,
					isDarkMode: user.isDarkMode ?? defaultUserPreferences.isDarkMode,
					animationSpeed: user.animationSpeed ?? defaultUserPreferences.animationSpeed,
					isSnapMode: user.isSnapMode ?? defaultUserPreferences.isSnapMode,
				}
			},
		},
	},
})

/** @internal */
export const USER_COLORS = [
	'#FF802B',
	'#EC5E41',
	'#F2555A',
	'#F04F88',
	'#E34BA9',
	'#BD54C6',
	'#9D5BD2',
	'#7B66DC',
	'#02B1CC',
	'#11B3A3',
	'#39B178',
	'#55B467',
] as const

function getRandomColor() {
	return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)]
}

/** @internal */
export function userPrefersDarkUI() {
	if (typeof window === 'undefined') {
		return false
	}
	return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false
}

/** @internal */
export function userPrefersReducedMotion() {
	if (typeof window === 'undefined') {
		return false
	}
	return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
}

/** @public */
export const defaultUserPreferences = Object.freeze({
	name: 'New User',
	locale: getDefaultTranslationLocale(),
	color: getRandomColor(),
	isDarkMode: false,
	animationSpeed: userPrefersReducedMotion() ? 0 : 1,
	isSnapMode: false,
}) satisfies Readonly<Omit<TLUserPreferences, 'id'>>

/** @public */
export function getFreshUserPreferences(): TLUserPreferences {
	return {
		id: uniqueId(),
	}
}

function migrateUserPreferences(userData: unknown) {
	if (userData === null || typeof userData !== 'object') {
		return getFreshUserPreferences()
	}

	if (!('version' in userData) || !('user' in userData) || typeof userData.version !== 'number') {
		return getFreshUserPreferences()
	}

	const migrationResult = migrate<TLUserPreferences>({
		value: userData.user,
		fromVersion: userData.version,
		toVersion: userMigrations.currentVersion ?? 0,
		migrations: userMigrations,
	})

	if (migrationResult.type === 'error') {
		return getFreshUserPreferences()
	}

	try {
		userTypeValidator.validate(migrationResult.value)
	} catch (e) {
		return getFreshUserPreferences()
	}

	return migrationResult.value
}

function loadUserPreferences(): TLUserPreferences {
	const userData =
		typeof window === 'undefined'
			? null
			: ((JSON.parse(window?.localStorage?.getItem(USER_DATA_KEY) || 'null') ??
					null) as null | UserDataSnapshot)

	return migrateUserPreferences(userData)
}

const globalUserPreferences = atom<TLUserPreferences>('globalUserData', loadUserPreferences())

function storeUserPreferences() {
	if (typeof window !== 'undefined' && window.localStorage) {
		window.localStorage.setItem(
			USER_DATA_KEY,
			JSON.stringify({
				version: userMigrations.currentVersion,
				user: globalUserPreferences.get(),
			})
		)
	}
}

/** @public */
export function setUserPreferences(user: TLUserPreferences) {
	userTypeValidator.validate(user)
	globalUserPreferences.set(user)
	storeUserPreferences()
	broadcastUserPreferencesChange()
}

const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test'

const channel =
	typeof BroadcastChannel !== 'undefined' && !isTest
		? new BroadcastChannel('tldraw-user-sync')
		: null

channel?.addEventListener('message', (e) => {
	const data = e.data as undefined | UserChangeBroadcastMessage
	if (data?.type === broadcastEventKey && data?.origin !== broadcastOrigin) {
		globalUserPreferences.set(migrateUserPreferences(data.data))
	}
})

const broadcastOrigin = uniqueId()
const broadcastEventKey = 'tldraw-user-preferences-change' as const

function broadcastUserPreferencesChange() {
	channel?.postMessage({
		type: broadcastEventKey,
		origin: broadcastOrigin,
		data: {
			user: globalUserPreferences.get(),
			version: userMigrations.currentVersion,
		},
	} satisfies UserChangeBroadcastMessage)
}

/** @public */
export function getUserPreferences() {
	return globalUserPreferences.get()
}
