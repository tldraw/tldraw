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
	it('has exactly one ctx.abort("destroyed") call site (the one the override defuses)', () => {
		expect(agentsDist.match(/ctx\.abort\("destroyed"\)/g)).toHaveLength(1)
	})

	it('still defers session teardown via the condemned-marker alarm', () => {
		expect(mcpDist).toContain('_cf_scheduleDestroy')
	})

	it('still routes initialize retries through setInitializeRequest (the fail-closed guard target)', () => {
		expect(mcpDist).toContain('setInitializeRequest')
	})
})
