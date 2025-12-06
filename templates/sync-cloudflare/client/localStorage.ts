/**
 * Safe localStorage helpers that handle cases where localStorage is not available
 * or access is restricted by the browser.
 */

export function getLocalStorageItem(key: string): string | null {
	try {
		return localStorage.getItem(key)
	} catch (error) {
		console.warn('Failed to access localStorage:', error)
		return null
	}
}

export function setLocalStorageItem(key: string, value: string): void {
	try {
		localStorage.setItem(key, value)
	} catch (error) {
		console.warn('Failed to set localStorage item:', error)
	}
}

export function removeLocalStorageItem(key: string): void {
	try {
		localStorage.removeItem(key)
	} catch (error) {
		console.warn('Failed to remove localStorage item:', error)
	}
}
