import { createContext, useContext } from 'react'
import { assertExists, atom } from 'tldraw'
import { TldrawApp } from '../app/TldrawApp'

export const appContext = createContext<TldrawApp | null>(null)
// Anonymous trees never mount the provider, so they read the default: not loading.
export const appLoadingContext = createContext(false)

export const isClientTooOld$ = atom('isClientTooOld', false)

// The one source for the app; the React context below is derived from it. Code that runs before
// the app exists but must pick it up without remounting (the presence user store behind the sync
// socket) reads this directly.
export const currentApp$ = atom<TldrawApp | null>('currentApp', null)

export function useMaybeApp() {
	return useContext(appContext)
}

/**
 * True between mount and the app resolving for a signed-in user. `useMaybeApp()` alone cannot
 * tell a signed-out visitor from a signed-in user whose Zero preload is still running.
 */
export function useIsAppLoading() {
	return useContext(appLoadingContext)
}
export function useApp(): TldrawApp {
	return assertExists(useContext(appContext), 'useApp must be used within AppStateProvider')
}
