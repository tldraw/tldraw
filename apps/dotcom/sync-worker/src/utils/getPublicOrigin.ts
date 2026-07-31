import { IRequest } from 'itty-router'
import { Environment } from '../types'

// The origin used to build the URLs we emit into crawler HTML (og:image, canonical) and 302
// redirect `Location`s. We prefer the configured, trusted client origin so a spoofed
// `x-forwarded-host` / `Host` can't steer those URLs at an attacker origin (open redirect + unfurl
// spoofing). Only when no origin is configured do we fall back to a request-derived host, and only
// if that host is a recognized tldraw/localhost origin.
export function getPublicOrigin(request: IRequest, env: Environment) {
	if (env.MCP_SCREENSHOT_RENDER_ORIGIN) return env.MCP_SCREENSHOT_RENDER_ORIGIN

	const forwardedHost = request.headers.get('x-forwarded-host')?.split(',').at(-1)?.trim()
	const host = forwardedHost ?? request.headers.get('host') ?? undefined
	const proto = request.headers.get('x-forwarded-proto')?.split(',').at(-1)?.trim() ?? 'https'
	if (host && isTrustedPublicHost(host)) {
		return `${proto}://${host}`
	}
	return new URL(request.url).origin
}

// Hosts we're willing to emit into public URLs. Anything else (a spoofed header, a *.workers.dev
// direct hit) falls through to the request's own origin rather than being trusted.
function isTrustedPublicHost(host: string) {
	const hostname = host.split(':')[0].toLowerCase()
	return (
		hostname === 'tldraw.com' ||
		hostname.endsWith('.tldraw.com') ||
		hostname === 'localhost' ||
		hostname === '127.0.0.1'
	)
}
