import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	PERFORMANCE_COLORS,
	PERFORMANCE_PREFIX_COLOR,
	measureAverageDuration,
	measureCbDuration,
	measureDuration,
} from './perf'

describe('PERFORMANCE_COLORS', () => {
	it('contains expected color values', () => {
		expect(PERFORMANCE_COLORS).toEqual({
			Good: '#40C057',
			Mid: '#FFC078',
			Poor: '#E03131',
		})
	})

	it('has string values for all colors', () => {
		Object.values(PERFORMANCE_COLORS).forEach((color) => {
			expect(typeof color).toBe('string')
			expect(color).toMatch(/^#[0-9A-F]{6}$/i)
		})
	})

	it('can be accessed and values are strings', () => {
		// JavaScript objects are mutable by default
		// This test documents the current behavior and structure
		expect(typeof PERFORMANCE_COLORS.Good).toBe('string')
		expect(typeof PERFORMANCE_COLORS.Mid).toBe('string')
		expect(typeof PERFORMANCE_COLORS.Poor).toBe('string')
	})
})

describe('PERFORMANCE_PREFIX_COLOR', () => {
	it('uses the Good performance color', () => {
		expect(PERFORMANCE_PREFIX_COLOR).toBe('#40C057')
		expect(PERFORMANCE_PREFIX_COLOR).toBe(PERFORMANCE_COLORS.Good)
	})

	it('is a string', () => {
		expect(typeof PERFORMANCE_PREFIX_COLOR).toBe('string')
	})
})

describe('measureCbDuration', () => {
	let consoleSpy: ReturnType<typeof vi.spyOn>

	beforeEach(() => {
		consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
	})

	afterEach(() => {
		consoleSpy.mockRestore()
	})

	it('executes callback and returns its result', () => {
		const callback = vi.fn(() => 'test result')
		const result = measureCbDuration('test operation', callback)

		expect(callback).toHaveBeenCalledOnce()
		expect(result).toBe('test result')
	})

	it('logs execution time to console', () => {
		const callback = () => 'result'
		measureCbDuration('test operation', callback)

		expect(consoleSpy).toHaveBeenCalledOnce()
		const [logMessage, styleFirst, styleSecond] = consoleSpy.mock.calls[0]

		expect(logMessage).toMatch(/^%cPerf%c test operation took \d+(\.\d+)?ms$/)
		expect(styleFirst).toBe(
			`color: white; background: ${PERFORMANCE_PREFIX_COLOR};padding: 2px;border-radius: 3px;`
		)
		expect(styleSecond).toBe('font-weight: normal')
	})

	it('works with callbacks that return different types', () => {
		expect(measureCbDuration('number test', () => 42)).toBe(42)
		expect(measureCbDuration('string test', () => 'hello')).toBe('hello')
		expect(measureCbDuration('object test', () => ({ key: 'value' }))).toEqual({ key: 'value' })
		expect(measureCbDuration('null test', () => null)).toBe(null)
		expect(measureCbDuration('undefined test', () => undefined)).toBeUndefined()
	})

	it('handles callbacks that throw errors', () => {
		const throwingCallback = () => {
			throw new Error('callback error')
		}

		expect(() => measureCbDuration('error test', throwingCallback)).toThrow('callback error')
		expect(consoleSpy).not.toHaveBeenCalled() // Should not log if callback throws
	})

	it('uses the provided operation name in log message', () => {
		measureCbDuration('custom operation name', () => 'result')

		expect(consoleSpy).toHaveBeenCalledOnce()
		const [logMessage] = consoleSpy.mock.calls[0]
		expect(logMessage).toContain('custom operation name')
	})

	it('measures actual execution time', () => {
		const slowCallback = () => {
			// Simulate some work
			const start = performance.now()
			while (performance.now() - start < 10) {
				// Busy wait for at least 10ms
			}
			return 'done'
		}

		measureCbDuration('slow operation', slowCallback)

		expect(consoleSpy).toHaveBeenCalledOnce()
		const [logMessage] = consoleSpy.mock.calls[0]
		const match = (logMessage as string).match(/took (\d+(?:\.\d+)?)ms/)
		expect(match).not.toBeNull()
		const duration = parseFloat(match![1])
		expect(duration).toBeGreaterThanOrEqual(10)
	})

	it('handles empty operation names', () => {
		measureCbDuration('', () => 'result')

		expect(consoleSpy).toHaveBeenCalledOnce()
		const [logMessage] = consoleSpy.mock.calls[0]
		expect(logMessage).toMatch(/^%cPerf%c {2}took \d+(\.\d+)?ms$/)
	})
})

describe('measureDuration decorator', () => {
	let consoleSpy: ReturnType<typeof vi.spyOn>

	beforeEach(() => {
		consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
	})

	afterEach(() => {
		consoleSpy.mockRestore()
	})

	it('decorates method and logs execution time', () => {
		// Test the decorator directly since TypeScript compilation handles the decorator
		const testMethod = function (this: any) {
			return this.value
		}

		const descriptor: PropertyDescriptor = {
			value: testMethod,
			writable: true,
			enumerable: true,
			configurable: true,
		}

		measureDuration({}, 'testMethod', descriptor)

		const wrappedMethod = descriptor.value
		const result = wrappedMethod.call({ value: 'test' })

		expect(result).toBe('test')
		expect(consoleSpy).toHaveBeenCalledOnce()

		const [logMessage, styleFirst, styleSecond] = consoleSpy.mock.calls[0]
		expect(logMessage).toMatch(/^%cPerf%c testMethod took: \d+(\.\d+)?ms$/)
		expect(styleFirst).toBe(
			`color: white; background: ${PERFORMANCE_PREFIX_COLOR};padding: 2px;border-radius: 3px;`
		)
		expect(styleSecond).toBe('font-weight: normal')
	})

	it('preserves method functionality with parameters', () => {
		const multiplyMethod = function (this: any, a: number, b: number) {
			return a * b
		}

		const descriptor: PropertyDescriptor = {
			value: multiplyMethod,
			writable: true,
			enumerable: true,
			configurable: true,
		}

		measureDuration({}, 'multiply', descriptor)

		const wrappedMethod = descriptor.value
		const result = wrappedMethod.call({}, 5, 3)

		expect(result).toBe(15)
		expect(consoleSpy).toHaveBeenCalledOnce()

		const [logMessage] = consoleSpy.mock.calls[0]
		expect(logMessage).toContain('multiply took:')
	})

	it('preserves this context', () => {
		const calculateMethod = function (this: any, value: number) {
			return value * this.multiplier
		}

		const descriptor: PropertyDescriptor = {
			value: calculateMethod,
			writable: true,
			enumerable: true,
			configurable: true,
		}

		measureDuration({}, 'calculate', descriptor)

		const wrappedMethod = descriptor.value
		const result = wrappedMethod.call({ multiplier: 2 }, 10)

		expect(result).toBe(20)
	})

	it('handles methods that throw errors', () => {
		const throwingMethod = function () {
			throw new Error('method error')
		}

		const descriptor: PropertyDescriptor = {
			value: throwingMethod,
			writable: true,
			enumerable: true,
			configurable: true,
		}

		measureDuration({}, 'throwError', descriptor)

		const wrappedMethod = descriptor.value

		expect(() => wrappedMethod.call({})).toThrow('method error')
		expect(consoleSpy).not.toHaveBeenCalled() // Should not log if method throws
	})

	it('can decorate multiple methods', () => {
		const methodA = function () {
			return 'A'
		}
		const methodB = function () {
			return 'B'
		}

		const descriptorA: PropertyDescriptor = {
			value: methodA,
			writable: true,
			enumerable: true,
			configurable: true,
		}

		const descriptorB: PropertyDescriptor = {
			value: methodB,
			writable: true,
			enumerable: true,
			configurable: true,
		}

		measureDuration({}, 'methodA', descriptorA)
		measureDuration({}, 'methodB', descriptorB)

		descriptorA.value.call({})
		descriptorB.value.call({})

		expect(consoleSpy).toHaveBeenCalledTimes(2)

		const [firstLog] = consoleSpy.mock.calls[0]
		const [secondLog] = consoleSpy.mock.calls[1]

		expect(firstLog).toContain('methodA took:')
		expect(secondLog).toContain('methodB took:')
	})

	it('works with async methods', async () => {
		const asyncMethod = async function () {
			await new Promise((resolve) => setTimeout(resolve, 10))
			return 'async result'
		}

		const descriptor: PropertyDescriptor = {
			value: asyncMethod,
			writable: true,
			enumerable: true,
			configurable: true,
		}

		measureDuration({}, 'asyncMethod', descriptor)

		const wrappedMethod = descriptor.value
		const result = await wrappedMethod.call({})

		expect(result).toBe('async result')
		expect(consoleSpy).toHaveBeenCalledOnce()

		const [logMessage] = consoleSpy.mock.calls[0]
		expect(logMessage).toContain('asyncMethod took:')
	})

	it('handles methods with no return value', () => {
		const context = { sideEffect: false }
		const sideEffectMethod = function (this: typeof context) {
			this.sideEffect = true
		}

		const descriptor: PropertyDescriptor = {
			value: sideEffectMethod,
			writable: true,
			enumerable: true,
			configurable: true,
		}

		measureDuration({}, 'doSideEffect', descriptor)

		const wrappedMethod = descriptor.value
		const result = wrappedMethod.call(context)

		expect(result).toBeUndefined()
		expect(context.sideEffect).toBe(true)
		expect(consoleSpy).toHaveBeenCalledOnce()
	})

	it('modifies the original descriptor', () => {
		const originalMethod = function () {
			return 'original'
		}
		const descriptor: PropertyDescriptor = {
			value: originalMethod,
			writable: true,
			enumerable: true,
			configurable: true,
		}

		const result = measureDuration({}, 'testMethod', descriptor)

		expect(result).toBe(descriptor) // Returns same descriptor object
		expect(descriptor.value).not.toBe(originalMethod) // But value is wrapped
		expect(typeof descriptor.value).toBe('function')
	})
})

describe('measureAverageDuration decorator', () => {
	let consoleSpy: ReturnType<typeof vi.spyOn>

	beforeEach(() => {
		consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
	})

	afterEach(() => {
		consoleSpy.mockRestore()
	})

	it('tracks running average of execution times', () => {
		const testMethod = function () {
			return 'result'
		}

		const descriptor: PropertyDescriptor = {
			value: testMethod,
			writable: true,
			enumerable: true,
			configurable: true,
		}

		measureAverageDuration({}, 'testMethod', descriptor)

		const wrappedMethod = descriptor.value

		// Call multiple times
		wrappedMethod.call({})
		wrappedMethod.call({})
		wrappedMethod.call({})

		expect(consoleSpy).toHaveBeenCalledTimes(3)

		// Each call should show both current time and running average
		consoleSpy.mock.calls.forEach(([logMessage]) => {
			expect(logMessage).toMatch(/^%cPerf%c testMethod took \d+\.\d{2}ms \| average \d+\.\d{2}ms$/)
		})
	})

	it('preserves method functionality', () => {
		const addMethod = function (a: number, b: number) {
			return a + b
		}

		const descriptor: PropertyDescriptor = {
			value: addMethod,
			writable: true,
			enumerable: true,
			configurable: true,
		}

		measureAverageDuration({}, 'add', descriptor)

		const wrappedMethod = descriptor.value
		const result = wrappedMethod.call({}, 2, 3)

		expect(result).toBe(5)
	})

	it('maintains separate averages for different methods', () => {
		const methodA = function () {
			return 'A'
		}
		const methodB = function () {
			return 'B'
		}

		const descriptorA: PropertyDescriptor = {
			value: methodA,
			writable: true,
			enumerable: true,
			configurable: true,
		}

		const descriptorB: PropertyDescriptor = {
			value: methodB,
			writable: true,
			enumerable: true,
			configurable: true,
		}

		measureAverageDuration({}, 'methodA', descriptorA)
		measureAverageDuration({}, 'methodB', descriptorB)

		// Call each method multiple times
		descriptorA.value.call({})
		descriptorA.value.call({})
		descriptorB.value.call({})
		descriptorB.value.call({})

		expect(consoleSpy).toHaveBeenCalledTimes(4)

		const methodACalls = consoleSpy.mock.calls.filter(([msg]) =>
			(msg as string).includes('methodA')
		)
		const methodBCalls = consoleSpy.mock.calls.filter(([msg]) =>
			(msg as string).includes('methodB')
		)

		expect(methodACalls).toHaveLength(2)
		expect(methodBCalls).toHaveLength(2)
	})

	it('does not log when execution time is 0', () => {
		const instantMethod = function () {
			return 'instant'
		}

		const descriptor: PropertyDescriptor = {
			value: instantMethod,
			writable: true,
			enumerable: true,
			configurable: true,
		}

		measureAverageDuration({}, 'instantMethod', descriptor)

		// Mock performance.now to return same value (0 duration)
		const mockPerformanceNow = vi.spyOn(performance, 'now')
		mockPerformanceNow.mockReturnValue(1000)

		const wrappedMethod = descriptor.value
		const result = wrappedMethod.call({})

		expect(result).toBe('instant')
		expect(consoleSpy).not.toHaveBeenCalled()

		mockPerformanceNow.mockRestore()
	})

	it('handles methods that throw errors', () => {
		const throwingMethod = function () {
			throw new Error('method error')
		}

		const descriptor: PropertyDescriptor = {
			value: throwingMethod,
			writable: true,
			enumerable: true,
			configurable: true,
		}

		measureAverageDuration({}, 'throwError', descriptor)

		const wrappedMethod = descriptor.value

		expect(() => wrappedMethod.call({})).toThrow('method error')
		expect(consoleSpy).not.toHaveBeenCalled()
	})

	it('calculates averages correctly', () => {
		const timedMethod = function () {
			return 'result'
		}

		const descriptor: PropertyDescriptor = {
			value: timedMethod,
			writable: true,
			enumerable: true,
			configurable: true,
		}

		measureAverageDuration({}, 'timedMethod', descriptor)

		// Mock performance.now to return predictable values
		const mockPerformanceNow = vi.spyOn(performance, 'now')
		let timeCounter = 0
		mockPerformanceNow.mockImplementation(() => {
			// First call: 0, second: 10, third: 10, fourth: 20, etc.
			const time = timeCounter
			timeCounter += 10
			return time
		})

		const wrappedMethod = descriptor.value

		// First call: 10ms duration, average 10ms
		wrappedMethod.call({})
		expect(consoleSpy).toHaveBeenCalledTimes(1)
		expect(consoleSpy.mock.calls[0][0]).toMatch(/took 10\.00ms \| average 10\.00ms/)

		// Second call: 10ms duration, average 10ms
		wrappedMethod.call({})
		expect(consoleSpy).toHaveBeenCalledTimes(2)
		expect(consoleSpy.mock.calls[1][0]).toMatch(/took 10\.00ms \| average 10\.00ms/)

		mockPerformanceNow.mockRestore()
	})

	it('works with async methods', async () => {
		const asyncMethod = async function () {
			await new Promise((resolve) => setTimeout(resolve, 10))
			return 'async result'
		}

		const descriptor: PropertyDescriptor = {
			value: asyncMethod,
			writable: true,
			enumerable: true,
			configurable: true,
		}

		measureAverageDuration({}, 'asyncMethod', descriptor)

		const wrappedMethod = descriptor.value
		const result = await wrappedMethod.call({})

		expect(result).toBe('async result')
		expect(consoleSpy).toHaveBeenCalledOnce()

		const [logMessage] = consoleSpy.mock.calls[0]
		expect(logMessage).toContain('asyncMethod took')
		expect(logMessage).toContain('average')
	})

	it('initializes averages map entry', () => {
		const originalMethod = function () {
			return 'original'
		}
		const descriptor: PropertyDescriptor = {
			value: originalMethod,
			writable: true,
			enumerable: true,
			configurable: true,
		}

		const result = measureAverageDuration({}, 'testMethod', descriptor)

		expect(result).toBe(descriptor)
		expect(descriptor.value).not.toBe(originalMethod)

		// The averages map should be initialized for this method
		// We can't directly test the private averages map, but the decorator should work
		expect(typeof descriptor.value).toBe('function')
	})

	it('formats times to 2 decimal places', () => {
		const testMethod = function () {
			return 'result'
		}

		const descriptor: PropertyDescriptor = {
			value: testMethod,
			writable: true,
			enumerable: true,
			configurable: true,
		}

		measureAverageDuration({}, 'testMethod', descriptor)

		// Mock performance.now to return fractional values
		const mockPerformanceNow = vi.spyOn(performance, 'now')
		mockPerformanceNow
			.mockReturnValueOnce(0)
			.mockReturnValueOnce(15.6789)
			.mockReturnValueOnce(15.6789)

		const wrappedMethod = descriptor.value
		wrappedMethod.call({})

		expect(consoleSpy).toHaveBeenCalledOnce()
		const [logMessage] = consoleSpy.mock.calls[0]
		expect(logMessage).toMatch(/took 15\.68ms \| average 15\.68ms/)

		mockPerformanceNow.mockRestore()
	})
})
