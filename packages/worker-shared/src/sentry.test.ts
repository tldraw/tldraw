import { describe, expect, it } from 'vitest'
import { createSentry, SentryEnvironment } from './sentry'

describe('sentry', () => {
	describe('createSentry', () => {
		it('returns null in development environment', () => {
			const ctx = { waitUntil: () => {} } as any
			const env: SentryEnvironment = {
				TLDRAW_ENV: 'development',
			}

			const result = createSentry(ctx, env)

			expect(result).toBe(null)
		})

		it('throws when SENTRY_DSN is missing in production', () => {
			const ctx = { waitUntil: () => {} } as any
			const env: SentryEnvironment = {
				TLDRAW_ENV: 'production',
			}

			expect(() => createSentry(ctx, env)).toThrow('Missing required env var: SENTRY_DSN')
		})
	})
})
