#!/usr/bin/env node
// A tiny local UI for poking at the shared-board screenshot MCP server by hand:
// run the initialize handshake, read the advertised tool schemas, fill in a
// generated form, and call the thing. See src/routes/tla/sharedBoardScreenshotMcp.ts.
//
// It proxies every JSON-RPC call through this Node process rather than calling
// the worker from the browser, which matters for two reasons:
//   - blockUnknownOrigins runs on `*` before the route, so a browser (which
//     always sends `Origin`) gets a 403; Node's fetch sends no Origin header.
//   - no CORS preflight to satisfy, so it works against any deployment.
//
// Usage: yarn dev-inspector   (from apps/dotcom/sync-worker)
// Env:
//   PORT           - port for this inspector (default 5177)
//   MCP_TARGET     - extra preset, e.g. a preview deploy URL
//   SYNC_WORKER_PORT - port the local sync worker listens on (default 8787)

import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT ?? 5177)
const WORKER_PORT = Number(process.env.SYNC_WORKER_PORT ?? 8787)

// Locally the `/api/` prefix is stripped by Worker.fetch, so `/app/mcp` is the
// path; deployments sit behind the `*/api/*` route and need it.
const PRESETS = [
	...(process.env.MCP_TARGET ? [{ label: 'MCP_TARGET', url: process.env.MCP_TARGET }] : []),
	{ label: 'local · yarn dev-app', url: `http://127.0.0.1:${WORKER_PORT}/app/mcp` },
	{ label: 'staging', url: 'https://staging.tldraw.com/api/app/mcp' },
	{ label: 'production', url: 'https://www.tldraw.com/api/app/mcp' },
]

// The SDK's Streamable HTTP transport answers a request with either a JSON body
// or a one-shot SSE stream, depending on the server. Pull the frame matching our
// request id out of the stream; fall back to the last frame.
function parseSseFrames(text) {
	const frames = []
	for (const block of text.split(/\r?\n\r?\n/)) {
		const data = block
			.split(/\r?\n/)
			.filter((line) => line.startsWith('data:'))
			.map((line) => line.slice(5).trim())
			.join('\n')
		if (!data) continue
		try {
			frames.push(JSON.parse(data))
		} catch {
			// keep-alive comments and partial frames are expected; ignore them
		}
	}
	return frames
}

async function forward(payload) {
	const { url, token, sessionId, protocolVersion, request } = payload
	if (!url) throw new Error('No URL provided')

	const headers = {
		'Content-Type': 'application/json',
		// The SDK transport 406s unless the client accepts both.
		Accept: 'application/json, text/event-stream',
	}
	if (sessionId) headers['Mcp-Session-Id'] = sessionId
	// Only sent after initialize has negotiated a version; the SDK rejects it on
	// the initialize request itself.
	if (protocolVersion && request.method !== 'initialize') {
		headers['MCP-Protocol-Version'] = protocolVersion
	}
	if (token) headers['Authorization'] = `Bearer ${token}`

	const res = await fetch(url, {
		method: 'POST',
		headers,
		body: JSON.stringify(request),
		// A cache-miss screenshot spins up a Browser Rendering session and waits
		// for the render page to settle, so give it plenty of room.
		signal: AbortSignal.timeout(90_000),
	})

	const contentType = res.headers.get('content-type') || ''
	const raw = await res.text()

	let message = null
	if (raw.trim()) {
		if (contentType.includes('text/event-stream')) {
			const frames = parseSseFrames(raw)
			message = frames.find((f) => f && f.id === request.id) ?? frames[frames.length - 1] ?? null
		} else {
			try {
				message = JSON.parse(raw)
			} catch {
				message = null
			}
		}
	}

	return {
		status: res.status,
		contentType,
		sessionId: res.headers.get('mcp-session-id') || null,
		message,
		raw: raw.length > 200_000 ? `${raw.slice(0, 200_000)}… [truncated]` : raw,
		hint: diagnose(res.status, raw),
	}
}

// A wedged `wrangler dev` looks identical to a broken route from here, so name
// the usual suspects rather than surfacing a bare HTTP status.
function diagnose(status, raw) {
	if (status === 503 && raw.includes('restarted mid-request')) {
		return 'The local worker is wedged, not the route — a rebuild (any edit under apps/dotcom/sync-worker, including package.json) can leave workerd unable to serve, and every POST then fails instantly. Restart it: `node_modules/.cache/process-compose/process-compose process restart sync-worker`'
	}
	if (status === 403) {
		return 'blockUnknownOrigins rejected this. It runs on `*` before the route, so requests carrying a non-allowlisted `Origin` are refused — that means this proxy is being bypassed.'
	}
	if (status === 404) {
		return 'Route not found. Either the path is wrong (deployments need the /api prefix, local does not) or MCP_SCREENSHOT_ENABLED is set to something other than "true", which 404s the whole endpoint including initialize.'
	}
	if (status === 405) return 'This endpoint is POST-only.'
	return undefined
}

function readBody(req) {
	return new Promise((resolve, reject) => {
		const chunks = []
		req.on('data', (c) => chunks.push(c))
		req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
		req.on('error', reject)
	})
}

const server = createServer(async (req, res) => {
	const send = (status, body, type = 'application/json') => {
		res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' })
		res.end(typeof body === 'string' ? body : JSON.stringify(body))
	}

	try {
		if (req.url === '/__presets') return send(200, PRESETS)

		if (req.url === '/__rpc' && req.method === 'POST') {
			const payload = JSON.parse(await readBody(req))
			try {
				return send(200, await forward(payload))
			} catch (err) {
				// A dead port or DNS failure is a normal thing to hit here, so report
				// it as data the UI can show rather than as a 500.
				return send(200, { transportError: err?.message ?? String(err) })
			}
		}

		if (req.url === '/' || req.url?.startsWith('/?')) {
			// Read per request so editing index.html only needs a browser refresh.
			return send(200, await readFile(join(HERE, 'index.html'), 'utf8'), 'text/html; charset=utf-8')
		}

		send(404, 'Not found', 'text/plain')
	} catch (err) {
		send(500, { error: err?.message ?? String(err) })
	}
})

server.listen(PORT, () => {
	console.log(`\ntldraw MCP inspector → http://localhost:${PORT}\n`)
	for (const p of PRESETS) console.log(`  ${p.label.padEnd(32)} ${p.url}`)
	console.log('')
})
