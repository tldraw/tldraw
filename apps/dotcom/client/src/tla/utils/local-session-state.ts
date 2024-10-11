import { TldrawAppUser, TldrawAppUserId } from '@tldraw/dotcom-shared'
import { atom, getFromLocalStorage, setInLocalStorage, useValue } from 'tldraw'

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
	preferences: Pick<
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
	preferences: {
		exportFormat: 'png',
		exportTheme: 'auto',
		exportBackground: true,
		exportPadding: true,
	},
}

try {
	const stored = getFromLocalStorage('tldrawapp_session_2')
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
	setInLocalStorage('tldrawapp_session_2', JSON.stringify(localSessionState.get()))
}

export function updateLocalSessionState(
	fn: (state: TldrawAppSessionState) => Partial<TldrawAppSessionState>
) {
	localSessionState.update((state) => ({ ...state, ...fn(state) }))
	setInLocalStorage('tldrawapp_session_2', JSON.stringify(localSessionState.get()))
}

export function useLocalSessionState() {
	return useValue('session', () => getLocalSessionState(), [])
}
