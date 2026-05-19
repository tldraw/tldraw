import { uniqueId } from '@tldraw/utils'

const TOKEN_PREFIX = 'tldr_pat_'
const TOKEN_BODY_LENGTH = 32

export function generateApiToken(): string {
	return TOKEN_PREFIX + uniqueId(TOKEN_BODY_LENGTH)
}

export function isApiTokenShaped(token: string): boolean {
	return token.startsWith(TOKEN_PREFIX) && token.length === TOKEN_PREFIX.length + TOKEN_BODY_LENGTH
}

export async function hashApiToken(rawToken: string): Promise<string> {
	const data = new TextEncoder().encode(rawToken)
	const digest = await crypto.subtle.digest('SHA-256', data)
	const bytes = new Uint8Array(digest)
	let hex = ''
	for (let i = 0; i < bytes.length; i++) {
		hex += bytes[i].toString(16).padStart(2, '0')
	}
	return hex
}
