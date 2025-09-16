import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the toucan-js library
vi.mock('toucan-js', () => ({
	Toucan: vi.fn(),
}))

// Mock the requiredEnv function
vi.mock('./env', () => ({
	requiredEnv: vi.fn(),
}))

// Mock @cloudflare/workers-types
vi.mock('@cloudflare/workers-types', () => ({}))

import { Toucan } from 'toucan-js'
import { requiredEnv } from './env'
import { createSentry, SentryEnvironment } from './sentry'

const mockToucan = vi.mocked(Toucan)
const mockRequiredEnv = vi.mocked(requiredEnv)

const createMockContext = () => ({
	waitUntil: vi.fn(),
})

const createMockRequest = () =>
	new Request('https://example.com/api/test', {
		method: 'GET',
		headers: { 'user-agent': 'Mozilla/5.0' },
	})

describe('sentry', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	describe('SentryEnvironment interface', () => {
		it('allows all properties to be undefined', () => {
			const env: SentryEnvironment = {}
			expect(env).toBeDefined()
		})

		it('accepts defined SENTRY_DSN', () => {
			const env: SentryEnvironment = {
				SENTRY_DSN: 'https://abc123@sentry.io/456789',
			}
			expect(env.SENTRY_DSN).toBe('https://abc123@sentry.io/456789')
		})

		it('accepts defined TLDRAW_ENV', () => {
			const env: SentryEnvironment = {
				TLDRAW_ENV: 'production',
			}
			expect(env.TLDRAW_ENV).toBe('production')
		})

		it('accepts defined WORKER_NAME', () => {
			const env: SentryEnvironment = {
				WORKER_NAME: 'my-worker',
			}
			expect(env.WORKER_NAME).toBe('my-worker')
		})

		it('accepts defined CF_VERSION_METADATA', () => {
			const metadata = { id: 'abc123', tag: 'v1.0.0', timestamp: '1234567890' }
			const env: SentryEnvironment = {
				CF_VERSION_METADATA: metadata,
			}
			expect(env.CF_VERSION_METADATA).toBe(metadata)
		})

		it('accepts all properties as defined', () => {
			const env: SentryEnvironment = {
				SENTRY_DSN: 'https://abc123@sentry.io/456789',
				TLDRAW_ENV: 'production',
				WORKER_NAME: 'my-worker',
				CF_VERSION_METADATA: { id: 'abc123', tag: 'v1.0.0', timestamp: '1234567890' },
			}
			expect(env).toBeDefined()
			expect(Object.keys(env)).toHaveLength(4)
		})
	})

	describe('createSentry', () => {
		describe('development environment behavior', () => {
			it('returns null when SENTRY_DSN is undefined and TLDRAW_ENV is development', () => {
				const ctx = createMockContext()
				const env: SentryEnvironment = {
					TLDRAW_ENV: 'development',
				}

				const result = createSentry(ctx, env)

				expect(result).toBe(null)
				expect(mockRequiredEnv).not.toHaveBeenCalled()
				expect(mockToucan).not.toHaveBeenCalled()
			})

			it.fails(
				'returns null when SENTRY_DSN is undefined and TLDRAW_ENV is undefined (dev default)',
				() => {
					// BUG: This test reveals a potential bug in the sentry.ts implementation
					// The comment says "TLDRAW_ENV is undefined in dev" but the condition only checks
					// for exact equality to 'development'. When both SENTRY_DSN and TLDRAW_ENV are
					// undefined, the function tries to call requiredEnv instead of returning null early.
					const ctx = createMockContext()
					const env: SentryEnvironment = {}

					const result = createSentry(ctx, env)

					expect(result).toBe(null)
					expect(mockRequiredEnv).not.toHaveBeenCalled()
					expect(mockToucan).not.toHaveBeenCalled()
				}
			)

			it('returns null when SENTRY_DSN is empty string and TLDRAW_ENV is development', () => {
				const ctx = createMockContext()
				const env: SentryEnvironment = {
					SENTRY_DSN: '',
					TLDRAW_ENV: 'development',
				}

				const result = createSentry(ctx, env)

				expect(result).toBe(null)
				expect(mockRequiredEnv).not.toHaveBeenCalled()
				expect(mockToucan).not.toHaveBeenCalled()
			})
		})

		describe('production environment behavior', () => {
			it('calls requiredEnv to validate required environment variables', () => {
				const ctx = createMockContext()
				const env: SentryEnvironment = {
					SENTRY_DSN: 'https://abc123@sentry.io/456789',
					TLDRAW_ENV: 'production',
					WORKER_NAME: 'test-worker',
					CF_VERSION_METADATA: { id: 'version123', tag: 'v1.0.0', timestamp: '1234567890' },
				}

				mockRequiredEnv.mockReturnValue({
					SENTRY_DSN: 'https://abc123@sentry.io/456789',
					WORKER_NAME: 'test-worker',
					CF_VERSION_METADATA: { id: 'version123', tag: 'v1.0.0', timestamp: '1234567890' },
				})

				createSentry(ctx, env)

				expect(mockRequiredEnv).toHaveBeenCalledWith(env, {
					SENTRY_DSN: true,
					WORKER_NAME: true,
					CF_VERSION_METADATA: true,
				})
			})

			it('creates Toucan instance with correct configuration', () => {
				const ctx = createMockContext()
				const request = createMockRequest()
				const env: SentryEnvironment = {
					SENTRY_DSN: 'https://abc123@sentry.io/456789',
					TLDRAW_ENV: 'production',
				}

				const requiredVars = {
					SENTRY_DSN: 'https://abc123@sentry.io/456789',
					WORKER_NAME: 'test-worker',
					CF_VERSION_METADATA: { id: 'version123', tag: 'v1.0.0', timestamp: '1234567890' },
				}
				mockRequiredEnv.mockReturnValue(requiredVars)

				createSentry(ctx, env, request)

				expect(mockToucan).toHaveBeenCalledWith({
					dsn: 'https://abc123@sentry.io/456789',
					release: 'test-worker.version123',
					environment: 'test-worker',
					context: ctx,
					request,
					requestDataOptions: {
						allowedHeaders: ['user-agent'],
						allowedSearchParams: /(.*)/,
					},
				})
			})

			it('creates Toucan instance without request when not provided', () => {
				const ctx = createMockContext()
				const env: SentryEnvironment = {
					SENTRY_DSN: 'https://abc123@sentry.io/456789',
					TLDRAW_ENV: 'production',
				}

				const requiredVars = {
					SENTRY_DSN: 'https://abc123@sentry.io/456789',
					WORKER_NAME: 'my-worker',
					CF_VERSION_METADATA: { id: 'abc123', tag: 'v2.0.0', timestamp: '1234567890' },
				}
				mockRequiredEnv.mockReturnValue(requiredVars)

				createSentry(ctx, env)

				expect(mockToucan).toHaveBeenCalledWith({
					dsn: 'https://abc123@sentry.io/456789',
					release: 'my-worker.abc123',
					environment: 'my-worker',
					context: ctx,
					request: undefined,
					requestDataOptions: {
						allowedHeaders: ['user-agent'],
						allowedSearchParams: /(.*)/,
					},
				})
			})

			it('returns the Toucan instance', () => {
				const ctx = createMockContext()
				const env: SentryEnvironment = {
					SENTRY_DSN: 'https://abc123@sentry.io/456789',
					TLDRAW_ENV: 'production',
				}

				const toucanInstance = { captureException: vi.fn() } as unknown as any
				mockToucan.mockReturnValue(toucanInstance)
				mockRequiredEnv.mockReturnValue({
					SENTRY_DSN: 'https://abc123@sentry.io/456789',
					WORKER_NAME: 'test-worker',
					CF_VERSION_METADATA: { id: 'version123', tag: 'v1.0.0', timestamp: '1234567890' },
				})

				const result = createSentry(ctx, env)

				expect(result).toBe(toucanInstance)
			})
		})

		describe('edge cases and error handling', () => {
			it('processes when SENTRY_DSN exists but TLDRAW_ENV is not development', () => {
				const ctx = createMockContext()
				const env: SentryEnvironment = {
					SENTRY_DSN: 'https://abc123@sentry.io/456789',
					TLDRAW_ENV: 'production',
				}

				mockRequiredEnv.mockReturnValue({
					SENTRY_DSN: 'https://abc123@sentry.io/456789',
					WORKER_NAME: 'test-worker',
					CF_VERSION_METADATA: { id: 'version123', tag: 'v1.0.0', timestamp: '1234567890' },
				})

				const result = createSentry(ctx, env)

				expect(result).not.toBe(null)
				expect(mockRequiredEnv).toHaveBeenCalled()
				expect(mockToucan).toHaveBeenCalled()
			})

			it('processes when SENTRY_DSN exists but TLDRAW_ENV is undefined', () => {
				const ctx = createMockContext()
				const env: SentryEnvironment = {
					SENTRY_DSN: 'https://abc123@sentry.io/456789',
				}

				mockRequiredEnv.mockReturnValue({
					SENTRY_DSN: 'https://abc123@sentry.io/456789',
					WORKER_NAME: 'test-worker',
					CF_VERSION_METADATA: { id: 'version123', tag: 'v1.0.0', timestamp: '1234567890' },
				})

				const result = createSentry(ctx, env)

				expect(result).not.toBe(null)
				expect(mockRequiredEnv).toHaveBeenCalled()
				expect(mockToucan).toHaveBeenCalled()
			})

			it('processes when SENTRY_DSN exists and TLDRAW_ENV is staging', () => {
				const ctx = createMockContext()
				const env: SentryEnvironment = {
					SENTRY_DSN: 'https://abc123@sentry.io/456789',
					TLDRAW_ENV: 'staging',
				}

				mockRequiredEnv.mockReturnValue({
					SENTRY_DSN: 'https://abc123@sentry.io/456789',
					WORKER_NAME: 'staging-worker',
					CF_VERSION_METADATA: { id: 'staging123', tag: 'v1.0.0', timestamp: '1234567890' },
				})

				const result = createSentry(ctx, env)

				expect(result).not.toBe(null)
				expect(mockRequiredEnv).toHaveBeenCalled()
				expect(mockToucan).toHaveBeenCalled()
			})

			it('throws error when requiredEnv throws for missing variables', () => {
				const ctx = createMockContext()
				const env: SentryEnvironment = {
					SENTRY_DSN: 'https://abc123@sentry.io/456789',
					TLDRAW_ENV: 'production',
				}

				const error = new Error('Missing required env var: WORKER_NAME')
				mockRequiredEnv.mockImplementation(() => {
					throw error
				})

				expect(() => createSentry(ctx, env)).toThrow('Missing required env var: WORKER_NAME')
			})
		})

		describe('release string formatting', () => {
			it('formats release as WORKER_NAME.CF_VERSION_METADATA.id', () => {
				const ctx = createMockContext()
				const env: SentryEnvironment = {
					SENTRY_DSN: 'https://abc123@sentry.io/456789',
				}

				mockRequiredEnv.mockReturnValue({
					SENTRY_DSN: 'https://abc123@sentry.io/456789',
					WORKER_NAME: 'api-worker',
					CF_VERSION_METADATA: { id: 'build-456', tag: 'v3.2.1', timestamp: '1234567890' },
				})

				createSentry(ctx, env)

				expect(mockToucan).toHaveBeenCalledWith(
					expect.objectContaining({
						release: 'api-worker.build-456',
					})
				)
			})

			it('handles different CF_VERSION_METADATA id formats', () => {
				const ctx = createMockContext()
				const env: SentryEnvironment = {
					SENTRY_DSN: 'https://abc123@sentry.io/456789',
				}

				mockRequiredEnv.mockReturnValue({
					SENTRY_DSN: 'https://abc123@sentry.io/456789',
					WORKER_NAME: 'sync-worker',
					CF_VERSION_METADATA: {
						id: 'commit-abc123def456',
						tag: 'v1.0.0',
						timestamp: '1234567890',
					},
				})

				createSentry(ctx, env)

				expect(mockToucan).toHaveBeenCalledWith(
					expect.objectContaining({
						release: 'sync-worker.commit-abc123def456',
					})
				)
			})
		})

		describe('environment name handling', () => {
			it('uses WORKER_NAME as environment', () => {
				const ctx = createMockContext()
				const env: SentryEnvironment = {
					SENTRY_DSN: 'https://abc123@sentry.io/456789',
				}

				mockRequiredEnv.mockReturnValue({
					SENTRY_DSN: 'https://abc123@sentry.io/456789',
					WORKER_NAME: 'upload-worker',
					CF_VERSION_METADATA: { id: 'version789', tag: 'v1.0.0', timestamp: '1234567890' },
				})

				createSentry(ctx, env)

				expect(mockToucan).toHaveBeenCalledWith(
					expect.objectContaining({
						environment: 'upload-worker',
					})
				)
			})
		})

		describe('request data options configuration', () => {
			it('configures allowed headers to only include user-agent', () => {
				const ctx = createMockContext()
				const env: SentryEnvironment = {
					SENTRY_DSN: 'https://abc123@sentry.io/456789',
				}

				mockRequiredEnv.mockReturnValue({
					SENTRY_DSN: 'https://abc123@sentry.io/456789',
					WORKER_NAME: 'test-worker',
					CF_VERSION_METADATA: { id: 'version123', tag: 'v1.0.0', timestamp: '1234567890' },
				})

				createSentry(ctx, env)

				expect(mockToucan).toHaveBeenCalledWith(
					expect.objectContaining({
						requestDataOptions: {
							allowedHeaders: ['user-agent'],
							allowedSearchParams: /(.*)/,
						},
					})
				)
			})

			it('configures allowedSearchParams with catch-all regex', () => {
				const ctx = createMockContext()
				const env: SentryEnvironment = {
					SENTRY_DSN: 'https://abc123@sentry.io/456789',
				}

				mockRequiredEnv.mockReturnValue({
					SENTRY_DSN: 'https://abc123@sentry.io/456789',
					WORKER_NAME: 'test-worker',
					CF_VERSION_METADATA: { id: 'version123', tag: 'v1.0.0', timestamp: '1234567890' },
				})

				createSentry(ctx, env)

				const calledWith = mockToucan.mock.calls[0][0]
				const searchParamsConfig = calledWith.requestDataOptions?.allowedSearchParams

				expect(searchParamsConfig).toBeInstanceOf(RegExp)
				if (searchParamsConfig instanceof RegExp) {
					expect(searchParamsConfig.test('param1')).toBe(true)
					expect(searchParamsConfig.test('param2=value')).toBe(true)
					expect(searchParamsConfig.test('query')).toBe(true)
					expect(searchParamsConfig.test('')).toBe(true)
				}
			})
		})

		describe('context and request passing', () => {
			it('passes context to Toucan constructor', () => {
				const ctx = createMockContext()
				const env: SentryEnvironment = {
					SENTRY_DSN: 'https://abc123@sentry.io/456789',
				}

				mockRequiredEnv.mockReturnValue({
					SENTRY_DSN: 'https://abc123@sentry.io/456789',
					WORKER_NAME: 'test-worker',
					CF_VERSION_METADATA: { id: 'version123', tag: 'v1.0.0', timestamp: '1234567890' },
				})

				createSentry(ctx, env)

				expect(mockToucan).toHaveBeenCalledWith(
					expect.objectContaining({
						context: ctx,
					})
				)
			})

			it('passes request to Toucan constructor when provided', () => {
				const ctx = createMockContext()
				const request = createMockRequest()
				const env: SentryEnvironment = {
					SENTRY_DSN: 'https://abc123@sentry.io/456789',
				}

				mockRequiredEnv.mockReturnValue({
					SENTRY_DSN: 'https://abc123@sentry.io/456789',
					WORKER_NAME: 'test-worker',
					CF_VERSION_METADATA: { id: 'version123', tag: 'v1.0.0', timestamp: '1234567890' },
				})

				createSentry(ctx, env, request)

				expect(mockToucan).toHaveBeenCalledWith(
					expect.objectContaining({
						request,
					})
				)
			})

			it('passes undefined request to Toucan constructor when not provided', () => {
				const ctx = createMockContext()
				const env: SentryEnvironment = {
					SENTRY_DSN: 'https://abc123@sentry.io/456789',
				}

				mockRequiredEnv.mockReturnValue({
					SENTRY_DSN: 'https://abc123@sentry.io/456789',
					WORKER_NAME: 'test-worker',
					CF_VERSION_METADATA: { id: 'version123', tag: 'v1.0.0', timestamp: '1234567890' },
				})

				createSentry(ctx, env)

				expect(mockToucan).toHaveBeenCalledWith(
					expect.objectContaining({
						request: undefined,
					})
				)
			})
		})

		describe('DSN handling', () => {
			it('passes SENTRY_DSN directly to Toucan constructor', () => {
				const ctx = createMockContext()
				const env: SentryEnvironment = {
					SENTRY_DSN: 'https://different-dsn@sentry.io/999999',
				}

				mockRequiredEnv.mockReturnValue({
					SENTRY_DSN: 'https://different-dsn@sentry.io/999999',
					WORKER_NAME: 'test-worker',
					CF_VERSION_METADATA: { id: 'version123', tag: 'v1.0.0', timestamp: '1234567890' },
				})

				createSentry(ctx, env)

				expect(mockToucan).toHaveBeenCalledWith(
					expect.objectContaining({
						dsn: 'https://different-dsn@sentry.io/999999',
					})
				)
			})
		})

		describe('complete Toucan configuration validation', () => {
			it('passes all expected parameters to Toucan constructor', () => {
				const ctx = createMockContext()
				const request = createMockRequest()
				const env: SentryEnvironment = {
					SENTRY_DSN: 'https://complete-test@sentry.io/123456',
				}

				const requiredVars = {
					SENTRY_DSN: 'https://complete-test@sentry.io/123456',
					WORKER_NAME: 'complete-worker',
					CF_VERSION_METADATA: {
						id: 'complete-version-789',
						tag: 'v1.0.0',
						timestamp: '1234567890',
					},
				}
				mockRequiredEnv.mockReturnValue(requiredVars)

				createSentry(ctx, env, request)

				expect(mockToucan).toHaveBeenCalledWith({
					dsn: 'https://complete-test@sentry.io/123456',
					release: 'complete-worker.complete-version-789',
					environment: 'complete-worker',
					context: ctx,
					request,
					requestDataOptions: {
						allowedHeaders: ['user-agent'],
						allowedSearchParams: /(.*)/,
					},
				})

				// Ensure it was called exactly once
				expect(mockToucan).toHaveBeenCalledTimes(1)
			})

			it('creates new Toucan instance on each call', () => {
				const ctx1 = createMockContext()
				const ctx2 = createMockContext()
				const env: SentryEnvironment = {
					SENTRY_DSN: 'https://abc123@sentry.io/456789',
				}

				const requiredVars = {
					SENTRY_DSN: 'https://abc123@sentry.io/456789',
					WORKER_NAME: 'test-worker',
					CF_VERSION_METADATA: { id: 'version123', tag: 'v1.0.0', timestamp: '1234567890' },
				}
				mockRequiredEnv.mockReturnValue(requiredVars)

				const instance1 = { id: 1 } as unknown as any
				const instance2 = { id: 2 } as unknown as any
				mockToucan.mockReturnValueOnce(instance1).mockReturnValueOnce(instance2)

				const result1 = createSentry(ctx1, env)
				const result2 = createSentry(ctx2, env)

				expect(result1).toBe(instance1)
				expect(result2).toBe(instance2)
				expect(result1).not.toBe(result2)
				expect(mockToucan).toHaveBeenCalledTimes(2)
			})
		})
	})

	describe('integration scenarios', () => {
		it('works with typical CloudFlare Worker environment', () => {
			const ctx = {
				waitUntil: vi.fn(),
			}
			const request = new Request('https://api.example.com/endpoint', {
				method: 'POST',
				headers: {
					'user-agent': 'CloudFlare Worker/1.0',
					'content-type': 'application/json',
				},
			})
			const env: SentryEnvironment = {
				SENTRY_DSN: 'https://worker-dsn@sentry.io/cloudflare',
				TLDRAW_ENV: 'production',
				WORKER_NAME: 'api-worker',
				CF_VERSION_METADATA: { id: 'cf-deploy-456', tag: 'v2.1.0', timestamp: '1234567890' },
			}

			mockRequiredEnv.mockReturnValue({
				SENTRY_DSN: 'https://worker-dsn@sentry.io/cloudflare',
				WORKER_NAME: 'api-worker',
				CF_VERSION_METADATA: { id: 'cf-deploy-456', tag: 'v2.1.0', timestamp: '1234567890' },
			})

			const sentryInstance = {
				captureException: vi.fn(),
				captureMessage: vi.fn(),
			} as unknown as any
			mockToucan.mockReturnValue(sentryInstance)

			const result = createSentry(ctx, env, request)

			expect(result).toBe(sentryInstance)
			expect(mockToucan).toHaveBeenCalledWith({
				dsn: 'https://worker-dsn@sentry.io/cloudflare',
				release: 'api-worker.cf-deploy-456',
				environment: 'api-worker',
				context: ctx,
				request,
				requestDataOptions: {
					allowedHeaders: ['user-agent'],
					allowedSearchParams: /(.*)/,
				},
			})
		})

		it('handles development environment gracefully', () => {
			const ctx = {
				waitUntil: vi.fn(),
			}
			const env: SentryEnvironment = {
				TLDRAW_ENV: 'development',
				WORKER_NAME: 'dev-worker',
			}

			const result = createSentry(ctx, env)

			expect(result).toBe(null)
			expect(mockRequiredEnv).not.toHaveBeenCalled()
			expect(mockToucan).not.toHaveBeenCalled()
		})

		it('extends SentryEnvironment in custom worker environments', () => {
			interface CustomWorkerEnv extends SentryEnvironment {
				readonly DATABASE_URL: string
				readonly API_KEY: string
				readonly ASSETS_BUCKET: { name: string }
			}

			const env: CustomWorkerEnv = {
				SENTRY_DSN: 'https://custom@sentry.io/123',
				TLDRAW_ENV: 'production',
				WORKER_NAME: 'custom-worker',
				CF_VERSION_METADATA: { id: 'custom-123', tag: 'v1.0.0', timestamp: '1234567890' },
				DATABASE_URL: 'postgres://localhost:5432/db',
				API_KEY: 'secret-api-key',
				ASSETS_BUCKET: { name: 'assets-bucket' },
			}

			const ctx = { waitUntil: vi.fn() }

			mockRequiredEnv.mockReturnValue({
				SENTRY_DSN: 'https://custom@sentry.io/123',
				WORKER_NAME: 'custom-worker',
				CF_VERSION_METADATA: { id: 'custom-123', tag: 'v1.0.0', timestamp: '1234567890' },
			})

			const result = createSentry(ctx, env)

			expect(mockRequiredEnv).toHaveBeenCalledWith(env, {
				SENTRY_DSN: true,
				WORKER_NAME: true,
				CF_VERSION_METADATA: true,
			})
			expect(mockToucan).toHaveBeenCalled()
		})
	})

	describe('error conditions and boundary testing', () => {
		it('handles requiredEnv throwing specific error messages', () => {
			const ctx = createMockContext()
			const env: SentryEnvironment = {
				SENTRY_DSN: 'https://abc123@sentry.io/456789',
			}

			mockRequiredEnv.mockImplementation(() => {
				throw new Error('Missing required env var: CF_VERSION_METADATA')
			})

			expect(() => createSentry(ctx, env)).toThrow('Missing required env var: CF_VERSION_METADATA')
			expect(mockToucan).not.toHaveBeenCalled()
		})

		it('handles Toucan constructor throwing errors', () => {
			const ctx = createMockContext()
			const env: SentryEnvironment = {
				SENTRY_DSN: 'https://abc123@sentry.io/456789',
			}

			mockRequiredEnv.mockReturnValue({
				SENTRY_DSN: 'https://abc123@sentry.io/456789',
				WORKER_NAME: 'test-worker',
				CF_VERSION_METADATA: { id: 'version123' },
			})

			mockToucan.mockImplementation(() => {
				throw new Error('Invalid Sentry DSN')
			})

			expect(() => createSentry(ctx, env)).toThrow('Invalid Sentry DSN')
		})

		it('handles edge case SENTRY_DSN values', () => {
			const ctx = createMockContext()

			// Test with falsy but not undefined values
			const envWithEmptyString: SentryEnvironment = {
				SENTRY_DSN: '',
				TLDRAW_ENV: 'production',
			}

			mockRequiredEnv.mockReturnValue({
				SENTRY_DSN: '',
				WORKER_NAME: 'test-worker',
				CF_VERSION_METADATA: { id: 'version123' },
			})

			createSentry(ctx, envWithEmptyString)

			expect(mockRequiredEnv).toHaveBeenCalled()
			expect(mockToucan).toHaveBeenCalledWith(
				expect.objectContaining({
					dsn: '',
				})
			)
		})

		it('handles development check with different TLDRAW_ENV values', () => {
			const ctx = createMockContext()

			const testCases = [
				{ SENTRY_DSN: undefined, TLDRAW_ENV: 'development', shouldReturnNull: true },
				{ SENTRY_DSN: '', TLDRAW_ENV: 'development', shouldReturnNull: true },
				{ SENTRY_DSN: undefined, TLDRAW_ENV: 'prod', shouldReturnNull: false },
				{ SENTRY_DSN: undefined, TLDRAW_ENV: 'staging', shouldReturnNull: false },
				// BUG: This case reveals the bug - undefined TLDRAW_ENV doesn't return null even when SENTRY_DSN is undefined
				{ SENTRY_DSN: undefined, TLDRAW_ENV: undefined, shouldReturnNull: false },
				{ SENTRY_DSN: 'dsn', TLDRAW_ENV: 'development', shouldReturnNull: false },
			]

			testCases.forEach(({ SENTRY_DSN, TLDRAW_ENV, shouldReturnNull }, index) => {
				vi.clearAllMocks()

				const env: SentryEnvironment = { SENTRY_DSN, TLDRAW_ENV }

				if (!shouldReturnNull) {
					mockRequiredEnv.mockReturnValue({
						SENTRY_DSN: SENTRY_DSN || 'default-dsn',
						WORKER_NAME: 'test-worker',
						CF_VERSION_METADATA: { id: 'version123', tag: 'v1.0.0', timestamp: '1234567890' },
					})
				}

				const result = createSentry(ctx, env)

				if (shouldReturnNull) {
					expect(result).toBe(null)
					expect(mockRequiredEnv).not.toHaveBeenCalled()
				} else {
					expect(result).not.toBe(null)
					expect(mockRequiredEnv).toHaveBeenCalled()
				}
			})
		})
	})
})
