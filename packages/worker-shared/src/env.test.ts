import { describe, expect, it, vi } from 'vitest'
import { requiredEnv } from './env'

// Mock the getOwnProperty function from @tldraw/utils
vi.mock('@tldraw/utils', () => ({
	getOwnProperty: vi.fn((obj: object, key: string) => {
		// Mimic the actual behavior of getOwnProperty
		if (!Object.prototype.hasOwnProperty.call(obj, key)) {
			return undefined
		}
		// @ts-expect-error we know the property exists
		return obj[key]
	}),
}))

const { getOwnProperty } = await import('@tldraw/utils')

describe('env', () => {
	describe('requiredEnv', () => {
		describe('successful validation', () => {
			it('returns environment with all required variables present', () => {
				const env = {
					DATABASE_URL: 'postgres://localhost:5432/db',
					API_KEY: 'secret-key-123',
				}

				const result = requiredEnv(env, {
					DATABASE_URL: true,
					API_KEY: true,
				})

				expect(result).toBe(env)
				expect(result.DATABASE_URL).toBe('postgres://localhost:5432/db')
				expect(result.API_KEY).toBe('secret-key-123')
			})

			it('handles string values correctly', () => {
				const env = {
					STRING_VAR: 'hello world',
					EMPTY_STRING: '',
				}

				const result = requiredEnv(env, {
					STRING_VAR: true,
					EMPTY_STRING: true,
				})

				expect(result.STRING_VAR).toBe('hello world')
				expect(result.EMPTY_STRING).toBe('')
			})

			it('handles numeric values correctly', () => {
				const env = {
					PORT: 3000,
					ZERO_VALUE: 0,
				}

				const result = requiredEnv(env, {
					PORT: true,
					ZERO_VALUE: true,
				})

				expect(result.PORT).toBe(3000)
				expect(result.ZERO_VALUE).toBe(0)
			})

			it('handles boolean values correctly', () => {
				const env = {
					DEBUG: true,
					PRODUCTION: false,
				}

				const result = requiredEnv(env, {
					DEBUG: true,
					PRODUCTION: true,
				})

				expect(result.DEBUG).toBe(true)
				expect(result.PRODUCTION).toBe(false)
			})

			it('handles object values correctly', () => {
				const bucketObject = { name: 'test-bucket' }
				const env = {
					BUCKET: bucketObject,
					METADATA: { version: '1.0.0' },
				}

				const result = requiredEnv(env, {
					BUCKET: true,
					METADATA: true,
				})

				expect(result.BUCKET).toBe(bucketObject)
				expect(result.METADATA).toEqual({ version: '1.0.0' })
			})

			it('handles array values correctly', () => {
				const env = {
					ALLOWED_ORIGINS: ['https://example.com', 'https://test.com'],
					NUMBERS: [1, 2, 3],
				}

				const result = requiredEnv(env, {
					ALLOWED_ORIGINS: true,
					NUMBERS: true,
				})

				expect(result.ALLOWED_ORIGINS).toEqual(['https://example.com', 'https://test.com'])
				expect(result.NUMBERS).toEqual([1, 2, 3])
			})

			it('validates single required variable', () => {
				const env = {
					SINGLE_VAR: 'value',
				}

				const result = requiredEnv(env, {
					SINGLE_VAR: true,
				})

				expect(result.SINGLE_VAR).toBe('value')
			})

			it('validates multiple required variables', () => {
				const env = {
					VAR_ONE: 'first',
					VAR_TWO: 'second',
					VAR_THREE: 'third',
				}

				const result = requiredEnv(env, {
					VAR_ONE: true,
					VAR_TWO: true,
					VAR_THREE: true,
				})

				expect(result.VAR_ONE).toBe('first')
				expect(result.VAR_TWO).toBe('second')
				expect(result.VAR_THREE).toBe('third')
			})

			it('uses getOwnProperty to check for variables', () => {
				const env = {
					PRESENT_VAR: 'value',
				}

				requiredEnv(env, {
					PRESENT_VAR: true,
				})

				expect(getOwnProperty).toHaveBeenCalledWith(env, 'PRESENT_VAR')
			})
		})

		describe('error handling for missing variables', () => {
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
				} as any // Type assertion needed for testing missing property

				expect(() =>
					requiredEnv(env, {
						PRESENT_VAR: true,
						MISSING_VAR: true,
					} as any)
				).toThrow('Missing required env var: MISSING_VAR')
			})

			it('throws error with correct variable name for first missing variable', () => {
				const env = {
					PRESENT_VAR: 'value',
				} as any // Type assertion needed for testing missing properties

				expect(() =>
					requiredEnv(env, {
						MISSING_FIRST: true,
						PRESENT_VAR: true,
						MISSING_SECOND: true,
					} as any)
				).toThrow('Missing required env var: MISSING_FIRST')
			})

			it('throws error with exact message format', () => {
				const env = {} as any // Type assertion needed for testing empty object

				expect(() =>
					requiredEnv(env, {
						TEST_VAR: true,
					} as any)
				).toThrow(new Error('Missing required env var: TEST_VAR'))
			})

			it('stops validation on first missing variable', () => {
				const env = {}
				const mockGetOwnProperty = vi.mocked(getOwnProperty)
				mockGetOwnProperty.mockClear()

				try {
					requiredEnv(env, {
						FIRST_MISSING: true,
						SECOND_MISSING: true,
					})
				} catch {
					// Expected to throw
				}

				// Should only check the first variable before throwing
				expect(mockGetOwnProperty).toHaveBeenCalledTimes(1)
				expect(mockGetOwnProperty).toHaveBeenCalledWith(env, 'FIRST_MISSING')
			})
		})

		describe('edge cases and boundary conditions', () => {
			it('handles empty environment object', () => {
				const env = {}

				expect(() =>
					requiredEnv(env, {
						ANY_VAR: true,
					})
				).toThrow('Missing required env var: ANY_VAR')
			})

			it('handles empty keys object', () => {
				const env = {
					SOME_VAR: 'value',
				}

				// Clear previous calls to getOwnProperty
				vi.mocked(getOwnProperty).mockClear()

				const result = requiredEnv(env as any, {} as any)

				expect(result).toBe(env)
				expect(getOwnProperty).not.toHaveBeenCalled()
			})

			it('accepts null values as valid (non-undefined)', () => {
				const env = {
					NULL_VAR: null,
				}

				const result = requiredEnv(env, {
					NULL_VAR: true,
				})

				expect(result.NULL_VAR).toBe(null)
			})

			it('accepts zero as valid value', () => {
				const env = {
					ZERO_VAR: 0,
				}

				const result = requiredEnv(env, {
					ZERO_VAR: true,
				})

				expect(result.ZERO_VAR).toBe(0)
			})

			it('accepts false as valid value', () => {
				const env = {
					FALSE_VAR: false,
				}

				const result = requiredEnv(env, {
					FALSE_VAR: true,
				})

				expect(result.FALSE_VAR).toBe(false)
			})

			it('accepts empty string as valid value', () => {
				const env = {
					EMPTY_STRING: '',
				}

				const result = requiredEnv(env, {
					EMPTY_STRING: true,
				})

				expect(result.EMPTY_STRING).toBe('')
			})

			it('handles objects with null prototype', () => {
				const env = Object.create(null)
				env.TEST_VAR = 'value'

				const result = requiredEnv(env, {
					TEST_VAR: true,
				})

				expect(result.TEST_VAR).toBe('value')
			})

			it('handles objects with overridden hasOwnProperty', () => {
				const env = {
					TEST_VAR: 'value',
					hasOwnProperty: () => false, // Override hasOwnProperty
				} as any // Type assertion needed for overriding built-in method

				const result = requiredEnv(env, {
					TEST_VAR: true,
				} as any)

				expect(result.TEST_VAR).toBe('value')
				// Should still work because getOwnProperty uses Object.prototype.hasOwnProperty.call
			})
		})

		describe('type safety and return value', () => {
			it('returns the same object reference', () => {
				const env = {
					TEST_VAR: 'value',
				}

				const result = requiredEnv(env, {
					TEST_VAR: true,
				})

				expect(result).toBe(env)
			})

			it('preserves all properties in returned object', () => {
				const env = {
					REQUIRED_VAR: 'required',
					OPTIONAL_VAR: 'optional',
					ANOTHER_OPTIONAL: 123,
					OBJECT_VAR: { nested: 'value' },
				}

				const result = requiredEnv(
					env as any,
					{
						REQUIRED_VAR: true,
					} as any
				)

				expect(result).toEqual(env)
				expect(Object.keys(result)).toEqual(Object.keys(env))
			})

			it('maintains property descriptors', () => {
				const env = {}
				Object.defineProperty(env, 'READONLY_VAR', {
					value: 'readonly',
					writable: false,
					enumerable: true,
					configurable: false,
				})

				const result = requiredEnv(env, {
					READONLY_VAR: true,
				})

				const descriptor = Object.getOwnPropertyDescriptor(result, 'READONLY_VAR')
				expect(descriptor).toEqual({
					value: 'readonly',
					writable: false,
					enumerable: true,
					configurable: false,
				})
			})
		})

		describe('complex object scenarios', () => {
			it('works with CloudFlare Worker environment interfaces', () => {
				interface WorkerEnv {
					readonly SENTRY_DSN?: string
					readonly API_KEY?: string
					readonly BUCKET?: { name: string }
					readonly WORKER_NAME?: string
				}

				const env: WorkerEnv = {
					SENTRY_DSN: 'https://sentry.io/123',
					API_KEY: 'secret-key',
					BUCKET: { name: 'test-bucket' },
					// WORKER_NAME is undefined
				}

				const result = requiredEnv(env, {
					SENTRY_DSN: true,
					API_KEY: true,
					BUCKET: true,
				})

				expect(result.SENTRY_DSN).toBe('https://sentry.io/123')
				expect(result.API_KEY).toBe('secret-key')
				expect(result.BUCKET).toEqual({ name: 'test-bucket' })
			})

			it('handles mixed data types in single validation', () => {
				const env = {
					STRING_VAR: 'text',
					NUMBER_VAR: 42,
					BOOLEAN_VAR: true,
					ARRAY_VAR: [1, 2, 3],
					OBJECT_VAR: { key: 'value' },
					NULL_VAR: null,
					ZERO_VAR: 0,
					FALSE_VAR: false,
					EMPTY_STRING: '',
				}

				const result = requiredEnv(env, {
					STRING_VAR: true,
					NUMBER_VAR: true,
					BOOLEAN_VAR: true,
					ARRAY_VAR: true,
					OBJECT_VAR: true,
					NULL_VAR: true,
					ZERO_VAR: true,
					FALSE_VAR: true,
					EMPTY_STRING: true,
				})

				expect(result).toEqual(env)
			})

			it('validates environment with computed property names', () => {
				const prefix = 'API'
				const suffix = 'KEY'
				const computedKey = `${prefix}_${suffix}`

				const env = {
					[computedKey]: 'dynamic-key-value',
				}

				const result = requiredEnv(env, {
					API_KEY: true,
				})

				expect(result.API_KEY).toBe('dynamic-key-value')
			})
		})

		describe('real-world usage patterns', () => {
			it('validates typical web server environment', () => {
				const env = {
					PORT: 3000,
					NODE_ENV: 'production',
					DATABASE_URL: 'postgres://localhost:5432/myapp',
					JWT_SECRET: 'super-secret-key',
					REDIS_URL: 'redis://localhost:6379',
				}

				const result = requiredEnv(
					env as any,
					{
						DATABASE_URL: true,
						JWT_SECRET: true,
					} as any
				)

				expect(result.DATABASE_URL).toBe('postgres://localhost:5432/myapp')
				expect(result.JWT_SECRET).toBe('super-secret-key')
				expect((result as any).PORT).toBe(3000)
				expect((result as any).NODE_ENV).toBe('production')
				expect((result as any).REDIS_URL).toBe('redis://localhost:6379')
			})

			it('validates CloudFlare Worker environment', () => {
				const env = {
					SENTRY_DSN: 'https://abc123@sentry.io/456789',
					WORKER_NAME: 'my-worker',
					TLDRAW_ENV: 'production',
					CF_VERSION_METADATA: { id: 'abc123', tag: 'v1.0.0' },
					UPLOADS_BUCKET: { name: 'uploads-bucket' },
				}

				const result = requiredEnv(
					env as any,
					{
						SENTRY_DSN: true,
						WORKER_NAME: true,
						CF_VERSION_METADATA: true,
					} as any
				)

				expect(result.SENTRY_DSN).toBe('https://abc123@sentry.io/456789')
				expect(result.WORKER_NAME).toBe('my-worker')
				expect(result.CF_VERSION_METADATA).toEqual({ id: 'abc123', tag: 'v1.0.0' })
				expect((result as any).TLDRAW_ENV).toBe('production')
				expect((result as any).UPLOADS_BUCKET).toEqual({ name: 'uploads-bucket' })
			})

			it('fails validation with realistic missing variables', () => {
				const env = {
					PORT: 3000,
					NODE_ENV: 'production',
					// DATABASE_URL is missing
					JWT_SECRET: undefined,
				} as any // Type assertion needed for missing properties

				expect(() =>
					requiredEnv(env, {
						DATABASE_URL: true,
						JWT_SECRET: true,
						PORT: true,
					} as any)
				).toThrow('Missing required env var: DATABASE_URL')
			})
		})

		describe('validation order consistency', () => {
			it('validates keys in Object.keys() order', () => {
				const env = {} as any // Type assertion needed for testing empty object

				// Object.keys returns keys in insertion order for string keys
				const keys = {
					THIRD: true,
					FIRST: true,
					SECOND: true,
				} as any

				expect(() => requiredEnv(env, keys)).toThrow('Missing required env var: THIRD')
			})

			it('stops at first missing variable in order', () => {
				const env = {
					B_VAR: 'present',
					D_VAR: 'present',
				} as any // Type assertion needed for testing missing properties

				// A_VAR and C_VAR are both missing, but should throw for A_VAR first
				expect(() =>
					requiredEnv(env, {
						A_VAR: true,
						B_VAR: true,
						C_VAR: true,
						D_VAR: true,
					} as any)
				).toThrow('Missing required env var: A_VAR')
			})
		})
	})
})
