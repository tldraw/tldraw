import { afterEach, describe, expect, it, vi } from 'vitest'
import { SentryEnvironment } from './sentry'

const ctx = { waitUntil: () => {} } as any

// createSentry warns at most once per isolate, so each test needs a fresh module instance.
async function freshCreateSentry() {
	vi.resetModules()
	return (await import('./sentry')).createSentry
}

afterEach(() => {
	vi.restoreAllMocks()
})

describe('sentry', () => {
	describe('createSentry', () => {
		it('returns null in development environment', async () => {
			const createSentry = await freshCreateSentry()
			const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

			expect(createSentry(ctx, { TLDRAW_ENV: 'development' })).toBe(null)
			// development is the expected way to run without a DSN, so it should stay quiet
			expect(consoleError).not.toHaveBeenCalled()
		})

		// createSentry is called from catch blocks and durable object constructors, so a
		// misconfigured deployment must not turn into a thrown error there.
		it('returns null and logs when config is missing outside development', async () => {
			const createSentry = await freshCreateSentry()
			const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

			expect(createSentry(ctx, { TLDRAW_ENV: 'production' })).toBe(null)
			expect(consoleError).toHaveBeenCalledWith(
				expect.stringContaining('Missing: SENTRY_DSN, WORKER_NAME, CF_VERSION_METADATA')
			)
		})

		it('names only the vars that are actually missing', async () => {
			const createSentry = await freshCreateSentry()
			const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

			const env: SentryEnvironment = {
				TLDRAW_ENV: 'production',
				SENTRY_DSN: 'https://public@example.ingest.sentry.io/1',
				WORKER_NAME: 'production-tldraw-image-optimizer',
			}

			expect(createSentry(ctx, env)).toBe(null)
			expect(consoleError).toHaveBeenCalledWith(
				expect.stringContaining('Missing: CF_VERSION_METADATA')
			)
		})

		// Durable objects call createSentry per construction and per fetch, so an unconditional warn
		// would be a log line per request for as long as the deploy stays misconfigured.
		it('warns only once per isolate', async () => {
			const createSentry = await freshCreateSentry()
			const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

			const env: SentryEnvironment = { TLDRAW_ENV: 'production' }
			createSentry(ctx, env)
			createSentry(ctx, env)
			createSentry(ctx, env)

			expect(consoleError).toHaveBeenCalledTimes(1)
		})

		it('builds a client tagged with the worker name and version when fully configured', async () => {
			const createSentry = await freshCreateSentry()

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
