import { cookieConsent, getPosthogInitialPersonInfo } from './analytics'

// tldraw.dev's own utm_* tags on our links only say "came from tldraw.com". These carry how the
// visitor found tldraw.com. The CRM worker reads them, and tldraw/tldraw#11571 emits the same names
// from our other apps, so keep them stable.
const DOT_DEV_HOSTNAMES = ['tldraw.dev', 'www.tldraw.dev']
// The cap the CRM worker applies when it reads these values.
const MAX_PARAM_LENGTH = 500

export function getDotDevUrl(campaign: string): string {
	return `https://tldraw.dev?utm_source=dotcom&utm_medium=organic&utm_campaign=${campaign}`
}

function cleanParamValue(value: string | null | undefined): string | undefined {
	const trimmed = value?.trim().slice(0, MAX_PARAM_LENGTH)
	return trimmed || undefined
}

function parseUrl(value: unknown): URL | undefined {
	if (typeof value !== 'string' || !value) return undefined
	try {
		return new URL(value)
	} catch {
		return undefined
	}
}

function isTldrawComHostname(hostname: string) {
	return hostname === 'tldraw.com' || hostname.endsWith('.tldraw.com')
}

function isDotDevHostname(hostname: string) {
	return hostname === 'tldraw.dev' || hostname.endsWith('.tldraw.dev')
}

/** Turns PostHog's `$initial_person_info` (`{ r, u }`) into the tl_* params to put on a link. */
export function getAppOriginParams(personInfo: unknown): Array<[string, string]> {
	if (!personInfo || typeof personInfo !== 'object') return []
	const { r, u } = personInfo as { r?: unknown; u?: unknown }

	const landing = parseUrl(u)?.searchParams
	// r is '$direct' when there was no referrer, which doesn't parse as a URL.
	const referrerHostname = parseUrl(r)?.hostname.toLowerCase()

	// A visitor who found tldraw.com through tldraw.dev would otherwise carry tldraw.dev back as
	// their app origin. tldraw.dev links here with utm_source=dotdev, often with no referrer.
	if (
		(referrerHostname && isDotDevHostname(referrerHostname)) ||
		landing?.get('utm_source')?.trim().toLowerCase() === 'dotdev'
	) {
		return []
	}

	const params: Array<[string, string | undefined]> = [
		['tl_os', cleanParamValue(landing?.get('utm_source'))],
		['tl_om', cleanParamValue(landing?.get('utm_medium'))],
		['tl_oc', cleanParamValue(landing?.get('utm_campaign'))],
		[
			'tl_or',
			referrerHostname && !isTldrawComHostname(referrerHostname)
				? cleanParamValue(referrerHostname)
				: undefined,
		],
	]
	return params.filter((param): param is [string, string] => !!param[1])
}

/** Returns url with the tl_* params added when it points at tldraw.dev, or url unchanged. */
export function addAppOriginParams(url: string, personInfo: unknown): string {
	const parsed = parseUrl(url)
	if (!parsed) return url
	if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return url
	if (!DOT_DEV_HOSTNAMES.includes(parsed.hostname.toLowerCase())) return url

	let changed = false
	for (const [key, value] of getAppOriginParams(personInfo)) {
		if (parsed.searchParams.has(key)) continue
		parsed.searchParams.set(key, value)
		changed = true
	}
	return changed ? parsed.toString() : url
}

/**
 * Adds the visitor's first touch to a tldraw.dev url, only when they have granted analytics
 * consent. Reads the consent atom, so calling it inside useValue re-renders on a consent change.
 */
export function withAppOrigin(url: string): string {
	if (cookieConsent.get()?.analytics !== true) return url
	return addAppOriginParams(url, getPosthogInitialPersonInfo())
}
