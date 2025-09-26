import { describe, expect, it } from 'vitest'
import { assert, assertExists, exhaustiveSwitchError, promiseWithResolve } from './control'

describe('exhaustiveSwitchError', () => {
	it('should throw an error with the unhandled value', () => {
		expect(() => exhaustiveSwitchError('unhandled' as never)).toThrow(
			'Unknown switch case unhandled'
		)
	})

	it('should throw with property value when provided', () => {
		const value = { type: 'unknown', data: 'test' } as never
		expect(() => exhaustiveSwitchError(value, 'type')).toThrow('Unknown switch case unknown')
	})
})

describe('assert', () => {
	it('should throw with custom message when provided', () => {
		expect(() => assert(false, 'Custom error message')).toThrow('Custom error message')
		expect(() => assert(null, 'Value cannot be null')).toThrow('Value cannot be null')
	})
})

describe('assertExists', () => {
	it('should throw with custom message when provided', () => {
		expect(() => assertExists(null, 'Custom null message')).toThrow('Custom null message')
		expect(() => assertExists(undefined, 'Custom undefined message')).toThrow(
			'Custom undefined message'
		)
	})
})

describe('promiseWithResolve', () => {
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
})
