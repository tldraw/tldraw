/* eslint-disable no-storage/no-browser-storage */

/**
 * Get a value from session storage.
 *
 * @param key - The key to get.
 * @param defaultValue - The default value to return if the key is not found or if session storage is not available.
 *
 * @public
 */
export function getFromSessionStorage(key: string, defaultValue = null) {
	try {
		const value = sessionStorage.getItem(key)
		if (value === null) return defaultValue
		return JSON.parse(value)
	} catch {
		return defaultValue
	}
}

/**
 * Set a value in session storage. Will not throw an error if sessionStorage is not available.
 *
 * @param key - The key to set.
 * @param value - The value to set.
 *
 * @public
 */
export function setInSessionStorage(key: string, value: any) {
	try {
		sessionStorage.setItem(key, JSON.stringify(value))
	} catch {
		// noop
	}
}

/**
 * Remove a value from session storage. Will not throw an error if sessionStorage is not available.
 *
 * @param key - The key to set.
 *
 * @public
 */
export function deleteFromSessionStorage(key: string) {
	try {
		sessionStorage.removeItem(key)
	} catch {
		// noop
	}
}

/**
 * Clear all values from session storage. Will not throw an error if sessionStorage is not available.
 *
 * @public
 */
export function clearSessionStorage() {
	try {
		sessionStorage.clear()
	} catch {
		// noop
	}
}
