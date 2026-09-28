/**
 * Guards against the Aug 2026 mcp-app outage: the agents SDK's default
 * DurableObjectEventStore persists every outgoing MCP message to DO storage before
 * writing it to the wire, and SQLite-backed DO storage caps a value at 2MB. Our
 * ~2.4MB widget resource exceeded that, the storage put threw, the rejection was
 * swallowed, and `resources/read` hung forever — the widget never loaded in any
 * host. `TldrawMCP.getEventStore()` returning undefined disables the store (the
 * transport optional-chains it), so large messages flow straight to the stream.
 *
 * Two layers:
 * - canaries: pin the SDK behaviors the override relies on, so an `agents` bump
 *   that changes them fails here instead of silently re-breaking prod
 * - smoke: boot the real worker under wrangler and read a >2MB resource through
 *   the actual transport, the request that hung in production
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import {
	MINIMAL_FIXTURES,
	initSession,
	mcpPost,
	parseSSEResult,
	startWranglerDev,
	type WranglerDevHandle,
} from './wrangler-dev-harness'

const require = createRequire(import.meta.url)

describe('agents SDK assumptions behind the getEventStore() override', () => {
	const mcpDist = readFileSync(require.resolve('agents/mcp'), 'utf8')

	test('the transport optional-chains the event store, so disabling it still sends', () => {
		// `await this._eventStore?.storeEvent(...)` — with no store, the message goes
		// straight to the wire. If the SDK ever makes the store mandatory, the
		// override stops being a fix and this line changes shape.
		expect(mcpDist.match(/await this\._eventStore\?\.storeEvent\(/g)?.length).toBeGreaterThan(0)
	})

	test('the SSE keepalive clears itself when a write rejects (the #10010 leak fix)', () => {
		// First shipped in agents 0.14.0. A downgrade below that re-introduces the
		// leaked 30s interval that pinned abandoned sessions' durable objects awake.
		expect(mcpDist).toContain('.catch(() => clearInterval')
	})

	test('TldrawMCP disables the event store', () => {
		// worker.ts imports cloudflare:workers transitively so it cannot be imported
		// here; pin the override at the source level instead.
		const workerSrc = readFileSync(join(__dirname, 'worker.ts'), 'utf8')
		expect(workerSrc).toMatch(/override getEventStore\(\)\s*\{\s*return undefined\s*\}/)
	})
})

describe('large resource reads through the real transport', () => {
	const port = 8100 + (process.pid % 500)
	let server: WranglerDevHandle | null = null

	beforeAll(async () => {
		server = await startWranglerDev({
			port,
			fixtures: {
				// sized to reproduce the failing payload exactly
				'mcp-app.html': '<!doctype html><html><body>' + 'x'.repeat(2_600_000),
				'method-map.json': MINIMAL_FIXTURES['method-map.json'],
			},
		})
	}, 90_000)

	afterAll(() => server?.stop())

	test('resources/read of the >2MB widget completes instead of hanging', async () => {
		const base = server!.base
		const sessionId = await initSession(base, 'large-payload-smoke')

		const toolsRes = await mcpPost(base, { jsonrpc: '2.0', id: 2, method: 'tools/list' }, sessionId)
		const tools = parseSSEResult(await toolsRes.text())
		expect(tools.result.tools.map((t: { name: string }) => t.name)).toContain('exec')

		const readRes = await mcpPost(
			base,
			{
				jsonrpc: '2.0',
				id: 3,
				method: 'resources/read',
				params: { uri: 'ui://show-canvas/mcp-app.html' },
			},
			sessionId
		)
		expect(readRes.status).toBe(200)
		const read = parseSSEResult(await readRes.text())
		expect(read.error).toBeUndefined()
		expect(read.result.contents[0].text.length).toBeGreaterThan(2 * 1024 * 1024)
	}, 30_000)
})
