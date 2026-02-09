import path from 'path'
import { Readable } from 'stream'
import { loadEnv, type Plugin } from 'vite'

const GEMINI_URL =
	'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent'

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

			server.middlewares.use('/api/elevenlabs/tts-with-timestamps', (req, res) => {
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
							`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`,
							{
								method: 'POST',
								headers: {
									'xi-api-key': elevenLabsApiKey,
									'Content-Type': 'application/json',
								},
								body: JSON.stringify({
									text,
									model_id: 'eleven_multilingual_v2',
									output_format: 'mp3_22050_32',
								}),
							}
						)
						if (!upstream.ok) {
							const errText = await upstream.text()
							console.error(
								`[ElevenLabs] TTS-with-timestamps failed (${upstream.status}):`,
								errText
							)
							res.statusCode = upstream.status
							res.setHeader('Content-Type', 'application/json')
							res.end(JSON.stringify({ error: errText }))
							return
						}
						const data = await upstream.text()
						res.statusCode = 200
						res.setHeader('Content-Type', 'application/json')
						res.end(data)
					} catch (err) {
						console.error('[ElevenLabs] TTS-with-timestamps proxy error:', err)
						res.statusCode = 502
						res.setHeader('Content-Type', 'application/json')
						res.end(JSON.stringify({ error: String(err) }))
					}
				})
			})
		},
	}
}
