import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSentry, SentryEnvironment } from './sentry'

const ctx = { waitUntil: () => {} } as any

afterEach(() => {
	vi.restoreAllMocks()
})

describe('sentry', () => {
	describe('createSentry', () => {
		it('returns null in development environment', () => {
			const env: SentryEnvironment = {
				TLDRAW_ENV: 'development',
			}

			const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

			expect(createSentry(ctx, env)).toBe(null)
			// development is the expected way to run without a DSN, so it should stay quiet
			expect(consoleError).not.toHaveBeenCalled()
		})

		// createSentry is called from catch blocks and durable object constructors, so a
		// misconfigured deployment must not turn into a thrown error there.
		it('returns null and logs when config is missing outside development', () => {
			const env: SentryEnvironment = {
				TLDRAW_ENV: 'production',
			}

			const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

			expect(createSentry(ctx, env)).toBe(null)
			expect(consoleError).toHaveBeenCalledWith(
				'Sentry is not configured, errors will not be reported. Missing: SENTRY_DSN, WORKER_NAME, CF_VERSION_METADATA'
			)
		})

		it('names only the vars that are actually missing', () => {
			const env: SentryEnvironment = {
				TLDRAW_ENV: 'production',
				SENTRY_DSN: 'https://public@example.ingest.sentry.io/1',
				WORKER_NAME: 'production-tldraw-image-optimizer',
			}

			const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

			expect(createSentry(ctx, env)).toBe(null)
			expect(consoleError).toHaveBeenCalledWith(
				'Sentry is not configured, errors will not be reported. Missing: CF_VERSION_METADATA'
			)
		})

		it('returns a client when fully configured', () => {
			const env: SentryEnvironment = {
				TLDRAW_ENV: 'production',
				SENTRY_DSN: 'https://public@example.ingest.sentry.io/1',
				WORKER_NAME: 'production-tldraw-image-optimizer',
				CF_VERSION_METADATA: { id: 'version-id', tag: 'tag' } as any,
			}

			expect(createSentry(ctx, env)).not.toBe(null)
		})
	})
})
