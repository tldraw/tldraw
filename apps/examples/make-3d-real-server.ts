import fs from 'fs'
import path from 'path'
import { Plugin } from 'vite'

// Dev-only server middleware for the "make 3D real" example. It keeps the
// GOOGLE_API_KEY on the server: the browser posts notes + images to
// /api/make-3d-real, and this handler calls the Gemini API and returns only the
// generated code. The key is never sent to or exposed in the client bundle.

const SYSTEM_PROMPT = `You are an expert React Three Fiber / three.js artist. You turn a designer's canvas notes (and any reference images) into a real, rendered 3D scene.

Output ONLY JavaScript source that defines a component named \`Scene\`. No imports, no exports, no markdown fences, no prose — just \`function Scene() { ... }\`.

These globals are already in scope; use them directly and NEVER import anything:
- React (with hooks: React.useRef, React.useState, React.useMemo)
- THREE (the three.js namespace, e.g. new THREE.Color(), new THREE.Vector3())
- useFrame, useThree (from @react-three/fiber)
- Every @react-three/drei helper is in scope by its export name — e.g. Outlines, Edges, Float, Environment, ContactShadows, Sky, Cloud, Clouds, Stars, Sparkles, Text, Text3D, Center, RoundedBox, Instances, Instance, Line, GradientTexture, MeshWobbleMaterial, MeshDistortMaterial, useTexture. Use them freely.

Hard rules:
- Do NOT include <Canvas>, <OrbitControls>, or a camera — the host provides those and AUTO-FRAMES whatever you build, so you don't need to worry about exact scale or centering. Put the main subject near the origin and build at a natural scale.
- You cannot load external models, textures, or image files. Build everything from three.js primitives, generated geometry (BufferGeometry, extrude/lathe shapes), and procedural placement.
- Add your own lighting: a key directional light (with castShadow), one or two fills, and low ambient.
- You MAY set atmosphere: <color attach="background" args={[...]} /> and <fog attach="fog" args={[color, near, far]} /> for depth and mood. Prefer background color + fog for "sky" over giant sky domes.

Ambition — read the notes and match their scope:
- If the notes describe a single object, make a beautiful, detailed hero asset.
- If the notes describe a place, mood, or scene (a canyon, a city, a forest), build a whole COMPOSED ENVIRONMENT: ground, mid-ground structures, background silhouettes, scattered detail (rocks, plants, debris) placed with loops or <Instances>, and atmosphere. Think in foreground / midground / background layers with depth.
- Honor any reference image: match its palette, composition, mood, and linework.
- Keep the whole composition within roughly a 20-unit cube so the auto-framing stays sensible.

Style:
- For "ligne claire" / flat / cel looks: use flat color materials (meshBasicMaterial or meshToonMaterial), bold silhouettes, a limited flat palette, and <Outlines> on the key shapes for black linework. Avoid glossy PBR shading.
- Otherwise match whatever the notes ask for.
- Animate subtly with useFrame (drifting clouds, a slow rotation, swaying plants) when it adds life — keep it tasteful.

Aim high: this is a showcase. Prefer a rich, characterful, well-composed result over a bare primitive.

Minimal example (structure, not a ceiling on ambition):
function Scene() {
  const ref = React.useRef()
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.2 })
  return (
    <group>
      <color attach="background" args={['#cfe8f0']} />
      <fog attach="fog" args={['#cfe8f0', 12, 40]} />
      <directionalLight position={[6, 8, 4]} intensity={1.3} castShadow />
      <ambientLight intensity={0.4} />
      <mesh ref={ref} castShadow>
        <icosahedronGeometry args={[1.2, 0]} />
        <meshToonMaterial color="#e07a5f" />
        <Outlines thickness={4} color="#2b2b2b" />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={-1.2} receiveShadow>
        <circleGeometry args={[8, 48]} />
        <meshToonMaterial color="#f4d59a" />
      </mesh>
    </group>
  )
}`

// Models to try in order. Override with GOOGLE_MODEL. The first that isn't a
// "model not found" wins. Flash is the default for snappy iteration; set
// GOOGLE_MODEL=gemini-2.5-pro in .env.local for max quality (slower).
const DEFAULT_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash']

const REQUEST_TIMEOUT_MS = 120_000

interface RequestPayload {
	userText: string
	images?: Array<{ mimeType: string; data: string }>
}

// Minimal KEY=VALUE parser for a .env.vars file. We only read GOOGLE_API_KEY /
// GOOGLE_MODEL out of it and never log the value.
function readEnvFile(file: string): Record<string, string> {
	const out: Record<string, string> = {}
	if (!fs.existsSync(file)) return out
	for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
		const trimmed = line.trim()
		if (!trimmed || trimmed.startsWith('#')) continue
		const eq = trimmed.indexOf('=')
		if (eq === -1) continue
		const key = trimmed.slice(0, eq).trim()
		let value = trimmed.slice(eq + 1).trim()
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1)
		}
		out[key] = value
	}
	return out
}

