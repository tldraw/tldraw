/* eslint-disable no-storage/no-browser-storage */

/**
 * Get a value from local storage.
 *
 * @param key - The key to get.
 * @param defaultValue - The default value to return if the key is not found or if local storage is not available.
 *
 * @public
 */
export function getFromLocalStorage(key: string, defaultValue: any = null) {
	try {
		const value = localStorage.getItem(key)
		if (value === null) return defaultValue
		return JSON.parse(value)
	} catch {
		return defaultValue
	}
}

/**
 * Set a value in local storage. Will not throw an error if localStorage is not available.
 *
 * @param key - The key to set.
 * @param value - The value to set.
 *
 * @public
 */
export function setInLocalStorage(key: string, value: any) {
	try {
		localStorage.setItem(key, JSON.stringify(value))
	} catch {
		// noop
	}
}

/**
 * Remove a value from local storage. Will not throw an error if localStorage is not available.
 *
 * @param key - The key to set.
 *
 * @public
 */
export function deleteFromLocalStorage(key: string) {
	try {
		localStorage.removeItem(key)
	} catch {
		// noop
	}
}

/**
 * Clear all values from local storage. Will not throw an error if localStorage is not available.
 *
 * @public
 */
export function clearLocalStorage() {
	try {
		localStorage.clear()
	} catch {
		// noop
	}
}
