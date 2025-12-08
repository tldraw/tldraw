import { deleteFromSessionStorage, getFromSessionStorage, setInSessionStorage } from 'tldraw'
import { SESSION_STORAGE_KEYS } from './session-storage'

export function setRedirectOnSignIn() {
	// Only set redirect if one doesn't already exist (e.g., explicitly set by pricing pages)
	const existingRedirect = getFromSessionStorage(SESSION_STORAGE_KEYS.REDIRECT)
	if (existingRedirect) {
		return
	}

	const path = window.location.pathname + window.location.search + window.location.hash
	if (path !== '/') {
		setInSessionStorage(SESSION_STORAGE_KEYS.REDIRECT, path)
	}
}

export function clearRedirectOnSignIn() {
	deleteFromSessionStorage(SESSION_STORAGE_KEYS.REDIRECT)
}
