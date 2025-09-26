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

				const result = createSentry(ctx, env, request)

				expect(mockRequiredEnv).toHaveBeenCalledWith(env, {
					SENTRY_DSN: true,
					WORKER_NAME: true,
					CF_VERSION_METADATA: true,
				})
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
				expect(result).not.toBe(null)
			})

			it('creates Toucan instance without request when not provided', () => {
				const ctx = createMockContext()
				const env: SentryEnvironment = {
					SENTRY_DSN: 'https://abc123@sentry.io/456789',
					TLDRAW_ENV: 'production',
				}

				mockRequiredEnv.mockReturnValue({
					SENTRY_DSN: 'https://abc123@sentry.io/456789',
					WORKER_NAME: 'my-worker',
					CF_VERSION_METADATA: { id: 'abc123', tag: 'v2.0.0', timestamp: '1234567890' },
				})

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
		})

		describe('error handling', () => {
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
	})
})
