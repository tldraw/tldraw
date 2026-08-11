import { Environment } from '../types'
import { base64UrlDecode, base64UrlEncode } from './base64'

/**
 * Authorization for a server-authored comment: one signed grant to post as a given author, in a
 * given file, until it expires. Modelled on the thumbnail render tokens in `renderTokens.ts`.
 *
 * `authorId` rides inside the signed payload rather than the request body, which is the whole point
 * of signing rather than checking a shared secret in a header. A bare secret authorizes the caller
 * but says nothing about who they may post as, so any holder could comment as anyone; here a grant
 * minted for one author cannot be spent on another.
 */
export interface ServerCommentGrant {
	v: 1
	/** The file the comment may be posted in. The room checks this against its own slug. */
	fileId: string
	/** The user the comment is posted as. Must still be a live user row when the comment is written. */
	authorId: string
	/** Unix ms expiry. */
	exp: number
}

export async function mintServerCommentToken(
	env: Environment,
	grant: ServerCommentGrant
): Promise<string> {
	const secret = env.SERVER_COMMENT_TOKEN_SECRET
	if (!secret) {
		throw new Error('SERVER_COMMENT_TOKEN_SECRET is not configured')
	}
	const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(grant)))
	const signature = await crypto.subtle.sign(
		'HMAC',
		await getHmacKey(secret),
		new TextEncoder().encode(payload)
	)
	return `${payload}.${base64UrlEncode(new Uint8Array(signature))}`
}

/**
 * The grant this token carries, or null if it isn't one we'd honour. Fails closed: an unconfigured
 * secret rejects every token rather than waving them through, so an environment that never set one
 * has no server-comment endpoint rather than an unauthenticated one.
 */
export async function verifyServerCommentToken(
	env: Environment,
	token: string,
	now = Date.now()
): Promise<ServerCommentGrant | null> {
	const secret = env.SERVER_COMMENT_TOKEN_SECRET
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

	let grant: ServerCommentGrant
	try {
		grant = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)))
	} catch {
		return null
	}

	if (
		!grant ||
		grant.v !== 1 ||
		typeof grant.fileId !== 'string' ||
		!grant.fileId ||
		typeof grant.authorId !== 'string' ||
		!grant.authorId ||
		typeof grant.exp !== 'number'
	) {
		return null
	}
	if (grant.exp <= now) return null

	return grant
}

/** The bearer token on a request, or null when the header is absent or malformed. */
export function getBearerToken(req: Request): string | null {
	const header = req.headers.get('authorization')
	if (!header) return null
	const match = /^Bearer (.+)$/.exec(header)
	return match ? match[1] : null
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
