const hasLocalStorage = typeof window === 'undefined' || !('localStorage' in window)

/**
 * Get a value from local storage.
 *
 * @param key - The key to get.
 * @param defaultValue - The default value to return if the key is not found or if local storage is not available.
 *
 * @public
 */
export function getFromLocalStorage(key: string, defaultValue = null) {
	if (!hasLocalStorage) return defaultValue
	// eslint-disable-next-line no-storage/no-browser-storage
	const value = localStorage.getItem(key)
	if (value === null) return defaultValue
	return JSON.parse(value)
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
	if (!hasLocalStorage) return
	// eslint-disable-next-line no-storage/no-browser-storage
	localStorage.setItem(key, JSON.stringify(value))
}
