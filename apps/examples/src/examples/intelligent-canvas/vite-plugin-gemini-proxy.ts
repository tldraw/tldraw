import { execFile, spawn } from 'child_process'
import fs from 'fs'
import type { IncomingMessage } from 'http'
import path from 'path'
import type { Duplex } from 'stream'
import { Readable } from 'stream'
import { loadEnv, type Plugin } from 'vite'
import { WebSocketServer, WebSocket as WsClient } from 'ws'

const GEMINI_LIVE_WS_URL =
	'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent'

const GEMINI_URL =
	'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent'
const GEMINI_FLASH_URL =
	'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent'
const GEMINI_PRO_URL =
	'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent'
const EMBED_URL =
	'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents'

export function geminiProxy(): Plugin {
	let apiKey = ''
	let elevenLabsApiKey = ''
	let repoRoot = ''

	return {
		name: 'gemini-proxy',
		configResolved(config) {
			// Empty prefix loads all env vars from .env.local, not just VITE_*
			// Vite root is apps/examples/src/ but .env.local lives in apps/examples/
			const envDir = path.resolve(config.root, '..')
			const env = loadEnv(config.mode, envDir, '')
			apiKey = env.GEMINI_API_KEY ?? env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY ?? ''
			elevenLabsApiKey = env.ELEVENLABS_API_KEY ?? process.env.ELEVENLABS_API_KEY ?? ''
			// repo root is three levels up from apps/examples/src/
			repoRoot = path.resolve(config.root, '..', '..', '..')
		},
		configureServer(server) {
			server.middlewares.use('/api/gemini/status', (_req, res) => {
				res.setHeader('Content-Type', 'application/json')
				res.end(JSON.stringify({ available: !!apiKey }))
			})

			server.middlewares.use('/api/gemini/live/status', (_req, res) => {
				res.setHeader('Content-Type', 'application/json')
				res.end(JSON.stringify({ available: !!apiKey }))
			})

			// WebSocket proxy: client <-> this dev server <-> Gemini Live API.
			// We add the API key here so it's never exposed to the browser.
			const wss = new WebSocketServer({ noServer: true })

			server.httpServer?.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
				const url = req.url ?? ''
				if (!url.startsWith('/api/gemini/live')) return
				if (!apiKey) {
					socket.destroy()
					return
				}
				wss.handleUpgrade(req, socket, head, (clientWs) => {
					const upstreamUrl = `${GEMINI_LIVE_WS_URL}?key=${apiKey}`
					console.log(`[Gemini Live] ▶ client connected, opening upstream`)
					const upstream = new WsClient(upstreamUrl)

					const clientQueue: (string | Buffer)[] = []
					let upstreamOpen = false

					upstream.on('open', () => {
						upstreamOpen = true
						console.log(`[Gemini Live] ◀ upstream open`)
						for (const msg of clientQueue) upstream.send(msg)
						clientQueue.length = 0
					})

					upstream.on('message', (data, isBinary) => {
						if (clientWs.readyState === clientWs.OPEN) {
							clientWs.send(data, { binary: isBinary })
						}
					})

					upstream.on('close', (code, reason) => {
						const reasonText = reason.toString()
						console.log(`[Gemini Live] upstream closed code=${code} reason=${reasonText}`)
						if (clientWs.readyState === clientWs.OPEN) {
							// Browser WebSocket only accepts 1000 or 3000-4999 in close().
							// Pass the reason text through (truncated to 123 bytes) on a safe code
							// so the browser-side handler can surface it.
							const safeCode = code === 1000 || (code >= 3000 && code <= 4999) ? code : 1011
							const safeReason = reasonText.slice(0, 120)
							try {
								clientWs.close(safeCode, safeReason)
							} catch {
								clientWs.close()
							}
						}
					})

					upstream.on('error', (err) => {
						console.error(`[Gemini Live] upstream error:`, err)
						if (clientWs.readyState === clientWs.OPEN) clientWs.close(1011, 'upstream error')
					})

					clientWs.on('message', (data, isBinary) => {
						const msg = isBinary ? (data as Buffer) : data.toString()
						if (upstreamOpen) {
							upstream.send(msg)
						} else {
							clientQueue.push(msg)
						}
					})

					clientWs.on('close', () => {
						console.log(`[Gemini Live] client closed`)
						if (
							upstream.readyState === upstream.OPEN ||
							upstream.readyState === upstream.CONNECTING
						) {
							upstream.close()
						}
					})

					clientWs.on('error', (err) => {
						console.error(`[Gemini Live] client error:`, err)
						upstream.close()
					})
				})
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
								model: 'models/gemini-embedding-001',
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

			// --- Claude Code build endpoint ---

			server.middlewares.use('/api/claude/status', (_req, res) => {
				// Check if claude CLI is available
				execFile('/Users/anikrishnan/.local/bin/claude', ['--version'], (err) => {
					res.setHeader('Content-Type', 'application/json')
					res.end(JSON.stringify({ available: !err }))
				})
			})

			server.middlewares.use('/api/claude/build', (req, res) => {
				if (req.method !== 'POST') {
					res.statusCode = 405
					res.end('Method not allowed')
					return
				}

				const chunks: Buffer[] = []
				req.on('data', (chunk: Buffer) => chunks.push(chunk))
				req.on('end', async () => {
					try {
						const body = JSON.parse(Buffer.concat(chunks).toString()) as {
							prompt: string
							slug: string
						}

						console.log(`\n[Claude Code] ▶ building example: ${body.slug}`)
						const startTime = Date.now()

						// Spawn claude CLI with prompt as argument
						const child = spawn(
							'/Users/anikrishnan/.local/bin/claude',
							[
								'--permission-mode',
								'acceptEdits',
								'--allowedTools',
								'Read,Write,Edit,Glob,Grep,Bash',
								'--max-turns',
								'8',
								'--output-format',
								'json',
								'-p',
								body.prompt,
							],
							{
								cwd: repoRoot,
								stdio: ['ignore', 'pipe', 'pipe'],
								env: { ...process.env },
							}
						)

						let stdout = ''
						let stderr = ''
						child.stdout.on('data', (data: Buffer) => {
							stdout += data.toString()
						})
						child.stderr.on('data', (data: Buffer) => {
							stderr += data.toString()
							// Log stderr in real time to see what's happening
							const line = data.toString().trim()
							if (line) console.log(`[Claude Code] stderr: ${line}`)
						})

						// 10 minute timeout
						const timeout = setTimeout(
							() => {
								console.error(`[Claude Code] ◀ TIMEOUT after 20 minutes`)
								child.kill('SIGTERM')
							},
							20 * 60 * 1000
						)

						child.on('close', (code) => {
							clearTimeout(timeout)
							const elapsed = Date.now() - startTime

							if (code !== 0) {
								console.error(`[Claude Code] ◀ ${elapsed}ms | exit code ${code}`)
								if (stderr) console.error(`[Claude Code] stderr:`, stderr.slice(0, 1000))
								res.statusCode = 502
								res.setHeader('Content-Type', 'application/json')
								res.end(
									JSON.stringify({
										error: `claude exited with code ${code}`,
										stderr: stderr.slice(0, 1000),
									})
								)
								return
							}

							console.log(`[Claude Code] ◀ ${elapsed}ms | done`)

							// List the files that were created
							const outputDir = path.join(repoRoot, 'apps/examples/src/examples', body.slug)
							let files: string[] = []
							try {
								files = fs.readdirSync(outputDir).filter((f) => !f.startsWith('.'))
							} catch {
								// directory might not exist if claude failed
							}

							res.statusCode = 200
							res.setHeader('Content-Type', 'application/json')
							res.end(
								JSON.stringify({
									slug: body.slug,
									files,
									output: stdout.slice(0, 2000),
								})
							)
						})

						child.on('error', (err) => {
							clearTimeout(timeout)
							console.error(`[Claude Code] spawn error:`, err)
							res.statusCode = 502
							res.setHeader('Content-Type', 'application/json')
							res.end(JSON.stringify({ error: `Failed to spawn claude: ${err.message}` }))
						})
					} catch (err) {
						console.error(`[Claude Code] ◀ ERROR:`, err)
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
