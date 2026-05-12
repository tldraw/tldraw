import { Environment } from '../types'

const MAX_URL_LENGTH = 2048

const PRIVATE_HOST_PATTERNS = [
	/^localhost$/i,
	/^127\./,
	/^10\./,
	/^192\.168\./,
	/^172\.(1[6-9]|2\d|3[01])\./,
	/^169\.254\./,
	/^0\./,
	/^::1$/,
	/^fc/i,
	/^fd/i,
	/^fe80:/i,
]

function isPrivateHost(host: string): boolean {
	return PRIVATE_HOST_PATTERNS.some((re) => re.test(host))
}

export interface WebhookUrlValidationResult {
	ok: boolean
	message?: string
}

export function validateWebhookUrl(rawUrl: string, env: Environment): WebhookUrlValidationResult {
	if (typeof rawUrl !== 'string' || rawUrl.length === 0 || rawUrl.length > MAX_URL_LENGTH) {
		return { ok: false, message: 'url must be a non-empty string under 2048 characters' }
	}

	let url: URL
	try {
		url = new URL(rawUrl)
	} catch {
		return { ok: false, message: 'url is not a valid URL' }
	}

	const isProd = env.TLDRAW_ENV === 'production'

	if (isProd) {
		if (url.protocol !== 'https:') {
			return { ok: false, message: 'url must use https:// in production' }
		}
		if (isPrivateHost(url.hostname)) {
			return { ok: false, message: 'url host is not allowed' }
		}
	} else {
		if (url.protocol !== 'https:' && url.protocol !== 'http:') {
			return { ok: false, message: 'url must use http:// or https://' }
		}
	}

	return { ok: true }
}
