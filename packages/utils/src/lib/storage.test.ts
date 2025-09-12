/* eslint-disable no-restricted-syntax */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	clearLocalStorage,
	clearSessionStorage,
	deleteFromLocalStorage,
	deleteFromSessionStorage,
	getFromLocalStorage,
	getFromSessionStorage,
	setInLocalStorage,
	setInSessionStorage,
} from './storage'

describe('storage', () => {
	// Store original implementations
	const originalLocalStorage = global.localStorage
	const originalSessionStorage = global.sessionStorage

	beforeEach(() => {
		// Mock localStorage
		const localStorageMock = {
			getItem: vi.fn(),
			setItem: vi.fn(),
			removeItem: vi.fn(),
			clear: vi.fn(),
		}
		global.localStorage = localStorageMock as any

		// Mock sessionStorage
		const sessionStorageMock = {
			getItem: vi.fn(),
			setItem: vi.fn(),
			removeItem: vi.fn(),
			clear: vi.fn(),
		}
		global.sessionStorage = sessionStorageMock as any
	})

	afterEach(() => {
		// Restore original implementations
		global.localStorage = originalLocalStorage
		global.sessionStorage = originalSessionStorage
		vi.clearAllMocks()
	})

	describe('localStorage functions', () => {
		describe('getFromLocalStorage', () => {
			it('should return value when localStorage.getItem succeeds', () => {
				const mockValue = 'test-value'
				;(localStorage.getItem as any).mockReturnValue(mockValue)

				const result = getFromLocalStorage('test-key')

				expect(localStorage.getItem).toHaveBeenCalledWith('test-key')
				expect(result).toBe(mockValue)
			})

			it('should return null when localStorage.getItem returns null', () => {
				;(localStorage.getItem as any).mockReturnValue(null)

				const result = getFromLocalStorage('nonexistent-key')

				expect(localStorage.getItem).toHaveBeenCalledWith('nonexistent-key')
				expect(result).toBe(null)
			})

			it('should return null when localStorage.getItem throws an error', () => {
				;(localStorage.getItem as any).mockImplementation(() => {
					throw new Error('Storage not available')
				})

				const result = getFromLocalStorage('test-key')

				expect(localStorage.getItem).toHaveBeenCalledWith('test-key')
				expect(result).toBe(null)
			})

			it('should handle empty string values', () => {
				;(localStorage.getItem as any).mockReturnValue('')

				const result = getFromLocalStorage('empty-key')

				expect(result).toBe('')
			})
		})

		describe('setInLocalStorage', () => {
			it('should call localStorage.setItem with correct parameters', () => {
				setInLocalStorage('test-key', 'test-value')

				expect(localStorage.setItem).toHaveBeenCalledWith('test-key', 'test-value')
			})

			it('should not throw when localStorage.setItem throws an error', () => {
				;(localStorage.setItem as any).mockImplementation(() => {
					throw new Error('Quota exceeded')
				})

				expect(() => setInLocalStorage('test-key', 'test-value')).not.toThrow()
				expect(localStorage.setItem).toHaveBeenCalledWith('test-key', 'test-value')
			})

			it('should handle empty string values', () => {
				setInLocalStorage('empty-key', '')

				expect(localStorage.setItem).toHaveBeenCalledWith('empty-key', '')
			})

			it('should handle JSON stringified objects', () => {
				const obj = { theme: 'dark', language: 'en' }
				const jsonString = JSON.stringify(obj)

				setInLocalStorage('preferences', jsonString)

				expect(localStorage.setItem).toHaveBeenCalledWith('preferences', jsonString)
			})
		})

		describe('deleteFromLocalStorage', () => {
			it('should call localStorage.removeItem with correct key', () => {
				deleteFromLocalStorage('test-key')

				expect(localStorage.removeItem).toHaveBeenCalledWith('test-key')
			})

			it('should not throw when localStorage.removeItem throws an error', () => {
				;(localStorage.removeItem as any).mockImplementation(() => {
					throw new Error('Storage not available')
				})

				expect(() => deleteFromLocalStorage('test-key')).not.toThrow()
				expect(localStorage.removeItem).toHaveBeenCalledWith('test-key')
			})

			it('should handle non-existent keys gracefully', () => {
				deleteFromLocalStorage('nonexistent-key')

				expect(localStorage.removeItem).toHaveBeenCalledWith('nonexistent-key')
			})
		})

		describe('clearLocalStorage', () => {
			it('should call localStorage.clear', () => {
				clearLocalStorage()

				expect(localStorage.clear).toHaveBeenCalled()
			})

			it('should not throw when localStorage.clear throws an error', () => {
				;(localStorage.clear as any).mockImplementation(() => {
					throw new Error('Storage not available')
				})

				expect(() => clearLocalStorage()).not.toThrow()
				expect(localStorage.clear).toHaveBeenCalled()
			})
		})
	})

	describe('sessionStorage functions', () => {
		describe('getFromSessionStorage', () => {
			it('should return value when sessionStorage.getItem succeeds', () => {
				const mockValue = 'session-value'
				;(sessionStorage.getItem as any).mockReturnValue(mockValue)

				const result = getFromSessionStorage('session-key')

				expect(sessionStorage.getItem).toHaveBeenCalledWith('session-key')
				expect(result).toBe(mockValue)
			})

			it('should return null when sessionStorage.getItem returns null', () => {
				;(sessionStorage.getItem as any).mockReturnValue(null)

				const result = getFromSessionStorage('nonexistent-key')

				expect(sessionStorage.getItem).toHaveBeenCalledWith('nonexistent-key')
				expect(result).toBe(null)
			})

			it('should return null when sessionStorage.getItem throws an error', () => {
				;(sessionStorage.getItem as any).mockImplementation(() => {
					throw new Error('Storage not available')
				})

				const result = getFromSessionStorage('session-key')

				expect(sessionStorage.getItem).toHaveBeenCalledWith('session-key')
				expect(result).toBe(null)
			})

			it('should handle empty string values', () => {
				;(sessionStorage.getItem as any).mockReturnValue('')

				const result = getFromSessionStorage('empty-key')

				expect(result).toBe('')
			})
		})

		describe('setInSessionStorage', () => {
			it('should call sessionStorage.setItem with correct parameters', () => {
				setInSessionStorage('session-key', 'session-value')

				expect(sessionStorage.setItem).toHaveBeenCalledWith('session-key', 'session-value')
			})

			it('should not throw when sessionStorage.setItem throws an error', () => {
				;(sessionStorage.setItem as any).mockImplementation(() => {
					throw new Error('Quota exceeded')
				})

				expect(() => setInSessionStorage('session-key', 'session-value')).not.toThrow()
				expect(sessionStorage.setItem).toHaveBeenCalledWith('session-key', 'session-value')
			})

			it('should handle empty string values', () => {
				setInSessionStorage('empty-key', '')

				expect(sessionStorage.setItem).toHaveBeenCalledWith('empty-key', '')
			})

			it('should handle JSON stringified objects', () => {
				const obj = { x: 100, y: 200 }
				const jsonString = JSON.stringify(obj)

				setInSessionStorage('temp-data', jsonString)

				expect(sessionStorage.setItem).toHaveBeenCalledWith('temp-data', jsonString)
			})
		})

		describe('deleteFromSessionStorage', () => {
			it('should call sessionStorage.removeItem with correct key', () => {
				deleteFromSessionStorage('session-key')

				expect(sessionStorage.removeItem).toHaveBeenCalledWith('session-key')
			})

			it('should not throw when sessionStorage.removeItem throws an error', () => {
				;(sessionStorage.removeItem as any).mockImplementation(() => {
					throw new Error('Storage not available')
				})

				expect(() => deleteFromSessionStorage('session-key')).not.toThrow()
				expect(sessionStorage.removeItem).toHaveBeenCalledWith('session-key')
			})

			it('should handle non-existent keys gracefully', () => {
				deleteFromSessionStorage('nonexistent-key')

				expect(sessionStorage.removeItem).toHaveBeenCalledWith('nonexistent-key')
			})
		})

		describe('clearSessionStorage', () => {
			it('should call sessionStorage.clear', () => {
				clearSessionStorage()

				expect(sessionStorage.clear).toHaveBeenCalled()
			})

			it('should not throw when sessionStorage.clear throws an error', () => {
				;(sessionStorage.clear as any).mockImplementation(() => {
					throw new Error('Storage not available')
				})

				expect(() => clearSessionStorage()).not.toThrow()
				expect(sessionStorage.clear).toHaveBeenCalled()
			})
		})
	})

	describe('edge cases and error scenarios', () => {
		it('should handle undefined localStorage gracefully', () => {
			// Testing edge case where localStorage is undefined
			global.localStorage = undefined as any

			expect(() => getFromLocalStorage('key')).not.toThrow()
			expect(() => setInLocalStorage('key', 'value')).not.toThrow()
			expect(() => deleteFromLocalStorage('key')).not.toThrow()
			expect(() => clearLocalStorage()).not.toThrow()

			expect(getFromLocalStorage('key')).toBe(null)
		})

		it('should handle undefined sessionStorage gracefully', () => {
			// Testing edge case where sessionStorage is undefined
			global.sessionStorage = undefined as any

			expect(() => getFromSessionStorage('key')).not.toThrow()
			expect(() => setInSessionStorage('key', 'value')).not.toThrow()
			expect(() => deleteFromSessionStorage('key')).not.toThrow()
			expect(() => clearSessionStorage()).not.toThrow()

			expect(getFromSessionStorage('key')).toBe(null)
		})

		it('should handle privacy mode or incognito scenarios', () => {
			// Simulate privacy mode where storage operations throw
			;(localStorage.setItem as any).mockImplementation(() => {
				throw new DOMException('QuotaExceededError')
			})
			;(localStorage.getItem as any).mockImplementation(() => {
				throw new DOMException('SecurityError')
			})

			expect(() => setInLocalStorage('key', 'value')).not.toThrow()
			expect(getFromLocalStorage('key')).toBe(null)
		})

		it('should handle very long keys and values', () => {
			const longKey = 'k'.repeat(1000)
			const longValue = 'v'.repeat(10000)

			expect(() => setInLocalStorage(longKey, longValue)).not.toThrow()
			expect(() => setInSessionStorage(longKey, longValue)).not.toThrow()

			expect(localStorage.setItem).toHaveBeenCalledWith(longKey, longValue)
			expect(sessionStorage.setItem).toHaveBeenCalledWith(longKey, longValue)
		})

		it('should handle special characters in keys and values', () => {
			const specialKey = 'key-with-特殊字符-and-emoji-🎨'
			const specialValue = 'value-with-新ライン\n\r\t特殊字符-📝'

			expect(() => setInLocalStorage(specialKey, specialValue)).not.toThrow()
			expect(() => setInSessionStorage(specialKey, specialValue)).not.toThrow()

			expect(localStorage.setItem).toHaveBeenCalledWith(specialKey, specialValue)
			expect(sessionStorage.setItem).toHaveBeenCalledWith(specialKey, specialValue)
		})
	})

	describe('integration scenarios', () => {
		it('should handle typical user preference workflow', () => {
			const preferences = { theme: 'dark', language: 'en', fontSize: '16px' }
			const prefsJson = JSON.stringify(preferences)

			// Set preferences
			setInLocalStorage('user-preferences', prefsJson)
			expect(localStorage.setItem).toHaveBeenCalledWith('user-preferences', prefsJson)

			// Get preferences
			;(localStorage.getItem as any).mockReturnValue(prefsJson)
			const retrieved = getFromLocalStorage('user-preferences')
			expect(retrieved).toBe(prefsJson)

			// Update preferences (simulate partial update)
			const updatedPrefs = { ...preferences, theme: 'light' }
			const updatedJson = JSON.stringify(updatedPrefs)
			setInLocalStorage('user-preferences', updatedJson)
			expect(localStorage.setItem).toHaveBeenLastCalledWith('user-preferences', updatedJson)

			// Clear preferences
			deleteFromLocalStorage('user-preferences')
			expect(localStorage.removeItem).toHaveBeenCalledWith('user-preferences')
		})

		it('should handle session-based workflow', () => {
			// Set session data
			setInSessionStorage('current-tool', 'select')
			setInSessionStorage('canvas-position', JSON.stringify({ x: 100, y: 200 }))

			expect(sessionStorage.setItem).toHaveBeenCalledWith('current-tool', 'select')
			expect(sessionStorage.setItem).toHaveBeenCalledWith(
				'canvas-position',
				JSON.stringify({ x: 100, y: 200 })
			)

			// Simulate session cleanup
			clearSessionStorage()
			expect(sessionStorage.clear).toHaveBeenCalled()
		})

		it('should handle mixed localStorage and sessionStorage usage', () => {
			// Long-term preference
			setInLocalStorage('theme', 'dark')
			expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark')

			// Session-specific state
			setInSessionStorage('current-selection', JSON.stringify(['shape1', 'shape2']))
			expect(sessionStorage.setItem).toHaveBeenCalledWith(
				'current-selection',
				JSON.stringify(['shape1', 'shape2'])
			)

			// Verify both can be retrieved
			;(localStorage.getItem as any).mockReturnValue('dark')
			;(sessionStorage.getItem as any).mockReturnValue(JSON.stringify(['shape1', 'shape2']))

			expect(getFromLocalStorage('theme')).toBe('dark')
			expect(getFromSessionStorage('current-selection')).toBe(JSON.stringify(['shape1', 'shape2']))
		})
	})
})
