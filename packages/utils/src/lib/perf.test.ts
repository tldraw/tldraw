import { describe, expect, it, vi } from 'vitest'
import { measureAverageDuration, measureCbDuration, measureDuration } from './perf'

describe('measureCbDuration', () => {
	it('executes callback and returns its result', () => {
		const callback = vi.fn(() => 'test result')
		const result = measureCbDuration('test operation', callback)

		expect(callback).toHaveBeenCalledOnce()
		expect(result).toBe('test result')
	})
})

describe('measureDuration decorator', () => {
	it('preserves method functionality with parameters', () => {
		const multiplyMethod = function (a: number, b: number) {
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
	})
})

describe('measureAverageDuration decorator', () => {
	it('preserves method functionality across multiple calls', () => {
		const counterMethod = function () {
			return Math.random()
		}

		const descriptor: PropertyDescriptor = {
			value: counterMethod,
			writable: true,
			enumerable: true,
			configurable: true,
		}

		measureAverageDuration({}, 'counter', descriptor)

		const wrappedMethod = descriptor.value

		// Call multiple times - should not interfere with each other
		const result1 = wrappedMethod.call({})
		const result2 = wrappedMethod.call({})
		const result3 = wrappedMethod.call({})

		expect(typeof result1).toBe('number')
		expect(typeof result2).toBe('number')
		expect(typeof result3).toBe('number')
	})
})
