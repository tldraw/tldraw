import { describe, expect, it } from 'vitest'
import { Environment } from '../types'
import { getPublicOrigin } from './getPublicOrigin'

describe('getPublicOrigin', () => {
	function requestWithHeaders(headers: Record<string, string>) {
		return new Request('https://main-tldraw-multiplayer.workers.dev/app/social-preview/f/x/image', {
			headers,
		}) as any
	}

	it('prefers the configured origin and ignores a spoofed forwarded host', () => {
		const origin = getPublicOrigin(
			requestWithHeaders({ 'x-forwarded-host': 'evil.com', 'x-forwarded-proto': 'https' }),
			{ MCP_SCREENSHOT_RENDER_ORIGIN: 'https://www.tldraw.com' } as Environment
		)
		expect(origin).toBe('https://www.tldraw.com')
	})

	it('uses a trusted forwarded host when no origin is configured', () => {
		const origin = getPublicOrigin(
			requestWithHeaders({
				'x-forwarded-host': 'staging.tldraw.com',
				'x-forwarded-proto': 'https',
			}),
			{} as Environment
		)
		expect(origin).toBe('https://staging.tldraw.com')
	})

	it('rejects an untrusted forwarded host and falls back to the request origin', () => {
		const origin = getPublicOrigin(
			requestWithHeaders({ 'x-forwarded-host': 'evil.com' }),
			{} as Environment
		)
		expect(origin).toBe('https://main-tldraw-multiplayer.workers.dev')
	})

	it('takes the proxy-appended (rightmost) forwarded host, not a client-injected one', () => {
		const origin = getPublicOrigin(
			requestWithHeaders({ 'x-forwarded-host': 'evil.com, www.tldraw.com' }),
			{} as Environment
		)
		expect(origin).toBe('https://www.tldraw.com')
	})
})
