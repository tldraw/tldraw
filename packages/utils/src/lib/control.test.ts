import { describe, expect, it } from 'vitest'
import {
	assert,
	assertExists,
	exhaustiveSwitchError,
	promiseWithResolve,
	Result,
	sleep,
	type ErrorResult,
	type OkResult,
} from './control'

describe('Result types', () => {
	describe('OkResult', () => {
		it('should have ok property set to true', () => {
			const result: OkResult<string> = { ok: true, value: 'test' }
			expect(result.ok).toBe(true)
		})

		it('should contain the value', () => {
			const result: OkResult<number> = { ok: true, value: 42 }
			expect(result.value).toBe(42)
		})
	})

	describe('ErrorResult', () => {
		it('should have ok property set to false', () => {
			const result: ErrorResult<string> = { ok: false, error: 'test error' }
			expect(result.ok).toBe(false)
		})

		it('should contain the error', () => {
			const result: ErrorResult<string> = { ok: false, error: 'something went wrong' }
			expect(result.error).toBe('something went wrong')
		})
	})

	describe('Result utility object', () => {
		describe('Result.ok', () => {
			it('should create an OkResult with the given value', () => {
				const result = Result.ok('success')
				expect(result.ok).toBe(true)
				expect(result.value).toBe('success')
			})

			it('should work with different types', () => {
				const stringResult = Result.ok('hello')
				const numberResult = Result.ok(123)
				const objectResult = Result.ok({ key: 'value' })

				expect(stringResult.value).toBe('hello')
				expect(numberResult.value).toBe(123)
				expect(objectResult.value).toEqual({ key: 'value' })
			})

			it('should work with null and undefined values', () => {
				const nullResult = Result.ok(null)
				const undefinedResult = Result.ok(undefined)

				expect(nullResult.value).toBe(null)
				expect(undefinedResult.value).toBe(undefined)
			})
		})

		describe('Result.err', () => {
			it('should create an ErrorResult with the given error', () => {
				const result = Result.err('failure')
				expect(result.ok).toBe(false)
				expect(result.error).toBe('failure')
			})

			it('should work with different error types', () => {
				const stringError = Result.err('string error')
				const numberError = Result.err(404)
				const objectError = Result.err({ message: 'object error' })

				expect(stringError.error).toBe('string error')
				expect(numberError.error).toBe(404)
				expect(objectError.error).toEqual({ message: 'object error' })
			})
		})

		describe('Result type discrimination', () => {
			it('should allow type narrowing with ok property', () => {
				function processResult(result: Result<string, string>) {
					if (result.ok) {
						// TypeScript should infer result as OkResult<string>
						return result.value.toUpperCase()
					} else {
						// TypeScript should infer result as ErrorResult<string>
						return `Error: ${result.error}`
					}
				}

				const success = Result.ok('hello')
				const failure = Result.err('failed')

				expect(processResult(success)).toBe('HELLO')
				expect(processResult(failure)).toBe('Error: failed')
			})
		})
	})
})

describe('exhaustiveSwitchError', () => {
	it('should throw an error with the unhandled value', () => {
		expect(() => exhaustiveSwitchError('unhandled' as never)).toThrow(
			'Unknown switch case unhandled'
		)
	})

	it('should throw an error with property value when provided', () => {
		const value = { type: 'unknown', data: 'test' } as never
		expect(() => exhaustiveSwitchError(value, 'type')).toThrow('Unknown switch case unknown')
	})

	it('should handle objects without the specified property', () => {
		const value = { other: 'value' } as never
		expect(() => exhaustiveSwitchError(value, 'nonexistent')).toThrow(
			'Unknown switch case [object Object]'
		)
	})

	it('should handle null and undefined values', () => {
		expect(() => exhaustiveSwitchError(null as never)).toThrow('Unknown switch case null')
		expect(() => exhaustiveSwitchError(undefined as never)).toThrow('Unknown switch case undefined')
	})

	it('should handle primitive values', () => {
		expect(() => exhaustiveSwitchError(123 as never)).toThrow('Unknown switch case 123')
		expect(() => exhaustiveSwitchError(true as never)).toThrow('Unknown switch case true')
	})
})

