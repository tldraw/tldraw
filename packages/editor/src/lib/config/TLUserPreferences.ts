import { atom } from '@tldraw/state'
import { getDefaultTranslationLocale } from '@tldraw/tlschema'
import { getFromLocalStorage, setInLocalStorage, structuredClone, uniqueId } from '@tldraw/utils'
import { T } from '@tldraw/validate'

const USER_DATA_KEY = 'TLDRAW_USER_DATA_v3'

/**
 * A user of tldraw
 *
 * @public
 */
export interface TLUserPreferences {
	id: string
	name?: string | null
	color?: string | null
	// N.B. These are duplicated in TLdrawAppUser.
	locale?: string | null
	animationSpeed?: number | null
	areKeyboardShortcutsEnabled?: boolean | null
	edgeScrollSpeed?: number | null
	colorScheme?: 'light' | 'dark' | 'system'
	isSnapMode?: boolean | null
	isWrapMode?: boolean | null
	isDynamicSizeMode?: boolean | null
	isPasteAtCursorMode?: boolean | null
	enhancedA11yMode?: boolean | null
	inputMode?: 'trackpad' | 'mouse' | null
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

/** @public */
export const userTypeValidator: T.Validator<TLUserPreferences> = T.object<TLUserPreferences>({
	id: T.string,
	name: T.string.nullable().optional(),
	color: T.string.nullable().optional(),
	// N.B. These are duplicated in TLdrawAppUser.
	locale: T.string.nullable().optional(),
	animationSpeed: T.number.nullable().optional(),
	areKeyboardShortcutsEnabled: T.boolean.nullable().optional(),
	edgeScrollSpeed: T.number.nullable().optional(),
	colorScheme: T.literalEnum('light', 'dark', 'system').optional(),
	isSnapMode: T.boolean.nullable().optional(),
	isWrapMode: T.boolean.nullable().optional(),
	isDynamicSizeMode: T.boolean.nullable().optional(),
	isPasteAtCursorMode: T.boolean.nullable().optional(),
	enhancedA11yMode: T.boolean.nullable().optional(),
	inputMode: T.literalEnum('trackpad', 'mouse').nullable().optional(),
})

const Versions = {
	AddAnimationSpeed: 1,
	AddIsSnapMode: 2,
	MakeFieldsNullable: 3,
	AddEdgeScrollSpeed: 4,
	AddExcalidrawSelectMode: 5,
	AddDynamicSizeMode: 6,
	AllowSystemColorScheme: 7,
	AddPasteAtCursor: 8,
	AddKeyboardShortcuts: 9,
	AddShowUiLabels: 10,
	AddPointerPeripheral: 11,
	RenameShowUiLabelsToEnhancedA11yMode: 12,
} as const

const CURRENT_VERSION = Math.max(...Object.values(Versions))

function migrateSnapshot(data: { version: number; user: any }) {
	if (data.version < Versions.AddAnimationSpeed) {
		data.user.animationSpeed = 1
	}
	if (data.version < Versions.AddIsSnapMode) {
		data.user.isSnapMode = false
	}
	if (data.version < Versions.MakeFieldsNullable) {
		// noop
	}
	if (data.version < Versions.AddEdgeScrollSpeed) {
		data.user.edgeScrollSpeed = 1
	}
	if (data.version < Versions.AddExcalidrawSelectMode) {
		data.user.isWrapMode = false
	}
	if (data.version < Versions.AllowSystemColorScheme) {
		if (data.user.isDarkMode === true) {
			data.user.colorScheme = 'dark'
		} else if (data.user.isDarkMode === false) {
			data.user.colorScheme = 'light'
		}
		delete data.user.isDarkMode
	}

	if (data.version < Versions.AddDynamicSizeMode) {
		data.user.isDynamicSizeMode = false
	}
	if (data.version < Versions.AddPasteAtCursor) {
		data.user.isPasteAtCursorMode = false
	}
	if (data.version < Versions.AddKeyboardShortcuts) {
		data.user.areKeyboardShortcutsEnabled = true
	}
	if (data.version < Versions.AddShowUiLabels) {
		data.user.showUiLabels = false
	}
	if (data.version < Versions.RenameShowUiLabelsToEnhancedA11yMode) {
		data.user.enhancedA11yMode = data.user.showUiLabels
		delete data.user.showUiLabels
	}

	if (data.version < Versions.AddPointerPeripheral) {
		data.user.inputMode = null
	}

	// finally
	data.version = CURRENT_VERSION
}

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
export function userPrefersReducedMotion() {
	if (typeof window !== 'undefined' && window.matchMedia) {
		return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false
	}

	return false
}

/** @public */
export const defaultUserPreferences = Object.freeze({
	name: '',
	locale: getDefaultTranslationLocale(),
	color: getRandomColor(),

	// N.B. These are duplicated in TLdrawAppUser.
	edgeScrollSpeed: 1,
	animationSpeed: userPrefersReducedMotion() ? 0 : 1,
	areKeyboardShortcutsEnabled: true,
	isSnapMode: false,
	isWrapMode: false,
	isDynamicSizeMode: false,
	isPasteAtCursorMode: false,
	enhancedA11yMode: false,
	colorScheme: 'light',
	inputMode: null,
}) satisfies Readonly<Omit<TLUserPreferences, 'id'>>

/** @public */
export function getFreshUserPreferences(): TLUserPreferences {
	return {
		id: uniqueId(),
		color: getRandomColor(),
	}
}

function migrateUserPreferences(userData: unknown): TLUserPreferences {
	if (userData === null || typeof userData !== 'object') {
		return getFreshUserPreferences()
	}

	if (!('version' in userData) || !('user' in userData) || typeof userData.version !== 'number') {
		return getFreshUserPreferences()
	}

	const snapshot = structuredClone(userData) as any

	migrateSnapshot(snapshot)

	try {
		return userTypeValidator.validate(snapshot.user)
	} catch {
		return getFreshUserPreferences()
	}
}

function loadUserPreferences(): TLUserPreferences {
	const userData = (JSON.parse(getFromLocalStorage(USER_DATA_KEY) || 'null') ??
		null) as null | UserDataSnapshot

	return migrateUserPreferences(userData)
}

const globalUserPreferences = atom<TLUserPreferences | null>('globalUserData', null)

function storeUserPreferences() {
	setInLocalStorage(
		USER_DATA_KEY,
		JSON.stringify({
			version: CURRENT_VERSION,
			user: globalUserPreferences.get(),
		})
	)
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
	if (data?.type === broadcastEventKey && data?.origin !== getBroadcastOrigin()) {
		globalUserPreferences.set(migrateUserPreferences(data.data))
	}
})

let _broadcastOrigin = null as null | string
function getBroadcastOrigin() {
	if (_broadcastOrigin === null) {
		_broadcastOrigin = uniqueId()
	}
	return _broadcastOrigin
}
const broadcastEventKey = 'tldraw-user-preferences-change' as const

function broadcastUserPreferencesChange() {
	channel?.postMessage({
		type: broadcastEventKey,
		origin: getBroadcastOrigin(),
		data: {
			user: getUserPreferences(),
			version: CURRENT_VERSION,
		},
	} satisfies UserChangeBroadcastMessage)
}

/** @public */
export function getUserPreferences(): TLUserPreferences {
	let prefs = globalUserPreferences.get()
	if (!prefs) {
		prefs = loadUserPreferences()
		setUserPreferences(prefs)
	}
	return prefs
}
