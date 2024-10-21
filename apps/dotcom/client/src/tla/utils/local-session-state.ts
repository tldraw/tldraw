import { TldrawAppUser, TldrawAppUserId } from '@tldraw/dotcom-shared'
import { atom, getFromLocalStorage, setInLocalStorage, useValue } from 'tldraw'

const STORAGE_KEY = 'tldrawapp_session_3'

export interface TldrawAppSessionState {
	createdAt: number
	isSidebarOpen: boolean
	isSidebarOpenMobile: boolean
	auth?: {
		userId: TldrawAppUserId // null,
	}
	shareMenuActiveTab: 'share' | 'export'
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
		TldrawAppUser,
		'exportFormat' | 'exportTheme' | 'exportBackground' | 'exportPadding'
	>
}

let prev: TldrawAppSessionState = {
	createdAt: Date.now(),
	isSidebarOpen: true,
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
			isSidebarOpen: false,
			isSidebarOpenMobile: false,
			auth: undefined,
		}
	}
} catch (e) {
	// noop
}

const localSessionState = atom<TldrawAppSessionState>('session', prev)

export function getLocalSessionStateUnsafe() {
	return localSessionState.__unsafe__getWithoutCapture()
}

export function getLocalSessionState() {
	return localSessionState.get()
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
