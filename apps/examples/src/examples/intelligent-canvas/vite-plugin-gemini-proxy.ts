import path from 'path'
import { Readable } from 'stream'
import { loadEnv, type Plugin } from 'vite'

const GEMINI_URL =
	'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent'
const GEMINI_FLASH_URL =
	'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview:generateContent'
const GEMINI_PRO_URL =
	'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent'
const EMBED_URL =
	'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents'

export function geminiProxy(): Plugin {
	let apiKey = ''
	let elevenLabsApiKey = ''

	return {
		name: 'gemini-proxy',
		configResolved(config) {
			// Empty prefix loads all env vars from .env.local, not just VITE_*
			// Vite root is apps/examples/src/ but .env.local lives in apps/examples/
			const envDir = path.resolve(config.root, '..')
			const env = loadEnv(config.mode, envDir, '')
			apiKey = env.GEMINI_API_KEY ?? env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY ?? ''
			elevenLabsApiKey = env.ELEVENLABS_API_KEY ?? process.env.ELEVENLABS_API_KEY ?? ''
		},
		configureServer(server) {
			server.middlewares.use('/api/gemini/status', (_req, res) => {
				res.setHeader('Content-Type', 'application/json')
				res.end(JSON.stringify({ available: !!apiKey }))
			})

			server.middlewares.use('/api/gemini/embed', (req, res) => {
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
						const body = JSON.parse(Buffer.concat(chunks).toString()) as {
							texts: string[]
							taskType: string
						}
						const { texts, taskType } = body

						console.log(`\n[Gemini Embed] ▶ ${texts.length} texts | taskType=${taskType}`)

						const batchBody = {
							requests: texts.map((text) => ({
								model: 'models/text-embedding-004',
								content: { parts: [{ text }] },
								taskType,
							})),
						}

						const startTime = Date.now()
						const upstream = await fetch(`${EMBED_URL}?key=${apiKey}`, {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify(batchBody),
						})
						const data = await upstream.text()
						const elapsed = Date.now() - startTime

						if (upstream.ok) {
							const parsed = JSON.parse(data)
							const count = parsed.embeddings?.length ?? 0
							console.log(`[Gemini Embed] ◀ ${elapsed}ms | ${count} embeddings returned`)
						} else {
							console.error(
								`[Gemini Embed] ◀ ${elapsed}ms | ERROR ${upstream.status}: ${data.slice(0, 300)}`
							)
						}

						res.statusCode = upstream.status
						res.setHeader('Content-Type', 'application/json')
						res.end(data)
					} catch (err) {
						console.error(`[Gemini Embed] ◀ PROXY ERROR:`, err)
						res.statusCode = 502
						res.setHeader('Content-Type', 'application/json')
						res.end(JSON.stringify({ error: String(err) }))
					}
				})
			})

			server.middlewares.use('/api/gemini/pro', (req, res) => {
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

						console.log(`\n[Gemini Pro] ▶ request`)

						const startTime = Date.now()
						const upstream = await fetch(`${GEMINI_PRO_URL}?key=${apiKey}`, {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body,
						})
						const data = await upstream.text()
						const elapsed = Date.now() - startTime

						if (upstream.ok) {
							console.log(`[Gemini Pro] ◀ ${elapsed}ms | OK`)
						} else {
							console.error(
								`[Gemini Pro] ◀ ${elapsed}ms | ERROR ${upstream.status}: ${data.slice(0, 300)}`
							)
						}

						res.statusCode = upstream.status
						res.setHeader('Content-Type', 'application/json')
						res.end(data)
					} catch (err) {
						console.error(`[Gemini Pro] ◀ PROXY ERROR:`, err)
						res.statusCode = 502
						res.setHeader('Content-Type', 'application/json')
						res.end(JSON.stringify({ error: String(err) }))
					}
				})
			})

			server.middlewares.use('/api/gemini/flash', (req, res) => {
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

						console.log(`\n[Gemini Flash] ▶ request`)

						const startTime = Date.now()
						const upstream = await fetch(`${GEMINI_FLASH_URL}?key=${apiKey}`, {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body,
						})
						const data = await upstream.text()
						const elapsed = Date.now() - startTime

						if (upstream.ok) {
							console.log(`[Gemini Flash] ◀ ${elapsed}ms | OK`)
						} else {
							console.error(
								`[Gemini Flash] ◀ ${elapsed}ms | ERROR ${upstream.status}: ${data.slice(0, 300)}`
							)
						}

						res.statusCode = upstream.status
						res.setHeader('Content-Type', 'application/json')
						res.end(data)
					} catch (err) {
						console.error(`[Gemini Flash] ◀ PROXY ERROR:`, err)
						res.statusCode = 502
						res.setHeader('Content-Type', 'application/json')
						res.end(JSON.stringify({ error: String(err) }))
					}
				})
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

			server.middlewares.use('/api/elevenlabs/status', (_req, res) => {
				res.setHeader('Content-Type', 'application/json')
				res.end(JSON.stringify({ available: !!elevenLabsApiKey }))
			})

			server.middlewares.use('/api/elevenlabs/tts', (req, res) => {
				if (req.method !== 'POST') {
					res.statusCode = 405
					res.end('Method not allowed')
					return
				}

				if (!elevenLabsApiKey) {
					res.statusCode = 403
					res.setHeader('Content-Type', 'application/json')
					res.end(JSON.stringify({ error: 'ELEVENLABS_API_KEY not configured' }))
					return
				}

				const chunks: Buffer[] = []
				req.on('data', (chunk: Buffer) => chunks.push(chunk))
				req.on('end', async () => {
					try {
						const body = JSON.parse(Buffer.concat(chunks).toString())
						const text = body.text as string
						const voiceId = (body.voiceId as string) || 'oTQK6KgOJHp8UGGZjwUu'
						const upstream = await fetch(
							`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_22050_32`,
							{
								method: 'POST',
								headers: {
									'xi-api-key': elevenLabsApiKey,
									'Content-Type': 'application/json',
								},
								body: JSON.stringify({
									text,
									model_id: 'eleven_multilingual_v2',
								}),
							}
						)
						if (!upstream.ok || !upstream.body) {
							const errText = await upstream.text()
							console.error(`[ElevenLabs] TTS failed (${upstream.status}):`, errText)
							res.statusCode = upstream.status
							res.setHeader('Content-Type', 'application/json')
							res.end(JSON.stringify({ error: errText }))
							return
						}
						res.statusCode = upstream.status
						res.setHeader('Content-Type', 'audio/mpeg')
						Readable.fromWeb(upstream.body as any).pipe(res)
					} catch (err) {
						console.error('[ElevenLabs] TTS proxy error:', err)
						res.statusCode = 502
						res.setHeader('Content-Type', 'application/json')
						res.end(JSON.stringify({ error: String(err) }))
					}
				})
			})
		},
	}
}
