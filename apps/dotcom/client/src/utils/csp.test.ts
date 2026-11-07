import { describe, expect, it } from 'vitest'
import { csp, thumbnailRenderCsp } from './csp'

function scriptSrcOf(policy: string) {
	return policy
		.split('; ')
		.find((directive) => directive.startsWith('script-src '))!
		.split(' ')
		.slice(1)
}

describe('thumbnailRenderCsp', () => {
	// Browser Run's addScriptTag is an inline script. With a hash in the list, the browser ignores
	// 'unsafe-inline', blocks the push, and every pushed render times out.
	it('allows inline script with no hash or nonce to cancel it', () => {
		const sources = scriptSrcOf(thumbnailRenderCsp)
		expect(sources).toContain(`'unsafe-inline'`)
		expect(sources.filter((source) => /^'(sha\d+|nonce)-/.test(source))).toEqual([])
	})

	it("keeps the app's other script sources", () => {
		const hosts = scriptSrcOf(csp).filter((source) => !source.startsWith(`'sha`))
		expect(scriptSrcOf(thumbnailRenderCsp)).toEqual([...hosts, `'unsafe-inline'`])
	})
})
