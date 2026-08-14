import { readFileSync } from 'fs'
import { createRequire } from 'module'
import { describe, expect, it } from 'vitest'

// The TldrawMCP.destroy() override in worker.ts skips the SDK's isolate abort
// and takes over its side effects. That is only sound while the SDK keeps the
// shape asserted here; a bump that moves this path must re-audit the override.
const require = createRequire(import.meta.url)
const agentsDist = readFileSync(require.resolve('agents'), 'utf8')
const mcpDist = readFileSync(require.resolve('agents/mcp'), 'utf8')

describe('agents SDK assumptions behind the destroy() override', () => {
	it('has exactly one ctx.abort("destroyed") call site, inside destroy() (the one the override defuses)', () => {
		expect(agentsDist.match(/ctx\.abort\("destroyed"\)/g)).toHaveLength(1)
		const abortIndex = agentsDist.indexOf('ctx.abort("destroyed")')
		const enclosingDestroy = agentsDist.lastIndexOf('async destroy()', abortIndex)
		expect(enclosingDestroy).toBeGreaterThan(-1)
		expect(abortIndex - enclosingDestroy).toBeLessThan(2000)
	})

	it('still defers session teardown via the condemned-marker alarm', () => {
		expect(mcpDist).toContain('_cf_scheduleDestroy')
	})

	it('still rejects initialize requests that carry a session id before any DO lookup', () => {
		// This router gate is why a condemned instance cannot be revived by an
		// initialize retry; if it disappears, TldrawMCP needs a guard again.
		expect(mcpDist).toContain('Initialization requests must not include a sessionId')
		expect(mcpDist).toContain('await agent.setInitializeRequest(')
	})
})
