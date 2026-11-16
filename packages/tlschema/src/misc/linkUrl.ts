import { T } from '@tldraw/validate'

const preAppLinkProtocols = new Set(['http:', 'https:', 'mailto:'])

/**
 * Whether a shape's `url` was valid before `T.linkUrl` accepted app links. Clients on older
 * versions reject any other, so the `AllowAppLinkUrls` migrations blank it on the way down.
 */
export function isPreAppLinkUrl(url: string) {
	if (!T.linkUrl.isValid(url)) return false
	if (url === '' || url.startsWith('/') || url.startsWith('./')) return true
	return preAppLinkProtocols.has(new URL(url).protocol.toLowerCase())
}
