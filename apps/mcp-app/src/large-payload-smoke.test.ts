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
import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

const require = createRequire(import.meta.url)
const appDir = join(__dirname, '..')

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
	const base = `http://127.0.0.1:${port}`
	const widgetPath = join(appDir, 'dist', 'mcp-app.html')
	let wroteFixture = false
	let server: ChildProcess | null = null

	beforeAll(async () => {
		// The worker serves whatever dist/mcp-app.html contains; in CI the widget is
		// not built, so a >2MB fixture reproduces the failing payload size exactly.
		if (!existsSync(widgetPath)) {
			mkdirSync(join(appDir, 'dist'), { recursive: true })
			writeFileSync(widgetPath, '<!doctype html><html><body>' + 'x'.repeat(2_600_000))
			wroteFixture = true
		}

		// wrangler is hoisted to the repo root; resolve its entry through node instead
		// of assuming a local .bin symlink
		const wranglerBin = require.resolve('wrangler/bin/wrangler.js')
		server = spawn(
			process.execPath,
			[wranglerBin, 'dev', '--port', String(port), '--var', 'MCP_IS_DEV:true'],
			{
				cwd: appDir,
				env: { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: '1' },
				stdio: ['ignore', 'pipe', 'pipe'],
				detached: true,
			}
		)

		const deadline = Date.now() + 60_000
		for (;;) {
			try {
				const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(1000) })
				if (res.ok) break
			} catch {
				// not up yet
			}
			if (Date.now() > deadline) throw new Error('wrangler dev did not become ready in 60s')
			await new Promise((r) => setTimeout(r, 500))
		}
	}, 90_000)

	afterAll(() => {
		if (server?.pid) {
			// wrangler spawns workerd children; kill the whole detached group
			try {
				process.kill(-server.pid, 'SIGTERM')
			} catch {
				server.kill('SIGTERM')
			}
		}
		if (wroteFixture) {
			rmSync(widgetPath, { force: true })
		}
	})

	async function mcpPost(body: unknown, sessionId?: string) {
		return fetch(`${base}/mcp`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json, text/event-stream',
				...(sessionId ? { 'mcp-session-id': sessionId } : {}),
			},
			body: JSON.stringify(body),
			// generous for CI, but far below the infinite hang this test exists to catch
			signal: AbortSignal.timeout(20_000),
		})
	}

	/** The response arrives as an SSE stream; pull the JSON out of its `data:` line. */
	function parseSSEResult(text: string) {
		const data = text
			.split('\n')
			.filter((line) => line.startsWith('data: '))
			.map((line) => line.slice('data: '.length))
			.join('')
		return JSON.parse(data)
	}

	test('resources/read of the >2MB widget completes instead of hanging', async () => {
		const initRes = await mcpPost({
			jsonrpc: '2.0',
			id: 1,
			method: 'initialize',
			params: {
				protocolVersion: '2025-06-18',
				capabilities: {},
				clientInfo: { name: 'large-payload-smoke', version: '1.0' },
			},
		})
		expect(initRes.status).toBe(200)
		const sessionId = initRes.headers.get('mcp-session-id')
		expect(sessionId).toBeTruthy()
		await initRes.text()

		await mcpPost({ jsonrpc: '2.0', method: 'notifications/initialized' }, sessionId!)

		const toolsRes = await mcpPost({ jsonrpc: '2.0', id: 2, method: 'tools/list' }, sessionId!)
		const tools = parseSSEResult(await toolsRes.text())
		expect(tools.result.tools.map((t: { name: string }) => t.name)).toContain('exec')

		const readRes = await mcpPost(
			{
				jsonrpc: '2.0',
				id: 3,
				method: 'resources/read',
				params: { uri: 'ui://show-canvas/mcp-app.html' },
			},
			sessionId!
		)
		expect(readRes.status).toBe(200)
		const read = parseSSEResult(await readRes.text())
		expect(read.error).toBeUndefined()
		expect(read.result.contents[0].text.length).toBeGreaterThan(2 * 1024 * 1024)
	}, 30_000)
})
