import { deleteFromSessionStorage, setInSessionStorage } from 'tldraw'

const REDIRECT_KEY = 'redirect-to'

export function setRedirectOnSignIn() {
	const path = window.location.pathname + window.location.search + window.location.hash
	if (path !== '/') {
		setInSessionStorage(REDIRECT_KEY, path)
	}
}

export function clearRedirectOnSignIn() {
	deleteFromSessionStorage(REDIRECT_KEY)
}
