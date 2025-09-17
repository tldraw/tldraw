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
}

let prev: TldrawAppSessionState = {
	createdAt: Date.now(),
	_sidebarToggle: true,
	isSidebarOpenMobile: false,
	shareMenuActiveTab: 'share',
	sidebarActiveTab: 'recent',
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
