import { describe, expect, it } from 'vitest'
import { requiredEnv } from './env'

describe('env', () => {
	describe('requiredEnv', () => {
		it('returns environment when all required variables are present', () => {
			const env = {
				DATABASE_URL: 'postgres://localhost:5432/db',
				API_KEY: 'secret-key-123',
			}

			const result = requiredEnv(env, {
				DATABASE_URL: true,
				API_KEY: true,
			})

			expect(result).toBe(env)
		})

		it('accepts falsy values except undefined', () => {
			const env = {
				ZERO_VALUE: 0,
				FALSE_VALUE: false,
				NULL_VALUE: null,
				EMPTY_STRING: '',
			}

			const result = requiredEnv(env, {
				ZERO_VALUE: true,
				FALSE_VALUE: true,
				NULL_VALUE: true,
				EMPTY_STRING: true,
			})

			expect(result).toBe(env)
		})

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

		it('handles empty keys object', () => {
			const env = {
				SOME_VAR: 'value',
			}

			const result = requiredEnv(env as {}, {})
			expect(result).toBe(env)
		})
	})
})
