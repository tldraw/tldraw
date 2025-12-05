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
	fairyManualActiveTab: 'introduction' | 'usage' | 'about'
	theme: 'light' | 'dark'
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
	fairiesEnabled?: boolean
	fairiesDebugEnabled?: boolean
	hasManualBeenOpened?: boolean
}

let prev: TldrawAppSessionState = {
	createdAt: Date.now(),
	_sidebarToggle: true,
	isSidebarOpenMobile: false,
	shareMenuActiveTab: 'share',
	sidebarActiveTab: 'recent',
	fairyManualActiveTab: 'introduction',
	theme: 'light',
	views: {},
	flags: {},
	exportSettings: {
		exportFormat: 'png',
		exportTheme: 'auto',
		exportBackground: true,
		exportPadding: true,
	},
	sidebarWidth: 260,
	fairiesEnabled: true,
	fairiesDebugEnabled: false,
	hasManualBeenOpened: false,
}

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

export function clearLocalSessionState() {
	return deleteFromLocalStorage(STORAGE_KEY)
}
export function getLocalSessionStateUnsafe() {
	return localSessionState.__unsafe__getWithoutCapture()
}

export function getLocalSessionState() {
	return localSessionState.get()
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

export function setLocalSessionState(state: TldrawAppSessionState) {
	localSessionState.set(state)
	setInLocalStorage(STORAGE_KEY, JSON.stringify(localSessionState.get()))
}

export function updateLocalSessionState(
	fn: (state: TldrawAppSessionState) => Partial<TldrawAppSessionState>
) {
	localSessionState.update((state) => {
		return { ...state, ...fn(state) }
	})
	setInLocalStorage(STORAGE_KEY, JSON.stringify(localSessionState.get()))
}

export function useLocalSessionState() {
	return useValue('session', () => getLocalSessionState(), [])
}

export function getAreFairiesEnabled() {
	return localSessionState.get().fairiesEnabled ?? true
}

export function useAreFairiesEnabled() {
	return useValue('areFairiesEnabled', getAreFairiesEnabled, [])
}

export function toggleFairies(enabled?: boolean) {
	const nextEnabled = enabled ?? !getAreFairiesEnabled()
	updateLocalSessionState(() => {
		return { fairiesEnabled: nextEnabled }
	})
}

export function getAreFairiesDebugEnabled() {
	return localSessionState.get().fairiesDebugEnabled ?? false
}

export function useAreFairiesDebugEnabled() {
	return useValue('areFairiesDebugEnabled', getAreFairiesDebugEnabled, [])
}

export function toggleFairiesDebug(enabled?: boolean) {
	const nextEnabled = enabled ?? !getAreFairiesDebugEnabled()
	updateLocalSessionState(() => {
		return { fairiesDebugEnabled: nextEnabled }
	})
}

export function getHasManualBeenOpened() {
	return localSessionState.get().hasManualBeenOpened ?? false
}

export function useHasManualBeenOpened() {
	return useValue('hasManualBeenOpened', getHasManualBeenOpened, [])
}

export function markManualAsOpened() {
	updateLocalSessionState(() => {
		return { hasManualBeenOpened: true }
	})
}