describe('assert', () => {
	it('should not throw for truthy values', () => {
		expect(() => assert(true)).not.toThrow()
		expect(() => assert('hello')).not.toThrow()
		expect(() => assert(1)).not.toThrow()
		expect(() => assert({})).not.toThrow()
		expect(() => assert([])).not.toThrow()
	})

	it('should throw for falsy values', () => {
		expect(() => assert(false)).toThrow('Assertion Error')
		expect(() => assert('')).toThrow('Assertion Error')
		expect(() => assert(0)).toThrow('Assertion Error')
		expect(() => assert(null)).toThrow('Assertion Error')
		expect(() => assert(undefined)).toThrow('Assertion Error')
		expect(() => assert(NaN)).toThrow('Assertion Error')
	})

	it('should throw with custom message when provided', () => {
		expect(() => assert(false, 'Custom error message')).toThrow('Custom error message')
		expect(() => assert(null, 'Value cannot be null')).toThrow('Value cannot be null')
	})

	it('should provide type narrowing', () => {
		const value: string | null = 'test'
		assert(value)
		// After assertion, TypeScript should know value is non-null
		expect(value.length).toBe(4)
	})
})

describe('assertExists', () => {
	it('should return the value when not null or undefined', () => {
		expect(assertExists('hello')).toBe('hello')
		expect(assertExists(0)).toBe(0)
		expect(assertExists(false)).toBe(false)
		expect(assertExists('')).toBe('')

		const obj = { key: 'value' }
		expect(assertExists(obj)).toBe(obj)
	})

	it('should throw for null values', () => {
		expect(() => assertExists(null)).toThrow('value must be defined')
	})

	it('should throw for undefined values', () => {
		expect(() => assertExists(undefined)).toThrow('value must be defined')
	})

	it('should throw with custom message when provided', () => {
		expect(() => assertExists(null, 'Custom null message')).toThrow('Custom null message')
		expect(() => assertExists(undefined, 'Custom undefined message')).toThrow(
			'Custom undefined message'
		)
	})

	it('should provide type narrowing', () => {
		const value: string | null | undefined = 'test'
		const result = assertExists(value)
		// After assertion, TypeScript should know result is string (not null or undefined)
		expect(result.length).toBe(4)
	})
})

describe('promiseWithResolve', () => {
	it('should create a promise with resolve and reject methods', () => {
		const deferred = promiseWithResolve<string>()

		expect(deferred).toBeInstanceOf(Promise)
		expect(typeof deferred.resolve).toBe('function')
		expect(typeof deferred.reject).toBe('function')
	})

	it('should resolve when resolve is called', async () => {
		const deferred = promiseWithResolve<string>()

		setTimeout(() => deferred.resolve('resolved value'), 0)

		const result = await deferred
		expect(result).toBe('resolved value')
	})

	it('should reject when reject is called', async () => {
		const deferred = promiseWithResolve<string>()

		setTimeout(() => deferred.reject('rejected reason'), 0)

		await expect(deferred).rejects.toBe('rejected reason')
	})

	it('should work with different value types', async () => {
		const numberDeferred = promiseWithResolve<number>()
		const objectDeferred = promiseWithResolve<{ key: string }>()

		setTimeout(() => numberDeferred.resolve(42), 0)
		setTimeout(() => objectDeferred.resolve({ key: 'value' }), 0)

		expect(await numberDeferred).toBe(42)
		expect(await objectDeferred).toEqual({ key: 'value' })
	})

	it('should handle multiple calls to resolve/reject gracefully', async () => {
		const deferred = promiseWithResolve<string>()

		deferred.resolve('first')
		deferred.resolve('second') // Should be ignored

		const result = await deferred
		expect(result).toBe('first')
	})
})

describe('sleep', () => {
	it('should resolve after the specified delay', async () => {
		const start = Date.now()
		await sleep(50)
		const elapsed = Date.now() - start

		// Allow for some timing variance (±10ms)
		expect(elapsed).toBeGreaterThanOrEqual(40)
		expect(elapsed).toBeLessThan(100)
	})

	it('should resolve with undefined', async () => {
		const result = await sleep(1)
		expect(result).toBe(undefined)
	})

	it('should work with zero delay', async () => {
		const start = Date.now()
		await sleep(0)
		const elapsed = Date.now() - start

		// Should resolve very quickly
		expect(elapsed).toBeLessThan(50)
	})

	it('should work in parallel', async () => {
		const start = Date.now()

		await Promise.all([sleep(30), sleep(30), sleep(30)])

		const elapsed = Date.now() - start

		// All should complete around the same time (~30ms), not sequentially (~90ms)
		expect(elapsed).toBeGreaterThanOrEqual(25)
		expect(elapsed).toBeLessThan(60)
	})
})
