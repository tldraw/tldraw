import { T } from '@tldraw/validate'

const preDeepLinkProtocols = new Set(['http:', 'https:', 'mailto:'])

/**
 * Whether a shape's `url` was valid before `T.linkUrl` accepted app deep links. Clients on older
 * versions reject any other, so the `AllowDeepLinkUrls` migrations blank it on the way down.
 */
export function isPreDeepLinkUrl(url: string) {
	if (!T.linkUrl.isValid(url)) return false
	if (url === '' || url.startsWith('/') || url.startsWith('./')) return true
	return preDeepLinkProtocols.has(new URL(url).protocol.toLowerCase())
}
