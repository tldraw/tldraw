import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { warnDeprecatedGetter, warnOnce } from './warn'

describe('warning utilities', () => {
	let consoleSpy: ReturnType<typeof vi.spyOn>

	beforeEach(() => {
		// Mock console.warn to capture output
		consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
	})

	afterEach(() => {
		// Restore console.warn
		consoleSpy.mockRestore()
	})

	describe('warnOnce', () => {
		it('logs warning message with tldraw prefix', () => {
			const message = 'This is a test warning'

			warnOnce(message)

			expect(consoleSpy).toHaveBeenCalledTimes(1)
			expect(consoleSpy).toHaveBeenCalledWith('[tldraw] This is a test warning')
		})

		it('only logs the same message once', () => {
			const message = 'Duplicate warning test - unique 1'

			warnOnce(message)
			warnOnce(message)
			warnOnce(message)

			expect(consoleSpy).toHaveBeenCalledTimes(1)
			expect(consoleSpy).toHaveBeenCalledWith('[tldraw] Duplicate warning test - unique 1')
		})

		it('logs different messages separately', () => {
			const message1 = 'First warning - unique 2a'
			const message2 = 'Second warning - unique 2b'

			warnOnce(message1)
			warnOnce(message2)
			warnOnce(message1) // Should not log again
			warnOnce(message2) // Should not log again

			expect(consoleSpy).toHaveBeenCalledTimes(2)
			expect(consoleSpy).toHaveBeenNthCalledWith(1, '[tldraw] First warning - unique 2a')
			expect(consoleSpy).toHaveBeenNthCalledWith(2, '[tldraw] Second warning - unique 2b')
		})

		it('handles empty string messages', () => {
			warnOnce('')

			expect(consoleSpy).toHaveBeenCalledTimes(1)
			expect(consoleSpy).toHaveBeenCalledWith('[tldraw] ')
		})

		it('handles messages with special characters', () => {
			const specialMessage = 'Warning with "quotes" and \\backslashes\\ and newlines\n - unique 4'

			warnOnce(specialMessage)

			expect(consoleSpy).toHaveBeenCalledTimes(1)
			expect(consoleSpy).toHaveBeenCalledWith(
				'[tldraw] Warning with "quotes" and \\backslashes\\ and newlines\n - unique 4'
			)
		})

		it('handles very long messages', () => {
			const longMessage = 'A'.repeat(1000) + ' - unique 5'

			warnOnce(longMessage)

			expect(consoleSpy).toHaveBeenCalledTimes(1)
			expect(consoleSpy).toHaveBeenCalledWith(`[tldraw] ${longMessage}`)
		})

		it('maintains unique message tracking across multiple calls', () => {
			warnOnce('Message A - unique 6a')
			warnOnce('Message B - unique 6b')
			warnOnce('Message A - unique 6a') // Should not log
			warnOnce('Message C - unique 6c')
			warnOnce('Message B - unique 6b') // Should not log

			expect(consoleSpy).toHaveBeenCalledTimes(3)
			expect(consoleSpy).toHaveBeenNthCalledWith(1, '[tldraw] Message A - unique 6a')
			expect(consoleSpy).toHaveBeenNthCalledWith(2, '[tldraw] Message B - unique 6b')
			expect(consoleSpy).toHaveBeenNthCalledWith(3, '[tldraw] Message C - unique 6c')
		})
	})

	describe('warnDeprecatedGetter', () => {
		it('generates correct deprecation warning for simple property name', () => {
			warnDeprecatedGetter('viewport1')

			expect(consoleSpy).toHaveBeenCalledTimes(1)
			expect(consoleSpy).toHaveBeenCalledWith(
				"[tldraw] Using 'viewport1' is deprecated and will be removed in the near future. Please refactor to use 'getViewport1' instead."
			)
		})

		it('correctly capitalizes first letter of property name', () => {
			warnDeprecatedGetter('camera2')

			expect(consoleSpy).toHaveBeenCalledTimes(1)
			expect(consoleSpy).toHaveBeenCalledWith(
				"[tldraw] Using 'camera2' is deprecated and will be removed in the near future. Please refactor to use 'getCamera2' instead."
			)
		})

		it('handles property names with multiple words', () => {
			warnDeprecatedGetter('currentPage3')

			expect(consoleSpy).toHaveBeenCalledTimes(1)
			expect(consoleSpy).toHaveBeenCalledWith(
				"[tldraw] Using 'currentPage3' is deprecated and will be removed in the near future. Please refactor to use 'getCurrentPage3' instead."
			)
		})

		it('handles single character property names', () => {
			warnDeprecatedGetter('x')

			expect(consoleSpy).toHaveBeenCalledTimes(1)
			expect(consoleSpy).toHaveBeenCalledWith(
				"[tldraw] Using 'x' is deprecated and will be removed in the near future. Please refactor to use 'getX' instead."
			)
		})

		it('only shows the same deprecation warning once', () => {
			const propName = 'viewport4'
			warnDeprecatedGetter(propName)
			warnDeprecatedGetter(propName)
			warnDeprecatedGetter(propName)

			expect(consoleSpy).toHaveBeenCalledTimes(1)
			expect(consoleSpy).toHaveBeenCalledWith(
				"[tldraw] Using 'viewport4' is deprecated and will be removed in the near future. Please refactor to use 'getViewport4' instead."
			)
		})

		it('shows different property deprecation warnings separately', () => {
			warnDeprecatedGetter('viewport5')
			warnDeprecatedGetter('camera5')
			warnDeprecatedGetter('viewport5') // Should not log again

			expect(consoleSpy).toHaveBeenCalledTimes(2)
			expect(consoleSpy).toHaveBeenNthCalledWith(
				1,
				"[tldraw] Using 'viewport5' is deprecated and will be removed in the near future. Please refactor to use 'getViewport5' instead."
			)
			expect(consoleSpy).toHaveBeenNthCalledWith(
				2,
				"[tldraw] Using 'camera5' is deprecated and will be removed in the near future. Please refactor to use 'getCamera5' instead."
			)
		})

		it('handles property names starting with uppercase', () => {
			warnDeprecatedGetter('Transform6')

			expect(consoleSpy).toHaveBeenCalledTimes(1)
			expect(consoleSpy).toHaveBeenCalledWith(
				"[tldraw] Using 'Transform6' is deprecated and will be removed in the near future. Please refactor to use 'getTransform6' instead."
			)
		})

		it('handles property names with numbers', () => {
			warnDeprecatedGetter('page27')

			expect(consoleSpy).toHaveBeenCalledTimes(1)
			expect(consoleSpy).toHaveBeenCalledWith(
				"[tldraw] Using 'page27' is deprecated and will be removed in the near future. Please refactor to use 'getPage27' instead."
			)
		})

		it('handles empty string property name gracefully', () => {
			// This tests the edge case behavior - the function should handle it without crashing
			expect(() => warnDeprecatedGetter('')).toThrow()
		})
	})

	describe('integration between warnOnce and warnDeprecatedGetter', () => {
		it('both functions work together without interference', () => {
			warnOnce('Custom warning message - unique 8a')
			warnDeprecatedGetter('viewport8')
			warnOnce('Another custom message - unique 8b')
			warnDeprecatedGetter('camera8')

			expect(consoleSpy).toHaveBeenCalledTimes(4)
			expect(consoleSpy).toHaveBeenNthCalledWith(1, '[tldraw] Custom warning message - unique 8a')
			expect(consoleSpy).toHaveBeenNthCalledWith(
				2,
				"[tldraw] Using 'viewport8' is deprecated and will be removed in the near future. Please refactor to use 'getViewport8' instead."
			)
			expect(consoleSpy).toHaveBeenNthCalledWith(3, '[tldraw] Another custom message - unique 8b')
			expect(consoleSpy).toHaveBeenNthCalledWith(
				4,
				"[tldraw] Using 'camera8' is deprecated and will be removed in the near future. Please refactor to use 'getCamera8' instead."
			)
		})

		it('duplicate messages from different functions are still deduplicated', () => {
			const customMessage =
				"Using 'viewport9' is deprecated and will be removed in the near future. Please refactor to use 'getViewport9' instead."

			warnOnce(customMessage)
			warnDeprecatedGetter('viewport9') // Should not log (same message)

			expect(consoleSpy).toHaveBeenCalledTimes(1)
			expect(consoleSpy).toHaveBeenCalledWith(`[tldraw] ${customMessage}`)
		})
	})

	describe('edge cases', () => {
		it('handles consecutive calls with rapid succession', () => {
			const message = 'Rapid succession test - unique 10'

			// Simulate rapid calls
			for (let i = 0; i < 100; i++) {
				warnOnce(message)
			}

			expect(consoleSpy).toHaveBeenCalledTimes(1)
			expect(consoleSpy).toHaveBeenCalledWith('[tldraw] Rapid succession test - unique 10')
		})

		it('handles mixed message types in sequence', () => {
			warnOnce('Custom message 1 - unique 11a')
			warnDeprecatedGetter('prop11a')
			warnOnce('Custom message 2 - unique 11b')
			warnDeprecatedGetter('prop11b')
			warnOnce('Custom message 1 - unique 11a') // Duplicate
			warnDeprecatedGetter('prop11a') // Duplicate

			expect(consoleSpy).toHaveBeenCalledTimes(4)
		})

		it('preserves functionality when console.warn is undefined', () => {
			// Temporarily remove console.warn
			const originalWarn = console.warn
			// @ts-expect-error - Intentionally testing undefined console.warn
			console.warn = undefined

			expect(() => {
				warnOnce('Test with no console.warn')
			}).toThrow()

			// Restore console.warn
			console.warn = originalWarn
		})

		it('handles unicode property names in deprecation warnings', () => {
			warnDeprecatedGetter('café12')

			expect(consoleSpy).toHaveBeenCalledTimes(1)
			expect(consoleSpy).toHaveBeenCalledWith(
				"[tldraw] Using 'café12' is deprecated and will be removed in the near future. Please refactor to use 'getCafé12' instead."
			)
		})

		it('maintains separate tracking for messages with similar content', () => {
			warnOnce('Similar message A - unique 13a')
			warnOnce('Similar message B - unique 13b')
			warnOnce('Similar message A - unique 13a') // Should not log again

			expect(consoleSpy).toHaveBeenCalledTimes(2)
			expect(consoleSpy).toHaveBeenNthCalledWith(1, '[tldraw] Similar message A - unique 13a')
			expect(consoleSpy).toHaveBeenNthCalledWith(2, '[tldraw] Similar message B - unique 13b')
		})
	})
})
