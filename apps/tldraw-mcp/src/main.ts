/** Entry point: parse CLI args and start the MCP server with the selected transport. */

// Polyfill globalThis.crypto for Node environments (e.g. Claude Desktop)
// where it may not be available. Required by tldraw's nanoid-based ID generation.
if (!globalThis.crypto) {
	try {
		const { webcrypto } = await import('node:crypto')
		globalThis.crypto = webcrypto as Crypto
	} catch {
		// node:crypto unavailable — globalThis.crypto must be provided by the host
	}
}

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import express from 'express'
import { createServer } from './server.js'

const useStdio = process.argv.includes('--stdio')
const port = parseInt(process.env['PORT'] ?? '3001', 10)

async function startStdio() {
	const server = createServer()
	const transport = new StdioServerTransport()
	await server.connect(transport)
	console.error('tldraw MCP server running on stdio')
}

async function startHttp() {
	const app = express()

	// Store transports by session ID for session reuse
	const transports = new Map<string, StreamableHTTPServerTransport>()

	app.post('/mcp', async (req, res) => {
		const sessionId = req.headers['mcp-session-id'] as string | undefined

		if (sessionId && transports.has(sessionId)) {
			const transport = transports.get(sessionId)!
			await transport.handleRequest(req, res, req.body)
			return
		}

		const transport = new StreamableHTTPServerTransport({
			sessionIdGenerator: () => globalThis.crypto.randomUUID(),
			onsessioninitialized: (id) => {
				transports.set(id, transport)
			},
		})

		transport.onclose = () => {
			const id = [...transports.entries()].find(([, t]) => t === transport)?.[0]
			if (id) transports.delete(id)
		}

		const server = createServer()
		await server.connect(transport)
		await transport.handleRequest(req, res, req.body)
	})

	app.get('/mcp', async (req, res) => {
		const sessionId = req.headers['mcp-session-id'] as string | undefined
		if (sessionId && transports.has(sessionId)) {
			const transport = transports.get(sessionId)!
			await transport.handleRequest(req, res)
			return
		}
		res.status(400).json({ error: 'No active session. Send a POST to /mcp first.' })
	})

	app.delete('/mcp', async (req, res) => {
		const sessionId = req.headers['mcp-session-id'] as string | undefined
		if (sessionId && transports.has(sessionId)) {
			const transport = transports.get(sessionId)!
			await transport.handleRequest(req, res)
			return
		}
		res.status(400).json({ error: 'No active session.' })
	})

	app.listen(port, () => {
		console.error(`tldraw MCP server running on http://localhost:${port}/mcp`)
	})
}

if (useStdio) {
	startStdio().catch((err) => {
		console.error('Failed to start stdio server:', err)
		process.exit(1)
	})
} else {
	startHttp().catch((err) => {
		console.error('Failed to start HTTP server:', err)
		process.exit(1)
	})
}
