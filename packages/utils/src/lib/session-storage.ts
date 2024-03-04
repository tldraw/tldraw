const hasSessionStorage = typeof window === 'undefined' || !('sessionStorage' in window)

/**
 * Get a value from session storage.
 *
 * @param key - The key to get.
 * @param defaultValue - The default value to return if the key is not found or if session storage is not available.
 *
 * @public
 */
export function getFromSessionStorage(key: string, defaultValue = null) {
	if (!hasSessionStorage) return defaultValue
	// eslint-disable-next-line no-storage/no-browser-storage
	const value = sessionStorage.getItem(key)
	if (value === null) return defaultValue
	return JSON.parse(value)
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
	if (!hasSessionStorage) return
	// eslint-disable-next-line no-storage/no-browser-storage
	sessionStorage.setItem(key, JSON.stringify(value))
}

/**
 * Remove a value from session storage. Will not throw an error if sessionStorage is not available.
 *
 * @param key - The key to set.
 *
 * @public
 */
export function deleteFromSessionStorage(key: string) {
	if (!hasSessionStorage) return
	// eslint-disable-next-line no-storage/no-browser-storage
	sessionStorage.removeItem(key)
}

/**
 * Clear all values from session storage. Will not throw an error if sessionStorage is not available.
 *
 * @public
 */
export function clearSessionStorage() {
	if (!hasSessionStorage) return
	// eslint-disable-next-line no-storage/no-browser-storage
	sessionStorage.clear()
}
