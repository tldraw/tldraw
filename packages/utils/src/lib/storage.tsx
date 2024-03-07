/* eslint-disable no-restricted-syntax */

/**
 * Get a value from local storage.
 *
 * @param key - The key to get.
 *
 * @internal
 */
export function getFromLocalStorage(key: string) {
	try {
		return localStorage.getItem(key)
	} catch {
		return null
	}
}

/**
 * Set a value in local storage. Will not throw an error if localStorage is not available.
 *
 * @param key - The key to set.
 * @param value - The value to set.
 *
 * @internal
 */
export function setInLocalStorage(key: string, value: string) {
	try {
		localStorage.setItem(key, value)
	} catch {
		// noop
	}
}

/**
 * Remove a value from local storage. Will not throw an error if localStorage is not available.
 *
 * @param key - The key to set.
 *
 * @internal
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
 * @internal
 */
export function clearLocalStorage() {
	try {
		localStorage.clear()
	} catch {
		// noop
	}
}

/**
 * Get a value from session storage.
 *
 * @param key - The key to get.
 *
 * @internal
 */
export function getFromSessionStorage(key: string) {
	try {
		return sessionStorage.getItem(key)
	} catch {
		return null
	}
}

/**
 * Set a value in session storage. Will not throw an error if sessionStorage is not available.
 *
 * @param key - The key to set.
 * @param value - The value to set.
 *
 * @internal
 */
export function setInSessionStorage(key: string, value: string) {
	try {
		sessionStorage.setItem(key, value)
	} catch {
		// noop
	}
}

/**
 * Remove a value from session storage. Will not throw an error if sessionStorage is not available.
 *
 * @param key - The key to set.
 *
 * @internal
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
 * @internal
 */
export function clearSessionStorage() {
	try {
		sessionStorage.clear()
	} catch {
		// noop
	}
}
