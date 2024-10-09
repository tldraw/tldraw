import { atom, getFromLocalStorage, setInLocalStorage, useValue } from 'tldraw'
import { TldrawAppSessionState } from '../utils/db-schema'

let prev: TldrawAppSessionState = {
	createdAt: Date.now(),
	isSidebarOpen: true,
	isSidebarOpenMobile: false,
	shareMenuActiveTab: 'share',
	sidebarActiveTab: 'recent',
	theme: 'light',
	flags: {},
}

try {
	const stored = getFromLocalStorage('tldrawapp_session_2')
	const prevStored = stored ? JSON.parse(stored) : null
	if (prevStored) {
		prev = { ...prev, ...(prevStored as TldrawAppSessionState) }
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
