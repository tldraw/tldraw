import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { COMMON_ROOM_SNIPPET } from '../../../../../internal/shared/common-room-signals'
import { csp, cspDev } from './csp'

describe('Common Room CSP', () => {
	it('allows the exact shared snippet in production and development', () => {
		const hash = createHash('sha256').update(COMMON_ROOM_SNIPPET).digest('base64')
		for (const policy of [csp, cspDev]) {
			const scriptSrc = policy.split('; ').find((directive) => directive.startsWith('script-src '))
			const connectSrc = policy
				.split('; ')
				.find((directive) => directive.startsWith('connect-src '))
			expect(scriptSrc?.split(' ')).toContain(`'sha256-${hash}'`)
			expect(scriptSrc?.split(' ')).toContain('https://cdn.cr-relay.com')
			expect(scriptSrc?.split(' ')).not.toContain("'unsafe-inline'")
			expect(connectSrc?.split(' ')).toContain('https://api.cr-relay.com')
		}
	})
})
