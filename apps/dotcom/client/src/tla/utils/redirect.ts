import { deleteFromSessionStorage, setInSessionStorage } from 'tldraw'
import { SESSION_STORAGE_KEYS } from './session-storage'

export function setRedirect(path: string) {
	setInSessionStorage(SESSION_STORAGE_KEYS.REDIRECT, path)
}

export function setRedirectOnSignIn() {
	const path = window.location.pathname + window.location.search + window.location.hash
	if (path !== '/') {
		setRedirect(path)
	}
}

export function clearRedirectOnSignIn() {
	deleteFromSessionStorage(SESSION_STORAGE_KEYS.REDIRECT)
}
