import { TlaUser } from '@tldraw/dotcom-shared'
import {
	atom,
	deleteFromLocalStorage,
	getFromLocalStorage,
	setInLocalStorage,
	transact,
	useValue,
} from 'tldraw'
import { globalEditor } from '../../utils/globalEditor'

const STORAGE_KEY = 'tldrawapp_session_3'

export interface TldrawAppSessionState {
	createdAt: number
	/**
	 * don't use this to decide if the sidebar is open
	 * use `getIsSidebarOpen` or `useIsSidebarOpen` instead
	 */
	_sidebarToggle: boolean
	isSidebarOpenMobile: boolean
	auth?: {
		userId: string
	}
	shareMenuActiveTab: 'share' | 'export' | 'publish' | 'anon-share'
	sidebarActiveTab: 'recent' | 'groups' | 'shared' | 'drafts' | 'starred'
	theme: 'light' | 'dark'
	colorTheme: string
	colorThemeBackground?: string
	views: {
		[key: string]: {
			sort: 'recent' | 'newest' | 'oldest' | 'atoz' | 'ztoa'
			view: 'grid' | 'list'
			search: string
		}
	}
	flags: { [key: string]: boolean }
	exportSettings: Pick<
		TlaUser,
		'exportFormat' | 'exportTheme' | 'exportBackground' | 'exportPadding'
	>
	sidebarWidth?: number
	shouldShowWelcomeDialog?: boolean
	// The file this browser last synced to, keyed by account so a different sign-in on the same
	// browser never lands on someone else's board. Only a hint: Zero's file_state is authoritative.
	lastVisitedFile?: { userId: string; fileId: string }
	// The locale last shown on this browser. The signed-in user's real one is in Zero, which loads
	// well after the first render; starting from this instead of English avoids a language flash.
	locale?: string
}

const defaultSessionState: TldrawAppSessionState = {
	createdAt: Date.now(),
	_sidebarToggle: true,
	isSidebarOpenMobile: false,
	shareMenuActiveTab: 'share',
	sidebarActiveTab: 'recent',
	theme: 'light',
	colorTheme: 'default',
	views: {},
	flags: {},
	exportSettings: {
		exportFormat: 'png',
		exportTheme: 'auto',
		exportBackground: true,
		exportPadding: false,
	},
	sidebarWidth: 260,
}

let prev: TldrawAppSessionState = { ...defaultSessionState }

try {
	const stored = getFromLocalStorage(STORAGE_KEY)
	const prevStored = stored ? JSON.parse(stored) : null
	if (prevStored) {
		prev = {
			...prev,
			...(prevStored as TldrawAppSessionState),
			// forced initial values
			createdAt: Date.now(),
			isSidebarOpenMobile: false,
			auth: undefined,
		}
	}
} catch {
	// noop
}

const localSessionState = atom<TldrawAppSessionState>('session', prev)
const colorThemePreview = atom<string | null>('colorThemePreview', null)

export function getIsSidebarOpen() {
	return (
		localSessionState.get()._sidebarToggle &&
		globalEditor.get()?.getInstanceState().isFocusMode !== true
	)
}
export function useIsSidebarOpen() {
	return useValue('isSidebarOpen', getIsSidebarOpen, [])
}

export function getIsSidebarOpenMobile() {
	return localSessionState.get().isSidebarOpenMobile
}

export function useIsSidebarOpenMobile() {
	return useValue('isSidebarOpenMobile', getIsSidebarOpenMobile, [])
}

export function getDefaultSessionState() {
	return {
		...defaultSessionState,
		createdAt: Date.now(),
	}
}

export function clearLocalSessionState() {
	return deleteFromLocalStorage(STORAGE_KEY)
}

// we use this to help remove flashbangs on signout/signin
export function resetLocalSessionStateButKeepTheme() {
	const {
		theme: currentTheme,
		colorTheme,
		colorThemeBackground,
		locale,
	} = getLocalSessionStateUnsafe()
	clearLocalSessionState()
	const newState: TldrawAppSessionState = {
		...getDefaultSessionState(),
		theme: currentTheme,
		colorTheme: colorTheme ?? 'default',
		colorThemeBackground,
		locale,
	}
	localSessionState.set(newState)
	setInLocalStorage(STORAGE_KEY, JSON.stringify(newState))
}

export function getLocalSessionStateUnsafe() {
	return localSessionState.__unsafe__getWithoutCapture()
}

export function getLocalSessionState() {
	return localSessionState.get()
}

/**
 * The resolved light/dark theme the running app last mirrored to local storage (via
 * `SneakyDarkModeSync`), or null when this browser has no stored session. Signed-in theme changes
 * persist to the user's account record, not the SDK's global preferences, so this mirror is the only
 * copy readable outside the app's providers — e.g. the OAuth consent page. A missing session returns
 * null rather than the `light` default, so callers can fall back to the OS preference instead of
 * mistaking it for an explicit light choice.
 */
export function getStoredThemePreference(): 'light' | 'dark' | null {
	try {
		if (!getFromLocalStorage(STORAGE_KEY)) return null
	} catch {
		return null
	}
	return getLocalSessionState().theme
}

export function getColorThemePreview() {
	return colorThemePreview.get()
}

export function setColorThemePreview(themeId: string | null) {
	colorThemePreview.set(themeId)
}

export function toggleSidebar(open: boolean = !getIsSidebarOpen()) {
	transact(() => {
		if (open) {
			globalEditor.get()?.updateInstanceState({ isFocusMode: false })
		}
		updateLocalSessionState(() => {
			return { _sidebarToggle: open }
		})
	})
}

export function toggleMobileSidebar(open: boolean = !getIsSidebarOpenMobile()) {
	updateLocalSessionState(() => {
		return { isSidebarOpenMobile: open }
	})
}

export function getLastVisitedFileId(userId: string): string | null {
	const cached = getLocalSessionStateUnsafe().lastVisitedFile
	return cached?.userId === userId ? cached.fileId : null
}

export function setLastVisitedFile(userId: string, fileId: string) {
	updateLocalSessionState(() => ({ lastVisitedFile: { userId, fileId } }))
}

export function clearLastVisitedFile() {
	updateLocalSessionState(() => ({ lastVisitedFile: undefined }))
}

export function updateLocalSessionState(
	fn: (state: TldrawAppSessionState) => Partial<TldrawAppSessionState>
) {
	localSessionState.update((state) => {
		return { ...state, ...fn(state) }
	})
	setInLocalStorage(STORAGE_KEY, JSON.stringify(localSessionState.get()))
}
