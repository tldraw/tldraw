import path from 'path'
import { loadEnv, type Plugin } from 'vite'

const QUIVER_URL = 'https://api.quiver.ai/v1/svgs/generations'

/**
 * Dev-server middleware that proxies the SVG-to-freehand example's prompt UI to
 * the Quiver text-to-SVG API. The API key stays on the server side; the browser
 * just POSTs `{ prompt, model? }` to `/api/quiver/generate`.
 *
 * Set `QUIVERAI_API_KEY` in `apps/examples/.env.local` to enable.
 */
export function quiverProxy(): Plugin {
	let apiKey = ''

	return {
		name: 'quiver-proxy',
		configResolved(config) {
			// Vite root is apps/examples/src/, but .env.local lives in apps/examples/.
			const envDir = path.resolve(config.root, '..')
			const env = loadEnv(config.mode, envDir, '')
			apiKey = env.QUIVERAI_API_KEY ?? process.env.QUIVERAI_API_KEY ?? ''
		},
		configureServer(server) {
			server.middlewares.use('/api/quiver/status', (_req, res) => {
				res.setHeader('Content-Type', 'application/json')
				res.end(JSON.stringify({ available: !!apiKey }))
			})

			server.middlewares.use('/api/quiver/generate', (req, res) => {
				if (req.method !== 'POST') {
					res.statusCode = 405
					res.end('Method not allowed')
					return
				}

				if (!apiKey) {
					res.statusCode = 403
					res.setHeader('Content-Type', 'application/json')
					res.end(
						JSON.stringify({
							error:
								'QUIVERAI_API_KEY not set — add it to apps/examples/.env.local and restart dev.',
						})
					)
					return
				}

				const chunks: Buffer[] = []
				req.on('data', (chunk: Buffer) => chunks.push(chunk))
				req.on('end', async () => {
					try {
						const body = JSON.parse(Buffer.concat(chunks).toString() || '{}') as {
							prompt?: string
							model?: string
							instructions?: string
						}
						if (!body.prompt) {
							res.statusCode = 400
							res.setHeader('Content-Type', 'application/json')
							res.end(JSON.stringify({ error: 'Missing `prompt` in request body.' }))
							return
						}

						const upstream = await fetch(QUIVER_URL, {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
								Authorization: `Bearer ${apiKey}`,
							},
							body: JSON.stringify({
								model: body.model ?? 'arrow-1.1',
								prompt: body.prompt,
								instructions: body.instructions,
								n: 1,
							}),
						})

						const text = await upstream.text()
						res.statusCode = upstream.status
						res.setHeader('Content-Type', 'application/json')
						res.end(text)
					} catch (err) {
						res.statusCode = 500
						res.setHeader('Content-Type', 'application/json')
						res.end(JSON.stringify({ error: (err as Error).message }))
					}
				})
			})
		},
	}
}