function loadEnv(appDir: string) {
	// look for a local env file next to the examples app, then at the repo root
	const candidates = [
		path.join(appDir, '.env.local'),
		path.join(appDir, '.env.vars'),
		path.join(appDir, '..', '..', '.env.local'),
		path.join(appDir, '..', '..', '.env.vars'),
	]
	let fromFile: Record<string, string> = {}
	let source: string | null = null
	for (const file of candidates) {
		const parsed = readEnvFile(file)
		if (parsed.GOOGLE_API_KEY) {
			fromFile = parsed
			source = file
			break
		}
	}
	return {
		apiKey: process.env.GOOGLE_API_KEY ?? fromFile.GOOGLE_API_KEY ?? null,
		model: process.env.GOOGLE_MODEL ?? fromFile.GOOGLE_MODEL ?? null,
		source: process.env.GOOGLE_API_KEY ? 'process.env' : source,
	}
}

function readBody(req: import('http').IncomingMessage): Promise<string> {
	return new Promise((resolve, reject) => {
		let data = ''
		req.on('data', (chunk) => {
			data += chunk
			if (data.length > 20_000_000) reject(new Error('payload too large'))
		})
		req.on('end', () => resolve(data))
		req.on('error', reject)
	})
}

async function callGemini(
	apiKey: string,
	models: string[],
	payload: RequestPayload
): Promise<string> {
	const parts: Array<Record<string, unknown>> = [{ text: payload.userText }]
	for (const img of payload.images ?? []) {
		parts.push({ inline_data: { mime_type: img.mimeType, data: img.data } })
	}

	const body = {
		system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
		contents: [{ role: 'user', parts }],
		generationConfig: {
			temperature: 0.9,
			maxOutputTokens: 32768,
			// Disable Gemini 2.5's hidden "thinking" pass — it roughly 5x's latency.
			// Works on flash/flash-lite; pro ignores/requires thinking (override the
			// model with GOOGLE_MODEL if you want pro's extra quality at higher latency).
			thinkingConfig: { thinkingBudget: 0 },
		},
	}

	let lastError = 'no models tried'
	for (const model of models) {
		const started = Date.now()
		// eslint-disable-next-line no-console
		console.log(`[make-3d-real] calling ${model}…`)
		const controller = new AbortController()
		const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
		let res: Response
		try {
			res = await fetch(
				`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
				{
					method: 'POST',
					headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
					body: JSON.stringify(body),
					signal: controller.signal,
				}
			)
		} catch (e) {
			lastError =
				e instanceof Error && e.name === 'AbortError'
					? `${model} timed out after ${REQUEST_TIMEOUT_MS / 1000}s`
					: `${model} request failed: ${e instanceof Error ? e.message : String(e)}`
			continue
		} finally {
			clearTimeout(timer)
		}
		// eslint-disable-next-line no-console
		console.log(`[make-3d-real] ${model} responded ${res.status} in ${Date.now() - started}ms`)

		if (res.status === 404) {
			lastError = `model ${model} not found`
			continue // try the next model
		}

		const json = (await res.json()) as any
		if (!res.ok) {
			lastError = json?.error?.message ?? `HTTP ${res.status}`
			// a bad key or quota error won't be fixed by another model
			if (res.status === 400 || res.status === 403 || res.status === 429) break
			continue
		}

		const text: string =
			json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('') ?? ''
		if (text.trim()) return text
		lastError = 'model returned no text'
	}
	throw new Error(lastError)
}

export function make3dRealPlugin(appDir: string): Plugin {
	return {
		name: 'make-3d-real-server',
		configureServer(server) {
			server.middlewares.use('/api/make-3d-real', async (req, res) => {
				res.setHeader('content-type', 'application/json')
				if (req.method !== 'POST') {
					res.statusCode = 405
					res.end(JSON.stringify({ error: 'POST only' }))
					return
				}

				const { apiKey, model, source } = loadEnv(appDir)
				if (!apiKey) {
					res.statusCode = 500
					res.end(
						JSON.stringify({
							error:
								'GOOGLE_API_KEY not found. Add it to apps/examples/.env.vars (GOOGLE_API_KEY=...) or the repo-root .env.vars, then restart the dev server.',
						})
					)
					return
				}

				try {
					const payload = JSON.parse(await readBody(req)) as RequestPayload
					const models = model ? [model] : DEFAULT_MODELS
					// eslint-disable-next-line no-console
					console.log(
						`[make-3d-real] request: ${payload.userText.length} chars, ${payload.images?.length ?? 0} image(s)`
					)
					const raw = await callGemini(apiKey, models, payload)
					// strip a markdown fence if the model added one
					const fence = raw.match(/```(?:jsx?|tsx?|javascript)?\s*([\s\S]*?)```/)
					const code = (fence ? fence[1] : raw).trim()
					// eslint-disable-next-line no-console
					console.log(`[make-3d-real] generated ${code.length} chars via key from ${source}`)
					res.statusCode = 200
					res.end(JSON.stringify({ code }))
				} catch (e) {
					res.statusCode = 500
					res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }))
				}
			})
		},
	}
}
