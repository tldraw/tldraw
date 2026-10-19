import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'

const require = createRequire(import.meta.url)
const appDir = join(__dirname, '..')

export interface WranglerDevHandle {
	base: string
	stop(): void
}

/**
 * Boots the real worker under `wrangler dev` for integration tests. The worker
 * serves dist/ through its assets binding; in CI nothing is built, so callers
 * pass stand-in fixtures (written only if absent, removed on stop).
 */
export async function startWranglerDev(opts: {
	port: number
	vars?: Record<string, string>
	fixtures?: Record<string, string>
}): Promise<WranglerDevHandle> {
	const base = `http://127.0.0.1:${opts.port}`
	const distDir = join(appDir, 'dist')
	const writtenFixtures: string[] = []
	mkdirSync(distDir, { recursive: true })
	for (const [name, contents] of Object.entries(opts.fixtures ?? {})) {
		const path = join(distDir, name)
		if (existsSync(path)) continue
		writeFileSync(path, contents)
		writtenFixtures.push(path)
	}

	// wrangler is hoisted to the repo root; resolve its entry through node instead
	// of assuming a local .bin symlink
	const wranglerBin = require.resolve('wrangler/bin/wrangler.js')
	const varArgs = Object.entries({ MCP_IS_DEV: 'true', ...opts.vars }).flatMap(([k, v]) => [
		'--var',
		`${k}:${v}`,
	])
	const server: ChildProcess = spawn(
		process.execPath,
		[wranglerBin, 'dev', '--port', String(opts.port), ...varArgs],
		{
			cwd: appDir,
			env: { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: '1' },
			stdio: ['ignore', 'pipe', 'pipe'],
			detached: true,
		}
	)

	const handle: WranglerDevHandle = {
		base,
		stop() {
			if (server.pid) {
				// wrangler spawns workerd children; kill the whole detached group
				try {
					process.kill(-server.pid, 'SIGTERM')
				} catch {
					server.kill('SIGTERM')
				}
			}
			for (const path of writtenFixtures) rmSync(path, { force: true })
		},
	}

	const deadline = Date.now() + 60_000
	for (;;) {
		try {
			const res = await fetch(`${base}/health`, { signal: AbortSignal.timeout(1000) })
			if (res.ok) break
		} catch {
			// not up yet
		}
		if (Date.now() > deadline) {
			// callers never see a handle on throw, so clean up here or the group leaks
			handle.stop()
			throw new Error('wrangler dev did not become ready in 60s')
		}
		await new Promise((r) => setTimeout(r, 500))
	}

	return handle
}

/** Minimal assets so init() can load the widget and a canvas read resolves. */
export const MINIMAL_FIXTURES = {
	'mcp-app.html': '<!doctype html><html><body>stub</body></html>',
	'method-map.json': JSON.stringify({ select: { args: ['spread-ids'], ret: 'this' } }),
}

export function mcpPost(base: string, body: unknown, sessionId?: string) {
	return fetch(`${base}/mcp`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json, text/event-stream',
			...(sessionId ? { 'mcp-session-id': sessionId } : {}),
		},
		body: JSON.stringify(body),
		// generous for CI, but far below an infinite hang
		signal: AbortSignal.timeout(20_000),
	})
}

/** The response arrives as an SSE stream; pull the JSON out of its `data:` line. */
export function parseSSEResult(text: string) {
	const data = text
		.split('\n')
		.filter((line) => line.startsWith('data: '))
		.map((line) => line.slice('data: '.length))
		.join('')
	return JSON.parse(data)
}

export async function initSession(base: string, clientName: string): Promise<string> {
	const initRes = await mcpPost(base, {
		jsonrpc: '2.0',
		id: 1,
		method: 'initialize',
		params: {
			protocolVersion: '2025-06-18',
			capabilities: {},
			clientInfo: { name: clientName, version: '1.0' },
		},
	})
	if (initRes.status !== 200) throw new Error(`initialize failed: ${initRes.status}`)
	const sessionId = initRes.headers.get('mcp-session-id')
	if (!sessionId) throw new Error('initialize returned no mcp-session-id')
	await initRes.text()
	await mcpPost(base, { jsonrpc: '2.0', method: 'notifications/initialized' }, sessionId)
	return sessionId
}
