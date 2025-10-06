import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearRegisteredVersionsForTests, registerTldrawLibraryVersion } from './version'

describe('version utilities', () => {
	let mockConsoleLog: ReturnType<typeof vi.fn>

	beforeEach(() => {
		mockConsoleLog = vi.fn()
		vi.stubGlobal('console', { log: mockConsoleLog })
		vi.useFakeTimers()
		clearRegisteredVersionsForTests()
	})

	afterEach(() => {
		vi.unstubAllGlobals()
		vi.restoreAllMocks()
		vi.useRealTimers()
		clearRegisteredVersionsForTests()
	})

	describe('clearRegisteredVersionsForTests', () => {
		it('should clear all registered versions', () => {
			registerTldrawLibraryVersion('@tldraw/editor', '2.0.0', 'esm')
			registerTldrawLibraryVersion('@tldraw/tldraw', '2.0.0', 'esm')

			clearRegisteredVersionsForTests()

			// After clearing, registering the same versions should not trigger warnings
			registerTldrawLibraryVersion('@tldraw/editor', '2.0.0', 'esm')
			registerTldrawLibraryVersion('@tldraw/tldraw', '2.0.0', 'esm')

			vi.runAllTimers()

			expect(mockConsoleLog).not.toHaveBeenCalled()
		})

		it('should reset warning state', () => {
			// Register conflicting versions to trigger warning
			registerTldrawLibraryVersion('@tldraw/editor', '2.0.0', 'esm')
			registerTldrawLibraryVersion('@tldraw/editor', '1.9.0', 'esm')

			vi.runAllTimers()

			expect(mockConsoleLog).toHaveBeenCalled()
			mockConsoleLog.mockClear()

			clearRegisteredVersionsForTests()

			// After clearing, same conflicting versions should trigger warning again
			registerTldrawLibraryVersion('@tldraw/editor', '2.0.0', 'esm')
			registerTldrawLibraryVersion('@tldraw/editor', '1.9.0', 'esm')

			vi.runAllTimers()

			expect(mockConsoleLog).toHaveBeenCalled()
		})

		it('should clear scheduled timeout', () => {
			const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
			registerTldrawLibraryVersion('@tldraw/editor', '2.0.0', 'esm')

			clearRegisteredVersionsForTests()

			expect(clearTimeoutSpy).toHaveBeenCalled()
		})

		it('should handle multiple calls without error', () => {
			clearRegisteredVersionsForTests()
			clearRegisteredVersionsForTests()
			clearRegisteredVersionsForTests()

			expect(() => clearRegisteredVersionsForTests()).not.toThrow()
		})

		it('should handle clearing when no timeout is scheduled', () => {
			const _clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
			clearRegisteredVersionsForTests()

			// Should not throw when clearing empty state
			expect(() => clearRegisteredVersionsForTests()).not.toThrow()
		})
	})

	describe('registerTldrawLibraryVersion', () => {
		it('should register a library version with valid parameters', () => {
			expect(() => registerTldrawLibraryVersion('@tldraw/editor', '2.0.0', 'esm')).not.toThrow()

			// Should schedule a timeout check
			expect(vi.getTimerCount()).toBeGreaterThan(0)
		})

		it('should handle missing name parameter', () => {
			expect(() => registerTldrawLibraryVersion(undefined, '2.0.0', 'esm')).not.toThrow()

			// Should not schedule timeout when parameters are missing
			expect(vi.getTimerCount()).toBe(0)
		})

		it('should handle missing version parameter', () => {
			expect(() => registerTldrawLibraryVersion('@tldraw/editor', undefined, 'esm')).not.toThrow()

			expect(vi.getTimerCount()).toBe(0)
		})

		it('should handle missing modules parameter', () => {
			expect(() => registerTldrawLibraryVersion('@tldraw/editor', '2.0.0', undefined)).not.toThrow()

			expect(vi.getTimerCount()).toBe(0)
		})

		it('should handle all missing parameters', () => {
			expect(() => registerTldrawLibraryVersion()).not.toThrow()

			expect(vi.getTimerCount()).toBe(0)
		})

		it('should throw error in build environment when parameters missing', () => {
			const originalBuildFlag = (globalThis as any).TLDRAW_LIBRARY_IS_BUILD
			;(globalThis as any).TLDRAW_LIBRARY_IS_BUILD = true

			expect(() => registerTldrawLibraryVersion(undefined, '2.0.0', 'esm')).toThrow(
				'Missing name/version/module system in built version of tldraw library'
			)
			;(globalThis as any).TLDRAW_LIBRARY_IS_BUILD = originalBuildFlag
		})

		it('should schedule timeout check on first registration', () => {
			registerTldrawLibraryVersion('@tldraw/editor', '2.0.0', 'esm')

			expect(vi.getTimerCount()).toBe(1)
		})

		it('should not schedule multiple timeouts for multiple registrations', () => {
			registerTldrawLibraryVersion('@tldraw/editor', '2.0.0', 'esm')
			registerTldrawLibraryVersion('@tldraw/tldraw', '2.0.0', 'esm')

			expect(vi.getTimerCount()).toBe(1)
		})

		it('should handle setTimeout failure gracefully', () => {
			vi.spyOn(global, 'setTimeout').mockImplementation(() => {
				throw new Error('setTimeout not available')
			})

			// Should call check immediately when setTimeout fails
			registerTldrawLibraryVersion('@tldraw/editor', '2.0.0', 'esm')
			registerTldrawLibraryVersion('@tldraw/editor', '1.9.0', 'esm')

			expect(mockConsoleLog).toHaveBeenCalled()
		})
	})

	describe('version conflict detection', () => {
		it('should detect version conflicts between different versions', () => {
			registerTldrawLibraryVersion('@tldraw/editor', '2.0.0', 'esm')
			registerTldrawLibraryVersion('@tldraw/editor', '1.9.0', 'esm')

			vi.runAllTimers()

			expect(mockConsoleLog).toHaveBeenCalled()
			const logMessage = mockConsoleLog.mock.calls[0][0]
			expect(logMessage).toContain('multiple versions of tldraw libraries')
		})

		it('should not warn for identical versions', () => {
			registerTldrawLibraryVersion('@tldraw/editor', '2.0.0', 'esm')
			registerTldrawLibraryVersion('@tldraw/tldraw', '2.0.0', 'esm')

			vi.runAllTimers()

			expect(mockConsoleLog).not.toHaveBeenCalled()
		})

		it('should detect module type conflicts', () => {
			registerTldrawLibraryVersion('@tldraw/editor', '2.0.0', 'esm')
			registerTldrawLibraryVersion('@tldraw/editor', '2.0.0', 'cjs')

			vi.runAllTimers()

			expect(mockConsoleLog).toHaveBeenCalled()
			const logMessage = mockConsoleLog.mock.calls[0][0]
			expect(logMessage).toContain('multiple instances')
		})

		it('should warn only once per session', () => {
			registerTldrawLibraryVersion('@tldraw/editor', '2.0.0', 'esm')
			registerTldrawLibraryVersion('@tldraw/editor', '1.9.0', 'esm')

			vi.runAllTimers()

			expect(mockConsoleLog).toHaveBeenCalledTimes(1)

			// Register more conflicting versions
			registerTldrawLibraryVersion('@tldraw/tldraw', '1.8.0', 'esm')

			// Should not trigger another warning since didWarn is true
			expect(mockConsoleLog).toHaveBeenCalledTimes(1)
		})

		it('should handle complex version scenarios', () => {
			registerTldrawLibraryVersion('@tldraw/editor', '2.0.0', 'esm')
			registerTldrawLibraryVersion('@tldraw/tldraw', '2.0.0', 'esm')
			registerTldrawLibraryVersion('@tldraw/store', '1.9.0', 'esm')
			registerTldrawLibraryVersion('@tldraw/validate', '2.0.0', 'esm')

			vi.runAllTimers()

			expect(mockConsoleLog).toHaveBeenCalled()
			const logMessage = mockConsoleLog.mock.calls[0][0]
			expect(logMessage).toContain('multiple versions')
			expect(logMessage).toContain('v2.0.0')
			expect(logMessage).toContain('@tldraw/store')
		})

		it('should handle pre-release versions', () => {
			registerTldrawLibraryVersion('@tldraw/editor', '2.0.0-alpha.1', 'esm')
			registerTldrawLibraryVersion('@tldraw/editor', '2.0.0-beta.1', 'esm')

			vi.runAllTimers()

			expect(mockConsoleLog).toHaveBeenCalled()
		})

		it('should sort versions correctly', () => {
			registerTldrawLibraryVersion('@tldraw/editor', '1.0.0', 'esm')
			registerTldrawLibraryVersion('@tldraw/editor', '2.0.0', 'esm')
			registerTldrawLibraryVersion('@tldraw/editor', '1.5.0', 'esm')

			vi.runAllTimers()

			expect(mockConsoleLog).toHaveBeenCalled()
			const logMessage = mockConsoleLog.mock.calls[0][0]
			// Latest version should be 2.0.0
			expect(logMessage).toContain('v2.0.0')
		})

		it('should handle invalid version formats gracefully', () => {
			registerTldrawLibraryVersion('@tldraw/editor', 'invalid-version', 'esm')
			registerTldrawLibraryVersion('@tldraw/editor', 'also-invalid', 'esm')

			expect(() => vi.runAllTimers()).not.toThrow()
		})

		it('should handle empty version list', () => {
			registerTldrawLibraryVersion('@tldraw/editor', '2.0.0', 'esm')

			// Clear versions but let timer run
			clearRegisteredVersionsForTests()

			expect(() => vi.runAllTimers()).not.toThrow()
		})

		it('should format console output with colors', () => {
			registerTldrawLibraryVersion('@tldraw/editor', '2.0.0', 'esm')
			registerTldrawLibraryVersion('@tldraw/editor', '1.9.0', 'esm')

			vi.runAllTimers()

			expect(mockConsoleLog).toHaveBeenCalled()
			const logMessage = mockConsoleLog.mock.calls[0][0]
			// Check for ANSI color codes
			expect(logMessage).toContain('\x1B[')
		})

		it('should show both version mismatches and module duplicates in output', () => {
			registerTldrawLibraryVersion('@tldraw/editor', '2.0.0', 'esm')
			registerTldrawLibraryVersion('@tldraw/tldraw', '1.9.0', 'esm')

			vi.runAllTimers()

			expect(mockConsoleLog).toHaveBeenCalled()
			const logMessage = mockConsoleLog.mock.calls[0][0]
			expect(logMessage).toContain('latest version')
			expect(logMessage).toContain('not on the latest version')
		})
	})

	describe('integration scenarios', () => {
		it('should handle typical multi-package setup', () => {
			const packages = [
				{ name: '@tldraw/editor', version: '2.0.0', modules: 'esm' },
				{ name: '@tldraw/tldraw', version: '2.0.0', modules: 'esm' },
				{ name: '@tldraw/store', version: '2.0.0', modules: 'esm' },
				{ name: '@tldraw/validate', version: '2.0.0', modules: 'esm' },
			]

			packages.forEach((pkg) => {
				registerTldrawLibraryVersion(pkg.name, pkg.version, pkg.modules)
			})

			vi.runAllTimers()

			// All same version - should not warn
			expect(mockConsoleLog).not.toHaveBeenCalled()
		})

		it('should handle package manager deduplication scenario', () => {
			// The current implementation actually treats multiple registrations of the same
			// package+version+modules as duplicates, so this will trigger a warning
			registerTldrawLibraryVersion('@tldraw/editor', '2.0.0', 'esm')
			registerTldrawLibraryVersion('@tldraw/editor', '2.0.0', 'esm')
			registerTldrawLibraryVersion('@tldraw/editor', '2.0.0', 'esm')

			vi.runAllTimers()

			// Multiple registrations of same version are detected as module duplicates
			expect(mockConsoleLog).toHaveBeenCalled()
			const logMessage = mockConsoleLog.mock.calls[0][0]
			expect(logMessage).toContain('multiple instances')
		})

		it('should handle bundler misconfiguration scenario', () => {
			registerTldrawLibraryVersion('@tldraw/editor', '2.0.0', 'esm')
			registerTldrawLibraryVersion('@tldraw/editor', '2.0.0', 'cjs')

			vi.runAllTimers()

			expect(mockConsoleLog).toHaveBeenCalled()
			const logMessage = mockConsoleLog.mock.calls[0][0]
			expect(logMessage).toContain('bundler is misconfigured')
			expect(logMessage).toContain('ES Modules')
			expect(logMessage).toContain('CommonJS')
		})

		it('should handle mixed version and module conflicts', () => {
			registerTldrawLibraryVersion('@tldraw/editor', '2.0.0', 'esm')
			registerTldrawLibraryVersion('@tldraw/editor', '2.0.0', 'cjs')
			registerTldrawLibraryVersion('@tldraw/tldraw', '1.9.0', 'esm')

			vi.runAllTimers()

			expect(mockConsoleLog).toHaveBeenCalled()
			const logMessage = mockConsoleLog.mock.calls[0][0]
			// Should show version conflict first (higher priority)
			expect(logMessage).toContain('multiple versions')
		})

		it('should handle gradual package registration', () => {
			// Register packages over time
			registerTldrawLibraryVersion('@tldraw/editor', '2.0.0', 'esm')

			vi.runAllTimers()

			expect(mockConsoleLog).not.toHaveBeenCalled()

			// Clear warning state and add conflicting version
			clearRegisteredVersionsForTests()
			registerTldrawLibraryVersion('@tldraw/editor', '2.0.0', 'esm')
			registerTldrawLibraryVersion('@tldraw/tldraw', '1.9.0', 'esm')

			vi.runAllTimers()

			expect(mockConsoleLog).toHaveBeenCalled()
		})
	})

	describe('edge cases and error handling', () => {
		it('should handle extremely long package names', () => {
			const longName = '@tldraw/' + 'x'.repeat(1000)

			expect(() => registerTldrawLibraryVersion(longName, '2.0.0', 'esm')).not.toThrow()
		})

		it('should handle special characters in package names', () => {
			const specialName = '@tldraw/test-特殊字符-🎨'

			expect(() => registerTldrawLibraryVersion(specialName, '2.0.0', 'esm')).not.toThrow()
		})

		it('should handle unusual version strings', () => {
			const versions = [
				'2.0.0-alpha.1',
				'2.0.0-beta.1+build.123',
				'2.0.0-rc.1',
				'0.0.0',
				'999.999.999',
			]

			versions.forEach((version) => {
				expect(() => registerTldrawLibraryVersion('@tldraw/test', version, 'esm')).not.toThrow()
			})
		})

		it('should handle unusual module system values', () => {
			const moduleSystems = ['esm', 'cjs', 'umd', 'amd', 'custom']

			moduleSystems.forEach((modules) => {
				expect(() => registerTldrawLibraryVersion('@tldraw/test', '2.0.0', modules)).not.toThrow()
			})
		})

		it('should handle very large number of registrations', () => {
			for (let i = 0; i < 100; i++) {
				registerTldrawLibraryVersion(`@tldraw/package-${i}`, '2.0.0', 'esm')
			}

			expect(() => vi.runAllTimers()).not.toThrow()
		})

		it('should handle global object pollution', () => {
			// This test checks that the system is robust against different global contexts
			// We can't easily pollute the global object due to property descriptors,
			// but we can test that the system works with different global contexts
			expect(() => registerTldrawLibraryVersion('@tldraw/editor', '2.0.0', 'esm')).not.toThrow()

			// Register a different library to verify state tracking works
			expect(() => registerTldrawLibraryVersion('@tldraw/tldraw', '2.0.0', 'esm')).not.toThrow()

			vi.runAllTimers()

			// Should not warn for same versions
			expect(mockConsoleLog).not.toHaveBeenCalled()
		})
	})

	describe('timeout behavior', () => {
		it('should use 100ms delay for setTimeout', () => {
			const setTimeoutSpy = vi.spyOn(global, 'setTimeout')
			registerTldrawLibraryVersion('@tldraw/editor', '2.0.0', 'esm')

			expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 100)
		})

		it('should clear timeout after execution', () => {
			registerTldrawLibraryVersion('@tldraw/editor', '2.0.0', 'esm')

			vi.runAllTimers()

			// The timeout should be nulled after execution
			// This is internal behavior but we can test by checking that scheduling works again
			registerTldrawLibraryVersion('@tldraw/tldraw', '2.0.0', 'esm')

			expect(vi.getTimerCount()).toBe(1)
		})

		it('should not schedule new timeout if one is already pending', () => {
			registerTldrawLibraryVersion('@tldraw/editor', '2.0.0', 'esm')
			registerTldrawLibraryVersion('@tldraw/tldraw', '2.0.0', 'esm')
			registerTldrawLibraryVersion('@tldraw/store', '2.0.0', 'esm')

			expect(vi.getTimerCount()).toBe(1)
		})

		it('should handle timeout clearing correctly', () => {
			const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
			registerTldrawLibraryVersion('@tldraw/editor', '2.0.0', 'esm')

			clearRegisteredVersionsForTests()

			expect(clearTimeoutSpy).toHaveBeenCalled()
		})
	})

	describe('original test cases (updated)', () => {
		it('doesnt log anything if all versions are the same', () => {
			registerTldrawLibraryVersion('tldraw', '1.0.0', 'esm')
			registerTldrawLibraryVersion('@tldraw/editor', '1.0.0', 'esm')
			registerTldrawLibraryVersion('@tldraw/utils', '1.0.0', 'esm')
			registerTldrawLibraryVersion('@tldraw/tlschema', '1.0.0', 'esm')

			vi.runAllTimers()

			expect(mockConsoleLog).toHaveBeenCalledTimes(0)
		})

		it('logs if not all versions match', () => {
			registerTldrawLibraryVersion('tldraw', '1.0.0', 'esm')
			registerTldrawLibraryVersion('@tldraw/editor', '1.1.0', 'esm')
			registerTldrawLibraryVersion('@tldraw/utils', '1.1.0', 'esm')
			registerTldrawLibraryVersion('@tldraw/utils', '1.2.0', 'esm')
			registerTldrawLibraryVersion('@tldraw/tlschema', '1.2.0', 'esm')

			vi.runAllTimers()

			expect(mockConsoleLog).toHaveBeenCalledTimes(1)
			expect(mockConsoleLog.mock.calls[0]).toMatchInlineSnapshot(`
				[
				  "[1;41;97m[tldraw][m [31;1mYou have multiple versions of tldraw libraries installed. This can lead to bugs and unexpected behavior.[m

				The latest version you have installed is [1;94mv1.2.0[m. The following libraries are on the latest version:
				  • ✅ [1m@tldraw/tlschema[m

				The following libraries are not on the latest version, or have multiple versions installed:
				  • ❌ [1mtldraw[m ([31mv1.0.0[m)
				  • ❌ [1m@tldraw/editor[m ([31mv1.1.0[m)
				  • ❌ [1m@tldraw/utils[m ([31mv1.1.0[m, [32mv1.2.0[m)",
				]
			`)
		})

		it('logs if multiple versions of the same library are installed', () => {
			registerTldrawLibraryVersion('tldraw', '1.1.0', 'esm')
			registerTldrawLibraryVersion('@tldraw/editor', '1.1.0', 'esm')
			registerTldrawLibraryVersion('@tldraw/editor', '1.1.0', 'cjs')
			registerTldrawLibraryVersion('@tldraw/utils', '1.1.0', 'esm')
			registerTldrawLibraryVersion('@tldraw/utils', '1.1.0', 'cjs')
			registerTldrawLibraryVersion('@tldraw/tlschema', '1.1.0', 'esm')

			vi.runAllTimers()

			expect(mockConsoleLog).toHaveBeenCalledTimes(1)
			expect(mockConsoleLog.mock.calls[0]).toMatchInlineSnapshot(`
				[
				  "[1;41;97m[tldraw][m [31;1mYou have multiple instances of some tldraw libraries active. This can lead to bugs and unexpected behavior. [m

				This usually means that your bundler is misconfigured, and is importing the same library multiple times - usually once as an ES Module, and once as a CommonJS module.

				The following libraries have been imported multiple times:
				  • ❌ [1m@tldraw/editor[m v1.1.0: 
				      1. ES Modules
				      2. CommonJS
				  • ❌ [1m@tldraw/utils[m v1.1.0: 
				      1. ES Modules
				      2. CommonJS

				You should configure your bundler to only import one version of each library.",
				]
			`)
		})
	})
})
