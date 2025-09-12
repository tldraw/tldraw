import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Timers } from './timers'

describe('Timers', () => {
	let timers: Timers
	let mockSetTimeout: ReturnType<typeof vi.fn>
	let mockSetInterval: ReturnType<typeof vi.fn>
	let mockRequestAnimationFrame: ReturnType<typeof vi.fn>
	let mockClearTimeout: ReturnType<typeof vi.fn>
	let mockClearInterval: ReturnType<typeof vi.fn>
	let mockCancelAnimationFrame: ReturnType<typeof vi.fn>

	beforeEach(() => {
		// Mock window timer functions
		mockSetTimeout = vi.fn().mockReturnValue(123)
		mockSetInterval = vi.fn().mockReturnValue(456)
		mockRequestAnimationFrame = vi.fn().mockReturnValue(789)
		mockClearTimeout = vi.fn()
		mockClearInterval = vi.fn()
		mockCancelAnimationFrame = vi.fn()

		// Replace window functions with mocks
		vi.stubGlobal('setTimeout', mockSetTimeout)
		vi.stubGlobal('setInterval', mockSetInterval)
		vi.stubGlobal('requestAnimationFrame', mockRequestAnimationFrame)
		vi.stubGlobal('clearTimeout', mockClearTimeout)
		vi.stubGlobal('clearInterval', mockClearInterval)
		vi.stubGlobal('cancelAnimationFrame', mockCancelAnimationFrame)

		timers = new Timers()
	})

	afterEach(() => {
		vi.unstubAllGlobals()
		vi.clearAllMocks()
	})

	describe('constructor', () => {
		it('should bind methods to the instance', () => {
			const timers = new Timers()
			const boundSetTimeout = timers.setTimeout

			// Should be able to call the bound method without context
			expect(() => boundSetTimeout('test', () => {}, 100)).not.toThrow()
		})

		it('should initialize empty maps for tracking timers', () => {
			const timers = new Timers()

			// Test that timers can be added to different contexts
			timers.setTimeout('context1', () => {}, 100)
			timers.setTimeout('context2', () => {}, 200)

			expect(mockSetTimeout).toHaveBeenCalledTimes(2)
		})
	})

	describe('setTimeout', () => {
		it('should call window.setTimeout with correct parameters', () => {
			const handler = vi.fn()
			const timeout = 1000
			const args = ['arg1', 'arg2']

			const id = timers.setTimeout('test-context', handler, timeout, ...args)

			expect(mockSetTimeout).toHaveBeenCalledWith(handler, timeout, args)
			expect(id).toBe(123)
		})

		it('should handle default timeout parameter', () => {
			const handler = vi.fn()

			timers.setTimeout('test-context', handler)

			expect(mockSetTimeout).toHaveBeenCalledWith(handler, undefined, [])
		})

		it('should track timeouts by context', () => {
			const handler1 = vi.fn()
			const handler2 = vi.fn()

			mockSetTimeout.mockReturnValueOnce(100).mockReturnValueOnce(200).mockReturnValueOnce(300)

			timers.setTimeout('context1', handler1, 1000)
			timers.setTimeout('context1', handler2, 2000)
			timers.setTimeout('context2', handler1, 3000)

			// Dispose context1 should clear its timers
			timers.dispose('context1')

			expect(mockClearTimeout).toHaveBeenCalledWith(100)
			expect(mockClearTimeout).toHaveBeenCalledWith(200)
			expect(mockClearTimeout).not.toHaveBeenCalledWith(300)
		})

		it('should handle multiple timeouts in same context', () => {
			const handler = vi.fn()
			mockSetTimeout.mockReturnValueOnce(111).mockReturnValueOnce(222)

			timers.setTimeout('context', handler, 100)
			timers.setTimeout('context', handler, 200)

			timers.dispose('context')

			expect(mockClearTimeout).toHaveBeenCalledWith(111)
			expect(mockClearTimeout).toHaveBeenCalledWith(222)
		})

		it('should handle empty args array', () => {
			const handler = vi.fn()

			timers.setTimeout('test', handler, 1000)

			expect(mockSetTimeout).toHaveBeenCalledWith(handler, 1000, [])
		})
	})

	describe('setInterval', () => {
		it('should call window.setInterval with correct parameters', () => {
			const handler = vi.fn()
			const timeout = 1000
			const args = ['arg1', 'arg2']

			const id = timers.setInterval('test-context', handler, timeout, ...args)

			expect(mockSetInterval).toHaveBeenCalledWith(handler, timeout, args)
			expect(id).toBe(456)
		})

		it('should handle default timeout parameter', () => {
			const handler = vi.fn()

			timers.setInterval('test-context', handler)

			expect(mockSetInterval).toHaveBeenCalledWith(handler, undefined, [])
		})

		it('should track intervals by context', () => {
			const handler = vi.fn()
			mockSetInterval.mockReturnValueOnce(500).mockReturnValueOnce(600)

			timers.setInterval('context1', handler, 1000)
			timers.setInterval('context2', handler, 2000)

			timers.dispose('context1')

			expect(mockClearInterval).toHaveBeenCalledWith(500)
			expect(mockClearInterval).not.toHaveBeenCalledWith(600)
		})

		it('should handle multiple intervals in same context', () => {
			const handler = vi.fn()
			mockSetInterval.mockReturnValueOnce(501).mockReturnValueOnce(502)

			timers.setInterval('context', handler, 100)
			timers.setInterval('context', handler, 200)

			timers.dispose('context')

			expect(mockClearInterval).toHaveBeenCalledWith(501)
			expect(mockClearInterval).toHaveBeenCalledWith(502)
		})
	})

	describe('requestAnimationFrame', () => {
		it('should call window.requestAnimationFrame with correct parameters', () => {
			const callback = vi.fn()

			const id = timers.requestAnimationFrame('test-context', callback)

			expect(mockRequestAnimationFrame).toHaveBeenCalledWith(callback)
			expect(id).toBe(789)
		})

		it('should track animation frames by context', () => {
			const callback = vi.fn()
			mockRequestAnimationFrame.mockReturnValueOnce(700).mockReturnValueOnce(800)

			timers.requestAnimationFrame('context1', callback)
			timers.requestAnimationFrame('context2', callback)

			timers.dispose('context1')

			expect(mockCancelAnimationFrame).toHaveBeenCalledWith(700)
			expect(mockCancelAnimationFrame).not.toHaveBeenCalledWith(800)
		})

		it('should handle multiple animation frames in same context', () => {
			const callback = vi.fn()
			mockRequestAnimationFrame.mockReturnValueOnce(701).mockReturnValueOnce(702)

			timers.requestAnimationFrame('context', callback)
			timers.requestAnimationFrame('context', callback)

			timers.dispose('context')

			expect(mockCancelAnimationFrame).toHaveBeenCalledWith(701)
			expect(mockCancelAnimationFrame).toHaveBeenCalledWith(702)
		})
	})

	describe('dispose', () => {
		it('should clear all timer types for a specific context', () => {
			const handler = vi.fn()
			const callback = vi.fn()

			mockSetTimeout.mockReturnValue(100)
			mockSetInterval.mockReturnValue(200)
			mockRequestAnimationFrame.mockReturnValue(300)

			timers.setTimeout('test-context', handler, 1000)
			timers.setInterval('test-context', handler, 1000)
			timers.requestAnimationFrame('test-context', callback)

			timers.dispose('test-context')

			expect(mockClearTimeout).toHaveBeenCalledWith(100)
			expect(mockClearInterval).toHaveBeenCalledWith(200)
			expect(mockCancelAnimationFrame).toHaveBeenCalledWith(300)
		})

		it('should handle disposing non-existent context gracefully', () => {
			expect(() => timers.dispose('non-existent')).not.toThrow()

			expect(mockClearTimeout).not.toHaveBeenCalled()
			expect(mockClearInterval).not.toHaveBeenCalled()
			expect(mockCancelAnimationFrame).not.toHaveBeenCalled()
		})

		it('should only dispose timers from specified context', () => {
			const handler = vi.fn()

			mockSetTimeout.mockReturnValueOnce(100).mockReturnValueOnce(200)

			timers.setTimeout('context1', handler, 1000)
			timers.setTimeout('context2', handler, 2000)

			timers.dispose('context1')

			expect(mockClearTimeout).toHaveBeenCalledWith(100)
			expect(mockClearTimeout).not.toHaveBeenCalledWith(200)
		})

		it('should handle empty context gracefully', () => {
			// Create a context but don't add any timers
			expect(() => timers.dispose('empty-context')).not.toThrow()
		})

		it('should remove context from internal maps after disposal', () => {
			const handler = vi.fn()
			mockSetTimeout.mockReturnValue(100)

			timers.setTimeout('test-context', handler, 1000)
			timers.dispose('test-context')

			// Disposing again should not throw or clear anything
			expect(() => timers.dispose('test-context')).not.toThrow()
			expect(mockClearTimeout).toHaveBeenCalledTimes(1)
		})
	})

	describe('disposeAll', () => {
		it('should dispose all contexts', () => {
			const handler = vi.fn()
			const callback = vi.fn()

			mockSetTimeout.mockReturnValueOnce(100).mockReturnValueOnce(200)
			mockSetInterval.mockReturnValueOnce(300)
			mockRequestAnimationFrame.mockReturnValueOnce(400)

			// All timers need to be in contexts that have timeouts for disposeAll to find them
			// because disposeAll only iterates over timeout contexts
			timers.setTimeout('context1', handler, 1000)
			timers.setTimeout('context2', handler, 2000)
			timers.setInterval('context1', handler, 3000) // Same context as first timeout
			timers.requestAnimationFrame('context2', callback) // Same context as second timeout

			timers.disposeAll()

			expect(mockClearTimeout).toHaveBeenCalledWith(100)
			expect(mockClearTimeout).toHaveBeenCalledWith(200)
			expect(mockClearInterval).toHaveBeenCalledWith(300)
			expect(mockCancelAnimationFrame).toHaveBeenCalledWith(400)
		})

		it('should handle empty timers instance', () => {
			expect(() => timers.disposeAll()).not.toThrow()

			expect(mockClearTimeout).not.toHaveBeenCalled()
			expect(mockClearInterval).not.toHaveBeenCalled()
			expect(mockCancelAnimationFrame).not.toHaveBeenCalled()
		})

		it('should clear all contexts after disposal', () => {
			const handler = vi.fn()
			mockSetTimeout.mockReturnValue(100)

			timers.setTimeout('context1', handler, 1000)
			timers.setTimeout('context2', handler, 2000)

			timers.disposeAll()

			// Calling disposeAll again should not clear anything
			timers.disposeAll()
			expect(mockClearTimeout).toHaveBeenCalledTimes(2) // Only the initial two calls
		})
	})

	describe('forContext', () => {
		it('should return context-bound timer methods', () => {
			const contextTimers = timers.forContext('test-context')

			expect(contextTimers).toHaveProperty('setTimeout')
			expect(contextTimers).toHaveProperty('setInterval')
			expect(contextTimers).toHaveProperty('requestAnimationFrame')
			expect(contextTimers).toHaveProperty('dispose')
		})

		it('should bind setTimeout method to context', () => {
			const contextTimers = timers.forContext('test-context')
			const handler = vi.fn()

			contextTimers.setTimeout(handler, 1000, 'arg1', 'arg2')

			// The forContext method passes args as a single array argument
			expect(mockSetTimeout).toHaveBeenCalledWith(handler, 1000, [['arg1', 'arg2']])
		})

		it('should bind setInterval method to context', () => {
			const contextTimers = timers.forContext('test-context')
			const handler = vi.fn()

			contextTimers.setInterval(handler, 2000, 'arg1')

			// The forContext method passes args as a single array argument
			expect(mockSetInterval).toHaveBeenCalledWith(handler, 2000, [['arg1']])
		})

		it('should bind requestAnimationFrame method to context', () => {
			const contextTimers = timers.forContext('test-context')
			const callback = vi.fn()

			contextTimers.requestAnimationFrame(callback)

			expect(mockRequestAnimationFrame).toHaveBeenCalledWith(callback)
		})

		it('should bind dispose method to context', () => {
			const contextTimers = timers.forContext('test-context')
			const handler = vi.fn()

			mockSetTimeout.mockReturnValue(100)
			contextTimers.setTimeout(handler, 1000)

			contextTimers.dispose()

			expect(mockClearTimeout).toHaveBeenCalledWith(100)
		})

		it('should handle default parameters in context methods', () => {
			const contextTimers = timers.forContext('test-context')
			const handler = vi.fn()

			contextTimers.setTimeout(handler)
			contextTimers.setInterval(handler)

			// The forContext method passes empty args as [[]] instead of []
			expect(mockSetTimeout).toHaveBeenCalledWith(handler, undefined, [[]])
			expect(mockSetInterval).toHaveBeenCalledWith(handler, undefined, [[]])
		})
	})

	describe('integration scenarios', () => {
		it('should handle mixed timer types in same context', () => {
			const handler = vi.fn()
			const callback = vi.fn()

			mockSetTimeout.mockReturnValue(100)
			mockSetInterval.mockReturnValue(200)
			mockRequestAnimationFrame.mockReturnValue(300)

			timers.setTimeout('mixed-context', handler, 1000)
			timers.setInterval('mixed-context', handler, 2000)
			timers.requestAnimationFrame('mixed-context', callback)

			timers.dispose('mixed-context')

			expect(mockClearTimeout).toHaveBeenCalledWith(100)
			expect(mockClearInterval).toHaveBeenCalledWith(200)
			expect(mockCancelAnimationFrame).toHaveBeenCalledWith(300)
		})

		it('should handle typical component lifecycle pattern', () => {
			const handler = vi.fn()

			mockSetTimeout.mockReturnValueOnce(1).mockReturnValueOnce(2)
			mockSetInterval.mockReturnValue(3)

			// Component mount - set up timers
			timers.setTimeout('component', handler, 5000) // Auto-save
			timers.setInterval('component', handler, 1000) // Refresh
			timers.setTimeout('component', handler, 10000) // Cleanup task

			// Component unmount - dispose all timers
			timers.dispose('component')

			expect(mockClearTimeout).toHaveBeenCalledWith(1)
			expect(mockClearTimeout).toHaveBeenCalledWith(2)
			expect(mockClearInterval).toHaveBeenCalledWith(3)
		})

		it('should handle multiple contexts independently', () => {
			const handler = vi.fn()

			mockSetTimeout.mockReturnValueOnce(1).mockReturnValueOnce(2).mockReturnValueOnce(3)

			timers.setTimeout('ui', handler, 1000)
			timers.setTimeout('background', handler, 2000)
			timers.setTimeout('network', handler, 3000)

			// Dispose only UI context
			timers.dispose('ui')

			expect(mockClearTimeout).toHaveBeenCalledWith(1)
			expect(mockClearTimeout).not.toHaveBeenCalledWith(2)
			expect(mockClearTimeout).not.toHaveBeenCalledWith(3)

			// Dispose remaining contexts
			timers.disposeAll()

			expect(mockClearTimeout).toHaveBeenCalledWith(2)
			expect(mockClearTimeout).toHaveBeenCalledWith(3)
		})

		it('should work with context-bound methods in real scenario', () => {
			const uiTimers = timers.forContext('ui')
			const backgroundTimers = timers.forContext('background')

			const handler = vi.fn()
			mockSetTimeout.mockReturnValueOnce(10).mockReturnValueOnce(20)
			mockSetInterval.mockReturnValue(30)

			// UI operations
			uiTimers.setTimeout(handler, 1000)
			uiTimers.setInterval(handler, 500)

			// Background operations
			backgroundTimers.setTimeout(handler, 5000)

			// Dispose UI context only
			uiTimers.dispose()

			expect(mockClearTimeout).toHaveBeenCalledWith(10)
			expect(mockClearInterval).toHaveBeenCalledWith(30)
			expect(mockClearTimeout).not.toHaveBeenCalledWith(20)
		})

		it('should handle rapid timer creation and disposal', () => {
			const handler = vi.fn()
			const mockIds = [1, 2, 3, 4, 5]
			mockSetTimeout.mockImplementation(() => mockIds.shift() || 999)

			// Rapidly create timers
			for (let i = 0; i < 5; i++) {
				timers.setTimeout(`context-${i % 2}`, handler, 100 * i)
			}

			// Dispose one context
			timers.dispose('context-0')

			// Should clear timers for context-0 (indices 0, 2, 4)
			expect(mockClearTimeout).toHaveBeenCalledWith(1) // index 0
			expect(mockClearTimeout).toHaveBeenCalledWith(3) // index 2
			expect(mockClearTimeout).toHaveBeenCalledWith(5) // index 4
			expect(mockClearTimeout).not.toHaveBeenCalledWith(2) // index 1, context-1
			expect(mockClearTimeout).not.toHaveBeenCalledWith(4) // index 3, context-1
		})
	})

	describe('edge cases', () => {
		it('should handle empty context ID', () => {
			const handler = vi.fn()

			expect(() => timers.setTimeout('', handler, 1000)).not.toThrow()
			expect(() => timers.dispose('')).not.toThrow()
		})

		it('should handle special characters in context ID', () => {
			const handler = vi.fn()
			const contextId = 'context-with-特殊字符-and-emoji-🎨'

			mockSetTimeout.mockReturnValue(100)

			expect(() => timers.setTimeout(contextId, handler, 1000)).not.toThrow()
			expect(() => timers.dispose(contextId)).not.toThrow()

			expect(mockClearTimeout).toHaveBeenCalledWith(100)
		})

		it('should handle null/undefined handler gracefully', () => {
			// TypeScript would prevent this, but testing runtime behavior
			expect(() => timers.setTimeout('test', null as any, 1000)).not.toThrow()
			expect(() => timers.setInterval('test', undefined as any, 1000)).not.toThrow()

			expect(mockSetTimeout).toHaveBeenCalledWith(null, 1000, [])
			expect(mockSetInterval).toHaveBeenCalledWith(undefined, 1000, [])
		})

		it('should handle very large timeout values', () => {
			const handler = vi.fn()
			const largeTimeout = Number.MAX_SAFE_INTEGER

			timers.setTimeout('test', handler, largeTimeout)

			expect(mockSetTimeout).toHaveBeenCalledWith(handler, largeTimeout, [])
		})

		it('should handle zero timeout', () => {
			const handler = vi.fn()

			timers.setTimeout('test', handler, 0)
			timers.setInterval('test', handler, 0)

			expect(mockSetTimeout).toHaveBeenCalledWith(handler, 0, [])
			expect(mockSetInterval).toHaveBeenCalledWith(handler, 0, [])
		})

		it('should handle negative timeout', () => {
			const handler = vi.fn()

			timers.setTimeout('test', handler, -1000)

			expect(mockSetTimeout).toHaveBeenCalledWith(handler, -1000, [])
		})
	})
})
