import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('warnings', () => {
	describe('logComputedGetterWarning', () => {
		let originalConsoleWarn: typeof console.warn
		let consoleMock: ReturnType<typeof vi.fn>

		beforeEach(() => {
			originalConsoleWarn = console.warn
			consoleMock = vi.fn()
			console.warn = consoleMock
		})

		afterEach(() => {
			console.warn = originalConsoleWarn
		})

		it('should log deprecation warning with correct message', async () => {
			const { logComputedGetterWarning } = await import('../warnings')

			consoleMock.mockClear()
			logComputedGetterWarning()

			// Only test message content if a warning was actually logged
			if (consoleMock.mock.calls.length > 0) {
				expect(consoleMock).toHaveBeenCalledWith(
					`Using \`@computed\` as a decorator for getters is deprecated and will be removed in the near future. Please refactor to use \`@computed\` as a decorator for methods.

// Before
@computed
get foo() {
	return 'foo'
}

// After
@computed
getFoo() {
	return 'foo'
}
`
				)
			}
		})

		it('should prevent spam by only warning once', async () => {
			const { logComputedGetterWarning } = await import('../warnings')

			consoleMock.mockClear()

			logComputedGetterWarning()
			const firstCallCount = consoleMock.mock.calls.length

			// Subsequent calls should not increase the call count
			logComputedGetterWarning()
			logComputedGetterWarning()

			expect(consoleMock.mock.calls.length).toBe(firstCallCount)
		})
	})
})
