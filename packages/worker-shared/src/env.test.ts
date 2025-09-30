import { describe, expect, it } from 'vitest'
import { requiredEnv } from './env'

describe('env', () => {
	describe('requiredEnv', () => {
		it('throws error when required variable is undefined', () => {
			const env = {
				PRESENT_VAR: 'value',
				UNDEFINED_VAR: undefined,
			}

			expect(() =>
				requiredEnv(env, {
					PRESENT_VAR: true,
					UNDEFINED_VAR: true,
				})
			).toThrow('Missing required env var: UNDEFINED_VAR')
		})

		it('throws error when required variable is missing from object', () => {
			const env = {
				PRESENT_VAR: 'value',
			} as any

			expect(() =>
				requiredEnv(env, {
					PRESENT_VAR: true,
					MISSING_VAR: true,
				} as any)
			).toThrow('Missing required env var: MISSING_VAR')
		})

		it('throws error for first missing variable', () => {
			const env = {
				B_VAR: 'present',
			} as any

			expect(() =>
				requiredEnv(env, {
					A_VAR: true,
					B_VAR: true,
					C_VAR: true,
				} as any)
			).toThrow('Missing required env var: A_VAR')
		})
	})
})
