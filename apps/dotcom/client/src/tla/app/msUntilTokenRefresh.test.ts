import { describe, expect, it } from 'vitest'
import { msUntilTokenRefresh } from './TldrawApp'

const NOW = 1_700_000_000_000

/** A JWT whose payload carries `exp`, base64url-encoded the way Clerk emits it. */
function tokenExpiringIn(seconds: number, now = NOW): string {
	const payload = JSON.stringify({ exp: Math.floor(now / 1000) + seconds })
	const encoded = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
	return `header.${encoded}.signature`
}

describe('msUntilTokenRefresh', () => {
	it('refreshes at half the remaining lifetime', () => {
		expect(msUntilTokenRefresh(tokenExpiringIn(60), NOW)).toBe(30_000)
		// the case that actually fixes the 401 storm: a longer-lived token stretches the cadence
		// past the ~1/minute timer budget a hidden tab gets
		expect(msUntilTokenRefresh(tokenExpiringIn(600), NOW)).toBe(300_000)
	})

	it('falls back to a fixed cadence for a token it cannot read', () => {
		expect(msUntilTokenRefresh(undefined, NOW)).toBe(50_000)
		expect(msUntilTokenRefresh('not-a-jwt', NOW)).toBe(50_000)
		expect(msUntilTokenRefresh('header.!!!not-base64!!!.signature', NOW)).toBe(50_000)
		// parseable, but no exp claim to schedule from
		expect(msUntilTokenRefresh(`header.${btoa('{"sub":"user_1"}')}.signature`, NOW)).toBe(50_000)
	})

	it('never busy-loops on an expired or nearly-expired token', () => {
		expect(msUntilTokenRefresh(tokenExpiringIn(4), NOW)).toBe(5_000)
		expect(msUntilTokenRefresh(tokenExpiringIn(0), NOW)).toBe(5_000)
		expect(msUntilTokenRefresh(tokenExpiringIn(-3600), NOW)).toBe(5_000)
	})
})
