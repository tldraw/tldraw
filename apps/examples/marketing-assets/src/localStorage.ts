// Small wrappers around localStorage that don't throw in private-mode / blocked
// storage, used to remember which room this browser landed in.

export function getLocalStorageItem(key: string): string | null {
	try {
		return localStorage.getItem(key)
	} catch {
		return null
	}
}

export function setLocalStorageItem(key: string, value: string): void {
	try {
		localStorage.setItem(key, value)
	} catch {
		// ignore — storage may be unavailable
	}
}
