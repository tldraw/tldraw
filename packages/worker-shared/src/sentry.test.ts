import { describe, expect, it, vi } from 'vitest'
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

		it('reports query params but not credentials', async () => {
			const sent: string[] = []
			vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
				sent.push(String(init.body))
				return new Response('{}')
			})
			const pending: Promise<unknown>[] = []
			const sentry = createSentry(
				{ waitUntil: (p: Promise<unknown>) => pending.push(p) },
				{
					TLDRAW_ENV: 'production',
					SENTRY_DSN: 'https://public@example.ingest.sentry.io/1',
					WORKER_NAME: 'production-tldraw-multiplayer',
					CF_VERSION_METADATA: { id: 'version-id', tag: 'version-tag' } as any,
				},
				new Request(
					'https://example.com/app/file/abc?accessToken=at&token=t&session=s&apiKey=k&v=123&embed=1'
				)
			)

			// eslint-disable-next-line @typescript-eslint/no-deprecated
			sentry!.captureMessage('boom')
			await Promise.all(pending)
			vi.unstubAllGlobals()

			const event = sent[0]
				.split('\n')
				.map((line) => JSON.parse(line))
				.find((item) => item.request)
			expect(event.request.url).toBe('https://example.com/app/file/abc')
			expect(Object.fromEntries(new URLSearchParams(event.request.query_string))).toEqual({
				v: '123',
				embed: '1',
			})
		})
	})
})
