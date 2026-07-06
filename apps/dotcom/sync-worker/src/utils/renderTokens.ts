import { Environment } from '../types'

// Short-lived signed render jobs. The MCP screenshot route mints one of these per capture and
// Browser Run only ever visits the tldraw-owned render page with this token; the render page
// exchanges the token for snapshot data via /app/thumbnail-snapshot. Board identity and render
// parameters ride inside the signed payload so they cannot be tampered with in transit.
export interface ThumbnailRenderJob {
	v: 1
	kind: 'published'
	/** The published slug, i.e. the `:slug` in tldraw.com/p/:slug */
	slug: string
	/** The parent file id */
	fileId: string
	/** The file's lastPublished timestamp; changes when the file is republished */
	version: number
	x: number
	y: number
	z: number
	width: number
	height: number
	theme: 'light' | 'dark'
	/** Unix ms expiry */
	exp: number
}

export const THUMBNAIL_RENDER_TOKEN_TTL_MS = 5 * 60_000

export async function mintThumbnailRenderToken(
	env: Environment,
	job: ThumbnailRenderJob
): Promise<string> {
	const secret = env.MCP_SCREENSHOT_TOKEN_SECRET
	if (!secret) {
		throw new Error('MCP_SCREENSHOT_TOKEN_SECRET is not configured')
	}
	const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(job)))
	const signature = await crypto.subtle.sign(
		'HMAC',
		await getHmacKey(secret),
		new TextEncoder().encode(payload)
	)
	return `${payload}.${base64UrlEncode(new Uint8Array(signature))}`
}

export async function verifyThumbnailRenderToken(
	env: Environment,
	token: string,
	now = Date.now()
): Promise<ThumbnailRenderJob | null> {
	const secret = env.MCP_SCREENSHOT_TOKEN_SECRET
	if (!secret) return null

	const parts = token.split('.')
	if (parts.length !== 2 || !parts[0] || !parts[1]) return null
	const [payload, signature] = parts

	let signatureBytes: Uint8Array<ArrayBuffer>
	try {
		signatureBytes = base64UrlDecode(signature)
	} catch {
		return null
	}

	const isValid = await crypto.subtle.verify(
		'HMAC',
		await getHmacKey(secret),
		signatureBytes,
		new TextEncoder().encode(payload)
	)
	if (!isValid) return null

	let job: ThumbnailRenderJob
	try {
		job = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)))
	} catch {
		return null
	}

	if (
		!job ||
		job.v !== 1 ||
		job.kind !== 'published' ||
		typeof job.slug !== 'string' ||
		typeof job.exp !== 'number'
	) {
		return null
	}
	if (job.exp <= now) return null

	return job
}

async function getHmacKey(secret: string) {
	return crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign', 'verify']
	)
}

function base64UrlEncode(bytes: Uint8Array) {
	let binary = ''
	for (let i = 0; i < bytes.length; i += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
	}
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(value: string): Uint8Array<ArrayBuffer> {
	const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
	const binary = atob(base64)
	const bytes = new Uint8Array(new ArrayBuffer(binary.length))
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i)
	}
	return bytes
}
