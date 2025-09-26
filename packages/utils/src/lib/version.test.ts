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
		it('should reset warning state so tests can re-trigger warnings', () => {
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
	})

	describe('registerTldrawLibraryVersion', () => {
		it('should throw error in build environment when parameters missing', () => {
			const originalBuildFlag = (globalThis as any).TLDRAW_LIBRARY_IS_BUILD
			;(globalThis as any).TLDRAW_LIBRARY_IS_BUILD = true

			expect(() => registerTldrawLibraryVersion(undefined, '2.0.0', 'esm')).toThrow(
				'Missing name/version/module system in built version of tldraw library'
			)
			;(globalThis as any).TLDRAW_LIBRARY_IS_BUILD = originalBuildFlag
		})

		it('should handle setTimeout failure gracefully by checking immediately', () => {
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
	})

	describe('core business logic', () => {
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
			const logMessage = mockConsoleLog.mock.calls[0][0]
			expect(logMessage).toContain('multiple versions of tldraw libraries')
			expect(logMessage).toContain('v1.2.0')
			expect(logMessage).toContain('@tldraw/tlschema')
			expect(logMessage).toContain('tldraw')
			expect(logMessage).toContain('@tldraw/editor')
			expect(logMessage).toContain('@tldraw/utils')
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
			const logMessage = mockConsoleLog.mock.calls[0][0]
			expect(logMessage).toContain('multiple instances')
			expect(logMessage).toContain('@tldraw/editor')
			expect(logMessage).toContain('@tldraw/utils')
			expect(logMessage).toContain('ES Modules')
			expect(logMessage).toContain('CommonJS')
		})
	})
})
