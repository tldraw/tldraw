import { describe, expect, it } from 'vitest'
import { createSentry, SentryEnvironment } from './sentry'

const ctx = { waitUntil: () => {} } as any

describe('sentry', () => {
	describe('createSentry', () => {
		it('returns null in development environment', () => {
			const env: SentryEnvironment = {
				TLDRAW_ENV: 'development',
			}

			const result = createSentry(ctx, env)

			expect(result).toBe(null)
		})

		it('throws when SENTRY_DSN is missing in production', () => {
			const env: SentryEnvironment = {
				TLDRAW_ENV: 'production',
			}

			expect(() => createSentry(ctx, env)).toThrow('Missing required env var: SENTRY_DSN')
		})

		it('builds a client tagged with the worker name and version when fully configured', () => {
			const sentry = createSentry(ctx, {
				TLDRAW_ENV: 'production',
				SENTRY_DSN: 'https://public@example.ingest.sentry.io/1',
				WORKER_NAME: 'production-tldraw-image-optimizer',
				CF_VERSION_METADATA: { id: 'version-id', tag: 'version-tag' } as any,
			})

			// release and environment are what make an event attributable to a specific deploy
			const options = (sentry as any)?.getClient()?.getOptions()
			expect(options).toMatchObject({
				release: 'production-tldraw-image-optimizer.version-id',
				environment: 'production-tldraw-image-optimizer',
			})
		})
	})
})
