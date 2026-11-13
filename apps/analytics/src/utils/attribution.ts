import Cookies from 'js-cookie'

// Read by tldraw.dev's forms to tell HubSpot where a visitor came from; keep the shape stable.
export const ATTRIBUTION_COOKIE_NAME = 'tl_attribution'
const ATTRIBUTION_COOKIE_MAX_AGE_SECONDS = 15552000 // 180 days

// Visitors moving between our own sites are not a new source. Product subdomains such as
// computer.tldraw.com are deliberately left out, so traffic from them is kept.
const INTERNAL_REFERRER_HOSTNAMES = ['tldraw.com', 'tldraw.dev', 'tldraw.link'].flatMap(
	(domain) => [domain, `www.${domain}`, `docs.${domain}`]
)

export interface AttributionTouch {
	s?: string // utm_source
	m?: string // utm_medium
	c?: string // utm_campaign
	ct?: string // utm_content
	r?: string // external referrer: origin and path, no query string
	l: string // landing page: origin, path and only its utm_* params
	t: string // ISO 8601 time of the page view
}

export interface Attribution {
	v: 1
	first: AttributionTouch
	last: AttributionTouch
}

export interface PageView {
	url: string
	referrer: string
	time: Date
}

function getExternalReferrer(referrer: string, siteHostname: string): string | undefined {
	let url: URL
	try {
		url = new URL(referrer)
	} catch {
		return undefined
	}
	const hostname = url.hostname.toLowerCase()
	if (
		!hostname ||
		hostname === siteHostname.toLowerCase() ||
		INTERNAL_REFERRER_HOSTNAMES.includes(hostname)
	) {
		return undefined
	}
	return `${url.protocol}//${url.host}${url.pathname}`
}

/** Returns null when the page view says nothing about where the visitor came from. */
export function getAttributionTouch({ url, referrer, time }: PageView): AttributionTouch | null {
	let page: URL
	try {
		page = new URL(url)
	} catch {
		return null
	}

	const utmParams = [...page.searchParams].filter(
		([key, value]) => key.startsWith('utm_') && value !== ''
	)
	const externalReferrer = getExternalReferrer(referrer, page.hostname)
	if (utmParams.length === 0 && !externalReferrer) return null

	const utm = new URLSearchParams(utmParams)
	const landingQuery = utm.toString()
	const touch: AttributionTouch = {
		s: utm.get('utm_source') ?? undefined,
		m: utm.get('utm_medium') ?? undefined,
		c: utm.get('utm_campaign') ?? undefined,
		ct: utm.get('utm_content') ?? undefined,
		r: externalReferrer,
		l: `${page.origin}${page.pathname}${landingQuery ? `?${landingQuery}` : ''}`,
		t: time.toISOString(),
	}
	return Object.fromEntries(Object.entries(touch).filter(([, value]) => value)) as AttributionTouch
}

export function getNextAttribution(
	current: Attribution | null,
	touch: AttributionTouch
): Attribution {
	return { v: 1, first: current?.first ?? touch, last: touch }
}

function parseAttribution(value: string | undefined): Attribution | null {
	if (!value) return null
	try {
		const parsed = JSON.parse(value)
		if (
			parsed?.v === 1 &&
			typeof parsed.first === 'object' &&
			parsed.first !== null &&
			typeof parsed.last === 'object' &&
			parsed.last !== null
		) {
			return parsed
		}
	} catch {
		// A malformed cookie is treated as absent and replaced on the next touch.
	}
	return null
}

function getCookieAttributes(domain: string | undefined) {
	return [
		'Path=/',
		domain && `Domain=${domain}`,
		'SameSite=Lax',
		// A Secure cookie can't be set from an http page, which would break local development.
		window.location.protocol === 'https:' && 'Secure',
	]
		.filter(Boolean)
		.join('; ')
}

function canSetCookieOnDomain(domain: string) {
	const probeName = `${ATTRIBUTION_COOKIE_NAME}_probe`
	document.cookie = `${probeName}=1; ${getCookieAttributes(domain)}`
	const accepted = Cookies.get(probeName) === '1'
	document.cookie = `${probeName}=; Max-Age=0; ${getCookieAttributes(domain)}`
	return accepted
}

let cookieDomainCache: { hostname: string; domain: string | undefined } | undefined

// The registrable domain is the shortest parent the browser lets us set a cookie on: browsers
// refuse public suffixes such as "dev" or "vercel.app", so probing avoids shipping a suffix list.
// Hosts without one (localhost, IP addresses) get a host-only cookie.
function getCookieDomain(): string | undefined {
	const { hostname } = window.location
	if (cookieDomainCache?.hostname === hostname) return cookieDomainCache.domain

	let domain: string | undefined
	const isIpAddress = /^[\d.]+$/.test(hostname) || hostname.startsWith('[')
	if (hostname.includes('.') && !isIpAddress) {
		const labels = hostname.split('.')
		for (let index = labels.length - 2; index >= 0; index--) {
			const candidate = labels.slice(index).join('.')
			if (canSetCookieOnDomain(candidate)) {
				domain = candidate
				break
			}
		}
	}

	cookieDomainCache = { hostname, domain }
	return domain
}

export function readAttribution(): Attribution | null {
	return parseAttribution(Cookies.get(ATTRIBUTION_COOKIE_NAME))
}

export function recordAttributionPageView(pageView: PageView) {
	const touch = getAttributionTouch(pageView)
	if (!touch) return
	const value = encodeURIComponent(JSON.stringify(getNextAttribution(readAttribution(), touch)))
	document.cookie = `${ATTRIBUTION_COOKIE_NAME}=${value}; Max-Age=${ATTRIBUTION_COOKIE_MAX_AGE_SECONDS}; ${getCookieAttributes(getCookieDomain())}`
}

// Expires every domain the cookie could have been set on rather than probing, so nothing is
// written while consent is withheld.
export function removeAttribution() {
	const expired = `${ATTRIBUTION_COOKIE_NAME}=; Max-Age=0`
	document.cookie = `${expired}; ${getCookieAttributes(undefined)}`
	const labels = window.location.hostname.split('.')
	for (let index = 0; index < labels.length - 1; index++) {
		document.cookie = `${expired}; ${getCookieAttributes(labels.slice(index).join('.'))}`
	}
}
