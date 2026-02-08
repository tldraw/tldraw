import path from 'path'
import { loadEnv, type Plugin } from 'vite'

const GEMINI_URL =
	'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent'

export function geminiProxy(): Plugin {
	let apiKey = ''

	return {
		name: 'gemini-proxy',
		configResolved(config) {
			// Empty prefix loads all env vars from .env.local, not just VITE_*
			// Vite root is apps/examples/src/ but .env.local lives in apps/examples/
			const envDir = path.resolve(config.root, '..')
			const env = loadEnv(config.mode, envDir, '')
			apiKey = env.GEMINI_API_KEY ?? env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY ?? ''
		},
		configureServer(server) {
			server.middlewares.use('/api/gemini/status', (_req, res) => {
				res.setHeader('Content-Type', 'application/json')
				res.end(JSON.stringify({ available: !!apiKey }))
			})

			server.middlewares.use('/api/gemini', (req, res) => {
				if (req.method !== 'POST') {
					res.statusCode = 405
					res.end('Method not allowed')
					return
				}

				if (!apiKey) {
					res.statusCode = 403
					res.setHeader('Content-Type', 'application/json')
					res.end(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }))
					return
				}

				const chunks: Buffer[] = []
				req.on('data', (chunk: Buffer) => chunks.push(chunk))
				req.on('end', async () => {
					try {
						const body = Buffer.concat(chunks).toString()
						const upstream = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body,
						})
						const data = await upstream.text()
						res.statusCode = upstream.status
						res.setHeader('Content-Type', 'application/json')
						res.end(data)
					} catch (err) {
						res.statusCode = 502
						res.setHeader('Content-Type', 'application/json')
						res.end(JSON.stringify({ error: String(err) }))
					}
				})
			})
		},
	}
}
