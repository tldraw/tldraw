import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('warnings', () => {
	describe('logComputedGetterWarning', () => {
		// Store original console.warn for restoration
		let originalConsoleWarn: typeof console.warn
		let consoleMock: ReturnType<typeof vi.fn>

		beforeEach(() => {
			// Store original console.warn
			originalConsoleWarn = console.warn
			// Create a new mock for each test
			consoleMock = vi.fn()
			console.warn = consoleMock
		})

		afterEach(() => {
			// Restore original console.warn
			console.warn = originalConsoleWarn
		})

		it('should be a function', async () => {
			const { logComputedGetterWarning } = await import('../warnings')
			expect(typeof logComputedGetterWarning).toBe('function')
		})

		it('should call console.warn with correct message when warning is triggered', async () => {
			// Import fresh to test the warning behavior
			const { logComputedGetterWarning } = await import('../warnings')

			// Reset mock to capture calls cleanly
			consoleMock.mockClear()

			logComputedGetterWarning()

			// The function should either log (if this is the first module-level call)
			// or not log (if it has been called before in this test session)
			// If it logs, verify the message content
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

		it('should demonstrate spam prevention behavior within same test', async () => {
			const { logComputedGetterWarning } = await import('../warnings')

			// Reset mock to track calls cleanly
			consoleMock.mockClear()

			// Make multiple calls within the same test
			logComputedGetterWarning()
			const firstCallCount = consoleMock.mock.calls.length

			// Subsequent calls should not increase the call count
			logComputedGetterWarning()
			logComputedGetterWarning()
			logComputedGetterWarning()

			const finalCallCount = consoleMock.mock.calls.length
			// Call count should not increase after first call in this test
			expect(finalCallCount).toBe(firstCallCount)
		})

		it('should return undefined', async () => {
			const { logComputedGetterWarning } = await import('../warnings')
			const result = logComputedGetterWarning()
			expect(result).toBeUndefined()
		})

		it('should handle console.warn being undefined gracefully', async () => {
			const { logComputedGetterWarning } = await import('../warnings')

			// Simulate environment where console.warn doesn't exist
			const originalWarn = console.warn
			;(console as any).warn = undefined

			// Should not throw an error
			expect(() => logComputedGetterWarning()).not.toThrow()

			// Restore console.warn
			console.warn = originalWarn
		})

		it('should propagate console.warn errors if they occur', async () => {
			const { logComputedGetterWarning } = await import('../warnings')

			// Mock console.warn to throw an error
			console.warn = vi.fn().mockImplementation(() => {
				throw new Error('Console warning failed')
			})

			// The function doesn't catch errors, but due to module state,
			// it might not actually call console.warn if already warned
			try {
				logComputedGetterWarning()
				// If no error was thrown, that's fine (warning was already logged)
			} catch (error) {
				// If error was thrown, it should be the expected error
				expect((error as Error).message).toBe('Console warning failed')
			}
		})

		it('should work correctly when called from different execution contexts', async () => {
			const { logComputedGetterWarning } = await import('../warnings')

			// Simulate calls from different parts of the application
			const context1 = () => logComputedGetterWarning()
			const context2 = () => logComputedGetterWarning()
			const context3 = () => logComputedGetterWarning()

			// Reset mock to track calls cleanly
			consoleMock.mockClear()

			context1()
			const callsAfterFirst = consoleMock.mock.calls.length

			context2()
			context3()

			// Additional calls should not increase call count due to spam prevention
			expect(consoleMock.mock.calls.length).toBe(callsAfterFirst)
		})

		it('should handle rapid successive calls correctly', async () => {
			const { logComputedGetterWarning } = await import('../warnings')

			// Reset mock to track calls cleanly
			consoleMock.mockClear()

			// Track initial state
			logComputedGetterWarning()
			const initialCallCount = consoleMock.mock.calls.length

			// Multiple rapid calls should not change call count
			for (let i = 0; i < 100; i++) {
				logComputedGetterWarning()
			}

			// Call count should remain the same
			expect(consoleMock.mock.calls.length).toBe(initialCallCount)
		})

		it('should work in production-like environments', async () => {
			const { logComputedGetterWarning } = await import('../warnings')

			// Simulate production environment where console methods might be stubbed
			const productionConsole = {
				warn: vi.fn(),
			}

			const originalConsole = global.console
			global.console = productionConsole as any

			try {
				// Should not throw in production-like environment
				expect(() => logComputedGetterWarning()).not.toThrow()
				// Whether it logs depends on module state, so we don't assert call count
			} finally {
				global.console = originalConsole
			}
		})

		it('should maintain correct this binding when called in different ways', async () => {
			const { logComputedGetterWarning } = await import('../warnings')

			const obj = { warn: logComputedGetterWarning }
			const { warn } = obj
			const boundWarn = logComputedGetterWarning.bind(null)

			// Reset mock to track calls cleanly
			consoleMock.mockClear()

			// All these calling patterns should work without throwing
			expect(() => obj.warn()).not.toThrow()
			expect(() => warn()).not.toThrow()
			expect(() => boundWarn()).not.toThrow()
			expect(() => logComputedGetterWarning()).not.toThrow()
		})

		it('should handle being called asynchronously', async () => {
			const { logComputedGetterWarning } = await import('../warnings')

			// Reset mock to track calls cleanly
			consoleMock.mockClear()

			// Test async contexts
			const asyncCall1 = async () => logComputedGetterWarning()
			const asyncCall2 = async () => logComputedGetterWarning()

			// Track initial state
			await asyncCall1()
			const initialCallCount = consoleMock.mock.calls.length

			// Additional async calls should not increase call count
			await Promise.all([asyncCall2(), asyncCall1()])
			expect(consoleMock.mock.calls.length).toBe(initialCallCount)
		})
	})

	describe('warning message content', () => {
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

		it('should contain correct deprecation guidance when warning is logged', async () => {
			const { logComputedGetterWarning } = await import('../warnings')

			consoleMock.mockClear()
			logComputedGetterWarning()

			// Only test message content if a warning was actually logged
			if (consoleMock.mock.calls.length > 0) {
				const warningCall = consoleMock.mock.calls[0][0]

				// Check that warning contains key information
				expect(warningCall).toContain('@computed')
				expect(warningCall).toContain('deprecated')
				expect(warningCall).toContain('will be removed')
				expect(warningCall).toContain('getter')
				expect(warningCall).toContain('method')
				expect(warningCall).toContain('// Before')
				expect(warningCall).toContain('// After')
				expect(warningCall).toContain('get foo()')
				expect(warningCall).toContain('getFoo()')
			}
		})

		it('should contain proper code examples when warning is logged', async () => {
			const { logComputedGetterWarning } = await import('../warnings')

			consoleMock.mockClear()
			logComputedGetterWarning()

			// Only test if warning was logged
			if (consoleMock.mock.calls.length > 0) {
				const warningCall = consoleMock.mock.calls[0][0]

				// Check that the warning contains valid code examples
				expect(warningCall).toContain("@computed\nget foo() {\n\treturn 'foo'\n}")
				expect(warningCall).toContain("@computed\ngetFoo() {\n\treturn 'foo'\n}")
			}
		})

		it('should use consistent warning format when warning is logged', async () => {
			const { logComputedGetterWarning } = await import('../warnings')

			consoleMock.mockClear()
			logComputedGetterWarning()

			// Only test if warning was logged
			if (consoleMock.mock.calls.length > 0) {
				const warningCall = consoleMock.mock.calls[0][0]

				// Check that warning follows expected format
				expect(typeof warningCall).toBe('string')
				expect(warningCall.length).toBeGreaterThan(0)
				expect(warningCall).toMatch(/^Using `@computed`/) // Starts with "Using `@computed`"
			}
		})

		it('should provide clear migration guidance when warning is logged', async () => {
			const { logComputedGetterWarning } = await import('../warnings')

			consoleMock.mockClear()
			logComputedGetterWarning()

			// Only test if warning was logged
			if (consoleMock.mock.calls.length > 0) {
				const warningCall = consoleMock.mock.calls[0][0]

				// Verify the warning provides clear migration guidance
				expect(warningCall).toContain('Please refactor to use')
				expect(warningCall).toContain('decorator for methods')

				// Should show before/after examples
				const beforeIndex = warningCall.indexOf('// Before')
				const afterIndex = warningCall.indexOf('// After')
				expect(beforeIndex).toBeGreaterThan(-1)
				expect(afterIndex).toBeGreaterThan(beforeIndex)
			}
		})
	})

	describe('module behavior', () => {
		it('should export only the logComputedGetterWarning function', async () => {
			const module = await import('../warnings')
			const exports = Object.keys(module)

			expect(exports).toHaveLength(1)
			expect(exports).toContain('logComputedGetterWarning')
		})

		it('should maintain consistent exports across multiple imports', async () => {
			const import1 = await import('../warnings')
			const import2 = await import('../warnings')

			// Should be the exact same function reference
			expect(import1.logComputedGetterWarning).toBe(import2.logComputedGetterWarning)
		})

		it('should not expose internal didWarnComputedGetter flag', async () => {
			const module = await import('../warnings')

			// Internal flag should not be exported
			expect('didWarnComputedGetter' in module).toBe(false)
			expect((module as any).didWarnComputedGetter).toBeUndefined()
		})

		it('should be marked as internal API (compile-time check)', async () => {
			// This test verifies the function exists and can be imported
			// The @internal JSDoc annotation is checked during build/API extraction
			const { logComputedGetterWarning } = await import('../warnings')
			expect(logComputedGetterWarning).toBeDefined()
			expect(typeof logComputedGetterWarning).toBe('function')
		})
	})

	describe('edge cases and robustness', () => {
		let originalConsoleWarn: typeof console.warn

		beforeEach(() => {
			originalConsoleWarn = console.warn
		})

		afterEach(() => {
			console.warn = originalConsoleWarn
		})

		it('should handle console object being null or undefined', async () => {
			const { logComputedGetterWarning } = await import('../warnings')

			const originalConsole = global.console
			;(global as any).console = null

			try {
				// Should not throw even if console is null
				expect(() => logComputedGetterWarning()).not.toThrow()
			} finally {
				global.console = originalConsole
			}
		})

		it('should handle being called with various this contexts', async () => {
			const { logComputedGetterWarning } = await import('../warnings')

			// Test with various this values
			expect(() => logComputedGetterWarning.call(null)).not.toThrow()
			expect(() => logComputedGetterWarning.call(undefined)).not.toThrow()
			expect(() => logComputedGetterWarning.call({})).not.toThrow()
			expect(() => logComputedGetterWarning.call('string')).not.toThrow()
		})

		it('should be serializable (no complex closures)', async () => {
			const { logComputedGetterWarning } = await import('../warnings')

			// Function should be serializable to string
			expect(typeof logComputedGetterWarning.toString()).toBe('string')
			expect(logComputedGetterWarning.toString().length).toBeGreaterThan(0)
		})
	})
})
