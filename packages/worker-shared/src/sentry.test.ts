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
		})

		describe('production environment behavior', () => {
			it('creates Toucan instance with correct configuration', () => {
				const ctx = createMockContext()
				const request = new Request('https://example.com/api/test', {
					method: 'GET',
					headers: { 'user-agent': 'Mozilla/5.0' },
				})
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
		})
	})
})
