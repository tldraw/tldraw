import { afterEach, describe, expect, it } from 'vitest'
import { resolveDotcomDevInstance } from './dev-instance'

describe('resolveDotcomDevInstance', () => {
	const original = process.env.DOTCOM_DEV_INSTANCE

	afterEach(() => {
		if (original === undefined) delete process.env.DOTCOM_DEV_INSTANCE
		else process.env.DOTCOM_DEV_INSTANCE = original
	})

	it('uses DOTCOM_DEV_INSTANCE when set, without touching the registry', () => {
		process.env.DOTCOM_DEV_INSTANCE = '2'
		expect(resolveDotcomDevInstance({ allocate: true })).toBe(2)
		expect(resolveDotcomDevInstance({ allocate: false })).toBe(2)
	})

	it('rejects an out-of-range DOTCOM_DEV_INSTANCE', () => {
		process.env.DOTCOM_DEV_INSTANCE = '99'
		expect(() => resolveDotcomDevInstance({ allocate: false })).toThrow()
	})
})
