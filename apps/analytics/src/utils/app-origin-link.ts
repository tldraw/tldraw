import { Attribution, cleanParamValue } from './attribution'

// Our apps link to tldraw.dev with their own utm_* tags (utm_source=dotcom and so on), so a
// tldraw.dev visitor's first touch often only says "came from tldraw.com". Carrying the app's own
// first touch on those links keeps how the visitor found the app. Read on tldraw.dev by
// getAttributionTouch and by the CRM worker; keep the param names stable.
const DOT_DEV_HOSTNAMES = ['tldraw.dev', 'www.tldraw.dev']

function isDotDevHostname(hostname: string) {
	const host = hostname.toLowerCase()
	return host === 'tldraw.dev' || host.endsWith('.tldraw.dev')
}

function getReferrerHostname(referrer: string | undefined): string | undefined {
	if (!referrer) return undefined
	try {
		return new URL(referrer).hostname || undefined
	} catch {
		return undefined
	}
}

export function getAppOriginParams(attribution: Attribution): Array<[string, string]> {
	const { first } = attribution
	const params: Array<[string, string | undefined]> = [
		['tl_os', cleanParamValue(first.s)],
		['tl_om', cleanParamValue(first.m)],
		['tl_oc', cleanParamValue(first.c)],
		['tl_or', cleanParamValue(getReferrerHostname(first.r))],
	]
	return params.filter((param): param is [string, string] => !!param[1])
}

/**
 * Returns href with the app's first touch added when it points at tldraw.dev, or href unchanged.
 * Params already on the link win, and nothing is added from a tldraw.dev page: there the cookie
 * is tldraw.dev's own, not an app's.
 */
export function decorateDotDevHref(
	href: string,
	pageHostname: string,
	attribution: Attribution | null
): string {
	if (!attribution || isDotDevHostname(pageHostname)) return href

	let url: URL
	try {
		url = new URL(href)
	} catch {
		return href
	}
	if (url.protocol !== 'https:' && url.protocol !== 'http:') return href
	if (!DOT_DEV_HOSTNAMES.includes(url.hostname.toLowerCase())) return href

	let changed = false
	for (const [key, value] of getAppOriginParams(attribution)) {
		if (url.searchParams.has(key)) continue
		url.searchParams.set(key, value)
		changed = true
	}
	return changed ? url.toString() : href
}

function findLink(event: Event): HTMLAnchorElement | undefined {
	for (const target of event.composedPath()) {
		if (target instanceof HTMLAnchorElement && target.hasAttribute('href')) return target
	}
	return undefined
}

/**
 * Rewrites a tldraw.dev link's href as it is followed, so links rendered before consent (or by
 * any framework) are covered. Returns a function that removes the listeners.
 */
export function listenForDotDevLinks(getAttribution: () => Attribution | null): () => void {
	const handleActivation = (event: Event) => {
		const link = findLink(event)
		if (!link) return
		const attribution = getAttribution()
		if (!attribution) return
		const href = decorateDotDevHref(link.href, window.location.hostname, attribution)
		if (href !== link.href) link.href = href
	}
	// Capture phase, so the href is rewritten before the browser follows the link even when a
	// handler further down stops propagation. auxclick covers middle-click "open in new tab".
	document.addEventListener('click', handleActivation, true)
	document.addEventListener('auxclick', handleActivation, true)
	return () => {
		document.removeEventListener('click', handleActivation, true)
		document.removeEventListener('auxclick', handleActivation, true)
	}
}
